const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(root,'.test-work'),{recursive:true});
for(const test of ['fixtures.mjs','check-parsers.mjs','test-large-folders.mjs','test-library-ui.mjs','test-settings.mjs']) {
  const result=spawnSync(process.execPath,[path.join(root,'tests',test)],{cwd:root,stdio:'inherit',windowsHide:true});
  if(result.status!==0)process.exit(result.status||1);
}
console.log('All tests passed. Generated fixtures are in .test-work/ (gitignored).');
