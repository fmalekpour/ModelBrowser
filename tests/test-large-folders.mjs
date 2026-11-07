import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {pageOf, rememberImage, IMAGE_CACHE_SIZE} from '../library-state.mjs';
const require=createRequire(import.meta.url);
const {scanFiles}=require('../scan-files.cjs');
const {ThumbnailService}=require('../thumbnail-service.cjs');
const folder=path.resolve('.test-work/large-fixtures');
await fs.mkdir(folder,{recursive:true});await fs.mkdir(path.join(folder,'nested'),{recursive:true});
const stl=await fs.readFile('.test-work/fixtures/Tetrahedron.stl');
for(let start=0;start<600;start+=20)await Promise.all(Array.from({length:20},(_,offset)=>fs.writeFile(path.join(folder,`Model ${start+offset}.stl`),stl)));
await fs.copyFile('.test-work/fixtures/Tetrahedron.3mf',path.join(folder,'nested','Part.3mf'));
await fs.writeFile(path.join(folder,'ignore.txt'),'not a model');
const started=performance.now();const flat=await scanFiles(folder,false);
assert.equal(flat.files.length,600);assert.equal(flat.truncated,false);
assert.equal(flat.files[2].name,'Model 2.stl');
const recursive=await scanFiles(folder,true);assert.equal(recursive.files.length,601);
assert.equal((await scanFiles(folder,true,500)).truncated,true);
assert.equal((await scanFiles(folder,true,601)).truncated,false);
const ids=new Set();for(let p=0;p<10;p++){const result=pageOf(flat.files,'','',p);assert.equal(result.items.length,60);result.items.forEach(f=>ids.add(f.id));}assert.equal(ids.size,600);
assert.equal(pageOf(recursive.files,'part','3MF',9).items.length,1);
assert.equal(pageOf(flat.files,'missing','',3).page,0);
const cache=new Map();for(const f of flat.files)rememberImage(cache,f.id,'thumbnail');assert.equal(cache.size,IMAGE_CACHE_SIZE);
console.log(`PASS: 600-file folder scan, recursive scan, cap, natural sort, pagination, cross-page search, bounded cache (${Math.round(performance.now()-started)} ms).`);

const ipc=new EventEmitter();let created=[];
class FakeWindow extends EventEmitter {
 constructor(){super();this.dead=false;this.webContents=new EventEmitter();this.webContents.setWindowOpenHandler=()=>{};this.webContents.send=(_channel,job)=>{this.job=job;};created.push(this);}
 async loadFile(){queueMicrotask(()=>ipc.emit('thumbnail-ready',{sender:this.webContents}));}
 isDestroyed(){return this.dead;}destroy(){this.dead=true;}
}
const service=new ThumbnailService(FakeWindow,ipc,50);
const job=service.generate(flat.files[0]);await new Promise(r=>setImmediate(r));let worker=created.at(-1);
ipc.emit('thumbnail-result',{sender:worker.webContents},{jobId:worker.job.jobId,data:'image'});assert.equal(await job,'image');
const cancelled=service.generate(flat.files[1]);service.cancel();await assert.rejects(cancelled,/cancelled/);assert.equal(worker.dead,true);
await assert.rejects(service.generate(flat.files[2]),/too long/);assert.equal(created.at(-1).dead,true);
const crash=service.generate(flat.files[3]);await new Promise(r=>setImmediate(r));created.at(-1).webContents.emit('render-process-gone');await assert.rejects(crash,/stopped/);
service.completed=49;const recycled=service.generate(flat.files[4]);await new Promise(r=>setImmediate(r));worker=created.at(-1);ipc.emit('thumbnail-result',{sender:worker.webContents},{jobId:worker.job.jobId,data:'image'});await recycled;assert.equal(worker.dead,true);
console.log('PASS: thumbnail completion, cancellation, timeout, crash recovery and process recycling.');
