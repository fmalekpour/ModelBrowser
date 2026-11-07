const fs=require('node:fs/promises');
const path=require('node:path');
class DiskCache {
  constructor(directory) { this.directory=directory;this.entries=new Map();this.bytes=0;this.tail=Promise.resolve();this.lastPrune=0; }
  run(operation) { const task=this.tail.then(operation);this.tail=task.catch(()=>{});return task; }
  async init() {
    await fs.mkdir(this.directory,{recursive:true});
    const names=(await fs.readdir(this.directory)).filter(name=>/^[a-f0-9]{64}\.png$/.test(name));
    for(let i=0;i<names.length;i+=32) await Promise.all(names.slice(i,i+32).map(async name=>{
      const stat=await fs.lstat(path.join(this.directory,name));
      if(stat.isFile()&&!stat.isSymbolicLink()){this.entries.set(name,{size:stat.size,used:stat.mtimeMs});this.bytes+=stat.size;}
    }));
  }
  filename(key) { if(!/^[a-f0-9]{64}$/.test(key))throw Error('Invalid cache key');return key+'.png'; }
  async remove(name) { await fs.rm(path.join(this.directory,name),{force:true});this.bytes-=this.entries.get(name)?.size||0;this.entries.delete(name); }
  async pruneNow(settings) {
    const cutoff=settings.cacheDays ? Date.now()-settings.cacheDays*86400000 : 0;
    for(const [name,entry] of this.entries)if(entry.used<cutoff)await this.remove(name);
    if(this.bytes>settings.diskCacheMB*1048576) {
      for(const [name] of [...this.entries].sort((a,b)=>a[1].used-b[1].used)) {
        if(this.bytes<=settings.diskCacheMB*1048576)break;await this.remove(name);
      }
    }
    this.lastPrune=Date.now();
  }
  prune(settings) { return this.run(()=>this.pruneNow(settings)); }
  get(key,settings) { return this.run(async()=>{
    if(settings.cacheMode!=='disk')return null;
    const name=this.filename(key),entry=this.entries.get(name);if(!entry)return null;
    if(settings.cacheDays&&Date.now()-entry.used>settings.cacheDays*86400000){await this.remove(name);return null;}
    try {const bytes=await fs.readFile(path.join(this.directory,name));entry.used=Date.now();await fs.utimes(path.join(this.directory,name),new Date(),new Date(entry.used));return 'data:image/png;base64,'+bytes.toString('base64');}
    catch(error){if(error.code!=='ENOENT')throw error;this.bytes-=entry.size;this.entries.delete(name);return null;}
  }); }
  put(key,data,settings) { return this.run(async()=>{
    if(settings.cacheMode!=='disk')return;
    const name=this.filename(key),bytes=Buffer.from(data.slice(22),'base64');
    await fs.writeFile(path.join(this.directory,name),bytes);
    this.bytes-=this.entries.get(name)?.size||0;this.bytes+=bytes.length;this.entries.set(name,{size:bytes.length,used:Date.now()});
    if(this.bytes>settings.diskCacheMB*1048576||Date.now()-this.lastPrune>60000)await this.pruneNow(settings);
  }); }
  clear() { return this.run(async()=>{for(const name of [...this.entries.keys()])await this.remove(name);return this.summary();}); }
  summary(){return {count:this.entries.size,bytes:this.bytes,directory:this.directory};}
  stats(){return this.run(()=>this.summary());}
}
module.exports={DiskCache};
