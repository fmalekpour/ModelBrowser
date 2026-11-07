const fs=require('node:fs/promises');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
async function main(){
 const {zipSync,strToU8}=await import('three/addons/libs/fflate.module.js');
 const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 const result=spawnSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'-C',root,'ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8',windowsHide:true});
 if(result.status!==0)throw Error(result.stderr||'Git is required to create a source archive.');
 const names=[...new Set(result.stdout.split('\0').filter(Boolean))].sort();
 const entries={},hashes=[];
 for(const name of names){
  if(/^(node_modules|dist|work|\.test-work|\.cache|\.git)\//.test(name)||/(^|\/)\.env(?:\.|$)|\.(exe|pfx|p12|pem|log)$/i.test(name))throw Error('Unexpected generated or sensitive file in source manifest: '+name);
  let data;try{data=await fs.readFile(path.join(root,name));}catch(error){if(error.code==='ENOENT')continue;throw error;}
  if(data.length>5*1024*1024)throw Error('Unexpected large source file: '+name);
  entries[`ModelBrowser-${version}/${name}`]=new Uint8Array(data);
  hashes.push(createHash('sha256').update(data).digest('hex')+'  '+name);
 }
 entries[`ModelBrowser-${version}/SOURCE_SHA256SUMS.txt`]=strToU8(hashes.join('\n')+'\n');
 await fs.mkdir(path.join(root,'dist'),{recursive:true});
 const target=path.join(root,'dist',`ModelBrowser-${version}-source.zip`);
 await fs.writeFile(target,zipSync(entries,{level:9}));console.log(`Created ${target} (${hashes.length} source files)`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
