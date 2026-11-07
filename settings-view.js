import {SETTINGS, DEFAULTS} from './settings-schema.mjs';

export function createSettingsPage({api, getSettings, onSave, onClear}) {
  const make=(tag,text,className)=>{const element=document.createElement(tag);if(text)element.textContent=text;if(className)element.className=className;return element;};
  const button=make('button','⚙ Settings');button.id='openSettings';button.type='button';
  document.querySelector('header').insertBefore(button,document.getElementById('folder'));
  const dialog=make('dialog',null,'settings-dialog');dialog.id='settingsDialog';dialog.setAttribute('aria-labelledby','settingsTitle');
  const form=make('form');
  const heading=make('div',null,'settings-heading');const title=make('h2','Settings');title.id='settingsTitle';
  const version=make('span','', 'settings-version');version.id='settingsVersion';heading.append(title,version);
  const intro=make('p','Choose how ModelBrowser browses, renders, and stores previews. Changes apply when you save.','settings-intro');
  const body=make('div',null,'settings-body');
  const fields=new Map();let group,fieldset;
  for(const field of SETTINGS) {
    if(group!==field.group){group=field.group;fieldset=make('fieldset');fieldset.append(make('legend',group));body.append(fieldset);}
    const row=make('div',null,'setting-row');const description=make('div');const label=make('label',field.label);label.htmlFor='setting-'+field.key;description.append(label);
    if(field.help){const help=make('p',field.help);help.id='help-'+field.key;description.append(help);}
    const control=make(field.type==='select'?'select':'input');control.id='setting-'+field.key;control.name=field.key;
    if(field.type==='select')for(const [value,text] of Object.entries(field.options)){const option=make('option',text);option.value=value;control.append(option);}
    else {control.type=field.type==='boolean'?'checkbox':field.type;if(field.type==='number'){control.min=field.min;control.max=field.max;control.step=field.step;control.required=true;}}
    if(field.help)control.setAttribute('aria-describedby','help-'+field.key);
    const holder=make('div',null,'setting-control');holder.append(control);if(field.unit)holder.append(make('span',field.unit));
    row.append(description,holder);fieldset.append(row);fields.set(field.key,control);
  }
  const cache=make('fieldset');cache.append(make('legend','Cache management'));
  const usage=make('p','Reading cache usage…');usage.id='cacheUsage';
  const location=make('p','', 'cache-location');location.id='cacheLocation';
  const clear=make('button','Clear thumbnail cache');clear.type='button';clear.id='clearCache';
  cache.append(usage,location,clear,make('p','Removes generated thumbnail images from memory and disk. Your model files are never changed.','settings-intro'));body.append(cache);
  const footer=make('div',null,'settings-footer');const status=make('span');status.id='settingsStatus';status.setAttribute('role','status');
  const reset=make('button','Restore defaults');reset.type='button';reset.id='resetSettings';
  const cancel=make('button','Cancel');cancel.type='button';cancel.id='cancelSettings';
  const save=make('button','Save changes','primary');save.type='submit';save.id='saveSettings';footer.append(status,reset,cancel,save);
  form.append(heading,intro,body,footer);dialog.append(form);document.body.append(dialog);
  function fill(settings){for(const field of SETTINGS){const control=fields.get(field.key);if(field.type==='boolean')control.checked=settings[field.key];else control.value=String(settings[field.key]);}}
  function updateUsage(stats){usage.textContent=`${stats.count.toLocaleString()} thumbnails · ${(stats.bytes/1048576).toFixed(1)} MB on disk`;location.textContent=stats.directory;}
  async function refreshUsage(){try{updateUsage(await api.cacheStats());}catch(error){usage.textContent='Could not read cache: '+error.message;}}
  button.onclick=()=>{fill(getSettings());status.textContent='';dialog.showModal();body.scrollTop=0;refreshUsage();};
  cancel.onclick=()=>dialog.close();
  reset.onclick=()=>{fill(DEFAULTS);status.textContent='Defaults loaded. Save to apply them.';};
  clear.onclick=async()=>{
    clear.disabled=true;status.textContent='Clearing thumbnails…';
    try {await onClear();await refreshUsage();status.textContent='Thumbnail cache cleared. Images regenerate when you return to the library.';}
    catch(error){status.textContent='Could not clear cache: '+error.message;}finally{clear.disabled=false;}
  };
  form.onsubmit=async event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const next={};for(const field of SETTINGS){const control=fields.get(field.key);next[field.key]=field.type==='boolean'?control.checked:field.type==='number'?Number(control.value):control.value;}
    save.disabled=true;cancel.disabled=true;reset.disabled=true;clear.disabled=true;status.textContent='Saving…';
    try {const result=await api.saveSettings(next);await onSave(result.preferences);dialog.close();}
    catch(error){status.textContent='Could not save settings: '+error.message;}
    finally{save.disabled=false;cancel.disabled=false;reset.disabled=false;clear.disabled=false;}
  };
  return {setVersion:value=>{version.textContent='ModelBrowser v'+value;},onClose:callback=>dialog.addEventListener('close',callback)};
}
