const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bench', {
  ready: () => ipcRenderer.send('app-ready')
});
