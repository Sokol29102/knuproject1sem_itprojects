import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoardHistory,selectInRectangle,moveSelected,pasteCopies} from '../static/board-actions.mjs';

const note=(id,x=0,y=0,pinned=false)=>({id,type:'note',title:id,body:'Text',x,y,width:100,height:80,pinned});

test('box selection handles reverse drags and signed world coordinates',()=>{
  const cards=[note('a',-90,-60),note('b',200,200)];
  assert.deepEqual(selectInRectangle(cards,{x:30,y:30},{x:-100,y:-100}),['a']);
});
test('group movement preserves spacing and leaves pinned and unselected objects unchanged',()=>{
  const cards=[note('a',-50,0),note('b',100,50),note('pin',0,0,true),note('other',300,300)];
  const moved=moveSelected(cards,new Set(['a','b','pin']),25,-10);
  assert.deepEqual(moved.map(c=>[c.x,c.y]),[[-25,-10],[125,40],[0,0],[300,300]]);
  assert.equal(cards[0].x,-50);
});
test('pasting generates fresh IDs, retains group geometry, unpins copies and validates the whole result',()=>{
  const source=[note('a',-100,-50,true),note('b',20,30)];
  const copies=pasteCopies([],source,{x:500,y:600});
  assert.deepEqual(copies.map(c=>[c.x,c.y,c.pinned]),[[500,600,false],[620,680,false]]);
  assert.notEqual(copies[0].id,'a');assert.notEqual(copies[0].id,copies[1].id);
  assert.throws(()=>pasteCopies(Array.from({length:100},(_,i)=>note('n'+i)),source,{x:0,y:0}));
});
test('undo and redo cover edits, moves and deletion; a new edit clears redo',()=>{
  const history=createBoardHistory([note('a')]);
  const moved=[note('a',50,20)];history.record(moved);history.record([]);
  assert.deepEqual(history.undo(),moved);
  assert.equal(history.undo()[0].x,0);
  assert.deepEqual(history.redo(),moved);
  history.record([note('a',70)]);assert.equal(history.canRedo,false);
});
test('no-op edits do not create history, and reset prevents undo into another project',()=>{
  const history=createBoardHistory([note('a')]);
  history.record([note('a')]);assert.equal(history.canUndo,false);
  history.record([]);history.reset([note('different')]);assert.equal(history.canUndo,false);
  assert.equal(history.undo(),null);
});
test('history limits old snapshots without dropping the newest undo',()=>{
  const history=createBoardHistory([note('a')],{maxEntries:2});
  for(let x=1;x<=4;x++)history.record([note('a',x)]);
  assert.equal(history.undo()[0].x,3);assert.equal(history.undo()[0].x,2);assert.equal(history.undo(),null);
});

test('copy/paste retains embedded images and drawing geometry without sharing mutable points',()=>{
  const source=[{...note('image'),type:'image',src:'data:image/png;base64,AAAA'},
    {...note('draw',120),type:'drawing',color:'#386b56',strokeWidth:4,points:[[0,0],[30,40]]}];
  const copies=pasteCopies([],source,{x:300,y:500});
  assert.equal(copies[0].src,source[0].src);
  assert.deepEqual(copies[1].points,source[1].points);
  copies[1].points[0][0]=5;
  assert.equal(source[1].points[0][0],0);
});
