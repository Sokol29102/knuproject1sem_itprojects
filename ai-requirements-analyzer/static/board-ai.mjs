import {validateBoard,resizeCard} from './board-model.mjs?v=20261119-theme-circle';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const allowedChanges=new Set(['title','body','x','y','width','height','color','strokeWidth','fill']);

export function applyBoardOperations(cards,operations,{origin={x:0,y:0}}={}){
  if(!Array.isArray(operations)||operations.length>100)throw new Error('Gemini returned too many board operations.');
  let next=validateBoard({version:1,cards}),added=0,updated=new Set(),deleted=new Set(),affected=new Set();
  function targets(ids){
    if(!Array.isArray(ids)||!ids.length||ids.length>100||new Set(ids).size!==ids.length)throw new Error('Invalid target selection.');
    return ids.map(id=>{const card=next.find(c=>c.id===id);if(!card)throw new Error('A target object no longer exists. Ask Gemini again.');if(card.pinned)throw new Error('Pinned objects stay locked. Unpin them before asking Gemini to change them.');return card;});
  }
  function change(card,values){
    if(!values||Object.keys(values).some(k=>!allowedChanges.has(k)))throw new Error('Gemini attempted an unsupported object change.');
    const changes=Object.fromEntries(Object.entries(values).filter(([,v])=>v!==null&&v!==undefined));
    if(!Object.keys(changes).length)throw new Error('No object changes were provided.');
    for(const key of ['x','y','width','height','strokeWidth'])if(key in changes&&!finite(changes[key]))throw new Error('Object geometry must be finite.');
    if(('width' in changes&&(changes.width<24||changes.width>1600))||('height' in changes&&(changes.height<24||changes.height>1600)))throw new Error('Object dimensions must stay between 24 and 1,600.');
    const resized=('width' in changes||'height' in changes)?resizeCard(card,changes.width??card.width??260,changes.height??card.height??260):card;
    Object.assign(card,resized,changes);updated.add(card.id);affected.add(card.id);
  }
  for(const operation of operations){
    if(operation.action==='add'){
      const source=operation.card;
      if(!source||!['note','requirement','decision','shape'].includes(source.type))throw new Error('Unsupported new object type.');
      const card={id:crypto.randomUUID(),type:source.type,title:source.title??'',body:source.body??'',x:source.x??origin.x+added*40,y:source.y??origin.y+added*40,width:source.width??260,height:source.height??260,pinned:false};
      if(!finite(card.x)||!finite(card.y))throw new Error('Object positions must be finite.');
      if(source.type==='shape')Object.assign(card,{shape:source.shape,color:source.color??'#386b56',strokeWidth:source.strokeWidth??4,fill:source.fill??'none',reverseX:false,reverseY:false});
      next.push(card);affected.add(card.id);added++;
    }else if(operation.action==='delete'){
      const items=targets(operation.ids);for(const card of items){deleted.add(card.id);affected.delete(card.id);}const ids=new Set(operation.ids);next=next.filter(c=>!ids.has(c.id));
    }else if(operation.action==='move'){
      if(!finite(operation.dx)||!finite(operation.dy))throw new Error('Movement must be finite.');
      for(const card of targets(operation.ids))change(card,{x:card.x+operation.dx,y:card.y+operation.dy});
    }else if(operation.action==='resize'){
      for(const card of targets(operation.ids))change(card,{width:operation.width,height:operation.height});
    }else if(operation.action==='update'){
      change(targets([operation.id])[0],operation.changes);
    }else throw new Error('Unsupported Gemini board operation.');
  }
  next=validateBoard({version:1,cards:next});
  return {cards:next,selectedIds:[...affected].filter(id=>next.some(c=>c.id===id)),added,updated:updated.size,deleted:deleted.size};
}
