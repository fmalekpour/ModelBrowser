import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {DEFAULTS,SETTINGS,normalizeSettings,thumbnailSignature} from '../settings-schema.mjs';
import {pageOf,rememberImage} from '../library-state.mjs';
const require=createRequire(import.meta.url);
const {DiskCache}=require('../disk-cache.cjs');
assert.equal(SETTINGS.length,29);
assert.deepEqual(normalizeSettings(),DEFAULTS);
const invalid=normalizeSettings({pageSize:99999,memoryCache:-1,modelColor:'bad',cacheMode:'bad',lighting:NaN,rememberFolder:'false',arbitrary:'ignored'});
assert.equal(invalid.pageSize,240);assert.equal(invalid.memoryCache,12);assert.equal(invalid.modelColor,DEFAULTS.modelColor);assert.equal(invalid.cacheMode,'disk');assert.equal(invalid.rememberFolder,true);assert(!('arbitrary' in invalid));
assert.equal(normalizeSettings({lighting:.26}).lighting,.25);
assert.equal(thumbnailSignature(DEFAULTS),thumbnailSignature({...DEFAULTS,pageSize:24}));
assert.notEqual(thumbnailSignature(DEFAULTS),thumbnailSignature({...DEFAULTS,thumbnailResolution:'640'}));
const files=Array.from({length:100},(_,i)=>({relative:String(i),type:'STL'}));assert.equal(pageOf(files,'','',1,24).items.length,24);
const memory=new Map();for(let i=0;i<100;i++)rememberImage(memory,i,'img',12);assert.equal(memory.size,12);
const root=await fs.mkdtemp(path.resolve('.test-work/cache-settings-test-'));
const cache=new DiskCache(root);await cache.init();
const key=n=>String(n).padStart(64,'0');
const image='data:image/png;base64,'+Buffer.alloc(60).toString('base64');
const tiny={...DEFAULTS,diskCacheMB:120/1048576,cacheDays:0};
await cache.put(key(1),image,tiny);await cache.put(key(2),image,tiny);
await new Promise(r=>setTimeout(r,5));await cache.get(key(1),tiny);await cache.put(key(3),image,tiny);
assert.equal((await cache.stats()).count,2);assert.equal(await cache.get(key(2),tiny),null);assert.equal(await cache.get(key(1),tiny),image);
await cache.put(key(4),image,{...tiny,cacheMode:'session'});assert.equal(await cache.get(key(4),tiny),null);
assert.equal(await cache.get(key(1),{...tiny,cacheMode:'off'}),null);
const stale=new Date(Date.now()-40*86400000);await fs.utimes(path.join(root,key(1)+'.png'),stale,stale);
const restarted=new DiskCache(root);await restarted.init();await restarted.prune({...DEFAULTS,cacheDays:30});assert.equal(await restarted.get(key(1),DEFAULTS),null);
await fs.writeFile(path.join(root,'keep.stl'),'model');await restarted.clear();assert.equal((await restarted.stats()).count,0);assert.equal(await fs.readFile(path.join(root,'keep.stl'),'utf8'),'model');
console.log('PASS: 29 settings, validation, configurable pagination/memory, thumbnail invalidation, LRU size eviction, expiry, session/off policies, safe cache clearing.');

// Exercise the real main-process settings handlers with a desktop-window stub.
const Module=require('node:module');const {EventEmitter}=require('node:events');
const profile=await fs.mkdtemp(path.resolve('.test-work/preferences-test-'));
const fixtureFolder=path.resolve('.test-work/fixtures');await fs.writeFile(path.join(profile,'settings.json'),JSON.stringify({folder:fixtureFolder}));
const handlers=new Map();const ipc=new EventEmitter();ipc.handle=(name,fn)=>handlers.set(name,fn);
let startup;
const app={isPackaged:true,getPath:()=>profile,getVersion:()=>require('../package.json').version,on(){},quit(){},whenReady:()=>({then:fn=>{startup=fn();}})};
class Window extends EventEmitter{constructor(options){super();this.options=options;this.webContents={setWindowOpenHandler(){},on(){}};}removeMenu(){}async loadFile(){}setTitle(value){this.title=value;}}
const original=Module._load;Module._load=function(name,...args){return name==='electron'?{app,BrowserWindow:Window,ipcMain:ipc,dialog:{},shell:{}}:original.call(this,name,...args);};
try{require('../main.cjs');await startup;}finally{Module._load=original;}
let settings=handlers.get('settings')();assert.equal(settings.folder,fixtureFolder);assert.deepEqual(settings.preferences,DEFAULTS);assert.equal(settings.version,require('../package.json').version);
await handlers.get('save-settings')({}, {...DEFAULTS,pageSize:24,thumbnailSize:240,rememberFolder:false});
const stored=JSON.parse(await fs.readFile(path.join(profile,'settings.json'),'utf8'));assert.equal(stored.preferences.pageSize,24);assert.equal(stored.preferences.thumbnailSize,240);assert.equal(stored.folder,undefined);
assert.deepEqual(normalizeSettings(stored.preferences),stored.preferences);
await handlers.get('save-settings')({},DEFAULTS);assert.equal(JSON.parse(await fs.readFile(path.join(profile,'settings.json'),'utf8')).folder,fixtureFolder);
console.log('PASS: legacy settings migration, main-process save/read, version, remembered-folder policy, atomic settings file.');
