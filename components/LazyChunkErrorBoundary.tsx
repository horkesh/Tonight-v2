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
// We intentionally do NOT auto-reload: a reload tears down the P2P peer, which
// would kill an active session. The user gets a manual "Refresh" button instead.
export class LazyChunkErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: unknown): State {
    const msg = (error as Error)?.message || String(error);
    const isChunkError = CHUNK_ERROR_RX.test(msg);
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error: unknown) {
    console.error('LazyChunkErrorBoundary caught:', (error as Error)?.message || error);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const { isChunkError } = this.state;
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
          <div className="w-12 h-12 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-black">
              {isChunkError ? 'New version available' : 'Something went wrong'}
            </p>
            <p className="text-[10px] text-white/30 max-w-xs">
              {isChunkError
                ? 'A newer build was deployed. Refresh to pick it up.'
                : 'Try refreshing the page.'}
            </p>
          </div>
          <button
            onClick={this.handleRefresh}
            className="mt-4 text-[9px] uppercase tracking-widest text-white/60 border border-white/15 px-6 py-3 rounded-full hover:bg-white/10 transition-colors"
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

