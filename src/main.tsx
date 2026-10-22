import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import '@fontsource-variable/inter';
import './index.css';
import { anyRunning } from './state/jobs';
import { flush } from './state/store';
import { requestsInFlight } from './lib/api';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// After an update, a screen of the previous build may ask for a file that no
// longer exists; load the new build instead. Not again within a minute, so a
// file that is really missing shows the error screen instead of looping.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('dtp-reloaded-for-update') || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem('dtp-reloaded-for-update', String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  location.reload();
});

// Lets the Windows shell save pending edits before it restarts to install an
// update, and tells it whether AI work is still running.
(window as { __dtpPrepareForUpdate?: () => Promise<{ busy: boolean }> }).__dtpPrepareForUpdate = async () => {
  await flush().catch(() => undefined);
  return { busy: anyRunning() || requestsInFlight() > 0 };
};

// The web build works offline through a service worker. The Windows and
// Android apps load their files from the device, so they do not need one.
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && import.meta.env.PROD && !location.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        // Look for a newer build every hour, when the app comes back to the
        // foreground and when the connection returns.
        const check = () => void reg.update().catch(() => undefined);
        setInterval(check, 60 * 60 * 1000);
        window.addEventListener('online', check);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
      })
      .catch(() => undefined);
    // A new build has taken over (the first install of the worker is not an
    // update). It is used the next time the app is opened; the banner offers
    // to switch now. Never reloads by itself, so unsaved typing and AI answers
    // still on their way are not lost.
    let controlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (controlled) window.dispatchEvent(new Event('dtp-web-update'));
      controlled = true;
    });
  });
}
