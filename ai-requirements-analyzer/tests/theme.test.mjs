import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=()=>readFileSync(new URL('../static/theme.js',import.meta.url),'utf8');
function page(storage){
  const document={documentElement:{dataset:{}}};
  const window={};
  runInNewContext(source(),{document,window,localStorage:storage});
  return {root:document.documentElement,theme:window.appTheme};
}
test('light is the default; choosing dark persists across pages and can return to light',()=>{
  const values=new Map();
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const first=page(storage);
  assert.equal(first.root.dataset.theme,'light');
  first.theme.set('dark');
  assert.equal(first.root.dataset.theme,'dark');
  assert.equal(page(storage).root.dataset.theme,'dark');
  first.theme.set('light');
  assert.equal(page(storage).root.dataset.theme,'light');
});
test('blocked storage and unknown saved values keep theme switching usable',()=>{
  const blocked=page({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
  assert.equal(blocked.root.dataset.theme,'light');
  blocked.theme.set('dark');
  assert.equal(blocked.root.dataset.theme,'dark');
  blocked.theme.set('unexpected');
  assert.equal(blocked.root.dataset.theme,'light');
  assert.equal(page({getItem:()=>'<invalid>'}).root.dataset.theme,'light');
});
