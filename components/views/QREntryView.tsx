import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { PAGE_VARIANTS } from '../../constants';
import { useGameStore } from '../../store/gameState';

interface QREntryViewProps {
  /** Called when guest enters name and is ready to connect. */
  onGuestJoin: (name: string) => void;
  /** Called when host wants to start the session (after QR is displayed). */
  onHostReady: () => void;
  /** Whether the current user is the host. */
  isHost: boolean;
  /** The room ID for this session. */
  roomId: string;
}

/**
 * QREntryView: Two-sided view for Vibe Check guest entry.
 *
 * Host side:
 * - Generates a room ID
 * - Displays a QR code containing URL with room parameter
 * - Shows "Waiting for partner..." status
 *
 * Guest side:
 * - Arrived via QR scan (URL has ?room=XXX&mode=vibe_check)
 * - Enter name form (no account needed)
 * - Connect button
 */
export function QREntryView({ onGuestJoin, onHostReady, isHost, roomId }: QREntryViewProps) {
  const [guestName, setGuestName] = useState('');
  const sessionMode = useGameStore(s => s.sessionMode);

  // Build the share URL
  const shareUrl = useMemo(() => {
    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set('room', roomId);
    if (sessionMode) params.set('mode', sessionMode);
    return `${base}?${params.toString()}`;
  }, [roomId, sessionMode]);

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) {
      onGuestJoin(guestName.trim());
    }
  };

  if (isHost) {
    return (
      <motion.div
        key="qrEntryHost"
        variants={PAGE_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col items-center gap-8 pb-12"
      >
        <div className="text-center mb-2">
          <h1 className="text-2xl font-serif text-white/90 tracking-wide">Vibe Check</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-2">
            Scan to join
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-2xl shadow-2xl">
          <QRCodeSVG
            value={shareUrl}
            size={200}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Room info */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-1">
            Room
          </p>
          <p className="text-sm text-white/60 font-mono tracking-wider">
            {roomId}
          </p>
        </div>

        {/* Waiting indicator */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-rose-500"
          />
          <p className="text-xs text-white/40">
            Waiting for someone to scan...
          </p>
        </div>

        {/* Manual share option */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'Tonight - Vibe Check', url: shareUrl }).catch(() => {});
            } else if (navigator.clipboard) {
              navigator.clipboard.writeText(shareUrl).catch(() => {});
            }
          }}
          className="text-[10px] uppercase tracking-widest text-rose-400/60 hover:text-rose-400 transition-colors"
        >
          Share link instead
        </button>
      </motion.div>
    );
  }

  // Guest side
  return (
    <motion.div
      key="qrEntryGuest"
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center gap-8 pb-12"
    >
      <div className="text-center mb-4">
        <h1 className="text-2xl font-serif text-white/90 tracking-wide">Vibe Check</h1>
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-2">
          Five minutes. Zero pressure.
        </p>
      </div>

      <form onSubmit={handleGuestSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <div>
          <label htmlFor="guestName" className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-2 block">
            What should we call you?
          </label>
          <input
            id="guestName"
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name"
            maxLength={20}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-rose-500/50 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={!guestName.trim()}
          className="w-full py-3 rounded-xl bg-rose-600 text-white text-xs uppercase tracking-widest hover:bg-rose-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Join
        </button>
      </form>

      <p className="text-[10px] text-white/20 max-w-xs text-center">
        No account needed. No data stored. Just vibes.
      </p>
    </motion.div>
  );
}

export default QREntryView;
