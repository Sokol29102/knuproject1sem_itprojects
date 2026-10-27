from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, StrictStr

MAX_CHARACTERS = 20_000
MAX_FILE_BYTES = MAX_CHARACTERS * 4 + 3
MAX_REQUEST_BYTES = 1_048_576
STATIC = Path(__file__).parent / 'static'

app = FastAPI(title='AI Requirements Analyzer', version='0.1.0', description='Sprint 1: validate and preview requirements. AI analysis is planned for Sprint 2.')


class BoundedBody:
    """Bound request memory before either JSON or multipart parsing."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope['method'] != 'POST':
            return await self.app(scope, receive, send)
        body = bytearray()
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            body.extend(message.get('body', b''))
            if len(body) > MAX_REQUEST_BYTES:
                return await JSONResponse({'detail': 'Request is too large. Use a short TXT file or paste up to 20,000 characters.'}, status_code=413)(scope, receive, send)
            if not message.get('more_body', False):
                break
        delivered = False

        async def replay():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {'type': 'http.request', 'body': bytes(body), 'more_body': False}

        await self.app(scope, replay, send)


app.add_middleware(BoundedBody)


class TextInput(BaseModel):
    text: StrictStr


def accepted_text(text: str, source: str) -> dict:
    text = text.removeprefix('\ufeff').replace('\r\n', '\n').replace('\r', '\n')
    try:
        text.encode('utf-8')
    except UnicodeEncodeError:
        raise HTTPException(400, 'Text contains invalid Unicode. Use UTF-8 text.') from None
    if not text.strip():
        raise HTTPException(400, 'Add some requirements text. Empty or whitespace-only input cannot be previewed.')
    if len(text) > MAX_CHARACTERS:
        raise HTTPException(400, f'Text has {len(text):,} characters. The limit is 20,000; shorten the sample and try again.')
    return {'text': text, 'characters': len(text), 'lines': text.count('\n') + 1, 'source': source}


@app.exception_handler(RequestValidationError)
async def invalid_request(request, exc):
    return JSONResponse({'detail': 'Provide text as a string, or select a TXT file, and try again.'}, status_code=422)


@app.post('/api/preview')
def preview(payload: TextInput):
    return accepted_text(payload.text, 'Pasted text')


@app.post('/api/upload')
async def upload(file: UploadFile = File(...)):
    try:
        filename = (file.filename or '').replace('\\', '/').rsplit('/', 1)[-1]
        if not filename.lower().endswith('.txt'):
            raise HTTPException(400, 'Choose a .txt file. PDF, DOCX and other formats are planned for a later version.')
        content = await file.read(MAX_FILE_BYTES + 1)
        if len(content) > MAX_FILE_BYTES:
            raise HTTPException(400, 'File is too large. Use a TXT sample of up to 20,000 characters.')
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            raise HTTPException(400, 'This file is not valid UTF-8. Save it as UTF-8 text and try again.') from None
        return accepted_text(text, filename)
    finally:
        await file.close()


@app.get('/health')
def health():
    return {'status': 'ok', 'sprint': 1}


@app.get('/', include_in_schema=False)
def index():
    return FileResponse(STATIC / 'demo.html')


@app.get('/prototype', include_in_schema=False)
def input_prototype():
    return FileResponse(STATIC / 'index.html')


@app.get('/demo', include_in_schema=False)
def product_demo():
    return FileResponse(STATIC / 'demo.html')


app.mount('/static', StaticFiles(directory=STATIC), name='static')
