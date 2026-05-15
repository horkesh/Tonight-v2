import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Stale-chunk diagnostics. We do NOT auto-reload because reload tears down an
// active P2P session via beforeunload → p2p.teardown(). The LazyChunkErrorBoundary
// shows a manual "Refresh" button instead. Keep these listeners for visibility:
// when a chunk fails, we want it in the console even if the boundary doesn't
// see it (e.g. a chunk requested from an eager top-level import).
window.addEventListener('vite:preloadError', (e) => {
  console.warn('vite:preloadError', (e as any)?.payload || e);
});

window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i.test(msg)) {
    console.warn('Chunk-load error (no auto-reload):', msg);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e.reason?.message || e.reason || '');
  if (/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i.test(msg)) {
    console.warn('Chunk-load rejection (no auto-reload):', msg);
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