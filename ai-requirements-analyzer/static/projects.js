'use strict';

const projectsHome=document.createElement('section');
projectsHome.id='projects-home';
projectsHome.setAttribute('aria-label','Choose a project');
projectsHome.innerHTML=`<header class="projects-topbar"><a class="projects-brand" href="#projects"><span class="logo-mark">↗</span><span>AI Requirements<small>Analyzer</small></span></a><div><span class="concept-pill"><span></span>Interactive concept</span><span class="home-avatar" title="Sample reviewer">AR</span></div></header>
<main class="projects-main"><div class="home-intro"><div><p class="eyebrow">YOUR PROJECTS / YOUR SHARED CONTEXT</p><h1>A place for every idea.</h1><p>Choose a project to bring its requirements, conversations<br>and decisions into one workspace.</p></div><button class="button primary" id="new-project">＋ New project <span class="visual-label">PREVIEW</span></button></div>
<div class="projects-section-heading"><h2>All projects <span>1</span></h2><span>One sample project · project creation is a visual preview</span></div>
<div class="project-grid"><article class="project-tile"><div class="project-tile-top"><span class="library-icon">▤</span><span class="sample-tag">Demo project</span><button id="project-actions" class="project-menu" aria-label="AI Requirements Analyzer project actions preview">···</button></div><h2>AI Requirements Analyzer</h2><p>A workspace for turning rough ideas into clear requirements.<br>Planning AI Requirements Analyzer inside its own workspace.</p><div class="project-mini-canvas" aria-hidden="true"><span class="mini-note">Project brief<br><i></i><i></i></span><span class="mini-note mini-requirement">Requirements<br><i></i><i></i></span><span class="mini-note mini-decision">Decisions<br><i></i><i></i></span><span class="canvas-caption">THE WHOLE PROJECT, CONNECTED</span></div><div class="project-facts"><span>Requirements &amp; notes</span><span>Decisions &amp; files</span><span id="home-board-count">5 board cards</span></div><div class="project-tile-footer"><span><span class="small-dot"></span>Sample workspace</span><a href="#project/library/board" class="button primary">Open workspace →</a></div></article>
<button class="new-project-tile" id="new-project-tile"><span class="new-project-plus">＋</span><strong>Your next project starts here.</strong><span>Give your requirements a place to grow.</span><small>New project · visual preview only</small></button></div>
<section class="project-home-note"><div><span class="section-kicker">ONE PROJECT. ALL THE CONTEXT.</span><h2>Keep the conversation attached to the work.</h2><p>Collect requirements, files and decisions on the board. Use dialogue to explore questions.</p></div><div class="home-feature-tags"><span>▦ Board</span><span>✦ Dialogue</span><span>◇ Decisions</span></div></section><p class="home-disclaimer">Visual product prototype · AI findings and replies are simulated · board cards save in this browser · export JSON for a portable backup</p></main>
<dialog id="project-preview-dialog" class="board-dialog project-preview-dialog" aria-labelledby="project-dialog-title"><span class="section-kicker">VISUAL PREVIEW ONLY</span><h2 id="project-dialog-title">Create a project</h2><p id="project-dialog-description">This screen previews project setup. It does not create or store a new project.</p><label>Project name<input id="preview-project-name" placeholder="e.g. Student event planner" maxlength="120"></label><label>About this project<textarea id="preview-project-description" rows="3" placeholder="What are you building, and who is it for?"></textarea></label><div id="project-management-preview" hidden><button disabled class="button secondary">Archive project · preview</button><button disabled class="button secondary">Delete project · preview</button></div><div class="dialog-buttons"><button id="close-project-preview" class="button secondary">Close preview</button><button id="project-preview-submit" disabled class="button primary">Create project · visual only</button></div></dialog>`;
document.body.append(projectsHome);

const projectDialog=document.querySelector('#project-preview-dialog');
function projectPreview(manage=false){
  document.querySelector('#project-dialog-title').textContent=manage?'Project settings':'Create a project';
  document.querySelector('#project-dialog-description').textContent=manage?'A preview of project management. Renaming, archiving and deleting are not connected.':'This screen previews project setup. It does not create or store a new project.';
  document.querySelector('#preview-project-name').value=manage?'AI Requirements Analyzer':'';
  document.querySelector('#preview-project-description').value=manage?'Help students and small software teams clarify and review requirements.':'';
  document.querySelector('#project-management-preview').hidden=!manage;
  document.querySelector('#project-preview-submit').textContent=manage?'Save changes · visual only':'Create project · visual only';
  projectDialog.showModal();
}
document.querySelector('#new-project').addEventListener('click',()=>projectPreview());
document.querySelector('#new-project-tile').addEventListener('click',()=>projectPreview());
document.querySelector('#project-actions').addEventListener('click',()=>projectPreview(true));
document.querySelector('#close-project-preview').addEventListener('click',()=>projectDialog.close());

const logo=document.querySelector('.sidebar .logo');logo.href='#projects';logo.setAttribute('aria-label','All projects');
const back=document.createElement('a');back.href='#projects';back.className='all-projects-link';back.setAttribute('aria-label','All projects');back.innerHTML='<span aria-hidden="true">←</span><span class="sidebar-copy">All projects</span>';logo.after(back);
document.querySelector('.sidebar .nav-label').textContent='ANALYZER WORKSPACE';
document.querySelector('.real-link').href='/prototype';
document.querySelector('.demo-topbar>div').innerHTML='<a href="#projects">All projects</a><span>/</span><strong>AI Requirements Analyzer</strong>';

function showProjectChooser(){
  const entering=!document.body.classList.contains('project-chooser');
  document.body.classList.add('project-chooser');document.body.classList.remove('board-mode');projectsHome.hidden=false;
  document.querySelector('#discussion').hidden=true;
  document.querySelector('#open-discussion').setAttribute('aria-expanded','false');
  document.title='Your projects — AI Requirements Analyzer';
  const cardCount=document.querySelector('#board-count')?.textContent.split(' · ')[0];
  if(cardCount)document.querySelector('#home-board-count').textContent=cardCount.replace(' cards',' board cards');
  if(entering){const heading=projectsHome.querySelector('h1');heading.tabIndex=-1;heading.focus();}
}
window.projectNavigation={workspaceOpened(view){
  const entering=document.body.classList.contains('project-chooser');
  document.body.classList.remove('project-chooser');projectsHome.hidden=true;
  document.title='AI Requirements Analyzer — Project workspace';
  const hash=`#project/library/${view}`;
  if(location.hash!==hash)location.hash=hash;
  if(entering){const heading=document.querySelector(view==='board'?'.board-title':'#page-title');if(heading){heading.tabIndex=-1;heading.focus();}if(view==='board'){document.querySelector('#discussion').hidden=false;document.querySelector('#open-discussion').setAttribute('aria-expanded','true');}}
}};
function projectRoute(){
  const match=location.hash.match(/^#project\/library\/(review|context|history|board)$/);
  const legacy=location.hash.match(/^#(review|context|history|board)$/);
  if(match||legacy){
    if(legacy)history.replaceState(null,'',`#project/library/${legacy[1]}`);
    const view=(match||legacy)[1];
    const target=['review','context'].includes(view)?'board':view;
    if(view!==target)history.replaceState(null,'',`#project/library/${target}`);
    window.showView(target);
  }
  else showProjectChooser();
}
window.addEventListener('hashchange',projectRoute);
window.addEventListener('board-ready',projectRoute);
projectRoute();
