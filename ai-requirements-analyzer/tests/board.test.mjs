import test from 'node:test';
import assert from 'node:assert/strict';
import {position,validateBoard,sampleProposal,applyProposal,filterCards,duplicateCard,loadBoard,saveBoard,resizeCard,restoreCard,zoomAtPoint,screenToWorld,fitBoardView} from '../static/board-model.mjs';

test('positions allow travel in every direction without artificial edges',()=>{
  assert.deepEqual(position(-20,5000),{x:-20,y:5000});
  assert.deepEqual(position(NaN,Infinity),{x:0,y:0});
});
test('import rejects malformed, oversized and duplicate cards',()=>{
  for(const data of [{}, {version:1,cards:'bad'}, {version:1,cards:Array(101).fill({})}, {version:1,cards:[{id:'same',type:'note',title:'a',body:'b',x:0,y:0},{id:'same',type:'note',title:'c',body:'d',x:0,y:0}]}]){
    assert.throws(()=>validateBoard(data));
  }
});
test('import preserves text and signed distant coordinates',()=>{
  const result=validateBoard({version:1,cards:[{id:'n1',type:'note',title:'<script>example</script>',body:'literal <b>text</b>',x:-50,y:99999,pinned:true}]});
  assert.equal(result[0].title,'<script>example</script>');
  assert.equal(result[0].body,'literal <b>text</b>');
  assert.deepEqual([result[0].x,result[0].y,result[0].pinned],[-50,99999,true]);
});
test('proposal leaves the board unchanged until applied',()=>{
  const cards=[{id:'requirement-speed',type:'requirement',title:'Response time',body:'The system should respond quickly.',x:400,y:60,pinned:false}];
  const proposal=sampleProposal(cards);
  assert.equal(cards[0].body,'The system should respond quickly.');
  assert.equal(proposal.length,2);
  const updated=applyProposal(cards,proposal);
  assert.match(updated[0].body,/agreed/);
  assert.equal(cards[0].body,'The system should respond quickly.');
  assert.equal(updated.length,2);
});
test('pinned cards are not rewritten by the sample proposal',()=>{
  const cards=[{id:'requirement-speed',type:'requirement',title:'Keep',body:'Original',x:0,y:0,pinned:true}];
  const updated=applyProposal(cards,sampleProposal(cards));
  assert.equal(updated[0].body,'Original');
  assert.ok(updated.length>1);
});

test('search matches title and body literally and combines with type',()=>{
  const cards=[{type:'note',title:'Goal',body:'Ask the stakeholder'},{type:'requirement',title:'Login',body:'Must ASK for consent'}];
  assert.deepEqual(filterCards(cards,' ASK ','requirement'),[cards[1]]);
  assert.deepEqual(filterCards(cards,'[x]','all'),[]);
  assert.deepEqual(filterCards(cards,'','all'),cards);
});

test('duplicate preserves content with a new ID and starts unpinned',()=>{
  const original={id:'one',type:'decision',title:'x'.repeat(120),body:'Approved text',x:1540,y:840,pinned:true};
  const copy=duplicateCard(original);
  assert.notEqual(copy.id,original.id);
  assert.equal(copy.title.length<=120,true);
  assert.equal(copy.body,original.body);
  assert.equal(copy.pinned,false);
  assert.deepEqual(position(copy.x,copy.y),{x:copy.x,y:copy.y});
  assert.equal(original.pinned,true);
});

test('board storage round trip preserves edits, empty boards and manual pins',()=>{
  let value=null;
  const storage={getItem:()=>value,setItem:(key,data)=>{value=data;}};
  assert.equal(loadBoard(storage),null);
  const cards=[{id:'one',type:'note',title:'<b>literal</b>',body:'Content',x:20,y:30,pinned:true}];
  saveBoard(storage,cards);
  assert.deepEqual(loadBoard(storage),cards);
  saveBoard(storage,[]);
  assert.deepEqual(loadBoard(storage),[]);
});

test('invalid or unavailable storage reports failure without overwriting existing data',()=>{
  let value='broken JSON';
  const storage={getItem:()=>value,setItem:(key,data)=>{value=data;}};
  assert.throws(()=>loadBoard(storage));
  assert.equal(value,'broken JSON');
  assert.throws(()=>saveBoard(storage,[{id:'invalid'}]));
  assert.equal(value,'broken JSON');
  assert.throws(()=>saveBoard({setItem(){throw new Error('Quota exceeded');}},[]),/Quota/);
  assert.throws(()=>loadBoard({getItem(){throw new Error('Access denied');}}),/Access/);
});

test('objects can move far beyond the former board in either direction',()=>{
  assert.deepEqual(position(99999,-99999,800,400),{x:99999,y:-99999});
});

test('visual objects survive board validation and duplicate without losing their content',()=>{
  const base={id:'visual',title:'Design',body:'',x:40,y:40,pinned:true,width:400,height:200};
  for(const extra of [
    {type:'shape',shape:'ellipse',color:'#386b56',fill:'#eef6e9',strokeWidth:4},
    {type:'drawing',points:[[0,0],[100,50],[400,200]],color:'#386b56',strokeWidth:4},
    {type:'image',src:'data:image/png;base64,aGVsbG8='},
  ]){
    const original=validateBoard({version:1,cards:[{...base,...extra}]})[0];
    assert.equal(original.width,400);assert.equal(original.height,200);
    const copy=validateBoard({version:1,cards:[duplicateCard(original)]})[0];
    assert.equal(copy.type,extra.type);assert.equal(copy.pinned,false);
    if(extra.points)assert.deepEqual(copy.points,extra.points);
    if(extra.src)assert.equal(copy.src,extra.src);
    if(extra.shape)assert.equal(copy.shape,extra.shape);
  }
});

test('image imports reject remote URLs, SVG and oversized encoded data',()=>{
  const image={id:'img',type:'image',title:'Image',body:'',x:0,y:0,width:400,height:200};
  for(const src of ['https://example.com/image.png','javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,'+'a'.repeat(1500001)]){
    assert.throws(()=>validateBoard({version:1,cards:[{...image,src}]}));
  }
});

test('drawings and shape properties must be finite, bounded and allowlisted',()=>{
  const item={id:'draw',type:'drawing',title:'Sketch',body:'',x:0,y:0,width:200,height:100,color:'#386b56',strokeWidth:3};
  for(const points of [[[0,0],[Infinity,20]],[[0,0],[-1,0]],Array(2001).fill([0,0]),[[0,0],[201,0]],[]]){
    assert.throws(()=>validateBoard({version:1,cards:[{...item,points}]}));
  }
  assert.throws(()=>validateBoard({version:1,cards:[{...item,type:'shape',shape:'script',fill:'none'}]}));
  assert.throws(()=>validateBoard({version:1,cards:[{...item,type:'shape',shape:'rectangle',fill:'url(https://example.com)'}]}));
});

test('resizing a drawing scales its stroke without moving its origin',()=>{
  const card={id:'stroke',type:'drawing',title:'Sketch',body:'',x:5900,y:3900,width:100,height:100,color:'#386b56',strokeWidth:4,points:[[0,0],[100,100]],pinned:false};
  const resized=resizeCard(card,400,200);
  assert.deepEqual(resized.points,[[0,0],[400,200]]);
  assert.deepEqual([resized.x,resized.y],[5900,3900]);
  assert.deepEqual(card.points,[[0,0],[100,100]]);
  assert.equal(validateBoard({version:1,cards:[resized]}).length,1);
});

test('a board cannot export more data than the import limit accepts',()=>{
  const cards=Array.from({length:7},(_,i)=>({id:`img${i}`,type:'image',title:'Image',body:'',x:0,y:0,width:200,height:200,src:'data:image/png;base64,'+'a'.repeat(1400000)}));
  assert.throws(()=>validateBoard({version:1,cards}),/8 MB/);
});

test('restoring a deleted image checks the complete board before changing it',()=>{
  const image=i=>({id:`img${i}`,type:'image',title:'Image',body:'',x:0,y:0,width:200,height:200,src:'data:image/png;base64,'+'a'.repeat(1350000)});
  const cards=Array.from({length:6},(_,i)=>image(i));
  assert.equal(validateBoard({version:1,cards}).length,6);
  assert.throws(()=>restoreCard(cards,{card:image(6),index:0}),/8 MB/);
  assert.equal(cards.length,6);assert.equal(cards[0].id,'img0');
  const restored=restoreCard([],{card:image(7),index:3});
  assert.equal(restored[0].id,'img7');
});

test('zoom keeps the board coordinate under the cursor fixed in both directions',()=>{
  for(const next of [.5,1.5]){
    const result=zoomAtPoint(1,next,800,500,200,150,900,600);
    assert.equal((result.left+200)/result.zoom,1000);
    assert.equal((result.top+150)/result.zoom,650);
  }
});

test('zoom limits scale without clamping camera travel',()=>{
  const low=zoomAtPoint(1,.001,0,0,200,150,900,600);
  assert.deepEqual(low,{zoom:.01,left:-198,top:-148.5});
  const high=zoomAtPoint(1,10,5100,3400,900,600,900,600);
  assert.deepEqual(high,{zoom:2,left:11100,top:7400});
});


test('zoom-out at the old origin stays anchored using a negative camera position',()=>{
  const result=zoomAtPoint(1,.5,0,0,320,240);
  assert.deepEqual(result,{zoom:.5,left:-160,top:-120});
  assert.deepEqual(screenToWorld(320,240,result),{x:320,y:240});
});

test('screen-to-world mapping supports negative and distant camera positions',()=>{
  assert.deepEqual(screenToWorld(100,200,{left:-1000,top:50000,zoom:.5}),{x:-1800,y:100400});
});

test('fit board leaves space for floating top controls and bottom toolbar',()=>{
  const cards=[{x:-10000,y:-20000,width:260,height:260},{x:6000,y:5000,width:400,height:300}];
  const camera=fitBoardView(cards,1200,800);
  for(const card of cards){
    assert.ok(card.x*camera.zoom-camera.left>=39.999);
    assert.ok(card.y*camera.zoom-camera.top>=79.999);
    assert.ok((card.x+card.width)*camera.zoom-camera.left<=1160.001);
    assert.ok((card.y+card.height)*camera.zoom-camera.top<=680.001);
  }
  assert.equal(fitBoardView([],1200,800).zoom,1);
});
