import { makeStage, parseModel, fit, dispose } from './model-engine.js';
import { pageOf, rememberImage } from './library-state.mjs';
import { DEFAULTS, normalizeSettings } from './settings-schema.mjs';
import { createSettingsPage } from './settings-view.js';
const $ = id => document.getElementById(id);
const api = window.desktop;
let preferences={...DEFAULTS};
let folder, files = [], selected, currentModel, scanVersion = 0, previewVersion = 0;
let page = 0, gridVersion = 0, thumbQueue = [], thumbRunning = false;
const images = new Map(), failures = new Map(), filesById = new Map();
const formatSize = n => n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
function message(error) { return String(error?.message || error).replace(/^Error invoking remote method '[^']+': Error: /, ''); }
let stage;
try { stage = makeStage($('viewport')); }
catch (error) { $('previewStatus').textContent = '3D rendering could not start: ' + message(error); }
async function loadModel(file, version) {
  const bytes = await api.read(file.id);
  if (version !== previewVersion) throw Error('Preview cancelled.');
  return parseModel(bytes, file.type, preferences);
}

async function select(file) {
  $('wire').checked=preferences.wireframe;
  selected = file; const version = ++previewVersion;
  document.body.dataset.preview = 'loading';
  document.querySelectorAll('.card').forEach(card => card.classList.toggle('selected', card.dataset.id === file.id));
  $('modelName').textContent = file.name; $('modelPath').textContent = file.relative;
  $('badge').textContent = file.type; $('fileSize').textContent = formatSize(file.size);
  $('triangles').textContent = '—'; $('dimensions').textContent = '—'; $('reveal').disabled = false;
  $('previewStatus').textContent = 'Loading model…';
  if (currentModel) { stage?.scene.remove(currentModel); dispose(currentModel); currentModel = null; stage?.render(); }
  try {
    if (!stage) throw Error('3D rendering is unavailable.');
    const model = await loadModel(file, version);
    if (version !== previewVersion) { dispose(model); return; }
    currentModel = model; stage.scene.add(model); applyWireframe(); fit(stage, model, preferences.defaultView);
    const { size, triangles } = model.userData;
    $('triangles').textContent = triangles.toLocaleString();
    $('dimensions').textContent = [size.x, size.z, size.y].map(n => n.toLocaleString(undefined, { maximumFractionDigits: 2 })).join(' × ');
    $('previewStatus').textContent = ''; document.body.dataset.preview = file.id;
  } catch (error) {
    if (version !== previewVersion) return;
    $('previewStatus').textContent = message(error); document.body.dataset.preview = 'error';
  }
}

function updateThumb(id, generated) {
  const card = document.querySelector(`[data-id="${id}"]`); if (!card) return;
  const holder = card.querySelector('.thumb'); holder.replaceChildren();
  if (generated || images.has(id)) { const img = new Image(); img.src = generated || images.get(id); img.alt = ''; holder.append(img); }
  else if (failures.has(id)) { holder.textContent = 'Preview unavailable'; card.classList.add('failed'); card.title = failures.get(id); }
  else holder.textContent = preferences.autoThumbnails ? 'Generating preview…' : 'Select to preview';
}

async function pumpThumbnails() {
  if (thumbRunning) return;
  thumbRunning = true;
  try {
    while (thumbQueue.length) {
      const { file, version } = thumbQueue.shift();
      if (version !== gridVersion || images.has(file.id) || failures.has(file.id)) continue;
      try {
        const data = await api.thumbnail(file.id);
        if (version === gridVersion) {
          if(preferences.cacheMode!=='off')rememberImage(images, file.id, data, preferences.memoryCache);
          updateThumb(file.id,data);
        }
      } catch (error) {
        if (version === gridVersion) {failures.set(file.id, message(error));updateThumb(file.id);}
      }
    }
  } finally { thumbRunning = false; }
}

const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    if (!$('grid').contains(entry.target)) continue;
    const file = filesById.get(entry.target.dataset.id);
    if (preferences.autoThumbnails && file && !images.has(file.id) && !failures.has(file.id)) thumbQueue.push({ file, version: gridVersion });
    observer.unobserve(entry.target);
  }
  pumpThumbnails();
}, { root: $('grid'), rootMargin: '250px' });

function renderGrid() {
  ++gridVersion; observer.disconnect(); thumbQueue = []; api.cancelThumbnails().catch(() => {}); $('grid').replaceChildren();
  const query = $('search').value.toLowerCase(), type = $('type').value;
  const result = pageOf(files, query, type, page, preferences.pageSize);
  page = result.page; const visible = result.items;
  $('pageLabel').textContent = `Page ${page + 1} of ${result.pages}`;
  $('previousPage').disabled = page === 0; $('nextPage').disabled = page + 1 >= result.pages;
  $('pagination').hidden = result.total === 0;
  $('count').textContent = `${result.total.toLocaleString()} of ${files.length.toLocaleString()} models`;
  $('empty').hidden = visible.length > 0;
  if (folder) {
    $('empty').querySelector('h2').textContent = files.length ? 'No matching models' : 'No models in this folder';
    $('empty').querySelector('p').textContent = files.length ? 'Try a different search or format.' : 'Try another folder or enable Subfolders.';
  }
  const fragment = document.createDocumentFragment();
  for (const file of visible) {
    const card = document.createElement('button'); card.className = 'card'; card.dataset.id = file.id; card.title = file.relative;
    card.setAttribute('aria-label', `Preview ${file.name}`);
    card.classList.toggle('selected', selected?.id === file.id);
    const thumb = document.createElement('div'); thumb.className = 'thumb'; thumb.textContent = 'Waiting for preview';
    const body = document.createElement('div'); body.className = 'card-body';
    const title = document.createElement('strong'); title.textContent = file.name;
    const meta = document.createElement('small'); meta.textContent = `${file.type} · ${formatSize(file.size)}`;
    body.append(title, meta); card.append(thumb, body); card.addEventListener('click', () => select(file)); fragment.append(card);
  }
  $('grid').append(fragment);
  for (const card of $('grid').children) { updateThumb(card.dataset.id); observer.observe(card); }
}

async function scan() {
  if (!folder) return;
  const version = ++scanVersion; ++previewVersion; thumbQueue = []; observer.disconnect();
  selected = null; document.body.dataset.preview = ''; $('reveal').disabled = true;
  if (currentModel) { stage?.scene.remove(currentModel); dispose(currentModel); currentModel = null; stage?.render(); }
  $('modelName').textContent = 'Select a model'; $('modelPath').textContent = 'Your interactive preview appears here.';
  $('previewStatus').textContent = 'Select a model to explore';
  for (const id of ['fileSize', 'triangles', 'dimensions']) $(id).textContent = '—';
  files = []; page = 0; filesById.clear(); images.clear(); failures.clear(); renderGrid(); $('empty').hidden = true;
  $('status').textContent = 'Scanning folder…'; $('folder').textContent = folder; $('folder').title = folder;
  // Serialize folder changes to keep backend authorization and file records consistent.
  for (const id of ['choose', 'emptyChoose', 'refresh', 'recursive', 'openSettings']) $(id).disabled = true;
  try {
    const result = await api.scan(folder, $('recursive').checked);
    if (version !== scanVersion) return;
    files = result.files; files.forEach(file => filesById.set(file.id, file)); sortFiles();renderGrid();
    $('status').textContent = result.truncated ? `Showing the first ${preferences.scanLimit.toLocaleString()} files. Adjust the limit in Settings.` : result.warnings.length ? result.warnings.join(' · ') : `${files.length.toLocaleString()} models · Preview limit: ${preferences.modelLimitMB} MB/file`;
  } catch (error) { $('status').textContent = message(error); renderGrid(); }
  finally { for (const id of ['choose', 'emptyChoose', 'refresh', 'recursive', 'openSettings']) $(id).disabled = false; }
}

async function chooseFolder() {
  try { const chosen = await api.chooseFolder(); if (chosen) { folder = chosen; $('search').value = ''; await scan(); } }
  catch (error) { $('status').textContent = message(error); }
}
function applyWireframe() {
  currentModel?.traverse(item => { for (const material of [].concat(item.material || [])) material.wireframe = $('wire').checked; });
  stage?.render();
}
$('choose').onclick = chooseFolder; $('emptyChoose').onclick = chooseFolder;
$('refresh').onclick = scan; $('recursive').onchange = scan;
let searchTimer;
$('search').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { page = 0; renderGrid(); }, 150); };
$('type').onchange = () => { page = 0; renderGrid(); };
$('previousPage').onclick = () => { page--; renderGrid(); $('grid').scrollTop = 0; };
$('nextPage').onclick = () => { page++; renderGrid(); $('grid').scrollTop = 0; };
$('reset').onclick = () => stage && fit(stage, currentModel, preferences.defaultView);
document.querySelectorAll('[data-view]').forEach(button => { button.onclick = () => stage && fit(stage, currentModel, button.dataset.view); });
$('wire').onchange = applyWireframe;
$('reveal').onclick = async () => { if (selected) try { await api.reveal(selected.id); } catch (error) { $('status').textContent = message(error); } };
$('divider').onpointerdown = event => { $('divider').setPointerCapture(event.pointerId); };
$('divider').onpointermove = event => {
  if ($('divider').hasPointerCapture(event.pointerId)) $('preview').style.width = Math.max(320, Math.min(innerWidth - 380, innerWidth - event.clientX)) + 'px';
};
$('divider').onpointerup = event => { $('divider').releasePointerCapture(event.pointerId); };
$('divider').onkeydown = event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); $('preview').style.width = Math.max(320, Math.min(innerWidth - 380, $('preview').clientWidth + (event.key === 'ArrowLeft' ? 20 : -20))) + 'px'; } };
function sortFiles() {
  const collator=new Intl.Collator(undefined,{numeric:true});
  files.sort((a,b)=>{const result=preferences.sortBy==='name'?collator.compare(a.name,b.name):a[preferences.sortBy]-b[preferences.sortBy]||collator.compare(a.name,b.name);return preferences.sortDescending?-result:result;});
}
function applyPreferences() {
  document.documentElement.style.setProperty('--card-width',preferences.thumbnailSize+'px');
  document.documentElement.style.setProperty('--thumb-height',Math.round(preferences.thumbnailSize*.75)+'px');
  document.documentElement.style.setProperty('--card-height',(Math.round(preferences.thumbnailSize*.75)+62)+'px');
  $('preview').style.width=preferences.previewWidth+'px';
  $('recursive').checked=preferences.recursive;$('wire').checked=preferences.wireframe;
  stage?.configure?.(preferences);
  if(currentModel&&selected?.type==='STL')currentModel.traverse(item=>{for(const material of [].concat(item.material||[]))material.color?.set(preferences.modelColor);});
  applyWireframe();
}
let cacheCleared=false;
const settingsPage=createSettingsPage({
  api,getSettings:()=>preferences,
  onSave:async next=>{
    const needsScan=preferences.scanLimit!==next.scanLimit||$('recursive').checked!==next.recursive;
    preferences=normalizeSettings(next);images.clear();failures.clear();page=0;applyPreferences();sortFiles();
    if(needsScan&&folder)await scan();else renderGrid();
    if(currentModel)fit(stage,currentModel,preferences.defaultView);
  },
  onClear:async()=>{
    ++gridVersion;thumbQueue=[];observer.disconnect();await api.clearCache();images.clear();failures.clear();cacheCleared=true;
  }
});
settingsPage.onClose(()=>{if(cacheCleared){cacheCleared=false;renderGrid();}});
api.settings().then(settings => {
  preferences=normalizeSettings(settings.preferences);applyPreferences();
  if(settings.version){document.title=`ModelBrowser v${settings.version}`;document.querySelector('.brand strong').textContent=`ModelBrowser v${settings.version}`;settingsPage.setVersion(settings.version);}
  if (settings.folder) { folder = settings.folder; scan(); }
}).catch(error => { $('status').textContent = message(error); });
