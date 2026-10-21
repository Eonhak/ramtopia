const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ramtopiaWindow', {
  minimize: () => ipcRenderer.send('window-control', 'minimize'),
  close: () => ipcRenderer.send('window-control', 'close'),
  togglePin: () => ipcRenderer.send('window-control', 'pin')
});
