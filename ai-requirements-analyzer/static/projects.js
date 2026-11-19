'use strict';

const projectsHome=document.createElement('section');
projectsHome.id='projects-home';projectsHome.setAttribute('aria-label','Your account and projects');
projectsHome.innerHTML=`<header class="projects-topbar"><a class="projects-brand" href="#projects"><span class="logo-mark">↗</span><span>AI Requirements<small>Analyzer</small></span></a><div><span id="account-name"></span><button id="sign-out" class="button secondary" hidden>Sign out</button><details id="theme-setting" class="theme-setting" hidden><summary aria-label="Choose theme"><span>Theme:</span><span class="theme-swatch" aria-hidden="true"></span></summary><div id="theme-options" class="theme-options" aria-label="Theme options"><button type="button" data-theme-choice="light" aria-pressed="false"><span class="theme-swatch light" aria-hidden="true"></span>Light</button><button type="button" data-theme-choice="dark" aria-pressed="false"><span class="theme-swatch dark" aria-hidden="true"></span>Dark</button></div></details></div></header>
<main class="projects-main"><section id="account-panel" class="account-panel"><p class="eyebrow">YOUR WORKSPACE</p><h1>Keep your projects together.</h1><p>Sign in to open your boards, or create an account to get started.</p><form id="account-form"><h2 id="account-heading">Sign in</h2><label>Username<input id="account-username" autocomplete="username" pattern="[A-Za-z0-9_-]{3,40}" minlength="3" maxlength="40" required aria-describedby="account-help"></label><label>Password<input id="account-password" type="password" autocomplete="current-password" minlength="10" maxlength="128" required></label><small id="account-help">Username: 3–40 letters, numbers, underscores or hyphens. Password: at least 10 characters.</small><p id="account-error" role="alert" hidden></p><div class="dialog-buttons"><button type="submit" class="button primary" id="account-submit">Sign in</button><button type="button" id="account-toggle" class="button secondary">Create an account</button></div></form></section>
<section id="project-list-panel" hidden><div class="home-intro"><div><p class="eyebrow">YOUR PROJECTS / YOUR CONTEXT</p><h1>A place for every idea.</h1><p>Requirements, files and decisions, saved to your account.</p></div><button class="button primary" id="new-project">＋ New project</button></div><p id="projects-error" role="alert" hidden></p><button id="recover-board" class="button secondary" hidden>Download unsaved board from expired session</button><div class="projects-section-heading"><h2>My projects <span id="project-total">0</span></h2><span>Only projects owned by your account appear here.</span></div><div id="project-grid" class="project-grid"></div><p id="projects-empty" hidden>No projects yet. Create your first project to open a board.</p></section></main>
<dialog id="create-project-dialog" class="board-dialog project-preview-dialog" aria-labelledby="project-dialog-title"><form id="create-project-form"><h2 id="project-dialog-title">Create a project</h2><label>Project name<input id="project-name" maxlength="120" required placeholder="e.g. Student event planner"></label><label>About this project<textarea id="project-description" maxlength="2000" rows="3"></textarea></label><label id="legacy-import-label" class="legacy-import"><input type="checkbox" id="legacy-import"> Import the board previously saved in this browser</label><p id="create-project-error" role="alert" hidden></p><div class="dialog-buttons"><button id="cancel-project" type="button" class="button secondary">Cancel</button><button type="submit" id="create-project-submit" class="button primary">Create project</button></div></form></dialog>`;
document.body.append(projectsHome);
let account=null,currentProject=null,registering=false,ready=false,routeNumber=0,authEpoch=0;
let saveTail=Promise.resolve(),saveFailed=false,pendingSaves=0,recoveryBoard=null;
const byId=id=>document.getElementById(id);
function syncThemeChoice(){
  for(const button of byId('theme-options').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.themeChoice===document.documentElement.dataset.theme));
}
byId('theme-options').addEventListener('click',event=>{
  const button=event.target.closest('button[data-theme-choice]');if(!button)return;
  window.appTheme.set(button.dataset.themeChoice);syncThemeChoice();byId('theme-setting').open=false;
  byId('theme-setting').querySelector('summary').focus();
});
document.addEventListener('click',event=>{if(!byId('theme-setting').contains(event.target))byId('theme-setting').open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&byId('theme-setting').open){byId('theme-setting').open=false;byId('theme-setting').querySelector('summary').focus();}});
syncThemeChoice();
function errorAt(id,message){const el=byId(id);el.textContent=message||'';el.hidden=!message;}
async function api(path,options={}){
  const epoch=authEpoch;
  const response=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();
  if(!response.ok){const error=new Error(data.detail||'The request failed. Try again.');error.status=response.status;if(response.status===401&&account&&epoch===authEpoch){cancelPendingOperations();authEpoch++;if(currentProject&&(pendingSaves||saveFailed))recoveryBoard={owner:account.id,board:window.projectBoard.snapshot()};account=null;renderAccount();showProjectChooser();}throw error;}
  return data;
}
function showProjectChooser(){
  document.body.classList.add('project-chooser');document.body.classList.remove('board-mode');projectsHome.hidden=false;
  byId('discussion').hidden=true;byId('open-discussion').setAttribute('aria-expanded','false');document.title='Your projects — AI Requirements Analyzer';
}
function renderAccount(){
  byId('theme-setting').hidden=!account;byId('theme-setting').open=false;
  byId('account-panel').hidden=!!account;byId('project-list-panel').hidden=!account;byId('sign-out').hidden=!account;
  byId('account-name').textContent=account?account.username:'';byId('recover-board').hidden=!(account&&recoveryBoard?.owner===account.id);
  if(!account){byId('project-grid').replaceChildren();window.resetProjectDialogue?.();}
}
async function listProjects(){
  const owner=account?.id,epoch=authEpoch;
  errorAt('projects-error','');
  try{
    const list=await api('/projects');if(!account||account.id!==owner||epoch!==authEpoch)return;const grid=byId('project-grid');grid.replaceChildren();byId('project-total').textContent=list.length;byId('projects-empty').hidden=!!list.length;
    for(const project of list){
      const article=document.createElement('article');article.className='project-tile';
      const title=document.createElement('h2');title.textContent=project.name;
      const description=document.createElement('p');description.textContent=project.description||'Your project board.';
      const footer=document.createElement('div');footer.className='project-tile-footer';
      const status=document.createElement('span');status.textContent='Saved to your account';
      const link=document.createElement('a');link.className='button primary';link.href=`#project/${project.id}/board`;link.textContent='Open workspace →';
      footer.append(status,link);article.append(title,description,footer);grid.append(article);
    }
  }catch(error){if(account?.id===owner&&epoch===authEpoch)errorAt('projects-error',error.message);}
}
function updateAccountForm(){
  byId('account-heading').textContent=registering?'Create an account':'Sign in';byId('account-submit').textContent=registering?'Create account':'Sign in';
  byId('account-toggle').textContent=registering?'I already have an account':'Create an account';byId('account-password').autocomplete=registering?'new-password':'current-password';errorAt('account-error','');
}
byId('account-toggle').addEventListener('click',()=>{registering=!registering;updateAccountForm();});
byId('account-form').addEventListener('submit',async event=>{
  event.preventDefault();byId('account-submit').disabled=true;errorAt('account-error','');
  try{account=await api('/auth/'+(registering?'register':'login'),{method:'POST',body:JSON.stringify({username:byId('account-username').value,password:byId('account-password').value})});authEpoch++;ready=true;currentProject=null;saveFailed=false;window.projectBoard?.clearProject();byId('account-password').value='';renderAccount();await route();}
  catch(error){errorAt('account-error',error.message);}
  finally{byId('account-submit').disabled=false;}
});
async function finishSaves(){for(;;){const tail=saveTail;await tail;if(tail===saveTail)return !saveFailed;}}
function cancelPendingOperations(){window.projectBoard?.cancelPendingOperations();window.cancelProjectRequests?.();}
async function mayLeave(){cancelPendingOperations();if(await finishSaves())return true;return confirm('This board has unsaved changes. Export it before leaving to keep a backup. Leave without saving?');}
byId('sign-out').addEventListener('click',async()=>{
  if(!await mayLeave())return;
  try{await api('/auth/logout',{method:'POST'});authEpoch++;account=null;currentProject=null;saveFailed=false;recoveryBoard=null;window.projectBoard?.clearProject();renderAccount();location.hash='#projects';showProjectChooser();}
  catch(error){errorAt('projects-error',error.message);}
});
byId('recover-board').addEventListener('click',()=>{if(!account||recoveryBoard?.owner!==account.id)return;const url=URL.createObjectURL(new Blob([JSON.stringify(recoveryBoard.board)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='unsaved-project-board.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
byId('new-project').addEventListener('click',()=>{
  byId('create-project-form').reset();errorAt('create-project-error','');let saved=false;
  try{saved=localStorage.getItem('ai-requirements-analyzer:library:board:v1')!==null;}catch{}
  byId('legacy-import-label').hidden=!saved;byId('create-project-dialog').showModal();byId('project-name').focus();
});
byId('cancel-project').addEventListener('click',()=>byId('create-project-dialog').close());
byId('create-project-form').addEventListener('submit',async event=>{
  event.preventDefault();byId('create-project-submit').disabled=true;errorAt('create-project-error','');
  try{
    if(!await mayLeave())return;
    let imported=null;if(byId('legacy-import').checked)imported=window.projectBoard.readLegacyBoard();
    const project=await api('/projects',{method:'POST',body:JSON.stringify({name:byId('project-name').value,description:byId('project-description').value})});
    if(imported){try{await api(`/projects/${project.id}/board`,{method:'PUT',body:JSON.stringify({version:1,revision:0,cards:imported})});}catch(error){byId('create-project-dialog').close();await listProjects();throw new Error('Project created, but import failed: '+error.message+' Your old browser board was kept.');}}
    byId('create-project-dialog').close();location.hash=`#project/${project.id}/board`;
  }catch(error){if(byId('create-project-dialog').open)errorAt('create-project-error',error.message);else errorAt('projects-error',error.message);}
  finally{byId('create-project-submit').disabled=false;}
});
window.projectNavigation={
  get projectId(){return currentProject?.id;},
  get pendingSaves(){return pendingSaves;},
  async saveBoard(cards){
    if(!currentProject||!account)throw new Error('Sign in and open a project before saving.');
    const project=currentProject;const snapshot=JSON.parse(JSON.stringify(cards));pendingSaves++;
    const job=saveTail.then(async()=>{
      if(saveFailed)throw new Error('Saving paused after an error. Export this board and reopen the project before saving.');
      const result=await api(`/projects/${project.id}/board`,{method:'PUT',body:JSON.stringify({version:1,cards:snapshot,revision:project.revision})});project.revision=result.revision;
    });
    saveTail=job.catch(()=>{saveFailed=true;});
    try{await job;}finally{pendingSaves--;}
  },
  workspaceOpened(view){
    if(!account||!currentProject){showProjectChooser();return;}
    const entering=document.body.classList.contains('project-chooser');document.body.classList.remove('project-chooser');projectsHome.hidden=true;
    const hash=`#project/${currentProject.id}/${view}`;if(location.hash!==hash)history.replaceState(null,'',hash);
    document.title=currentProject.name+' — Project workspace';
    document.querySelector('.board-title').textContent=currentProject.name;
    if(entering&&view==='board'){byId('discussion').hidden=false;byId('open-discussion').setAttribute('aria-expanded','true');}
  }
};
async function route(){
  const sequence=++routeNumber;
  if(!ready||!account){showProjectChooser();return;}
  const match=location.hash.match(/^#project\/([a-f0-9]{32})\/(board|history)$/);
  if(!match){cancelPendingOperations();showProjectChooser();await listProjects();return;}
  if(!window.projectBoard){showProjectChooser();return;}
  if(currentProject?.id!==match[1]||document.body.classList.contains('project-chooser')){
    if(!await mayLeave()){history.replaceState(null,'',`#project/${currentProject.id}/board`);return;}
    showProjectChooser();
    try{
      const project=await api('/projects/'+match[1]);if(sequence!==routeNumber)return;
      window.projectBoard.loadProject(project);currentProject=project;saveFailed=false;window.resetProjectDialogue?.();
    }catch(error){showProjectChooser();await listProjects();errorAt('projects-error',error.message);return;}
  }
  if(sequence===routeNumber)window.showView(match[2]);
}
const logo=document.querySelector('.sidebar .logo');logo.href='#projects';logo.setAttribute('aria-label','All projects');
document.querySelector('.real-link').href='/prototype';
window.addEventListener('hashchange',route);window.addEventListener('board-ready',route);
window.addEventListener('beforeunload',event=>{if(pendingSaves||saveFailed){event.preventDefault();event.returnValue='';}});
showProjectChooser();
const startupEpoch=authEpoch;
api('/auth/me').then(user=>{if(startupEpoch===authEpoch)account=user;}).catch(error=>{if(error.status!==401&&startupEpoch===authEpoch)errorAt('account-error',error.message);}).finally(()=>{ready=true;renderAccount();route();});
