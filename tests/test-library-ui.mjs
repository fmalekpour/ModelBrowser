import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseHTML, DOMParser} from 'linkedom';
import {parseModel,dispose} from '../model-engine.js';
import {normalizeSettings} from '../settings-schema.mjs';
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
globalThis.DOMParser=DOMParser;
for(const [name,type] of [['Tetrahedron.stl','STL'],['Tetrahedron.3mf','3MF']]) {
  const model=parseModel(await fs.readFile('.test-work/fixtures/'+name),type);
  assert.equal(model.userData.triangles,4);assert(Math.abs(model.userData.size.y-40)<.001);dispose(model);
}
const {window,document}=parseHTML(await fs.readFile('index.html','utf8'));
globalThis.window=window;globalThis.document=document;
globalThis.Image=function(){return document.createElement('img');};
globalThis.engineStub={makeStage:()=>({scene:{remove(){}},render(){}}),parseModel,dispose,fit(){}};
let observers=[];
globalThis.IntersectionObserver=class {
  constructor(callback){this.callback=callback;this.items=[];observers.push(this);}
  observe(item){this.items.push(item);}unobserve(item){this.items=this.items.filter(i=>i!==item);}disconnect(){this.items=[];}
  emit(){this.callback(this.items.slice(0,18).map(target=>({target,isIntersecting:true})));}
};
const files=Array.from({length:600},(_,i)=>({id:String(i).padStart(64,'0'),name:`Model ${i}.stl`,relative:`Model ${i}.stl`,type:'STL',size:1000}));
let active=0,maximum=0,cancelled=0,requests=0,saved;
window.desktop={settings:async()=>({folder:'test',version}),scan:async()=>({files,warnings:[],truncated:false}),saveSettings:async value=>{saved=normalizeSettings(value);return {preferences:saved};},cacheStats:async()=>({count:3,bytes:1024,directory:'test-cache'}),clearCache:async()=>{},cancelThumbnails:async()=>{cancelled++;},thumbnail:async()=>{requests++;active++;maximum=Math.max(maximum,active);await new Promise(r=>setTimeout(r,3));active--;return 'data:image/png;base64,dGVzdA==';}};
Object.defineProperty(document.getElementById('type'),'value',{value:'',writable:true});
document.getElementById('search').value='';
let source=await fs.readFile('renderer.js','utf8');
source=source.replace("import { makeStage, parseModel, fit, dispose } from './model-engine.js';",'const {makeStage,parseModel,fit,dispose}=globalThis.engineStub;').replace("from './library-state.mjs'","from '../library-state.mjs'").replace("from './settings-schema.mjs'","from '../settings-schema.mjs'").replace("from './settings-view.js'","from '../settings-view.js'");
await fs.writeFile('.test-work/renderer-under-test.mjs',source);
await import('../.test-work/renderer-under-test.mjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(10);
assert.equal(document.querySelectorAll('.card').length,60);assert.equal(document.getElementById('pageLabel').textContent,'Page 1 of 10');
observers[0].emit();await wait(10);document.getElementById('nextPage').onclick();
assert.equal(document.querySelector('.card strong').textContent,'Model 60.stl');
observers[0].emit();for(let i=0;i<300&&document.querySelectorAll('.card img').length<18;i++)await wait(10);
assert.equal(maximum,1);assert.equal(document.querySelectorAll('.card img').length,18);
document.getElementById('search').value='Model 599';document.getElementById('search').oninput();await wait(180);
assert.equal(document.querySelectorAll('.card').length,1);assert.equal(document.querySelector('.card strong').textContent,'Model 599.stl');
assert.equal(document.getElementById('pageLabel').textContent,'Page 1 of 1');assert(cancelled>=3);
console.log('PASS: extracted STL/3MF engine, 600-model UI, 60-card bound, page navigation, off-page search, serial thumbnail scheduling, stale-page cancellation.');
assert.equal(document.title,`ModelBrowser v${version}`);
const dialog=document.getElementById('settingsDialog');dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new window.Event('close'));};
const form=dialog.querySelector('form');form.reportValidity=()=>true;
for(const select of dialog.querySelectorAll('select'))Object.defineProperty(select,'value',{writable:true,value:''});
document.getElementById('search').value='';document.getElementById('search').oninput();await wait(180);
document.getElementById('openSettings').onclick();assert(dialog.open);assert.equal(dialog.querySelectorAll('[name]').length,29);
document.getElementById('setting-pageSize').value='24';document.getElementById('setting-thumbnailSize').value='240';document.getElementById('setting-autoThumbnails').checked=false;
await form.onsubmit({preventDefault(){}});assert(!dialog.open);assert.equal(saved.pageSize,24);assert.equal(document.querySelectorAll('.card').length,24);
assert.equal(document.documentElement.style.getPropertyValue('--card-width'),'240px');
const before=requests;observers[0].emit();await wait(30);assert.equal(requests,before);
document.getElementById('openSettings').onclick();document.getElementById('resetSettings').onclick();assert.equal(document.getElementById('setting-pageSize').value,'60');document.getElementById('cancelSettings').onclick();assert.equal(document.querySelectorAll('.card').length,24);
document.getElementById('openSettings').onclick();await document.getElementById('clearCache').onclick();document.getElementById('cancelSettings').onclick();assert.equal(document.querySelectorAll('.card img').length,0);
console.log('PASS: version title, settings form, saved layout, disabled thumbnail generation, restore-defaults draft, cancel, clear cache.');
