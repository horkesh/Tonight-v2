
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectionStatusOverlayProps {
  isConnected: boolean;
  isActive: boolean;
  onRetry?: () => void;
  partnerName?: string;
  connectionStatus?: string;
}

const getQualityColor = (status?: string): string => {
  if (!status) return 'bg-green-500';
  const s = status.toLowerCase();
  if (s === 'connected') return 'bg-green-500';
  if (s.includes('reconnect') || s.includes('retry') || s.includes('searching')) return 'bg-amber-500';
  if (s.includes('timeout') || s.includes('unreachable') || s.includes('not found')) return 'bg-red-500';
  return 'bg-green-500';
};

export const ConnectionStatusOverlay: React.FC<ConnectionStatusOverlayProps> = ({ isConnected, isActive, onRetry, partnerName, connectionStatus }) => {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (!isConnected && isActive) {
        timer = setTimeout(() => {
            setShowOverlay(true);
        }, 5000);
    } else {
        setShowOverlay(false);
    }
    return () => clearTimeout(timer);
  }, [isConnected, isActive]);

  const showMiniIndicator = !isConnected && isActive && !showOverlay;
  const qualityColor = getQualityColor(isConnected ? 'connected' : connectionStatus);

  return (
    <>
        {/* Connection Quality Dot — always visible when connected */}
        <AnimatePresence>
            {isConnected && isActive && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-6 right-6 z-[90]"
                >
                    <div className={`w-2 h-2 rounded-full ${qualityColor} shadow-[0_0_6px_currentColor]`} />
                </motion.div>
            )}
        </AnimatePresence>

        {/* Mini Indicator (Corner) */}
        <AnimatePresence>
            {showMiniIndicator && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-6 right-6 z-[100] flex items-center gap-2"
                >
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[8px] text-amber-500/80 uppercase tracking-widest font-black">Signal Weak</span>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Full Overlay (Blocking) */}
        <AnimatePresence>
        {showOverlay && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6"
            >
                <div className="w-full max-w-xs text-center relative overflow-hidden p-8 border border-rose-900/30 rounded-[32px] bg-rose-950/10">
                    {/* Scanline Effect */}
                    <motion.div
                        animate={{ top: ["0%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute left-0 right-0 h-[2px] bg-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                    />

                    <div className="mb-6 relative">
                        <div className="w-16 h-16 border-2 border-rose-900 rounded-full mx-auto flex items-center justify-center">
                            <motion.div
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="w-10 h-10 bg-rose-600 rounded-full blur-md"
                            />
                        </div>
                    </div>

                    <h3 className="text-xl font-serif text-white/90 italic mb-2">Signal Interrupted</h3>
                    {partnerName && (
                        <p className="text-sm text-white/50 font-serif italic mb-4">
                            Lost connection to {partnerName}
                        </p>
                    )}
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-rose-500 animate-pulse">
                        Re-triangulating...
                    </p>
                    <p className="text-[9px] text-white/30 mt-6 font-mono mb-8">
                        Searching for partner frequency
                    </p>

                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs uppercase tracking-widest font-bold shadow-lg shadow-rose-900/40 transition-all active:scale-95"
                        >
                            {partnerName ? `Reconnect to ${partnerName}` : 'Reconnect Now'}
                        </button>
                    )}
                </div>
            </motion.div>
        )}
        </AnimatePresence>
    </>
  );
};
