'use strict';

const form = document.querySelector('#requirements-form');
const text = document.querySelector('#requirements');
const file = document.querySelector('#document');
const error = document.querySelector('#error');
const badge = document.querySelector('#preview-badge');
const status = document.querySelector('#status');
const submit = document.querySelector('#submit');
let pending = false;

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
