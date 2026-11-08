const path=require('node:path');
const {createHash}=require('node:crypto');
const asar=require('@electron/asar');

async function auditReader(read, version) {
  const {init,parse}=await import('es-module-lexer/minimal');await init();
  const visited=new Set();
  for(const htmlPath of ['index.html','thumbnail.html']) {
    const html=read(htmlPath);
    const mapSource=html.match(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
    if(!mapSource)throw Error(`Missing import map: ${htmlPath}`);
    const hash=createHash('sha256').update(mapSource).digest('base64');
    if(!html.includes(`'sha256-${hash}'`))throw Error(`Content policy does not authorize the import map: ${htmlPath}`);
    const imports=JSON.parse(mapSource).imports;
    const entries=[...html.matchAll(/<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/gi)].map(match=>match[1]);
    if(!entries.length)throw Error(`Missing browser entry point: ${htmlPath}`);
    function resolve(specifier, parent) {
      if(specifier.startsWith('.'))return path.posix.normalize(path.posix.join(path.posix.dirname(parent),specifier));
      const key=Object.keys(imports).sort((a,b)=>b.length-a.length).find(key=>key===specifier||(key.endsWith('/')&&specifier.startsWith(key)));
      if(!key)throw Error(`Unmapped browser import '${specifier}' from ${parent}`);
      return path.posix.normalize(path.posix.join(path.posix.dirname(htmlPath),imports[key]+specifier.slice(key.length)));
    }
    const localVisited=new Set();
    async function walk(file, parent) {
      if(localVisited.has(file))return;localVisited.add(file);visited.add(file);
      let code;try{code=read(file);}catch(error){throw Error(`Missing packaged browser dependency: ${file} (imported by ${parent})`,{cause:error});}
      const [references]=parse(code,file);
      for(const reference of references) {
        if(reference.d===-2)continue; // import.meta is not a dependency.
        if(!reference.n)throw Error(`Nonliteral import needs an explicit packaging check: ${file}`);
        await walk(resolve(reference.n,file),file);
      }
    }
    for(const entry of entries)await walk(path.posix.join(path.posix.dirname(htmlPath),entry),htmlPath);
  }
  for(const file of ['main.cjs','preload.cjs','thumbnail-preload.cjs','settings-schema.mjs','settings-view.js','LICENSE'])read(file);
  const pkg=JSON.parse(read('package.json'));if(version&&pkg.version!==version)throw Error(`Packaged version ${pkg.version} does not match ${version}`);
  return {version:pkg.version,browserModules:visited.size};
}
async function auditPackage(archive,version) {
  const result=await auditReader(file=>asar.extractFile(archive,path.normalize(file)).toString('utf8'),version);
  console.log(`Packaged browser dependency check passed: v${result.version}, ${result.browserModules} modules, both entry points and CSP import maps.`);
  return result;
}
module.exports={auditReader,auditPackage};
if(require.main===module){
  const root=path.resolve(__dirname,'..');
  auditPackage(process.argv[2]||path.join(root,'dist','win-unpacked','resources','app.asar'),require('../package.json').version).catch(error=>{console.error(error.message);process.exitCode=1;});
}
