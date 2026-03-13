
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IntelligenceReport, VibeStats } from '../types';
// @ts-ignore
import html2canvas from 'html2canvas';

interface IntelligenceBriefingProps {
  report: IntelligenceReport | null;
  isOpen: boolean;
  onClose: () => void;
}

const VibeBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-3">
    <span className="text-[9px] uppercase tracking-widest font-black w-24 text-right opacity-50">{label}</span>
    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value)}%` }}
        transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
    <span className="text-[10px] font-mono opacity-40 w-8">{value}%</span>
  </div>
);

export const IntelligenceBriefing: React.FC<IntelligenceBriefingProps> = ({ report, isOpen, onClose }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const shareTargetRef = useRef<HTMLDivElement>(null);
  const [showShareTarget, setShowShareTarget] = useState(false);

  if (!report) return null;

  // Parse vibeAnalysis for bar display if it's JSON-like
  let vibeStats: VibeStats | null = null;
  try {
    const parsed = JSON.parse(report.vibeAnalysis);
    if (parsed && typeof parsed.playful === 'number') vibeStats = parsed;
  } catch {}

  const caseNumber = report.caseNumber || `TNT-${Date.now().toString(36).toUpperCase()}`;

  const handleExport = async () => {
    // Mount the share-target div, wait a frame for it to render
    setShowShareTarget(true);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const target = shareTargetRef.current || contentRef.current;
    if (!target) return;

    try {
      const useShareTarget = !!shareTargetRef.current;
      const canvas = await html2canvas(target, {
        backgroundColor: '#0f172a',
        scale: useShareTarget ? 3 : 2,
        ...(useShareTarget ? { width: 1080, height: 1920, windowWidth: 1080, windowHeight: 1920 } : {}),
      });

      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/png', 1)
      );

      if (!blob) throw new Error('Canvas to blob failed');

      const fileName = `Tonight_${caseNumber}.png`;

      // Try Web Share API first (mobile native share sheet)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        const shareData = { files: [file], title: 'Tonight Intelligence Report' };

        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            return;
          } catch (e: any) {
            if (e.name === 'AbortError') return; // User cancelled
          }
        }
      }

      // Fallback: download
      const link = document.createElement('a');
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Failed to generate image", err);
    } finally {
      setShowShareTarget(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/95 backdrop-blur-2xl"
          />
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md my-auto"
          >
            {/* Visible Report Card */}
            <div ref={contentRef} className="bg-slate-950 text-white p-8 rounded-2xl border border-white/10 overflow-hidden relative shadow-[0_30px_90px_rgba(0,0,0,0.8)]">

              {/* Aged paper texture via gradient */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(30,41,59,0.8),transparent_60%)] pointer-events-none" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.3)_0%,transparent_30%,transparent_70%,rgba(15,23,42,0.5)_100%)] pointer-events-none" />

              {/* CLASSIFIED stamp */}
              <div className="absolute top-12 right-[-20px] rotate-[-15deg] text-rose-500/10 text-5xl font-black uppercase tracking-[0.3em] pointer-events-none select-none">
                CLASSIFIED
              </div>
              <div className="absolute bottom-20 left-[-10px] rotate-[12deg] text-amber-500/8 text-4xl font-black uppercase tracking-[0.2em] pointer-events-none select-none">
                TOP SECRET
              </div>

              <div className="relative z-10">
                {/* Classification Header */}
                <header className="border-b border-white/10 pb-6 mb-6">
                  <div className="flex justify-between items-center text-[8px] uppercase tracking-[0.5em] font-black text-white/20 mb-3">
                    <span>CASE {caseNumber}</span>
                    <span>{report.date}</span>
                  </div>
                  <div className="text-center">
                    <span className="inline-block px-4 py-1.5 border border-rose-500/30 rounded text-[9px] uppercase tracking-[0.4em] font-black text-rose-400/70 mb-4">
                      Intelligence Briefing
                    </span>
                    <h1 className="text-3xl font-serif italic text-white leading-tight">
                      {report.headline}
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mt-2">
                      {report.publicationName}
                    </p>
                  </div>
                </header>

                {/* Lede */}
                <p className="text-base font-serif italic text-white/70 leading-relaxed mb-6 first-letter:text-3xl first-letter:font-black first-letter:text-rose-400 first-letter:float-left first-letter:mr-2 first-letter:leading-[0.8]">
                  {report.lede}
                </p>

                {/* Summary with redacted effect */}
                <div className="mb-6">
                  <p className="text-sm text-white/50 leading-relaxed font-mono">
                    {report.summary}
                  </p>
                </div>

                {/* Vibe Analysis */}
                <div className="mb-6 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                  <h4 className="text-[9px] uppercase tracking-[0.4em] font-black text-white/30 mb-4">Vibe Analysis</h4>
                  {vibeStats ? (
                    <div className="flex flex-col gap-2">
                      <VibeBar label="Playful" value={vibeStats.playful} color="bg-emerald-500" />
                      <VibeBar label="Flirty" value={vibeStats.flirty} color="bg-rose-500" />
                      <VibeBar label="Deep" value={vibeStats.deep} color="bg-indigo-500" />
                      <VibeBar label="Comfortable" value={vibeStats.comfortable} color="bg-amber-500" />
                    </div>
                  ) : (
                    <p className="text-sm font-serif italic text-white/40">"{report.vibeAnalysis}"</p>
                  )}
                </div>

                {/* Rating stamp */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 block mb-1">Subject Rating</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-rose-400" style={{ textShadow: '0 0 30px rgba(225,29,72,0.4)' }}>
                        {report.partnerRating}
                      </span>
                      <span className="text-lg text-white/20 font-serif">/10</span>
                    </div>
                  </div>

                  {/* Bar Tab */}
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 block mb-2">The Tab</span>
                    {report.barTab?.slice(0, 4).map((item, i) => (
                      <p key={i} className="text-[10px] text-white/30 font-mono">{item}</p>
                    ))}
                    {(!report.barTab || report.barTab.length === 0) && (
                      <p className="text-[10px] italic text-white/20">Off the books</p>
                    )}
                  </div>
                </div>

                {/* Closing thought */}
                {report.closingThought && (
                  <div className="border-t border-white/5 pt-5 mb-4">
                    <p className="text-sm font-serif italic text-white/40 text-center leading-relaxed">
                      "{report.closingThought}"
                    </p>
                  </div>
                )}

                {/* Footer */}
                <footer className="text-center pt-4 border-t border-white/5">
                  <p className="text-[8px] uppercase tracking-[0.5em] text-white/15 font-black">
                    This document will self-destruct
                  </p>
                  <p className="text-[7px] uppercase tracking-[0.3em] text-rose-500/30 font-black mt-1">
                    Tonight
                  </p>
                </footer>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-4">
                 <button
                    onClick={handleExport}
                    className="py-3 px-8 bg-white/10 text-white rounded-full text-[10px] uppercase tracking-[0.3em] font-black hover:bg-white/20 transition-colors shadow-lg backdrop-blur-sm border border-white/10"
                 >
                    {typeof navigator !== 'undefined' && navigator.share ? 'Share' : 'Download'}
                 </button>
                 <button
                    onClick={onClose}
                    className="py-3 px-8 bg-slate-900 text-white rounded-full text-[10px] uppercase tracking-[0.3em] font-black hover:bg-slate-800 transition-colors border border-white/10"
                 >
                    Seal Files
                 </button>
            </div>
          </motion.div>

          {/* Hidden share-target div — only mounted during export */}
          {showShareTarget && <div className="fixed -left-[9999px] -top-[9999px]" aria-hidden="true">
            <div ref={shareTargetRef} style={{ width: 1080, height: 1920, padding: 80, background: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 120, right: 60, transform: 'rotate(-15deg)', fontSize: 72, fontWeight: 900, color: 'rgba(225,29,72,0.08)', letterSpacing: '0.3em' }}>CLASSIFIED</div>

              <div style={{ textAlign: 'center', marginBottom: 60, width: '100%' }}>
                <div style={{ fontSize: 14, letterSpacing: '0.5em', color: 'rgba(255,255,255,0.2)', fontWeight: 900, marginBottom: 24 }}>
                  CASE {caseNumber} — {report.date}
                </div>
                <div style={{ display: 'inline-block', padding: '8px 24px', border: '1px solid rgba(225,29,72,0.3)', borderRadius: 4, fontSize: 12, letterSpacing: '0.4em', color: 'rgba(225,29,72,0.6)', fontWeight: 900, marginBottom: 32 }}>
                  INTELLIGENCE BRIEFING
                </div>
                <div style={{ fontSize: 48, fontStyle: 'italic', lineHeight: 1.2, maxWidth: 800, margin: '0 auto' }}>
                  {report.headline}
                </div>
                <div style={{ fontSize: 14, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.2)', fontWeight: 900, marginTop: 16 }}>
                  {report.publicationName}
                </div>
              </div>

              <div style={{ fontSize: 22, fontStyle: 'italic', color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 700, lineHeight: 1.6, marginBottom: 48 }}>
                {report.lede}
              </div>

              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: 700, lineHeight: 1.6, fontFamily: 'monospace', marginBottom: 60 }}>
                {report.summary}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 48 }}>
                <span style={{ fontSize: 96, fontWeight: 900, color: 'rgba(225,29,72,0.8)' }}>{report.partnerRating}</span>
                <span style={{ fontSize: 32, color: 'rgba(255,255,255,0.2)' }}>/10</span>
              </div>

              {report.closingThought && (
                <div style={{ fontSize: 18, fontStyle: 'italic', color: 'rgba(255,255,255,0.3)', textAlign: 'center', maxWidth: 600, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 40 }}>
                  "{report.closingThought}"
                </div>
              )}

              <div style={{ position: 'absolute', bottom: 80, fontSize: 12, letterSpacing: '0.5em', color: 'rgba(225,29,72,0.25)', fontWeight: 900 }}>
                TONIGHT
              </div>
            </div>
          </div>}
        </div>
      )}
    </AnimatePresence>
  );
};
