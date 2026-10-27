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

const answers={
  why:['Why is this ambiguous?','“Quickly” is subjective. A requirement needs an operation, a measurable response-time target, and an agreed load or usage condition. The target remains an open stakeholder decision.'],
  rewrite:['What could a clearer version look like?','A discussion template could be: “The analyzer shall return findings within [agreed time] for [agreed input size] under [agreed load].” Replace the brackets only after a stakeholder confirms the values.'],
  record:['Add sample question to board.','The sample question was added as an unconfirmed board note. No numerical target has been approved.'],
};
let dialogueNotes=[];
const composer=document.createElement('form');composer.id='dialogue-form';composer.className='dialogue-composer';
composer.innerHTML='<label for="dialogue-message">Your message</label><textarea id="dialogue-message" rows="2" maxlength="2000" placeholder="Add a detail or ask a follow-up…" aria-describedby="dialogue-help" required></textarea><div><small id="dialogue-help">Guided demo replies · no model connected</small><button class="button primary" type="submit">Send →</button></div><div><button class="save-dialogue" type="button" id="save-dialogue">Add notes to board ↗</button><button class="save-dialogue" type="button" id="clear-dialogue">Clear dialogue</button></div>';
document.querySelector('.conversation-footnote').before(composer);
function appendDialogue(question,answer){
  const user=document.createElement('div');user.className='user-message';user.textContent=question;
  const assistant=document.createElement('div');assistant.className='assistant-message';
  const icon=document.createElement('span');icon.className='assistant-avatar';icon.textContent='✦';
  const body=document.createElement('div');const label=document.createElement('small');label.textContent='GUIDED DEMO RESPONSE';const paragraph=document.createElement('p');paragraph.textContent=answer;
  body.append(label,paragraph);assistant.append(icon,body);
  const messages=document.querySelector('#messages');messages.append(user,assistant);messages.scrollTop=messages.scrollHeight;
}
composer.addEventListener('submit',event=>{
  event.preventDefault();
  const field=document.querySelector('#dialogue-message');const message=field.value.trim();if(!message)return;
  dialogueNotes.push(message);
  const answer=dialogueNotes.length===1?'For this guided example, I’ll keep your message as a discussion note. What measurable condition, constraint or exception should we clarify next?':`Here is the discussion draft from your notes:\n\n${dialogueNotes.map((note,index)=>`${index+1}. ${note}`).join('\n')}\n\nConfirm these notes with the stakeholder before approving a requirement. Use Add notes to board to keep them.`;
  appendDialogue(message,answer);field.value='';field.focus();
});
document.querySelector('#save-dialogue').addEventListener('click',()=>{
  if(!dialogueNotes.length){toast('Write a message first, then add the discussion notes.');return;}
  if(window.projectBoard?.addDialogueNote(dialogueNotes.join('\n\n')))toast('Discussion notes added as an unpinned draft.');
});
document.querySelector('#clear-dialogue').addEventListener('click',()=>{dialogueNotes=[];document.querySelector('#messages').innerHTML=initialMessages;document.querySelector('#dialogue-message').value='';toast('Dialogue cleared. Board cards were kept.');});
document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.question;
  if(key==='record'&&!window.projectBoard?.addDialogueNote('Ask the stakeholder to specify analysis time, input size and expected load. No target is approved yet.'))return;
  appendDialogue(...answers[key]);
}));
document.querySelector('#reset-demo').addEventListener('click',()=>{
  if(!confirm('Replace the saved board with the five sample cards? Export your board first to keep a backup.'))return;
  dialogueNotes=[];document.querySelector('#messages').innerHTML=initialMessages;document.querySelector('#dialogue-message').value='';
  window.projectBoard?.reset();closeDiscussion();showView('board');toast('Sample board restored. All cards start unpinned.');
});
