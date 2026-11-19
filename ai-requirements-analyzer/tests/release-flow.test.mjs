import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBoard} from '../static/board-model.mjs';
import {applyBoardOperations} from '../static/board-ai.mjs';
import {createBoardHistory,pasteCopies} from '../static/board-actions.mjs';

const note={id:'note',type:'note',title:'Release',body:'Exact text\nSecond line',x:-1000,y:700,width:300,height:150,pinned:false};
const image={...note,id:'image',type:'image',src:'data:image/png;base64,AAAA'};

test('export/import round trip retains every supported object type and protected pins',()=>{
  const cards=validateBoard({version:1,cards:[note,image,{...note,id:'req',type:'requirement',pinned:true},
    {...note,id:'decision',type:'decision'},{...note,id:'file',type:'file'},
    {...note,id:'shape',type:'shape',shape:'arrow',color:'#386b56',fill:'none',strokeWidth:4,reverseX:true},
    {...note,id:'draw',type:'drawing',color:'#386b56',strokeWidth:4,points:[[0,0],[200,100]]}]});
  const exported=JSON.stringify({version:1,cards});
  assert.deepEqual(validateBoard(JSON.parse(exported)),cards);
});
test('a complete AI batch undoes and redoes once without changing locked objects or image content',()=>{
  const original=[note,image,{...note,id:'locked',pinned:true}];
  const history=createBoardHistory(original);
  const changed=applyBoardOperations(original,[
    {action:'move',ids:['note','image'],dx:-4000,dy:2000},
    {action:'resize',ids:['image'],width:600,height:300},
    {action:'update',id:'note',changes:{body:'Revised text'}},
    {action:'add',card:{type:'note',title:'',body:'Hell yeah,',x:-3000,y:4000,width:260,height:260}},
  ]).cards;
  history.record(changed);
  assert.equal(changed.at(-1).body,'Hell yeah,');
  assert.equal(changed.at(-1).pinned,false);
  assert.deepEqual(changed.find(c=>c.id==='locked'),original[2]);
  assert.equal(changed.find(c=>c.id==='image').src,image.src);
  assert.deepEqual(history.undo(),original);
  assert.equal(history.canUndo,false);
  assert.deepEqual(history.redo(),changed);
});
test('pasting past the object limit rejects the entire group and preserves existing content',()=>{
  const original=Array.from({length:99},(_,i)=>({...note,id:`n${i}`}));
  const before=JSON.stringify(original);
  assert.throws(()=>pasteCopies(original,[note,image],{x:-5000,y:-6000}));
  assert.equal(JSON.stringify(original),before);
});
