import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Self-heal stale tabs after a deploy. When Vercel ships a new build the
// HTML's chunk hashes change; a still-open tab holding old HTML will try
// to import a removed `/assets/Xxxx-hash.js` and crash. Reload once so we
// pick up the fresh index.html, but guard against an infinite loop.
const reloadOnceForStaleChunks = (reason: string) => {
  const KEY = 'tonight_chunk_reload_at';
  const last = Number(sessionStorage.getItem(KEY) || 0);
  // At most one reload per 30s window.
  if (Date.now() - last < 30_000) return;
  sessionStorage.setItem(KEY, String(Date.now()));
  console.warn(`Reloading to recover from stale chunk: ${reason}`);
  window.location.reload();
};

window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  reloadOnceForStaleChunks('vite:preloadError');
});

window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i.test(msg)) {
    reloadOnceForStaleChunks(msg);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e.reason?.message || e.reason || '');
  if (/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i.test(msg)) {
    reloadOnceForStaleChunks(msg);
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);