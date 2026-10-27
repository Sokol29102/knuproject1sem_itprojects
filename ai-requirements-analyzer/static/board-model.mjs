// World coordinates are independent of the visible window; there is no board edge.
export function zoomAtPoint(current,next,left,top,x,y){
  const zoom=Math.max(.01,Math.min(2,next));
  return {zoom,left:(left+x)*zoom/current-x,top:(top+y)*zoom/current-y};
}
export function screenToWorld(x,y,{left,top,zoom}){
  return {x:(left+x)/zoom,y:(top+y)/zoom};
}
export function fitBoardView(cards,width,height){
  if(!cards.length)return {zoom:1,left:-width/2,top:-height/2};
  const minX=Math.min(...cards.map(c=>c.x)),minY=Math.min(...cards.map(c=>c.y));
  const maxX=Math.max(...cards.map(c=>c.x+(c.width??260))),maxY=Math.max(...cards.map(c=>c.y+(c.height??260)));
  const zoom=Math.max(.01,Math.min(1,Math.max(1,width-80)/Math.max(1,maxX-minX),Math.max(1,height-200)/Math.max(1,maxY-minY)));
  return {zoom,left:(minX+maxX)*zoom/2-width/2,top:(minY+maxY)*zoom/2-(height-40)/2};
}
export function position(x,y){
  return {x:Number.isFinite(x)?x:0,y:Number.isFinite(y)?y:0};
}
export function filterCards(cards, query, type) {
  const term=query.trim().toLowerCase();
  return cards.filter(card=>(type==='all'||card.type===type) && `${card.title}\n${card.body}`.toLowerCase().includes(term));
}
export function duplicateCard(card) {
  return {...card,id:crypto.randomUUID(),title:`${card.title.slice(0,113)} (copy)`,...position(card.x+30,card.y+30,card.width,card.height),pinned:false};
}
export function resizeCard(card,width,height){
  const updated={...card,width,height,...position(card.x,card.y,width,height)};
  if(card.type==='drawing')updated.points=card.points.map(([x,y])=>[Math.min(width,x*width/card.width),Math.min(height,y*height/card.height)]);
  return updated;
}
export function restoreCard(cards,{card,index}){
  const restored=[...cards];restored.splice(Math.min(index,cards.length),0,card);
  return validateBoard({version:1,cards:restored});
}
const STORAGE_KEY='ai-requirements-analyzer:library:board:v1';
export function loadBoard(storage) {
  const value=storage.getItem(STORAGE_KEY);
  return value===null ? null : validateBoard(JSON.parse(value));
}
export function saveBoard(storage, cards) {
  storage.setItem(STORAGE_KEY,JSON.stringify({version:1,cards:validateBoard({version:1,cards})}));
}
export function validateBoard(data){
  if(data?.version!==1||!Array.isArray(data.cards)||data.cards.length>100)throw new Error('Choose a version 1 board with at most 100 objects.');
  const ids=new Set();
  const validColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
  const cards=data.cards.map(card=>{
    if(!card||typeof card.id!=='string'||!(/^[\w-]{1,80}$/).test(card.id)||ids.has(card.id)||!['note','requirement','decision','file','shape','drawing','image'].includes(card.type)||typeof card.title!=='string'||card.title.length>120||typeof card.body!=='string'||card.body.length>12000)throw new Error('This board contains invalid or duplicate objects.');
    ids.add(card.id);
    const visual=['shape','drawing','image'].includes(card.type);
    const width=card.width??260,height=card.height??260;
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<24||height<24||width>1600||height>1600)throw new Error('Object dimensions must be between 24 and 1,600 pixels.');
    const result={id:card.id,type:card.type,title:card.title,body:card.body,...position(card.x,card.y,width,height),pinned:card.pinned===true};
    if(visual||card.width!==undefined||card.height!==undefined)Object.assign(result,{width,height});
    if(card.type==='shape'||card.type==='drawing'){
      if(!validColor(card.color)||!Number.isFinite(card.strokeWidth)||card.strokeWidth<1||card.strokeWidth>16)throw new Error('Choose a valid drawing color and line width.');
      Object.assign(result,{color:card.color,strokeWidth:card.strokeWidth});
    }
    if(card.type==='shape'){
      if(!['rectangle','ellipse','arrow'].includes(card.shape)||!(card.fill==='none'||validColor(card.fill)))throw new Error('Unsupported shape or fill.');
      Object.assign(result,{shape:card.shape,fill:card.fill,reverseX:card.reverseX===true,reverseY:card.reverseY===true});
    }
    if(card.type==='drawing'){
      if(!Array.isArray(card.points)||card.points.length<2||card.points.length>2000||card.points.some(p=>!Array.isArray(p)||p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||p[0]<0||p[0]>width||p[1]<0||p[1]>height))throw new Error('Drawing points are invalid or exceed the 2,000-point limit.');
      result.points=card.points.map(p=>[...p]);
    }
    if(card.type==='image'){
      if(typeof card.src!=='string'||card.src.length>1500000||!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i.test(card.src))throw new Error('Use an embedded PNG, JPEG or WebP image within the image size limit.');
      result.src=card.src;
    }
    return result;
  });
  if(new TextEncoder().encode(JSON.stringify({version:1,cards})).length>8*1024*1024)throw new Error('This board exceeds the 8 MB project-file limit. Remove an image or use a smaller one.');
  return cards;
}
export function sampleProposal(cards) {
  const target=cards.find(card=>card.id==='requirement-speed' && !card.pinned);
  const draft={id:crypto.randomUUID(),type:'requirement',title:'Response-time draft',body:'The analyzer shall return findings within [agreed target] for [agreed input size] under [agreed load]. Draft only — confirm all values with the stakeholder.',x:700,y:360,pinned:false};
  return [target?{action:'update',id:target.id,before:target.body,card:{...target,body:draft.body}}:{action:'add',card:draft}, {action:'add',card:{id:crypto.randomUUID(),type:'note',title:'Clarification still needed',body:'Confirm the analysis-time target, input size and expected load. This sample proposal does not invent or approve values.',x:1020,y:100,pinned:false}}];
}
export function applyProposal(cards, proposal) {
  let updated=cards.map(card=>({...card}));
  for(const change of proposal) {
    if(change.action==='add') updated.push({...change.card});
    else updated=updated.map(card=>card.id===change.id && !card.pinned && card.body===change.before ? {...change.card}:card);
  }
  return validateBoard({version:1,cards:updated});
}
