export const SETTINGS = [
  { group:'Library', key:'thumbnailSize', label:'Thumbnail card width', type:'number', min:120, max:360, step:10, default:170, unit:'px' },
  { group:'Library', key:'pageSize', label:'Models per page', type:'number', min:12, max:240, step:1, default:60, help:'Larger pages use more memory.' },
  { group:'Library', key:'sortBy', label:'Sort models by', type:'select', options:{name:'Name',modified:'Last modified',size:'File size'}, default:'name' },
  { group:'Library', key:'sortDescending', label:'Reverse sort order', type:'boolean', default:false },
  { group:'Library', key:'recursive', label:'Include subfolders by default', type:'boolean', default:false },
  { group:'Library', key:'rememberFolder', label:'Reopen the last folder on startup', type:'boolean', default:true },
  { group:'Library', key:'autoThumbnails', label:'Generate thumbnails automatically', type:'boolean', default:true, help:'Turn off to browse filenames with minimal background work.' },
  { group:'Library', key:'scanLimit', label:'Maximum files per scan', type:'number', min:100, max:100000, step:1, default:20000 },
  { group:'Thumbnails & cache', key:'thumbnailResolution', label:'Rendered thumbnail resolution', type:'select', options:{160:'160 × 120',320:'320 × 240',480:'480 × 360',640:'640 × 480'}, default:'320', help:'Higher resolution is sharper but takes more memory and disk space.' },
  { group:'Thumbnails & cache', key:'thumbnailView', label:'Thumbnail camera angle', type:'select', options:{iso:'Isometric',front:'Front',top:'Top',right:'Right'}, default:'iso' },
  { group:'Thumbnails & cache', key:'cacheMode', label:'Cache policy', type:'select', options:{disk:'Memory and disk (persistent)',session:'Memory only (this session)',off:'No thumbnail cache'}, default:'disk', help:'Memory-only and no-cache modes leave existing disk files untouched; use Clear cache to remove them.' },
  { group:'Thumbnails & cache', key:'memoryCache', label:'Thumbnail images kept in memory', type:'number', min:12, max:600, step:1, default:120 },
  { group:'Thumbnails & cache', key:'diskCacheMB', label:'Maximum disk cache', type:'number', min:16, max:4096, step:1, default:512, unit:'MB', help:'Least recently used thumbnails are removed when the limit is reached.' },
  { group:'Thumbnails & cache', key:'cacheDays', label:'Remove thumbnails unused for', type:'number', min:0, max:365, step:1, default:30, unit:'days', help:'0 keeps thumbnails until the size limit is reached.' },
  { group:'Preview', key:'defaultView', label:'Initial camera angle', type:'select', options:{iso:'Isometric',front:'Front',top:'Top',right:'Right'}, default:'iso' },
  { group:'Preview', key:'previewWidth', label:'Preview panel width', type:'number', min:320, max:900, step:10, default:440, unit:'px' },
  { group:'Preview', key:'background', label:'Viewport background', type:'color', default:'#19212e' },
  { group:'Preview', key:'modelColor', label:'STL model color', type:'color', default:'#9bd7cc', help:'3MF files retain their own materials. Also applies to STL thumbnails.' },
  { group:'Preview', key:'lighting', label:'Lighting intensity', type:'number', min:0.25, max:3, step:0.05, default:1 },
  { group:'Preview', key:'pixelRatio', label:'Maximum display pixel ratio', type:'number', min:1, max:3, step:0.5, default:2, help:'Lower values reduce GPU load on high-resolution displays.' },
  { group:'Preview', key:'wireframe', label:'Start previews in wireframe mode', type:'boolean', default:false },
  { group:'Mouse & motion', key:'rotateSpeed', label:'Mouse rotation speed', type:'number', min:0.1, max:3, step:0.1, default:1 },
  { group:'Mouse & motion', key:'zoomSpeed', label:'Mouse zoom speed', type:'number', min:0.1, max:3, step:0.1, default:1 },
  { group:'Mouse & motion', key:'panSpeed', label:'Mouse pan speed', type:'number', min:0.1, max:3, step:0.1, default:1 },
  { group:'Mouse & motion', key:'autoRotate', label:'Automatically rotate the preview', type:'boolean', default:false },
  { group:'Mouse & motion', key:'autoRotateSpeed', label:'Automatic rotation speed', type:'number', min:0.1, max:5, step:0.1, default:1 },
  { group:'Performance', key:'modelLimitMB', label:'Maximum model file size', type:'number', min:10, max:500, step:1, default:150, unit:'MB', help:'Large or highly compressed models can require much more RAM than their file size.' },
  { group:'Performance', key:'thumbnailTimeout', label:'Thumbnail timeout', type:'number', min:5, max:120, step:1, default:30, unit:'seconds' },
  { group:'Performance', key:'workerRecycle', label:'Restart thumbnail worker after', type:'number', min:10, max:200, step:1, default:50, unit:'models', help:'Periodically releases parser and GPU memory.' }
];
export const DEFAULTS = Object.freeze(Object.fromEntries(SETTINGS.map(field=>[field.key,field.default])));
export function normalizeSettings(input = {}) {
  const result = {};
  for (const f of SETTINGS) {
    const value = input?.[f.key];
    if (f.type === 'boolean') result[f.key] = typeof value === 'boolean' ? value : f.default;
    else if (f.type === 'select') result[f.key] = Object.hasOwn(f.options, String(value)) ? String(value) : f.default;
    else if (f.type === 'color') result[f.key] = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : f.default;
    else {
      const number = typeof value === 'number' && Number.isFinite(value) ? value : f.default;
      result[f.key] = Number(Math.max(f.min,Math.min(f.max,Math.round(number/f.step)*f.step)).toFixed(3));
    }
  }
  return result;
}
export function thumbnailSignature(settings) {
  return JSON.stringify(['v2',settings.thumbnailResolution,settings.thumbnailView,settings.modelColor,settings.lighting]);
}
