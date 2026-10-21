const { app, BrowserWindow, Menu, session } = require('electron');
const path = require('node:path');
app.setName('RAMTOPIA');
function createWindow() {
  const window = new BrowserWindow({
    width: 1440, height: 1000, minWidth: 800, minHeight: 680,
    backgroundColor: '#f7f8f4', title: 'RAMTOPIA — 작은 왕국의 시대',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  // The packaged game is fully local and does not require Internet access.
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
