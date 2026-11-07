const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('thumbnailWorker', {
  read: id => ipcRenderer.invoke('read', id),
  onJob: callback => ipcRenderer.on('thumbnail-job', (_event, job) => callback(job)),
  ready: () => ipcRenderer.send('thumbnail-ready'),
  complete: result => ipcRenderer.send('thumbnail-result', result)
});
