const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{
 chooseFolder:()=>ipcRenderer.invoke('choose-folder'),
 scan:(folder,recursive)=>ipcRenderer.invoke('scan',folder,recursive),
 read:id=>ipcRenderer.invoke('read',id),
 thumbnail:id=>ipcRenderer.invoke('thumbnail',id),
 cancelThumbnails:()=>ipcRenderer.invoke('cancel-thumbnails'),
 settings:()=>ipcRenderer.invoke('settings'),
 saveSettings:settings=>ipcRenderer.invoke('save-settings',settings),
 cacheStats:()=>ipcRenderer.invoke('cache-stats'),
 clearCache:()=>ipcRenderer.invoke('clear-cache'),
 reveal:id=>ipcRenderer.invoke('reveal',id)
});
