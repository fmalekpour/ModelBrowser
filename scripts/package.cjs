const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const cli = require.resolve('electron-builder/cli.js');
const args = [cli, '--config', path.join(root, 'electron-builder.json'), '--win', '--x64', '--publish', 'never'];
if (process.argv.includes('--dir')) args.push('--dir');
const env = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false',
  ELECTRON_BUILDER_CACHE: path.join(root, '.cache', 'electron-builder'),
  electron_config_cache: path.join(root, '.cache', 'electron'),
  npm_config_cache: path.join(root, '.cache', 'npm') };
const pathKey=Object.keys(env).find(key=>key.toLowerCase()==='path')||'PATH';
env[pathKey]=path.dirname(process.execPath)+path.delimiter+(env[pathKey]||'');
const result = spawnSync(process.execPath, args, {
  cwd: root, stdio: 'inherit', windowsHide: true,
  env
});
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
