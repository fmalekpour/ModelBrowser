const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
async function build() {
  const output = path.join(__dirname, 'dist', 'ModelBrowser');
  const runtime = path.join(__dirname, 'node_modules', 'electron', 'dist');
  const appOnly = process.argv.includes('--app-only');
  await fs.access(path.join(runtime, 'electron.exe'));
  await fs.mkdir(output, { recursive: true });
  if (appOnly) {
    await fs.access(path.join(output, 'ModelBrowser.exe'));
    if ((await fs.readFile(path.join(output,'version'),'utf8')) !== (await fs.readFile(path.join(runtime,'version'),'utf8'))) throw Error('Runtime changed; run a full package build.');
  } else {
    await fs.cp(runtime, output, { recursive: true, force: true });
    await fs.rename(path.join(output, 'electron.exe'), path.join(output, 'ModelBrowser.exe'));
  }
  const appDir = path.join(output, 'resources', 'app');
  await fs.mkdir(appDir, { recursive: true });
  for (const file of ['main.cjs', 'preload.cjs', 'renderer.js', 'index.html', 'style.css', 'README.md', 'model-engine.js', 'library-state.mjs', 'scan-files.cjs', 'thumbnail-service.cjs', 'thumbnail-preload.cjs', 'thumbnail.html', 'thumbnail-renderer.js', 'settings-schema.mjs', 'settings-view.js', 'disk-cache.cjs']) await fs.copyFile(path.join(__dirname, file), path.join(appDir, file));
  const {version}=JSON.parse(await fs.readFile(path.join(__dirname,'package.json'),'utf8'));
  await fs.writeFile(path.join(appDir, 'package.json'), JSON.stringify({name:'model-browser', productName:'ModelBrowser', version, main:'main.cjs'}, null, 2));
  if (!appOnly) await fs.cp(path.join(__dirname, 'node_modules', 'three'), path.join(appDir, 'node_modules', 'three'), { recursive: true, force: true });
  const acl = spawnSync('icacls.exe', [output, '/grant', '*S-1-15-2-1:(OI)(CI)(RX)'], { encoding: 'utf8', windowsHide: true });
  if (acl.status !== 0) throw Error(acl.stderr || acl.stdout);
  console.log('Built: ' + path.join(output, 'ModelBrowser.exe'));
}
build().catch(error => { console.error(error); process.exitCode = 1; });
