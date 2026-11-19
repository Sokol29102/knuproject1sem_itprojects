import {validateBoard} from './board-model.mjs?v=20261119-theme-circle';

export function selectInRectangle(cards,start,end){
  const left=Math.min(start.x,end.x),right=Math.max(start.x,end.x),top=Math.min(start.y,end.y),bottom=Math.max(start.y,end.y);
  return cards.filter(c=>c.x<=right&&c.x+(c.width??260)>=left&&c.y<=bottom&&c.y+(c.height??260)>=top).map(c=>c.id);
}
export function moveSelected(cards,ids,dx,dy){
  return cards.map(c=>ids.has(c.id)&&!c.pinned?{...c,x:c.x+dx,y:c.y+dy}:c);
}
export function pasteCopies(cards,source,point){
  const checked=validateBoard({version:1,cards:source});
  if(!checked.length)return cards;
  const x=Math.min(...checked.map(c=>c.x)),y=Math.min(...checked.map(c=>c.y));
  return validateBoard({version:1,cards:[...cards,...checked.map(c=>({...c,id:crypto.randomUUID(),x:c.x-x+point.x,y:c.y-y+point.y,pinned:false}))]});
}
export function createBoardHistory(cards,{maxEntries=50,maxBytes=32*1024*1024}={}){
  let current=JSON.stringify(cards),past=[],future=[];
  const trim=()=>{while(past.length>maxEntries||past.reduce((n,s)=>n+s.length*2,0)>maxBytes)past.shift();};
  return {
    get canUndo(){return past.length>0;},get canRedo(){return future.length>0;},
    reset(next){current=JSON.stringify(next);past=[];future=[];},
    record(next){const value=JSON.stringify(next);if(value===current)return;past.push(current);current=value;future=[];trim();},
    undo(){if(!past.length)return null;future.push(current);current=past.pop();return JSON.parse(current);},
    redo(){if(!future.length)return null;past.push(current);current=future.pop();trim();return JSON.parse(current);},
  };
}

export function installBoardActions({viewport,canvas,getCards,setCards,render,persist,getCamera,getProjectEpoch,newObjectPosition,clearFilters}){
  const history=createBoardHistory(getCards());let selected=new Set(),pasteCount=0,cursor=null,gesture=null;
  const button=id=>document.getElementById(id);
  const active=event=>document.body.classList.contains('board-mode')&&!!window.projectNavigation?.projectId&&!document.querySelector('dialog[open]')&&!event.target.closest?.('input,textarea,select,[contenteditable="true"],#discussion,dialog');
  viewport.tabIndex=0;viewport.setAttribute('aria-label','Project canvas. Drag empty space to select objects.');
  function refresh(){
    const cards=getCards();selected=new Set([...selected].filter(id=>cards.some(c=>c.id===id)));
    for(const element of canvas.querySelectorAll('[data-card]')){const chosen=selected.has(element.dataset.card);element.classList.toggle('selected',chosen);element.setAttribute('aria-label',`${getCards().find(c=>c.id===element.dataset.card)?.title??'Object'}${chosen?' · selected':''}`);}
    button('undo-board').disabled=!history.canUndo;button('redo-board').disabled=!history.canRedo;
    button('delete-selected').disabled=!cards.some(c=>selected.has(c.id)&&!c.pinned);
    button('copy-selected').disabled=!selected.size;
    button('selection-status').textContent=selected.size?`${selected.size} selected${cards.some(c=>selected.has(c.id)&&c.pinned)?' · pinned objects stay locked':''}`:'';
  }
  function select(ids){selected=new Set(ids);refresh();}
  function focus(){viewport.focus({preventScroll:true});}
  function applyHistory(next){
    if(!next)return;
    const previousIds=new Set(getCards().map(c=>c.id)),restored=next.filter(c=>!previousIds.has(c.id)).map(c=>c.id);
    if(restored.length)selected=new Set(restored);
    setCards(next);clearFilters();render();persist(false);focus();
  }
  function remove(ids=selected){
    const before=getCards(),next=before.filter(c=>!ids.has(c.id)||c.pinned);
    if(next.length===before.length){window.toast('Unpin the selected objects before deleting them.');return false;}
    setCards(next);render();persist();focus();return true;
  }
  const selection=()=>getCards().filter(c=>selected.has(c.id));
  const prefix='AI_REQUIREMENTS_BOARD\n';
  function copyText(){return prefix+JSON.stringify({version:1,cards:selection()});}
  function pasteText(text){
    if(!text.startsWith(prefix))return false;
    gesture?.();
    try{
      if(text.length>8*1024*1024+100)throw new Error('The copied board objects exceed the size limit.');
      const source=validateBoard(JSON.parse(text.slice(prefix.length)));
      const camera=getCamera(),start=cursor?{x:(cursor.x+camera.left)/camera.zoom,y:(cursor.y+camera.top)/camera.zoom}:newObjectPosition();const point={x:start.x+24*pasteCount,y:start.y+24*pasteCount};
      const before=getCards(),next=pasteCopies(before,source,point);pasteCount++;
      if(next.length===before.length)return true;
      setCards(next);clearFilters();selected=new Set(next.slice(before.length).map(c=>c.id));render();persist();focus();
    }catch(error){window.toast(error.message||'These copied objects could not be pasted.');}
    return true;
  }
  document.addEventListener('copy',event=>{
    if(!active(event)||!selected.size||window.getSelection()?.toString())return;
    if(!event.clipboardData)return;event.clipboardData.setData('text/plain',copyText());event.preventDefault();pasteCount=1;
  });
  document.addEventListener('paste',event=>{
    if(!active(event))return;const text=event.clipboardData?.getData('text/plain')??'';
    if(pasteText(text))event.preventDefault();
  });
  button('copy-selected').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(copyText());pasteCount=1;window.toast('Selected objects copied. Paste with Ctrl+V.');}catch{window.toast('Use Ctrl+C to copy the selected objects.');}});
  button('paste-objects').addEventListener('click',async()=>{
    const epoch=getProjectEpoch();try{const text=await navigator.clipboard.readText();if(epoch!==getProjectEpoch())return;if(!pasteText(text))window.toast('Copy board objects first, then paste them here.');}catch{window.toast('Point at the board and press Ctrl+V to paste copied objects.');}
  });
  button('undo-board').addEventListener('click',()=>applyHistory(history.undo()));
  button('redo-board').addEventListener('click',()=>applyHistory(history.redo()));
  button('delete-selected').addEventListener('click',()=>remove());
  document.addEventListener('keydown',event=>{
    if(!active(event)||gesture)return;
    const modifier=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();
    if(modifier&&key==='z'){event.preventDefault();applyHistory(event.shiftKey?history.redo():history.undo());}
    else if(modifier&&key==='y'){event.preventDefault();applyHistory(history.redo());}
    else if(modifier&&key==='a'){event.preventDefault();select([...canvas.querySelectorAll('[data-card]')].map(el=>el.dataset.card));}
    else if(event.key==='Delete'||event.key==='Backspace'){if(selected.size){event.preventDefault();remove();}}
    else if(event.key==='Escape'){select([]);}
    else if(!modifier&&selected.size&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();const step=event.shiftKey?50:10,delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];
      setCards(moveSelected(getCards(),selected,...delta));render();persist();focus();
    }
  });
  function world(event){const rect=viewport.getBoundingClientRect(),camera=getCamera();return {x:(event.clientX-rect.left+camera.left)/camera.zoom,y:(event.clientY-rect.top+camera.top)/camera.zoom};}
  viewport.addEventListener('pointermove',event=>{if(!event.buttons){const rect=viewport.getBoundingClientRect();cursor={x:event.clientX-rect.left,y:event.clientY-rect.top};}});
  viewport.addEventListener('pointerdown',event=>{
    if(event.button!==0||viewport.dataset.tool!=='select'||event.target.closest('button:not(.card-handle),input,textarea,a,select,.object-resize'))return;
    const object=event.target.closest('[data-card]'),id=object?.dataset.card;
    const original=getCards(),initial=new Set(selected),start=world(event),epoch=getProjectEpoch();let moved=false,box=null;
    event.preventDefault();window.getSelection()?.removeAllRanges();focus();viewport.setPointerCapture(event.pointerId);
    if(id){
      if(event.shiftKey){selected.has(id)?selected.delete(id):selected.add(id);refresh();if(!selected.has(id))return;}
      else if(!selected.has(id))select([id]);
    }else{
      if(!event.shiftKey)select([]);box=document.createElement('div');box.className='board-selection-box';viewport.append(box);
    }
    function move(e){
      if(epoch!==getProjectEpoch())return;
      const point=world(e);moved||=Math.hypot(e.clientX-event.clientX,e.clientY-event.clientY)>2;
      if(id){
        if(!moved)return;setCards(moveSelected(original,selected,point.x-start.x,point.y-start.y));
        for(const card of getCards()){const el=canvas.querySelector(`[data-card="${card.id}"]`);if(el){el.style.left=`${card.x}px`;el.style.top=`${card.y}px`;}}
      }else{
        const rect=viewport.getBoundingClientRect();Object.assign(box.style,{left:`${Math.min(e.clientX,event.clientX)-rect.left}px`,top:`${Math.min(e.clientY,event.clientY)-rect.top}px`,width:`${Math.abs(e.clientX-event.clientX)}px`,height:`${Math.abs(e.clientY-event.clientY)}px`});
        const visibleIds=new Set([...canvas.querySelectorAll('[data-card]')].map(el=>el.dataset.card));
        select([...(event.shiftKey?initial:[]),...selectInRectangle(original.filter(c=>visibleIds.has(c.id)),start,point)]);
      }
    }
    function finish(e){
      viewport.removeEventListener('pointermove',move);viewport.removeEventListener('pointerup',finish);viewport.removeEventListener('pointercancel',finish);box?.remove();gesture=null;
      if(epoch!==getProjectEpoch())return;
      if(e.type==='pointercancel'){if(id)setCards(original);else selected=initial;render();return;}
      if(id&&moved){render();persist();}refresh();
    }
    gesture=()=>finish({type:'pointercancel'});
    viewport.addEventListener('pointermove',move);viewport.addEventListener('pointerup',finish);viewport.addEventListener('pointercancel',finish);refresh();
  });
  return {refresh,select,remove,getSelectedIds:()=>[...selected],record(cards){history.record(cards);refresh();},
    cancel(){gesture?.();},reset(cards){gesture?.();history.reset(cards);selected.clear();pasteCount=0;cursor=null;refresh();}};
}
