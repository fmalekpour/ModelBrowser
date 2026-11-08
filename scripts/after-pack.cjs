const path=require('node:path');
const {auditPackage}=require('./package-audit.cjs');
module.exports=async context=>{
  await auditPackage(path.join(context.appOutDir,'resources','app.asar'),context.packager.appInfo.version);
};
