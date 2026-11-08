const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {auditReader}=require('../scripts/package-audit.cjs');
const root=path.resolve(__dirname,'..');
async function main(){
  const read=file=>fs.readFileSync(path.join(root,file),'utf8');
  const result=await auditReader(read,require('../package.json').version);assert(result.browserModules>=10);
  for(const missing of ['node_modules/three/examples/jsm/loaders/STLLoader.js','node_modules/three/examples/jsm/controls/OrbitControls.js','node_modules/three/examples/jsm/libs/fflate.module.js','node_modules/three/examples/jsm/utils/BufferGeometryUtils.js']) {
    await assert.rejects(auditReader(file=>{if(file===missing)throw Error('simulated packaging omission');return read(file);}),/Missing packaged browser dependency/);
  }
  await assert.rejects(auditReader(file=>file==='index.html'?read(file).replace('sha256-','sha256-invalid'):read(file)),/Content policy/);
  console.log('PASS: complete browser import graphs, missing direct/transitive addon detection, CSP import-map validation.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
