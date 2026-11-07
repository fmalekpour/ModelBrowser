const path = require('node:path');

class ThumbnailService {
  constructor(BrowserWindow, ipcMain, timeoutMs = 30000) {
    this.BrowserWindow = BrowserWindow;
    this.window = null; this.pending = null; this.sequence = 0; this.completed = 0; this.timeoutMs = timeoutMs;
    ipcMain.on('thumbnail-ready', event => {
      if (event.sender === this.window?.webContents && this.pending) {
        this.window.webContents.send('thumbnail-job', this.pending.job);
      }
    });
    ipcMain.on('thumbnail-result', (event, result) => {
      if (event.sender !== this.window?.webContents || result?.jobId !== this.pending?.job.jobId) return;
      const pending = this.pending; this.pending = null; clearTimeout(pending.timer);
      this.completed++;
      if (result.error) pending.reject(Error(result.error)); else pending.resolve(result.data);
      // Periodically release the entire renderer, including parser and GPU caches.
      if (this.completed >= (pending.job.settings?.workerRecycle || 50)) this.cancel();
    });
  }
  cancel(reason = 'Thumbnail generation cancelled.') {
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(Error(reason)); this.pending = null; }
    const previous = this.window; this.window = null; this.completed = 0;
    if (previous && !previous.isDestroyed()) previous.destroy();
  }
  generate(file, settings) {
    if (this.pending) return Promise.reject(Error('Thumbnail worker is busy.'));
    return new Promise((resolve, reject) => {
      const job = { jobId: ++this.sequence, file, settings };
      this.pending = { job, resolve, reject, timer: setTimeout(() => this.cancel('Thumbnail took too long. Select the model to preview it.'), settings ? settings.thumbnailTimeout*1000 : this.timeoutMs) };
      if (this.window) { this.window.webContents.send('thumbnail-job', job); return; }
      const worker = this.window = new this.BrowserWindow({ show: false, width: 320, height: 240,
        webPreferences: { preload: path.join(__dirname, 'thumbnail-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, partition: 'thumbnail-worker' }
      });
      worker.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      worker.webContents.on('will-navigate', event => event.preventDefault());
      worker.webContents.on('render-process-gone', () => { if (worker === this.window) this.cancel('Thumbnail worker stopped. Select the model to preview it.'); });
      worker.loadFile(path.join(__dirname, 'thumbnail.html')).catch(error => { if (worker === this.window) this.cancel(error.message); });
    });
  }
}
module.exports = { ThumbnailService };
