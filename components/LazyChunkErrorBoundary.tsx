import React from 'react';

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const CHUNK_ERROR_RX = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError/i;

// Wraps the lazy-Suspense subtree so a missing or stale bundle doesn't crash the
// whole React root (which would unmount SessionProvider and tear down P2P).
// On chunk-load errors specifically, schedules one self-healing reload.
export class LazyChunkErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: unknown): State {
    const msg = (error as Error)?.message || String(error);
    const isChunkError = CHUNK_ERROR_RX.test(msg);
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error: unknown) {
    const msg = (error as Error)?.message || String(error);
    if (CHUNK_ERROR_RX.test(msg)) {
      const KEY = 'tonight_chunk_reload_at';
      try {
        const last = Number(sessionStorage.getItem(KEY) || 0);
        if (Date.now() - last > 30_000) {
          sessionStorage.setItem(KEY, String(Date.now()));
          console.warn('LazyChunkErrorBoundary: reloading to recover from stale chunk.');
          window.location.reload();
          return;
        }
      } catch {}
      // If we just reloaded and still got the error, fall through to fallback UI.
    } else {
      console.error('LazyChunkErrorBoundary caught:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
          <div className="w-12 h-12 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-black">
            {this.state.isChunkError ? 'Updating to latest version…' : 'Something went wrong'}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
