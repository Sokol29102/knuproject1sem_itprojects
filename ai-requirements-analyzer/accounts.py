"""Local accounts and owner-scoped project persistence, using SQLite and scrypt."""
import hashlib
import hmac
import json
import math
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, StrictStr, model_validator

router = APIRouter(prefix='/api')
COOKIE = 'analyzer_session'
SESSION_SECONDS = 7 * 24 * 3600


@contextmanager
def database():
    path = Path(os.environ.get('APP_DATABASE', str(Path(__file__).parent / 'data' / 'analyzer.sqlite3')))
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        db.execute('PRAGMA foreign_keys=ON')
        db.execute('PRAGMA journal_mode=WAL')
        db.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY, username TEXT NOT NULL, login TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS auth_attempts (ip TEXT NOT NULL, created REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id),
                name TEXT NOT NULL, description TEXT NOT NULL, board TEXT NOT NULL,
                revision INTEGER NOT NULL DEFAULT 0, updated REAL NOT NULL);
            CREATE INDEX IF NOT EXISTS projects_owner ON projects(owner_id);
        ''')
        with db:
            yield db
    finally:
        db.close()


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def password_hash(password, salt):
    return hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**15, r=8, p=3, maxmem=64*1024*1024).hex()


def current_user(request: Request):
    token = request.cookies.get(COOKIE, '')
    if not token or len(token) > 128:
        raise HTTPException(401, 'Sign in to open your projects.')
    with database() as db:
        row = db.execute('SELECT users.id, users.username FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires>?',
                         (token_hash(token), time.time())).fetchone()
    if not row:
        raise HTTPException(401, 'Your session has expired. Sign in again.')
    return dict(row)


class Credentials(BaseModel):
    model_config = ConfigDict(extra='forbid')
    username: StrictStr = Field(pattern=r'^[A-Za-z0-9_-]{3,40}$')
    password: StrictStr = Field(min_length=10, max_length=128)


def throttle(request):
    ip = request.client.host if request.client else 'local'
    now = time.time()
    with database() as db:
        db.execute('DELETE FROM auth_attempts WHERE created<?', (now - 900,))
        if db.execute('SELECT COUNT(*) FROM auth_attempts WHERE ip=?', (ip,)).fetchone()[0] >= 20:
            raise HTTPException(429, 'Too many sign-in attempts. Wait 15 minutes and try again.')
        db.execute('INSERT INTO auth_attempts VALUES (?,?)', (ip, now))


def start_session(request, response, user):
    token = secrets.token_urlsafe(32)
    old = request.cookies.get(COOKIE, '')
    with database() as db:
        db.execute('DELETE FROM sessions WHERE expires<? OR token_hash=?', (time.time(), token_hash(old)))
        db.execute('INSERT INTO sessions VALUES (?,?,?)', (token_hash(token), user['id'], time.time() + SESSION_SECONDS))
    response.set_cookie(COOKIE, token, max_age=SESSION_SECONDS, httponly=True, samesite='strict',
                        secure=request.url.scheme == 'https' or os.environ.get('APP_COOKIE_SECURE') == '1', path='/')
    return user


@router.post('/auth/register', status_code=201)
def register(payload: Credentials, request: Request, response: Response):
    throttle(request)
    salt = secrets.token_hex(16)
    hashed = salt + ':' + password_hash(payload.password, salt)
    try:
        with database() as db:
            cursor = db.execute('INSERT INTO users(username,login,password_hash) VALUES (?,?,?)',
                                (payload.username, payload.username.lower(), hashed))
            user = {'id': cursor.lastrowid, 'username': payload.username}
    except sqlite3.IntegrityError:
        raise HTTPException(409, 'That username is already taken.') from None
    return start_session(request, response, user)


@router.post('/auth/login')
def login(payload: Credentials, request: Request, response: Response):
    throttle(request)
    with database() as db:
        user = db.execute('SELECT * FROM users WHERE login=?', (payload.username.lower(),)).fetchone()
    stored = user['password_hash'] if user else '00'*16 + ':' + '00'*64
    salt, expected = stored.split(':')
    valid = hmac.compare_digest(password_hash(payload.password, salt), expected)
    if not user or not valid:
        raise HTTPException(401, 'Incorrect username or password.')
    return start_session(request, response, {'id': user['id'], 'username': user['username']})


@router.get('/auth/me')
def me(user=Depends(current_user)):
    return user


@router.post('/auth/logout')
def logout(request: Request, response: Response):
    with database() as db:
        db.execute('DELETE FROM sessions WHERE token_hash=?', (token_hash(request.cookies.get(COOKIE, '')),))
    response.delete_cookie(COOKIE, path='/', httponly=True, samesite='strict')
    return {'ok': True}


class ProjectInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: StrictStr = Field(min_length=1, max_length=120)
    description: StrictStr = Field(default='', max_length=2000)


class BoardInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    version: Literal[1]
    revision: int = Field(ge=0, strict=True)
    cards: list[dict] = Field(max_length=100)

    @model_validator(mode='after')
    def validate_cards(self):
        ids = set()
        color = lambda x: isinstance(x, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', x)
        number = lambda x: type(x) in (int, float) and math.isfinite(x)
        for card in self.cards:
            identifier = card.get('id')
            if not isinstance(identifier, str) or not re.fullmatch(r'[\w-]{1,80}', identifier, re.ASCII) or identifier in ids:
                raise ValueError('Invalid or duplicate card ID.')
            ids.add(identifier)
            if card.get('type') not in {'note', 'requirement', 'decision', 'file', 'shape', 'drawing', 'image'}:
                raise ValueError('Invalid card type.')
            for key, limit in [('title', 120), ('body', 12000)]:
                if not isinstance(card.get(key), str) or len(card[key]) > limit:
                    raise ValueError('Invalid card text.')
            if not number(card.get('x')) or not number(card.get('y')):
                raise ValueError('Invalid position.')
            width, height = card.get('width', 260), card.get('height', 260)
            if not all(number(v) and 24 <= v <= 1600 for v in (width, height)):
                raise ValueError('Invalid dimensions.')
            if card['type'] in {'shape', 'drawing'}:
                if not color(card.get('color')) or not number(card.get('strokeWidth')) or not 1 <= card['strokeWidth'] <= 16:
                    raise ValueError('Invalid drawing style.')
            if card['type'] == 'shape' and (card.get('shape') not in {'rectangle', 'ellipse', 'arrow'} or not (card.get('fill') == 'none' or color(card.get('fill')))):
                raise ValueError('Invalid shape.')
            if card['type'] == 'drawing':
                points = card.get('points')
                if not isinstance(points, list) or not 2 <= len(points) <= 2000 or any(not isinstance(p, list) or len(p) != 2 or not all(number(v) for v in p) or not 0 <= p[0] <= width or not 0 <= p[1] <= height for p in points):
                    raise ValueError('Invalid drawing points.')
            if card['type'] == 'image':
                src = card.get('src')
                if not isinstance(src, str) or len(src) > 1500000 or not re.fullmatch(r'data:image/(png|jpeg|webp);base64,[a-zA-Z0-9+/]+={0,2}', src):
                    raise ValueError('Invalid embedded image.')
        if len(json.dumps({'version': 1, 'cards': self.cards}, ensure_ascii=False).encode()) > 8*1024*1024:
            raise ValueError('Board is larger than 8 MB.')
        return self


@router.get('/projects')
def projects(user=Depends(current_user)):
    with database() as db:
        return [dict(row) for row in db.execute('SELECT id,name,description,revision,updated FROM projects WHERE owner_id=? ORDER BY updated DESC', (user['id'],))]


@router.post('/projects', status_code=201)
def create_project(payload: ProjectInput, user=Depends(current_user)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(400, 'Give your project a name.')
    project = {'id': secrets.token_hex(16), 'name': name, 'description': payload.description.strip(), 'revision': 0, 'updated': time.time()}
    with database() as db:
        db.execute('INSERT INTO projects(id,owner_id,name,description,board,updated) VALUES (?,?,?,?,?,?)',
                   (project['id'], user['id'], project['name'], project['description'], '{"version":1,"cards":[]}', project['updated']))
    return project


@router.get('/projects/{project_id}')
def get_project(project_id: str, user=Depends(current_user)):
    with database() as db:
        row = db.execute('SELECT id,name,description,board,revision,updated FROM projects WHERE id=? AND owner_id=?', (project_id, user['id'])).fetchone()
    if not row:
        raise HTTPException(404, 'Project not found.')
    project = dict(row)
    project['board'] = json.loads(project['board'])
    return project


@router.put('/projects/{project_id}/board')
def save_board(project_id: str, payload: BoardInput, user=Depends(current_user)):
    with database() as db:
        row = db.execute('SELECT revision FROM projects WHERE id=? AND owner_id=?', (project_id, user['id'])).fetchone()
        if not row:
            raise HTTPException(404, 'Project not found.')
        changed = db.execute('UPDATE projects SET board=?,revision=revision+1,updated=? WHERE id=? AND owner_id=? AND revision=?',
                             (json.dumps({'version': 1, 'cards': payload.cards}, ensure_ascii=False), time.time(), project_id, user['id'], payload.revision))
        if changed.rowcount != 1:
            raise HTTPException(409, 'This project changed in another tab. Export this board, then reopen the project before saving.')
    return {'revision': payload.revision + 1}
