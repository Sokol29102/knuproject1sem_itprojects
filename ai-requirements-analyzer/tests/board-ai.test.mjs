import test from 'node:test';
import assert from 'node:assert/strict';
import {applyBoardOperations} from '../static/board-ai.mjs';
const note=(id,x=0,pinned=false)=>({id,type:'note',title:id,body:'text',x,y:0,width:200,height:100,pinned});

test('Gemini can add, move, resize, edit and delete objects in one atomic batch',()=>{
  const original=[note('one'),note('two',300)];
  const result=applyBoardOperations(original,[
    {action:'add',card:{type:'note',title:'Note',body:'Hell yeah,',x:20,y:200}},
    {action:'move',ids:['one','two'],dx:50,dy:30},
    {action:'resize',ids:['two'],width:400,height:200},
    {action:'update',id:'one',changes:{title:'Updated',body:'Exact text'}},
    {action:'delete',ids:['two']},
  ]);
  assert.equal(result.cards.length,2);
  assert.deepEqual([result.cards[0].x,result.cards[0].y,result.cards[0].body],[50,30,'Exact text']);
  assert.equal(result.cards[1].body,'Hell yeah,');assert.equal(result.cards[1].pinned,false);
  assert.equal(original[0].x,0);assert.equal(original.length,2);
});
test('a bad, stale, or pinned target rejects the whole batch without partial additions',()=>{
  const original=[note('locked',0,true)];
  for(const operation of [{action:'delete',ids:['locked']},{action:'move',ids:['missing'],dx:1,dy:0},
    {action:'update',id:'locked',changes:{body:'overwrite'}},{action:'resize',ids:['locked'],width:200,height:100}]){
    assert.throws(()=>applyBoardOperations(original,[{action:'add',card:{type:'note',title:'New',body:'new'}},operation]));
    assert.equal(original.length,1);assert.equal(original[0].body,'text');
  }
});
test('geometry is finite and bounded, protected fields and unknown operations are rejected',()=>{
  const original=[note('one')];
  for(const operation of [{action:'move',ids:['one'],dx:Infinity,dy:0},{action:'resize',ids:['one'],width:1,height:100},
    {action:'update',id:'one',changes:{pinned:false}},{action:'delete',ids:[]},{action:'execute',code:'bad'}]){
    assert.throws(()=>applyBoardOperations(original,[operation]));
  }
});
test('resizing drawings scales points and preserves image data',()=>{
  const original=[{...note('draw'),type:'drawing',color:'#386b56',strokeWidth:4,points:[[10,10],[100,50]]},
    {...note('image'),type:'image',src:'data:image/png;base64,AAAA'}];
  const result=applyBoardOperations(original,[{action:'resize',ids:['draw','image'],width:400,height:200}]);
  assert.deepEqual(result.cards[0].points,[[20,20],[200,100]]);
  assert.equal(result.cards[1].src,original[1].src);
});
test('layout changes preserve the 100-object limit and reject coordinate overflow',()=>{
  assert.throws(()=>applyBoardOperations(Array.from({length:100},(_,i)=>note('n'+i)),[{action:'add',card:{type:'note',title:'extra',body:''}}]));
  assert.throws(()=>applyBoardOperations([note('one',Number.MAX_VALUE)],[{action:'move',ids:['one'],dx:Number.MAX_VALUE,dy:0}]));
});
