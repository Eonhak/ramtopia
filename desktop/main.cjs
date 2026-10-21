const { app, BrowserWindow, Menu, session, screen, ipcMain } = require('electron');
const path = require('node:path');
app.setName('RAMTOPIA');
function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.min(280, area.width), height = Math.min(360, area.height);
  const window = new BrowserWindow({
    width, height, minWidth: 260, minHeight: 340,
    x: area.x + area.width - width - 12, y: area.y + area.height - height - 12,
    frame: false, alwaysOnTop: true, maximizable: false, fullscreenable: false,
    backgroundColor: '#f7f8f4', title: 'RAMTOPIA',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}
ipcMain.on('window-control', (event, action) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;
  if (action === 'minimize') window.minimize();
  if (action === 'close') window.close();
  if (action === 'pin') window.setAlwaysOnTop(!window.isAlwaysOnTop());
});
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
