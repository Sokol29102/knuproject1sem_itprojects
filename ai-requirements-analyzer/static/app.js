'use strict';

const form = document.querySelector('#requirements-form');
const text = document.querySelector('#requirements');
const file = document.querySelector('#document');
const error = document.querySelector('#error');
const badge = document.querySelector('#preview-badge');
const status = document.querySelector('#status');
const submit = document.querySelector('#submit');
let pending = false;
let acceptedText = null;
let analysisRun = 0;

const analysisPanel = document.querySelector('#analysis');
const analyzeButton = document.querySelector('#analyze');
const CATEGORY_LABELS = { functional: 'Functional', 'non-functional': 'Non-functional', ambiguous: 'Ambiguous' };

function resetAnalysis() {
  analysisRun += 1; // any response still in flight belongs to old input and will be ignored
  acceptedText = null;
  analysisPanel.hidden = true;
  analysisPanel.setAttribute('aria-busy', 'false');
  ['#analysis-loading', '#analysis-error', '#analysis-empty', '#analysis-summary', '#unsupported'].forEach(id => { document.querySelector(id).hidden = true; });
  document.querySelector('#findings').replaceChildren();
  analyzeButton.disabled = false;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // model output is always rendered as text, never HTML
  return node;
}

function renderFindings(result) {
  const list = document.querySelector('#findings');
  list.replaceChildren();
  for (const finding of result.findings) {
    const item = element('li', 'finding');
    const header = element('header');
    header.append(element('span', `category ${finding.category}`, CATEGORY_LABELS[finding.category] ?? finding.category), element('span', 'finding-line', `Line ${finding.line}`));
    const question = element('p', 'question');
    question.append(element('b', '', 'Ask: '), document.createTextNode(finding.question));
    item.append(header, element('blockquote', '', finding.excerpt), element('p', '', finding.explanation), question);
    list.append(item);
  }
  const counts = Object.keys(CATEGORY_LABELS).map(key => `${result.findings.filter(f => f.category === key).length} ${CATEGORY_LABELS[key].toLowerCase()}`);
  const summary = document.querySelector('#analysis-summary');
  summary.replaceChildren(element('span', 'badge success', `LIVE · ${result.model}`), element('span', '', `${result.findings.length} findings: ${counts.join(', ')}`));
  summary.hidden = false;
  document.querySelector('#analysis-empty').hidden = result.findings.length > 0;
  const unsupported = document.querySelector('#unsupported');
  unsupported.hidden = !result.unsupported.length;
  document.querySelector('#unsupported-title').textContent = `${result.unsupported.length} model output(s) rejected as unsupported`;
  document.querySelector('#unsupported-list').replaceChildren(...result.unsupported.map(entry => element('li', '', `${entry.excerpt ? `“${entry.excerpt}” — ` : ''}${entry.reason}`)));
}

async function runAnalysis() {
  if (pending || acceptedText === null || !analyzeButton || analyzeButton.disabled) return;
  const run = ++analysisRun;
  const badgeEl = document.querySelector('#analysis-badge');
  analysisPanel.hidden = false;
  analysisPanel.setAttribute('aria-busy', 'true');
  ['#analysis-error', '#analysis-empty', '#analysis-summary', '#unsupported'].forEach(id => { document.querySelector(id).hidden = true; });
  document.querySelector('#findings').replaceChildren();
  document.querySelector('#analysis-loading').hidden = false;
  badgeEl.textContent = 'Analyzing…';
  badgeEl.className = 'badge';
  analyzeButton.disabled = true;
  status.textContent = 'Gemini analysis started.';
  analysisPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: acceptedText }), signal: AbortSignal.timeout(130000) });
    const result = await response.json();
    if (run !== analysisRun) return;
    if (response.status === 401) {
      const errorBox = document.querySelector('#analysis-error');
      signInHint(errorBox, 'Sign in to use AI analysis. Your text is unchanged.');
      errorBox.hidden = false;
      badgeEl.textContent = 'Sign-in required';
      errorBox.focus();
      return;
    }
    if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Analysis failed. Try again.');
    renderFindings(result);
    badgeEl.textContent = 'AI suggestions';
    badgeEl.className = 'badge success';
    status.textContent = `Analysis complete: ${result.findings.length} findings for review.`;
  } catch (failure) {
    if (run !== analysisRun) return;
    const message = failure.name === 'TimeoutError' ? 'The analysis took too long. Try again.' : failure instanceof TypeError || failure instanceof SyntaxError ? 'Could not reach the app. Check that it is running, then try again.' : failure.message;
    const errorBox = document.querySelector('#analysis-error');
    errorBox.textContent = `${message} Your text is unchanged.`;
    errorBox.hidden = false;
    badgeEl.textContent = 'Failed';
    errorBox.focus();
  } finally {
    if (run === analysisRun) {
      document.querySelector('#analysis-loading').hidden = true;
      analysisPanel.setAttribute('aria-busy', 'false');
      analyzeButton.disabled = false;
    }
  }
}

analyzeButton.addEventListener('click', runAnalysis);

function signInHint(container, message) {
  const link = element('a', '', 'Sign in or create an account');
  link.href = '/';
  container.replaceChildren(document.createTextNode(`${message} `), link, document.createTextNode(', then return to this page.'));
}

Promise.all([
  fetch('/api/ai/status').then(response => response.json()),
  fetch('/api/auth/me').then(response => response.ok),
]).then(([info, signedIn]) => {
  const note = document.querySelector('#ai-config');
  note.classList.toggle('warn', !info.configured || !signedIn);
  if (!signedIn) signInHint(note, 'AI analysis uses your account.');
  else note.textContent = info.configured ? `Live model: ${info.model}` : 'Gemini is not configured on this server; Analyze will report this.';
}).catch(() => {});

const normalized = value => value.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
const source = () => form.elements.source.value;

function updateCount() {
  const count = [...normalized(text.value)].length;
  const counter = document.querySelector('#counter');
  counter.textContent = `${count.toLocaleString('en-US')} / 20,000`;
  counter.classList.toggle('over-limit', count > 20000);
}

function invalidate(message = 'Awaiting input') {
  document.querySelector('#preview-result').hidden = true;
  document.querySelector('#empty-state').hidden = false;
  document.querySelector('#preview-text').textContent = '';
  badge.textContent = message;
  badge.className = 'badge';
  error.hidden = true;
  status.textContent = '';
  resetAnalysis();
}

function selectSource() {
  document.querySelector('#text-input').hidden = source() !== 'text';
  document.querySelector('#file-input').hidden = source() !== 'file';
  invalidate('Submit to validate');
}

text.addEventListener('input', () => { updateCount(); invalidate('Input changed'); });
file.addEventListener('change', () => invalidate('File selected'));
document.querySelectorAll('input[name=source]').forEach(radio => radio.addEventListener('change', selectSource));

document.querySelector('#sample').addEventListener('click', async () => {
  if (pending) return;
  form.elements.source.value = 'text';
  file.value = '';
  text.value = 'Library project — initial requirements\n\n1. A student shall be able to search books by title or author.\n2. The system should respond quickly.\n3. A librarian shall be able to add and update book records.\n4. Borrowing records shall be visible only to the relevant student and librarian.';
  selectSource();
  updateCount();
  text.focus();
});

document.querySelector('#clear').addEventListener('click', () => {
  form.reset();
  text.value = '';
  file.value = '';
  selectSource();
  updateCount();
  invalidate();
  text.focus();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  invalidate();
  if (source() === 'file' && !file.files.length) {
    error.textContent = 'Choose a TXT file first, then validate it.';
    error.hidden = false;
    error.focus();
    return;
  }
  pending = true;
  // Freeze the submitted source while waiting so an old response cannot become a new preview.
  const controls = [...form.elements, document.querySelector('#sample')];
  controls.forEach(control => { control.disabled = true; });
  document.querySelector('.preview-panel').setAttribute('aria-busy', 'true');
  submit.textContent = 'Validating…';
  status.textContent = 'Validating your requirements.';
  try {
    let response;
    if (source() === 'file') {
      const body = new FormData();
      body.append('file', file.files[0]);
      response = await fetch('/api/upload', { method: 'POST', body, signal: AbortSignal.timeout(15000) });
    } else {
      response = await fetch('/api/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.value }), signal: AbortSignal.timeout(15000) });
    }
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Validation failed. Check the input and try again.');
    document.querySelector('#accepted-count').textContent = result.characters.toLocaleString('en-US');
    document.querySelector('#accepted-lines').textContent = result.lines.toLocaleString('en-US');
    document.querySelector('#accepted-source').textContent = result.source;
    document.querySelector('#preview-text').textContent = result.text;
    acceptedText = result.text;
    document.querySelector('#empty-state').hidden = true;
    document.querySelector('#preview-result').hidden = false;
    badge.textContent = 'Accepted';
    badge.className = 'badge success';
    status.textContent = `Accepted ${result.characters} characters. Preview is ready.`;
  } catch (failure) {
    error.textContent = failure.name === 'TimeoutError' ? 'The request timed out. Try again.' : failure instanceof TypeError || failure instanceof SyntaxError ? 'Could not reach the app. Check that it is running, then try again.' : failure.message;
    error.hidden = false;
    badge.textContent = 'Not accepted';
    error.focus();
  } finally {
    pending = false;
    controls.forEach(control => { control.disabled = false; });
    document.querySelector('.preview-panel').setAttribute('aria-busy', 'false');
    submit.innerHTML = 'Validate &amp; preview <span aria-hidden="true">→</span>';
  }
});

updateCount();
