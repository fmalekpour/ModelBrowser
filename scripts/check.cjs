const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root=path.resolve(__dirname,'..');
for(const directory of [root,path.join(root,'scripts'),path.join(root,'tests')]) {
  for(const file of fs.readdirSync(directory)) if(/\.(cjs|mjs|js)$/.test(file)) {
    const result=spawnSync(process.execPath,['--check',path.join(directory,file)],{stdio:'inherit',windowsHide:true});
    if(result.status!==0)process.exit(result.status||1);
  }
}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json')));
if(pkg.version!==lock.version||pkg.version!==lock.packages[''].version)throw Error('package.json and lockfile versions must match');
console.log('Syntax and manifest checks passed.');
