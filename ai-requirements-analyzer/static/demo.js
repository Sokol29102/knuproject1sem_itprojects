'use strict';

let toastTimer;
const initialMessages=document.querySelector('#messages').innerHTML;
function toast(message){
  const el=document.querySelector('#toast');
  el.textContent=message;el.hidden=false;clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{el.hidden=true;},4500);
}
function showView(view){
  if(!['board','history'].includes(view))view='board';
  document.querySelectorAll('.view').forEach(el=>{el.hidden=el.id!==`${view}-view`;});
  document.querySelectorAll('[data-view].nav-item').forEach(el=>{
    el.classList.toggle('active',el.dataset.view===view);
    if(el.dataset.view===view)el.setAttribute('aria-current','page');
    else el.removeAttribute('aria-current');
  });
  const copy={board:['Your project board.','Keep requirements, questions and decisions together.'],history:['Review history.','Illustrative history · saved review versions are planned.']};
  document.querySelector('#page-title').textContent=copy[view][0];
  document.querySelector('#page-subtitle').textContent=copy[view][1];
  document.body.classList.toggle('board-mode',view==='board');
  window.projectNavigation?.workspaceOpened(view);
  if(view==='board')window.projectBoard?.openView();
}
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>showView(el.dataset.view)));
function closeDiscussion(){document.querySelector('#discussion').hidden=true;document.querySelector('#open-discussion').setAttribute('aria-expanded','false');document.querySelector('#open-discussion').focus();}
function openDiscussion(){document.querySelector('#discussion').hidden=false;document.querySelector('#open-discussion').setAttribute('aria-expanded','true');document.querySelector('#dialogue-message').focus();}
document.querySelector('#open-discussion').addEventListener('click',openDiscussion);
document.querySelector('#close-discussion').addEventListener('click',closeDiscussion);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('#discussion').hidden)closeDiscussion();});

let dialogueNotes=[];
let dialogueHistory=[];
let dialogueBusy=false;
let dialogueGeneration=0;
window.cancelProjectRequests=()=>{dialogueGeneration++;};
window.resetProjectDialogue=()=>{dialogueGeneration++;dialogueNotes=[];dialogueHistory=[];document.querySelector('#messages').innerHTML=initialMessages;const field=document.querySelector('#dialogue-message');if(field)field.value='';const error=document.querySelector('#dialogue-error');if(error)error.hidden=true;};
const composer=document.createElement('form');composer.id='dialogue-form';composer.className='dialogue-composer';
composer.innerHTML='<label for="dialogue-message">Your message</label><textarea id="dialogue-message" rows="2" maxlength="2000" placeholder="Ask Gemini about your requirements…" aria-describedby="dialogue-help" required></textarea><div><small id="dialogue-help" role="status">Checking Gemini configuration…</small><button class="button primary" type="submit">Send →</button></div><div><button class="save-dialogue" type="button" id="save-dialogue">Add notes to board ↗</button><button class="save-dialogue" type="button" id="clear-dialogue">Clear dialogue</button></div><p id="dialogue-error" role="alert" hidden></p>';
document.querySelector('.conversation-footnote').before(composer);
const dialogueHelp=document.querySelector('#dialogue-help');
fetch('/api/ai/status').then(response=>{if(!response.ok)throw new Error();return response.json();}).then(status=>{
  dialogueHelp.textContent=status.configured?`Gemini · ${status.model}`:'Set GEMINI_API_KEY on the server to enable replies.';
}).catch(()=>{dialogueHelp.textContent='Could not check Gemini configuration. Try sending a message.';});
window.requestGemini=async function(message,mode='dialogue'){
  const projectId=window.projectNavigation?.projectId;const generation=dialogueGeneration;
  const boardContext=window.projectBoard?.getContext()??[],expected=JSON.stringify(boardContext);
  const scene=window.projectBoard?.getSceneContext()??{};
  const today=new Date(),clientDate=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message,mode,project_id:projectId??null,history:dialogueHistory.slice(-20),cards:boardContext,client_date:clientDate,...scene}),
    signal:AbortSignal.timeout(70000)});
  const result=await response.json();
  if(!response.ok)throw new Error(result.detail||'Gemini could not answer. Please try again.');
  if(projectId!==window.projectNavigation?.projectId||generation!==dialogueGeneration)throw new Error('Project or conversation changed. Ask again in the current project.');
  result.application=await window.projectBoard.applyGeminiActions(result.actions,expected);
  if(projectId!==window.projectNavigation?.projectId||generation!==dialogueGeneration)throw new Error('Project or conversation changed. Open the original project to inspect its saved board.');
  return result;
};
function appendDialogue(question,answer,application=null){
  const user=document.createElement('div');user.className='user-message';user.textContent=question;
  const assistant=document.createElement('div');assistant.className='assistant-message';
  const icon=document.createElement('span');icon.className='assistant-avatar';icon.textContent='✦';
  const body=document.createElement('div');const label=document.createElement('small');label.textContent='GEMINI';const paragraph=document.createElement('p');paragraph.textContent=answer;paragraph.style.whiteSpace='pre-wrap';
  body.append(label,paragraph);
  if(application){
    const status=document.createElement('p');status.className='dialogue-action-status';status.setAttribute('role','status');
    status.textContent=`Board updated: ${application.added} added, ${application.updated} changed, ${application.deleted} removed. ${application.saved?'Saved to your account.':'Not saved yet — check the board save error.'} Undo is available.`;body.append(status);
  }
  assistant.append(icon,body);
  const messages=document.querySelector('#messages');messages.append(user,assistant);messages.scrollTop=messages.scrollHeight;
}
window.displayGeminiResult=(message,result)=>{
  appendDialogue(message,result.reply,result.application);
  dialogueHistory.push({role:'user',text:message},{role:'model',text:result.reply});dialogueHistory=dialogueHistory.slice(-20);
  dialogueNotes.push(`You: ${message}\n\nGemini: ${result.reply}`);
};
composer.addEventListener('submit',async event=>{
  event.preventDefault();
  const field=document.querySelector('#dialogue-message');const message=field.value.trim();if(!message||dialogueBusy)return;
  dialogueBusy=true;const previousStatus=dialogueHelp.textContent;dialogueHelp.textContent='Gemini is thinking…';composer.setAttribute('aria-busy','true');
  document.querySelectorAll('#dialogue-form button,[data-question],#reset-demo').forEach(button=>{button.disabled=true;});
  const errorBox=document.querySelector('#dialogue-error');errorBox.hidden=true;
  try{
    const result=await window.requestGemini(message);
    window.displayGeminiResult(message,result);
    if(field.value.trim()===message)field.value='';
  }catch(error){errorBox.textContent=['TimeoutError','AbortError'].includes(error.name)?'Gemini took too long. Your message was kept; try again.':error.message;errorBox.hidden=false;}
  finally{dialogueBusy=false;composer.removeAttribute('aria-busy');dialogueHelp.textContent=previousStatus;document.querySelectorAll('#dialogue-form button,[data-question],#reset-demo').forEach(button=>{button.disabled=false;});field.focus();}
});
document.querySelector('#save-dialogue').addEventListener('click',()=>{
  if(!dialogueNotes.length){toast('Write a message first, then add the discussion notes.');return;}
  if(window.projectBoard?.addDialogueNote(dialogueNotes.join('\n\n')))toast('Discussion notes added as an unpinned draft.');
});
document.querySelector('#clear-dialogue').addEventListener('click',()=>{window.resetProjectDialogue();toast('Dialogue cleared. Board cards were kept.');});
document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{
  if(dialogueBusy)return;
  document.querySelector('#dialogue-message').value=button.textContent;
  composer.requestSubmit();
}));
document.querySelector('#reset-demo').addEventListener('click',()=>{
  if(!confirm('Replace the saved board with the five sample cards? Export your board first to keep a backup.'))return;
  window.resetProjectDialogue();
  window.projectBoard?.reset();closeDiscussion();showView('board');toast('Sample board restored. All cards start unpinned.');
});
