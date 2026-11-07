const {app,BrowserWindow,ipcMain,dialog,shell}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {scanFiles}=require('./scan-files.cjs');
const {ThumbnailService}=require('./thumbnail-service.cjs');
const {DiskCache}=require('./disk-cache.cjs');
const crypto=require('node:crypto');
let preferences, normalizeSettings, thumbnailSignature, cache, settingsWrites=Promise.resolve();
function persistSettings(next=preferences) {
 const target=settingsPath(), temp=target+'.tmp';
 const data=JSON.stringify({folder:next.rememberFolder?selectedFolder:undefined,preferences:next},null,2);
 const operation=settingsWrites.then(async()=>{await fs.writeFile(temp,data);await fs.rename(temp,target);});
 settingsWrites=operation.catch(()=>{});return operation;
}
let thumbnails, thumbnailGeneration=0;
let win, selectedFolder, records=new Map();
const smokeIndex=app.isPackaged?-1:process.argv.indexOf('--smoke-test');
const smokeFolder=smokeIndex>=0?process.argv[smokeIndex+1]:null;
if(smokeFolder)app.setPath('userData',path.join(__dirname,'work','test-profile'));
const settingsPath=()=>path.join(app.getPath('userData'),'settings.json');
const cacheDir=()=>path.join(app.getPath('userData'),'thumbnails-v1');
function record(id){const r=records.get(id);if(!r)throw Error('File is no longer in the current folder.');return r;}
async function readModel(id){const r=record(id);const stat=await fs.lstat(r.path);if(!stat.isFile()||stat.isSymbolicLink())throw Error('Unsupported file.');if(stat.size>preferences.modelLimitMB*1024*1024)throw Error(`Preview limit is ${preferences.modelLimitMB} MB per file. Change it in Settings.`);return fs.readFile(r.path);}
app.whenReady().then(async()=>{
 ({normalizeSettings,thumbnailSignature}=await import('./settings-schema.mjs'));
 preferences=normalizeSettings();
 cache=new DiskCache(cacheDir());await cache.init();
 thumbnails=new ThumbnailService(BrowserWindow,ipcMain);
 try{const saved=JSON.parse(await fs.readFile(settingsPath(),'utf8'));preferences=normalizeSettings(saved.preferences);if(preferences.rememberFolder&&typeof saved.folder==='string')selectedFolder=saved.folder;}catch{}
 if(preferences.cacheMode==='disk')await cache.prune(preferences);
 if(smokeFolder)selectedFolder=smokeFolder;
 ipcMain.handle('settings',()=>({folder:selectedFolder,preferences,version:app.getVersion()}));
 ipcMain.handle('save-settings',async(_event,input)=>{
  const next=normalizeSettings(input);await persistSettings(next);preferences=next;
  ++thumbnailGeneration;thumbnails.cancel();
  if(preferences.cacheMode==='disk')await cache.prune(preferences);
  return {preferences,version:app.getVersion()};
 });
 ipcMain.handle('cache-stats',()=>cache.stats());
 ipcMain.handle('clear-cache',async()=>{++thumbnailGeneration;thumbnails.cancel();return cache.clear();});
 ipcMain.handle('choose-folder',async()=>{const result=await dialog.showOpenDialog(win,{properties:['openDirectory']});if(result.canceled)return null;selectedFolder=result.filePaths[0];await persistSettings();return selectedFolder;});
 ipcMain.handle('scan',async(_event,folder,recursive)=>{
  if(folder!==selectedFolder)throw Error('Choose a folder first.');
  ++thumbnailGeneration; thumbnails.cancel();
  const result=await scanFiles(folder,recursive,preferences.scanLimit);
  records=result.records;
  return {files:result.files,warnings:result.warnings,truncated:result.truncated};
 });
 ipcMain.handle('read',(_e,id)=>readModel(id));
 ipcMain.handle('cancel-thumbnails',()=>{++thumbnailGeneration;thumbnails.cancel();});
 ipcMain.handle('thumbnail',async(_e,id)=>{
  const file=record(id), generation=thumbnailGeneration;
  const config={...preferences};
  const key=crypto.createHash('sha256').update(id+thumbnailSignature(config)).digest('hex');
  const cached=await cache.get(key,config);if(cached)return cached;
  if(file.size>config.modelLimitMB*1024*1024)throw Error(`Preview limit is ${config.modelLimitMB} MB per file.`);
  if(generation!==thumbnailGeneration)throw Error('Thumbnail generation cancelled.');
  record(id);
  const data=await thumbnails.generate(file,config);
  if(typeof data!=='string'||!data.startsWith('data:image/png;base64,')||data.length>5000000)throw Error('Invalid thumbnail');
  if(generation!==thumbnailGeneration)throw Error('Thumbnail generation cancelled.');
  await cache.put(key,data,config);
  return data;
 });
 ipcMain.handle('reveal',(_e,id)=>shell.showItemInFolder(record(id).path));
 const title=`ModelBrowser v${app.getVersion()}`;
 win=new BrowserWindow({width:1400,height:900,minWidth:850,minHeight:600,backgroundColor:'#11151d',title,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.on('page-title-updated',event=>{event.preventDefault();win.setTitle(title);});
 win.on('closed',()=>{thumbnails.cancel();app.quit();});
 win.removeMenu();win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
 await win.loadFile('index.html');
 if(smokeFolder){try{const result=await win.webContents.executeJavaScript(`(async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));for(let i=0;i<200&&!document.querySelector('.card');i++)await sleep(100);const cards=[...document.querySelectorAll('.card')];if(cards.length!==2)throw Error('Expected two model cards, got '+cards.length);const results=[];for(const card of cards){card.click();for(let i=0;i<200;i++){await sleep(100);if(document.body.dataset.preview===card.dataset.id)break;if(document.body.dataset.preview==='error')throw Error(document.querySelector('#previewStatus').textContent);}if(document.body.dataset.preview!==card.dataset.id)throw Error('Preview timed out');results.push(document.querySelector('#modelName').textContent);}for(let i=0;i<200&&document.querySelectorAll('.card img').length<2;i++)await sleep(100);if(document.querySelectorAll('.card img').length!==2)throw Error('Missing thumbnails');return {models:results,thumbnails:2,canvas:document.querySelectorAll('canvas').length};})()`);console.log('SMOKE PASS',JSON.stringify(result));app.exit(0);}catch(e){console.error('SMOKE FAIL',e);app.exit(1);}}
});
app.on('window-all-closed',()=>app.quit());

