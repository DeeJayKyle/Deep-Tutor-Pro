const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const startFile = path.join(__dirname, 'web', 'index.html');
const startUrl = pathToFileURL(startFile).href;
function openExternal(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') void shell.openExternal(url);
  } catch { /* Ignore malformed external links. */ }
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 960, minWidth: 400, minHeight: 600,
    backgroundColor: '#090d16', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== startUrl && !url.startsWith(startUrl + '#')) { event.preventDefault(); openExternal(url); }
  });
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  void win.loadFile(startFile);
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
