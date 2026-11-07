const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {createReadStream}=require('node:fs');
const root=path.resolve(__dirname,'..');
async function main(){
 const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 const dir=path.join(root,'dist');
 const names=[`ModelBrowser-Setup-${version}-x64.exe`,`ModelBrowser-${version}-source.zip`];
 const lines=[];
 for(const name of names){const hash=createHash('sha256');for await(const chunk of createReadStream(path.join(dir,name)))hash.update(chunk);lines.push(hash.digest('hex')+'  '+name);}
 await fs.writeFile(path.join(dir,'SHA256SUMS.txt'),lines.join('\n')+'\n');
 console.log(lines.join('\n'));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
