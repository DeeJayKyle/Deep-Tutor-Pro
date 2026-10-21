'use strict';
// Deep Tutor Pro desktop shell.
//
// The bundled web app (copied into ./web by scripts/prepare-native.mjs) is
// served from the privileged custom scheme app://tutor-pro/ instead of file://
// so it gets a stable, secure origin: IndexedDB persists, fetch/CORS work
// against the DeepTutor server (which allows the app://tutor-pro origin), and
// the microphone can be requested.
const { app, BrowserWindow, net, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP_ID = 'com.deejaykyle.deeptutorpro';
const APP_TITLE = 'Deep Tutor Pro';
const SCHEME = 'app';
const HOST = 'tutor-pro';
const APP_ORIGIN = `${SCHEME}://${HOST}`;
const START_URL = `${APP_ORIGIN}/index.html`;
const WEB_ROOT = path.join(__dirname, 'web');

// Only these permissions are ever granted: microphone (voice notes) and
// sanitized clipboard writes. Everything else is denied.
const ALLOWED_PERMISSIONS = new Set(['media', 'clipboard-sanitized-write']);

// Must run before the app is ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  start();
}

function isAppUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === `${SCHEME}:` && url.host === HOST;
  } catch {
    return false;
  }
}

function openExternal(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') void shell.openExternal(url.href);
  } catch {
    /* Ignore malformed external links. */
  }
}

/** Map an app:// URL to a file inside WEB_ROOT, or null if it escapes it. */
function resolveWebFile(requestUrl) {
  let url;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  if (url.host !== HOST) return null;
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) return null;
  if (pathname === '' || pathname.endsWith('/')) pathname += 'index.html';
  const filePath = path.resolve(WEB_ROOT, `.${pathname}`);
  const relative = path.relative(WEB_ROOT, filePath);
  if (relative === '' || relative.split(path.sep)[0] === '..' || path.isAbsolute(relative)) return null;
  return filePath;
}

function notFound() {
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
}

function registerAppProtocol() {
  protocol.handle(SCHEME, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { 'content-type': 'text/plain' } });
    }
    const filePath = resolveWebFile(request.url);
    if (!filePath) return notFound();
    try {
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) return notFound();
    } catch {
      return notFound();
    }
    return net.fetch(pathToFileURL(filePath).href);
  });
}

function configureSession(ses) {
  ses.setPermissionRequestHandler((_contents, permission, callback, details) => {
    if (!ALLOWED_PERMISSIONS.has(permission) || !isAppUrl(details.requestingUrl)) return callback(false);
    if (permission === 'media') {
      // Microphone only; never the camera or screen capture.
      const types = details.mediaTypes || [];
      return callback(types.length > 0 && types.every((type) => type === 'audio'));
    }
    return callback(true);
  });
  ses.setPermissionCheckHandler((_contents, permission, requestingOrigin, details) => {
    if (!ALLOWED_PERMISSIONS.has(permission)) return false;
    if (requestingOrigin !== APP_ORIGIN && !isAppUrl(requestingOrigin)) return false;
    if (permission === 'media') return !details || details.mediaType !== 'video';
    return true;
  });
  // Downloads use Electron's default behaviour: a native Save dialog.
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: APP_TITLE,
    width: 1440,
    height: 960,
    minWidth: 400,
    minHeight: 600,
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });
  // Keep the window title fixed regardless of document.title changes.
  mainWindow.on('page-title-updated', (event) => event.preventDefault());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  void mainWindow.loadURL(START_URL);
}

function start() {
  app.setAppUserModelId(APP_ID);

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  // Apply navigation rules to every web contents, including any created later.
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (!isAppUrl(url)) openExternal(url);
      return { action: 'deny' };
    });
    contents.on('will-navigate', (event, url) => {
      if (isAppUrl(url)) return;
      event.preventDefault();
      openExternal(url);
    });
    contents.on('will-redirect', (event, url) => {
      if (!isAppUrl(url)) event.preventDefault();
    });
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });

  app.whenReady().then(() => {
    registerAppProtocol();
    configureSession(session.defaultSession);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
