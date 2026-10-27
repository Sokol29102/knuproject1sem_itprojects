import {renderVisual,installVisualTools} from './board-visuals.js';
import {position,validateBoard,sampleProposal,applyProposal,filterCards,duplicateCard,loadBoard,saveBoard,resizeCard,restoreCard,zoomAtPoint,screenToWorld,fitBoardView} from './board-model.mjs';

const seed=()=>[
 {id:'project-brief',type:'note',title:'The project at a glance',body:'AI Requirements Analyzer for students, junior analysts and small software teams.\n\nGoal: turn rough ideas into clear, reviewable requirements through dialogue and shared project context.',x:40,y:65,pinned:false},
 {id:'requirement-speed',type:'requirement',title:'Response time',body:'The analyzer should review requirements quickly.\n\nOpen question: what input size, analysis time and expected load?',x:340,y:95,pinned:false},
 {id:'source-file',type:'file',title:'analyzer-requirements.txt',body:'Sample source · 6 statements\n\nUsers can paste requirements or upload a UTF-8 TXT file. Reviewers inspect findings linked to the original text.\n\nAttach your own TXT or Markdown file to keep source text on this board.',x:650,y:55,pinned:false},
 {id:'open-questions',type:'note',title:'Questions for the stakeholder',body:'What does useful clarification look like?\n\nWhat project information should be saved?\n\nHow long may analysis take?',x:95,y:375,pinned:false},
 {id:'scope-decision',type:'decision',title:'First delivery',body:'Sprint 1: text/TXT input, validation and preview.\n\nSprint 2: AI findings and clarification questions.\n\nLater: live dialogue and model board edits.',x:410,y:395,pinned:false},
];
let cards=seed();let zoom=1;let camera={left:0,top:0};let viewInitialized=false;let editing=null;let proposal=[];
let deletedCards=[];
let storageMessage='Not saved yet — changes save in this browser';
let storageFailed=false;
try{
  const saved=loadBoard(window.localStorage);
  if(saved!==null){cards=saved;storageMessage='Restored from this browser';}
}catch(error){storageMessage='Saved board unavailable. Showing sample cards; export before leaving. Editing will retry saving.';storageFailed=true;}
function persistBoard(){
  try{saveBoard(window.localStorage,cards);storageMessage='Saved in this browser';storageFailed=false;}
  catch(error){storageMessage='Could not save in this browser. Export your board to keep changes.';storageFailed=true;}
  updateSaveStatus();
}
function updateSaveStatus(){
  const status=document.querySelector('#board-save-status');
  status.textContent=storageMessage;status.classList.toggle('save-error',storageFailed);
}
function clearFilters(){document.querySelector('#board-search').value='';document.querySelector('#board-type-filter').value='all';}
function newObjectPosition(width=260,height=260){
  return screenToWorld((viewport.clientWidth-width*zoom)/2,80+(viewport.clientHeight-200-height*zoom)/2,{...camera,zoom});
}
function revealCard(card){
  clearFilters();renderBoard();
  const fit=fitBoardView([card],viewport.clientWidth,viewport.clientHeight);zoom=Math.min(zoom,fit.zoom);
  camera={left:(card.x+(card.width??260)/2)*zoom-viewport.clientWidth/2,top:(card.y+(card.height??260)/2)*zoom-(viewport.clientHeight-40)/2};renderCamera();
}
function fitCurrentBoard(){
  clearFilters();renderBoard();const fit=fitBoardView(cards,viewport.clientWidth,viewport.clientHeight);zoom=fit.zoom;camera={left:fit.left,top:fit.top};renderCamera();
}

const section=document.createElement('section');section.id='board-view';section.className='view';section.hidden=true;section.setAttribute('aria-label','Project board');
section.innerHTML=`<div class="board-top"><div class="board-identity"><a href="#projects" aria-label="All projects">← Projects</a><span class="board-title">AI Requirements Analyzer</span><span class="board-local">LOCAL BOARD</span></div><div class="board-top-actions"><span id="board-save-status" role="status"></span><details name="board-ui" class="board-menu"><summary aria-label="Board search and actions">☰ Board</summary><div class="board-menu-panel"><label>Search objects<input id="board-search" type="search" placeholder="Find a title or text…"></label><label>Type<select id="board-type-filter"><option value="all">All objects</option><option value="note">Notes</option><option value="requirement">Requirements</option><option value="decision">Decisions</option><option value="file">Files</option><option value="shape">Shapes</option><option value="drawing">Drawings</option><option value="image">Images</option></select></label><span id="board-results" role="status"></span><button id="fit-board">⤢ Fit board</button><button id="export-board">↓ Export board</button><button id="import-board">↑ Import board</button><button id="propose-board">✦ Sample model proposal</button><button data-view="history" id="board-history">◷ Illustrative history</button><div id="board-menu-reset"></div><small id="board-count"></small></div></details></div></div>
<div id="board-viewport" class="board-viewport"><div id="board-space"><div id="board-canvas" class="board-canvas" aria-label="Project canvas"></div></div></div>
<div class="canvas-dock" role="toolbar" aria-label="Board tools"><button data-board-tool="select" title="Select and move objects" aria-label="Select" aria-pressed="true">↖<span>Select</span></button><button data-board-tool="pan" title="Drag to pan" aria-label="Pan">✥<span>Pan</span></button><i></i><details name="board-ui" class="dock-menu"><summary title="Add a card">＋<span>Card</span></summary><div class="dock-menu-panel"><button id="add-note">Note</button><button id="add-requirement">Requirement</button><button id="add-decision">Decision</button><button id="attach-info">File</button></div></details><button data-board-tool="rectangle" title="Draw a rectangle" aria-label="Rectangle">□<span>Rectangle</span></button><button data-board-tool="ellipse" title="Draw a circle or ellipse" aria-label="Ellipse">○<span>Ellipse</span></button><button data-board-tool="arrow" title="Draw an arrow" aria-label="Arrow">↗<span>Arrow</span></button><button data-board-tool="drawing" title="Freehand drawing" aria-label="Draw">✎<span>Draw</span></button><button id="add-image" title="Upload an image" aria-label="Add image">▧<span>Image</span></button><details name="board-ui" class="dock-menu"><summary title="Drawing style">◉<span>Style</span></summary><div class="dock-menu-panel paint-settings"><label>Line color<input id="paint-color" type="color" value="#386b56"></label><label>Line width<select id="paint-width"><option value="2">Fine</option><option value="4" selected>Medium</option><option value="8">Bold</option></select></label><label class="fill-toggle"><input id="shape-fill" type="checkbox"> Fill shapes</label></div></details><i></i><button id="undo-delete" title="Restore last deleted object" aria-label="Undo delete" disabled>↶<span>Restore</span></button></div>
<div class="board-corner"><span id="board-tool-hint"></span><label>Zoom<select id="board-zoom"><option value="0.01">1%</option><option value="0.05">5%</option><option value="0.1">10%</option><option value="0.25">25%</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1" selected>100%</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option></select></label></div>
<input id="board-info-file" type="file" hidden><input id="board-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden><input id="board-json-file" type="file" accept=".json,application/json" hidden>
<dialog id="card-editor" class="board-dialog"><form id="card-form"><span class="section-kicker">BOARD CARD</span><h2 id="editor-heading">Edit a card</h2><label>Card type<select id="card-type"><option value="note">Note</option><option value="requirement">Requirement</option><option value="decision">Decision</option><option value="file">File information</option><option value="shape" disabled>Shape</option><option value="drawing" disabled>Drawing</option><option value="image" disabled>Image</option></select></label><label>Title<input id="card-title" maxlength="120" required></label><label>Content<textarea id="card-body" rows="7" maxlength="12000"></textarea></label><fieldset id="object-style"><legend>Appearance</legend><label>Line color<input id="object-color" type="color" value="#386b56"></label><label>Line width<input id="object-line-width" type="number" min="1" max="16" value="4"></label><label id="object-fill-label"><input id="object-fill" type="checkbox"> Fill shape</label></fieldset><div class="object-dimensions"><label>Width<input id="object-width" type="number" min="24" max="1600" value="260" required></label><label>Height<input id="object-height" type="number" min="24" max="1600" value="260" required></label></div><div class="dialog-buttons"><button id="delete-card" type="button" class="delete-button">Delete card</button><button id="cancel-card" type="button" class="button secondary">Cancel</button><button type="submit" class="button primary">Save card</button></div></form></dialog>
<dialog id="model-proposal" class="board-dialog proposal-dialog"><span class="section-kicker">SIMULATED MODEL ACTION</span><h2>Review the proposed board changes.</h2><p>No model is connected. This sample shows how suggested edits could be reviewed before they touch your board. Pinned cards stay protected.</p><div id="proposal-changes"></div><div class="dialog-buttons"><button id="reject-proposal" class="button secondary">Discard proposal</button><button id="apply-proposal" class="button primary">Apply sample changes</button></div></dialog>`;
document.querySelector('main').append(section);
document.querySelector('#board-menu-reset').append(document.querySelector('#reset-demo'));
document.querySelector('.board-top-actions').append(document.querySelector('#open-discussion'));
document.querySelector('#board-history').addEventListener('click',()=>window.showView('history'));

const nav=document.createElement('button');nav.className='nav-item';nav.dataset.view='board';nav.setAttribute('aria-label','Project board');nav.innerHTML='<span aria-hidden="true">▦</span><span class="sidebar-copy">Project board</span>';nav.addEventListener('click',()=>window.showView('board'));document.querySelector('nav[aria-label="Project navigation"]').prepend(nav);
const canvas=document.querySelector('#board-canvas');const viewport=document.querySelector('#board-viewport');
const editor=document.querySelector('#card-editor');const modelDialog=document.querySelector('#model-proposal');

function renderBoard(save=false){
  const focused=document.activeElement;
  const focusedCard=canvas.contains(focused)?focused.closest('[data-card]'):null;
  const focusId=focusedCard?.dataset.card;
  const focusClass=focused?.classList.contains('card-duplicate')?'card-duplicate':focused?.classList.contains('card-pin')?'card-pin':focused?.classList.contains('card-handle')?'card-handle':'card-edit';
  canvas.replaceChildren();
  const visible=filterCards(cards,document.querySelector('#board-search').value,document.querySelector('#board-type-filter').value);
  for(const card of visible){
    const visual=['shape','drawing','image'].includes(card.type);
    const article=document.createElement('article');article.className=`board-card ${card.type}${card.pinned?' pinned':''}`;article.dataset.card=card.id;article.style.width=`${card.width??260}px`;article.style.height=`${card.height??260}px`;if(visual)article.classList.add('visual-object');article.style.left=`${card.x}px`;article.style.top=`${card.y}px`;
    const header=document.createElement('div');header.className='board-card-header';
    const handle=document.createElement('button');handle.type='button';handle.className='card-handle';handle.textContent=`${card.type.toUpperCase()} ${card.pinned?'· PINNED':'· DRAG'}`;handle.setAttribute('aria-label',`Move ${card.title}`);handle.title='Drag to move, or use arrow keys (Shift for larger steps)';handle.setAttribute('aria-disabled',String(card.pinned));
    const pin=document.createElement('button');pin.className='card-pin';pin.textContent=card.pinned?'◆':'◇';pin.setAttribute('aria-label',`${card.pinned?'Unpin':'Pin'} ${card.title}`);pin.addEventListener('click',()=>{card.pinned=!card.pinned;renderBoard(true);});
    header.append(handle,pin);const title=document.createElement('h3');title.textContent=card.title;const body=document.createElement('p');body.className='board-card-body';body.textContent=card.body;
    const edit=document.createElement('button');edit.className='card-edit';edit.textContent=visual?'Edit / resize':'Edit card ↗';edit.setAttribute('aria-label',`Edit ${card.title}`);edit.addEventListener('click',()=>editCard(card));
    const duplicate=document.createElement('button');duplicate.className='card-duplicate';duplicate.textContent='Duplicate';duplicate.setAttribute('aria-label',`Duplicate ${card.title}`);duplicate.addEventListener('click',()=>addCard(duplicateCard(card)));
    const actions=document.createElement('div');actions.className='board-card-actions';actions.append(edit,duplicate);
    if(visual){const art=document.createElement('div');art.className='object-art';art.append(renderVisual(card));if(card.body){const caption=document.createElement('span');caption.className='visual-caption';caption.textContent=card.body;art.append(caption);}article.append(art,header,actions);}
    else article.append(header,title,body,actions);
    const resize=document.createElement('button');resize.type='button';resize.className='object-resize';resize.setAttribute('aria-label',`Resize ${card.title}`);resize.title='Drag to resize, or use Edit / resize';resize.textContent='◢';article.append(resize);
    resize.addEventListener('click',event=>{if(event.detail===0)editCard(card);});
    resize.addEventListener('pointerdown',event=>{
      if(card.pinned||event.button!==0)return;
      event.preventDefault();event.stopPropagation();resize.setPointerCapture(event.pointerId);
      const startX=event.clientX,startY=event.clientY,original={...card},width=card.width??260,height=card.height??260;
      let nextWidth=width,nextHeight=height;
      const move=e=>{nextWidth=Math.round(Math.max(24,Math.min(1600,width+(e.clientX-startX)/zoom)));nextHeight=Math.round(Math.max(24,Math.min(1600,height+(e.clientY-startY)/zoom)));article.style.width=`${nextWidth}px`;article.style.height=`${nextHeight}px`;};
      const finish=e=>{resize.removeEventListener('pointermove',move);resize.removeEventListener('pointerup',finish);resize.removeEventListener('pointercancel',finish);if(e.type!=='pointercancel')Object.assign(card,resizeCard(original,nextWidth,nextHeight));renderBoard(e.type!=='pointercancel');};
      resize.addEventListener('pointermove',move);resize.addEventListener('pointerup',finish);resize.addEventListener('pointercancel',finish);
    });
    canvas.append(article);
    const startMove=event=>{
      if(card.pinned || event.button!==0)return;
      const startX=event.clientX,startY=event.clientY,original={x:card.x,y:card.y};handle.setPointerCapture(event.pointerId);
      const move=e=>{Object.assign(card,position(original.x+(e.clientX-startX)/zoom,original.y+(e.clientY-startY)/zoom,card.width,card.height));article.style.left=`${card.x}px`;article.style.top=`${card.y}px`;};
      const end=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);persistBoard();};
      handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
    };
    handle.addEventListener('pointerdown',startMove);
    article.querySelector('.object-art')?.addEventListener('pointerdown',startMove);
    handle.addEventListener('keydown',event=>{if(card.pinned)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!delta)return;event.preventDefault();const step=event.shiftKey?50:10;Object.assign(card,position(card.x+delta[0]*step,card.y+delta[1]*step,card.width,card.height));article.style.left=`${card.x}px`;article.style.top=`${card.y}px`;persistBoard();});
  }
  if(!visible.length){const empty=document.createElement('p');empty.className='board-empty';empty.textContent=cards.length?'No matching cards. Change the search or card type filter.':'Your board is empty. Add a note, requirement, decision or file to start.';canvas.append(empty);}
  document.querySelector('#board-results').textContent=`${visible.length} of ${cards.length} cards`;
  document.querySelector('#undo-delete').disabled=!deletedCards.length || cards.length>=100;
  if(save)persistBoard();else updateSaveStatus();
  document.querySelector('#board-count').textContent=`${cards.length} cards · ${cards.filter(c=>c.pinned).length} pinned`;
  if(focusId){const replacement=canvas.querySelector(`[data-card="${focusId}"] .${focusClass}`)||canvas.querySelector('.card-edit')||document.querySelector('#add-note');replacement.focus({preventScroll:true});}
}
function editCard(card=null,type='note'){
  document.querySelectorAll('#board-view details[open]').forEach(menu=>{menu.open=false;});
  document.querySelector('#object-style').hidden=!['shape','drawing'].includes(card?.type);document.querySelector('#object-fill-label').hidden=card?.type!=='shape';document.querySelector('#object-color').value=card?.color??'#386b56';document.querySelector('#object-line-width').value=card?.strokeWidth??4;document.querySelector('#object-fill').checked=card?.fill!=='none';
  editing=card?.id??null;document.querySelector('#editor-heading').textContent=card?'Edit object':'Add a card';document.querySelector('#card-type').disabled=['shape','drawing','image'].includes(card?.type);document.querySelector('#object-width').value=card?.width??260;document.querySelector('#object-height').value=card?.height??260;document.querySelector('#card-type').value=card?.type??type;document.querySelector('#card-title').value=card?.title??'';document.querySelector('#card-body').value=card?.body??'';document.querySelector('#delete-card').hidden=!card;editor.showModal();document.querySelector('#card-title').focus();
}
function addCard(card,{reveal=true}={}){if(cards.length>=100){window.toast('This demo supports up to 100 cards.');return false;}try{cards=validateBoard({version:1,cards:[...cards,card]});}catch(error){window.toast(error.message);return false;}persistBoard();if(reveal)revealCard(cards[cards.length-1]);else {clearFilters();renderBoard();}return true;}
document.querySelector('#add-note').addEventListener('click',()=>editCard(null,'note'));document.querySelector('#add-requirement').addEventListener('click',()=>editCard(null,'requirement'));
document.querySelector('#add-decision').addEventListener('click',()=>editCard(null,'decision'));
document.querySelector('#board-search').addEventListener('input',()=>renderBoard());
document.querySelector('#board-type-filter').addEventListener('change',()=>renderBoard());
document.querySelector('#undo-delete').addEventListener('click',()=>{
  if(!deletedCards.length || cards.length>=100)return;
  try{const entry=deletedCards[deletedCards.length-1];cards=restoreCard(cards,entry);deletedCards.pop();persistBoard();revealCard(entry.card);window.toast('Deleted object restored.');}catch(error){window.toast(error.message);}
});
document.querySelector('#cancel-card').addEventListener('click',()=>editor.close());
document.querySelector('#card-form').addEventListener('submit',event=>{
  event.preventDefault();
  const width=Number(document.querySelector('#object-width').value),height=Number(document.querySelector('#object-height').value);
  const values={type:document.querySelector('#card-type').value,title:document.querySelector('#card-title').value.trim(),body:document.querySelector('#card-body').value,width,height};
  if(!values.title)return;
  try{
    if(editing){cards=validateBoard({version:1,cards:cards.map(card=>{
      if(card.id!==editing)return card;
      const updated={...resizeCard(card,width,height),...values};
      if(card.type==='drawing'||card.type==='shape'){updated.color=document.querySelector('#object-color').value;updated.strokeWidth=Number(document.querySelector('#object-line-width').value);}
      if(card.type==='shape')updated.fill=document.querySelector('#object-fill').checked?updated.color:'none';
      return updated;
    })});}
    else if(!addCard({id:crypto.randomUUID(),...values,...newObjectPosition(width,height),pinned:false}))return;
    editor.close();renderBoard(true);
  }catch(error){window.toast(error.message);}
});
document.querySelector('#delete-card').addEventListener('click',()=>{const index=cards.findIndex(card=>card.id===editing);if(index<0)return;deletedCards.push({card:{...cards[index]},index});cards.splice(index,1);editor.close();renderBoard(true);document.querySelector('#undo-delete').focus();window.toast('Card deleted. Use Undo delete to restore it.');});
function renderCamera(){
  canvas.style.transform=`translate(${-camera.left}px,${-camera.top}px) scale(${zoom})`;
  viewport.style.backgroundPosition=`${-camera.left}px ${-camera.top}px`;
  const grid=Math.max(12,24*zoom);viewport.style.backgroundSize=`${grid}px ${grid}px`;
  const selector=document.querySelector('#board-zoom');
  selector.querySelector('[data-continuous-zoom]')?.remove();
  if(![...selector.options].some(option=>Number(option.value)===zoom)){
    const option=new Option(`${Math.round(zoom*100)}%`,String(zoom));option.dataset.continuousZoom='true';selector.add(option);
  }
  selector.value=String(zoom);
}
function setBoardZoom(next,x=viewport.clientWidth/2,y=viewport.clientHeight/2){
  const target=zoomAtPoint(zoom,next,camera.left,camera.top,x,y);
  zoom=target.zoom;camera={left:target.left,top:target.top};renderCamera();
}
document.querySelector('#fit-board').addEventListener('click',()=>{fitCurrentBoard();document.querySelectorAll('#board-view details[open]').forEach(menu=>{menu.open=false;});});
document.querySelector('#board-zoom').addEventListener('change',event=>setBoardZoom(Number(event.target.value)));
viewport.addEventListener('wheel',event=>{
  event.preventDefault();if(event.buttons)return;
  const bounds=viewport.getBoundingClientRect();
  const units=event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1;
  const delta=Math.max(-200,Math.min(200,event.deltaY*units));
  setBoardZoom(zoom*Math.exp(-delta*.002),event.clientX-bounds.left,event.clientY-bounds.top);
},{passive:false});
document.querySelector('#export-board').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,cards})],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='requirements-project-board.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);window.toast('Board file downloaded. Open it here to restore this canvas.');});
document.querySelector('#import-board').addEventListener('click',()=>document.querySelector('#board-json-file').click());
document.querySelector('#board-json-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>8*1024*1024)throw new Error('Choose a board JSON file smaller than 8 MB.');const imported=validateBoard(JSON.parse(await file.text()));if(!confirm('Replace the current board with this file? Export first if you need a backup.'))return;cards=imported;deletedCards=[];clearFilters();renderBoard(true);fitCurrentBoard();window.toast('Project board restored from file.');}catch(error){window.toast(error instanceof SyntaxError?'This is not a valid board JSON file.':error.message);}finally{event.target.value='';}});
document.querySelector('#attach-info').addEventListener('click',()=>document.querySelector('#board-info-file').click());
document.querySelector('#board-info-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw new Error('For this demo, choose a file up to 1 MB.');const textual=/\.(txt|md)$/i.test(file.name);let body=`File: ${file.name}\nSize: ${file.size.toLocaleString()} bytes\n\n`;if(textual){const content=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());body+=content.length>11000?'Excerpt (first 11,000 characters):\n'+content.slice(0,11000):content;}else body+='Reference card only. Binary contents are not stored or parsed in this visual prototype.';addCard({id:crypto.randomUUID(),type:'file',title:file.name.slice(0,120),body:body.slice(0,12000),...newObjectPosition(),pinned:false});}catch(error){window.toast(error instanceof TypeError?'This text file is not valid UTF-8.':error.message);}finally{event.target.value='';}});
document.querySelector('#propose-board').addEventListener('click',()=>{proposal=sampleProposal(cards);const changes=document.querySelector('#proposal-changes');changes.replaceChildren();for(const change of proposal){const item=document.createElement('div');item.className='proposal-change';const label=document.createElement('strong');label.textContent=`${change.action==='update'?'Update draft':'Add card'} · ${change.card.title}`;item.append(label);if(change.before){const before=document.createElement('p');before.textContent=`Before: ${change.before}`;item.append(before);}const after=document.createElement('p');after.textContent=`Proposed: ${change.card.body}`;item.append(after);changes.append(item);}modelDialog.showModal();});
document.querySelector('#reject-proposal').addEventListener('click',()=>modelDialog.close());
document.querySelector('#apply-proposal').addEventListener('click',()=>{try{cards=applyProposal(cards,proposal);renderBoard(true);modelDialog.close();window.toast('Sample changes applied. Your original source document was not changed.');}catch(error){window.toast(error.message);}});
window.projectBoard={addDialogueNote(body){if(body.length>12000){window.toast('Dialogue notes exceed the 12,000-character card limit. Nothing was truncated. Use Clear dialogue to start a shorter conversation; existing board cards stay intact.');return false;}return addCard({id:crypto.randomUUID(),type:'note',title:'Dialogue notes · unconfirmed',body,...newObjectPosition(),pinned:false});},openView(){if(!viewInitialized&&viewport.clientWidth){fitCurrentBoard();viewInitialized=true;}},reset(){cards=seed();deletedCards=[];clearFilters();renderBoard(true);fitCurrentBoard();}};
const visualTools=installVisualTools({canvas,viewport,getZoom:()=>zoom,getCamera:()=>({...camera,zoom}),setCamera:(left,top)=>{camera={left,top};renderCamera();},newObjectPosition,addCard});
renderBoard();renderCamera();
window.dispatchEvent(new Event('board-ready'));
