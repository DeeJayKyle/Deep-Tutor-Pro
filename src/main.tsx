import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// The web build works offline through a service worker. The Windows and
// Android apps load their files from the device, so they do not need one.
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && import.meta.env.PROD && !location.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
