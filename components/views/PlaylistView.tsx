
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_VARIANTS, PLAYLIST_RESULT_LABELS } from '../../constants';
import { useSession } from '../../context/SessionContext';
import { soundManager } from '../../services/soundManager';

type Phase = 'selecting' | 'waiting' | 'revealing' | 'result';

export const PlaylistView: React.FC = () => {
  const { state, aiState, aiActions } = useSession();
  const { users } = state;
  const { playlistData: data, playlistChoices } = aiState;
  const { submitPlaylistChoice, handlePlaylistComplete } = aiActions;

  const [selected, setSelected] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('selecting');
  const [revealIndex, setRevealIndex] = useState(-1);
  const completedRef = useRef(false);

  if (!data) return null;

  const self = users.find(u => u.isSelf);
  const partner = users.find(u => !u.isSelf);
  const selfId = self?.id || '';
  const partnerId = partner?.id || '';

  const myChoices = playlistChoices[selfId];
  const partnerChoices = playlistChoices[partnerId];
  const bothChosen = !!myChoices && !!partnerChoices;

  // Compute matches
  const matchedIndices = bothChosen
    ? myChoices.filter(i => partnerChoices.includes(i))
    : [];
  const matchCount = matchedIndices.length;

  // Phase transitions
  useEffect(() => {
    if (myChoices && !partnerChoices && phase === 'selecting') {
      setPhase('waiting');
    }
  }, [myChoices, partnerChoices, phase]);

  useEffect(() => {
    if (bothChosen && phase !== 'revealing' && phase !== 'result') {
      setPhase('revealing');
      soundManager.play('milestone');
    }
  }, [bothChosen, phase]);

  // Sequential song reveal
  useEffect(() => {
    if (phase !== 'revealing') return;
    if (revealIndex >= data.songs.length - 1) {
      const timer = setTimeout(() => setPhase('result'), 1200);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setRevealIndex(prev => prev + 1), 400);
    return () => clearTimeout(timer);
  }, [phase, revealIndex, data.songs.length]);

  const toggleSong = useCallback((index: number) => {
    if (phase !== 'selecting') return;
    setSelected(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      if (prev.length >= 3) return prev;
      return [...prev, index];
    });
  }, [phase]);

  const handleLockIn = useCallback(() => {
    if (selected.length !== 3) return;
    submitPlaylistChoice(selected);
  }, [selected, submitPlaylistChoice]);

  const handleContinue = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    handlePlaylistComplete(matchCount);
  }, [matchCount, handlePlaylistComplete]);

  return (
    <motion.div
      key="playlist"
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col gap-6 pt-12 min-h-[80vh] relative"
    >
      {/* Header */}
      <div className="text-center px-4">
        <span className="text-[9px] text-rose-500 tracking-[0.5em] uppercase font-black block mb-3">
          Shared Playlist
        </span>
        <h2 className="text-3xl font-serif text-white italic">
          {phase === 'selecting' ? 'Pick 3 songs' : phase === 'waiting' ? 'Locked in' : phase === 'revealing' ? 'Revealing...' : PLAYLIST_RESULT_LABELS[Math.min(matchCount, 3)]}
        </h2>
        {phase === 'selecting' && (
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-3 font-bold">
            Choose the 3 songs that fit this night
          </p>
        )}
      </div>

      {/* Song Cards */}
      <div className="flex flex-col gap-3 px-2">
        {data.songs.map((song, i) => {
          const isSelected = selected.includes(i);
          const isRevealed = phase === 'revealing' ? i <= revealIndex : phase === 'result';
          const isMatched = isRevealed && bothChosen && matchedIndices.includes(i);
          const wasMyPick = isRevealed && bothChosen && myChoices.includes(i);
          const wasPartnerPick = isRevealed && bothChosen && partnerChoices.includes(i);

          let cardStyle = 'bg-white/[0.03] border-white/10';
          if (phase === 'selecting' || phase === 'waiting') {
            if (isSelected) cardStyle = 'bg-rose-950/40 border-rose-500/40 shadow-[0_0_20px_rgba(225,29,72,0.2)]';
            else if (phase === 'selecting') cardStyle += ' hover:bg-white/[0.06] hover:border-white/20';
          } else if (isRevealed) {
            if (isMatched) cardStyle = 'bg-amber-950/30 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]';
            else if (wasMyPick || wasPartnerPick) cardStyle = 'bg-white/[0.05] border-white/15';
            else cardStyle = 'bg-white/[0.02] border-white/5';
          }

          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: isRevealed || phase === 'selecting' || phase === 'waiting' ? 1 : 0.3,
                x: 0,
                scale: isMatched ? 1.02 : 1,
              }}
              transition={{ delay: phase === 'selecting' ? 0.1 + i * 0.06 : 0, duration: 0.3 }}
              onClick={() => toggleSong(i)}
              disabled={phase !== 'selecting' || (selected.length >= 3 && !isSelected)}
              className={`relative w-full p-4 rounded-2xl border text-left transition-all duration-500 ${cardStyle}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className={`text-sm font-medium truncate ${isMatched ? 'text-amber-200' : 'text-white/80'}`}>
                    {song.title} <span className={`font-normal ${isMatched ? 'text-amber-300/60' : 'text-white/40'}`}>&middot; {song.artist}</span>
                  </span>
                </div>
                <span className={`text-[8px] uppercase tracking-widest font-black shrink-0 px-2 py-1 rounded-full ${
                  isMatched ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/25'
                }`}>
                  {song.vibe}
                </span>
              </div>

              {/* Reveal badges */}
              {isRevealed && bothChosen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex gap-2 mt-2"
                >
                  {wasMyPick && (
                    <span className="text-[8px] uppercase tracking-widest font-black text-rose-400/70">You</span>
                  )}
                  {wasPartnerPick && (
                    <span className="text-[8px] uppercase tracking-widest font-black text-violet-400/70">{partner?.name || 'Them'}</span>
                  )}
                  {isMatched && (
                    <span className="text-[8px] uppercase tracking-widest font-black text-amber-400 ml-auto">Match</span>
                  )}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Lock In Button */}
      <AnimatePresence>
        {phase === 'selecting' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex justify-center py-4"
          >
            <button
              onClick={handleLockIn}
              disabled={selected.length !== 3}
              className={`px-10 py-3 rounded-full text-[10px] uppercase tracking-widest font-black transition-all duration-300 ${
                selected.length === 3
                  ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.3)]'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              Lock In ({selected.length}/3)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting for partner */}
      <AnimatePresence>
        {phase === 'waiting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="w-12 h-12 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin" />
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-rose-500 animate-pulse">
              Waiting for {partner?.name || 'them'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {phase === 'result' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            <span className="text-5xl">
              {matchCount >= 3 ? '\uD83C\uDFB6' : matchCount >= 2 ? '\uD83C\uDFA7' : matchCount >= 1 ? '\uD83C\uDFB5' : '\uD83D\uDD07'}
            </span>
            <h3 className="text-2xl font-serif italic text-white">
              {PLAYLIST_RESULT_LABELS[Math.min(matchCount, 3)]}
            </h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
              {matchCount} of 3 songs matched
            </p>
            <button
              onClick={handleContinue}
              className="mt-4 px-8 py-3 bg-white/10 rounded-full text-[10px] uppercase tracking-widest font-black hover:bg-white/20 transition-colors"
            >
              Continue
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
