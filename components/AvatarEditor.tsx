
import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (modifier: string) => void;
  onPhotoSelect?: (base64: string) => void;
  currentAvatar?: string | null;
}

const CATEGORIES = [
  {
    id: 'posture',
    label: 'Body',
    items: [
      { label: 'Lean In', emoji: '🫂', value: 'leaning forward, intense eye contact, intimate', desc: 'Closer, interested' },
      { label: 'Lean Back', emoji: '😌', value: 'leaning back, relaxed posture, confident', desc: 'Relaxed, confident' },
      { label: 'Power', emoji: '🦁', value: 'standing tall, commanding presence, authoritative', desc: 'Commanding presence' },
      { label: 'Reserved', emoji: '🛡️', value: 'arms crossed, guarded, observing', desc: 'Guarded, watchful' },
      { label: 'Casual', emoji: '🛋️', value: 'slouching slightly, comfortable, at ease', desc: 'At ease' },
    ]
  },
  {
    id: 'face',
    label: 'Face',
    items: [
      { label: 'Smirk', emoji: '😏', value: 'cocky half-smile, playful, arrogant', desc: 'Playful, teasing' },
      { label: 'Genuine', emoji: '😊', value: 'warm genuine smile, eyes crinkling', desc: 'Warm, open' },
      { label: 'Serious', emoji: '🃏', value: 'deadpan expression, poker face, noir', desc: 'Poker face' },
      { label: 'Biting Lip', emoji: '😳', value: 'biting lower lip, nervous or flirtatious', desc: 'Nervous energy' },
      { label: 'Laughing', emoji: '😂', value: 'head thrown back laughing, joyful', desc: 'Pure joy' },
      { label: 'Gaze', emoji: '👁️', value: 'piercing stare, looking directly at camera', desc: 'Piercing stare' },
    ]
  },
  {
    id: 'action',
    label: 'Doing',
    items: [
      { label: 'Sip', emoji: '🍷', value: 'holding wine glass near lips, sipping', desc: 'Taking a sip' },
      { label: 'Toast', emoji: '🥂', value: 'raising glass for a toast, celebrating', desc: 'Raising a glass' },
      { label: 'Thinking', emoji: '🤔', value: 'hand on chin, pensive, deep thought', desc: 'Lost in thought' },
      { label: 'Hair', emoji: '💇', value: 'running hand through hair, fixing appearance', desc: 'Adjusting look' },
      { label: 'Shrug', emoji: '🤷', value: 'shrugging shoulders, indifferent', desc: 'Whatever happens' },
    ]
  },
  {
    id: 'vibe',
    label: 'Mood',
    items: [
      { label: 'Messy', emoji: '🌪️', value: 'slightly disheveled, loose tie/hair, undone', desc: 'Undone, raw' },
      { label: 'Shadows', emoji: '🌑', value: 'hidden in shadows, mysterious, noir lighting', desc: 'Mysterious' },
      { label: 'Glowing', emoji: '🕯️', value: 'soft candlelight on face, romantic glow', desc: 'Soft warmth' },
      { label: 'Sharp', emoji: '⚡', value: 'high contrast, sharp focus, intense detail', desc: 'Crisp, intense' },
      { label: 'Blur', emoji: '🌫️', value: 'soft focus, dreamlike, hazy memory', desc: 'Dreamlike haze' },
    ]
  }
];

const SWIPE_THRESHOLD = 40;

export const AvatarEditor: React.FC<AvatarEditorProps> = ({ isOpen, onClose, onSelect, onPhotoSelect, currentAvatar }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catIndex, setCatIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const navigateCategory = useCallback((direction: 1 | -1) => {
    setCatIndex(prev => {
      const next = prev + direction;
      if (next < 0 || next >= CATEGORIES.length) return prev;
      setSwipeDirection(direction);
      if (navigator.vibrate) navigator.vibrate(5);
      return next;
    });
  }, []);

  const handleSwipe = useCallback((_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -200) {
      navigateCategory(1);
    } else if (offset.x > SWIPE_THRESHOLD || velocity.x > 200) {
      navigateCategory(-1);
    }
  }, [navigateCategory]);

  const handleSelect = useCallback((value: string) => {
    setSelectedItem(value);
    if (navigator.vibrate) navigator.vibrate(15);
    // Brief visual confirmation then fire
    setTimeout(() => {
      onSelect(value);
      setSelectedItem(null);
    }, 300);
  }, [onSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onPhotoSelect) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onPhotoSelect(result.split(',')[1]);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  const currentCategory = CATEGORIES[catIndex];

  const gridVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full-screen backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xl"
          />

          {/* Editor panel — slides up from bottom */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] flex flex-col"
          >
            <div className="bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[32px] overflow-hidden flex flex-col max-h-[85vh]">

              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-white/15 rounded-full" />
              </div>

              {/* Header with avatar preview */}
              <div className="px-6 pb-4 flex items-center gap-4">
                {/* Live avatar thumbnail */}
                <div className="relative">
                  <motion.div
                    animate={selectedItem ? { scale: [1, 0.9, 1.05, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-rose-500/30 shadow-[0_0_20px_rgba(225,29,72,0.2)]"
                  >
                    {currentAvatar ? (
                      <img src={currentAvatar} className="w-full h-full object-cover" alt="Your avatar" />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white/20 text-lg">?</div>
                    )}
                  </motion.div>
                  {selectedItem && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center"
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.div>
                  )}
                </div>

                <div className="flex-1">
                  <h2 className="text-[10px] uppercase tracking-[0.4em] font-black text-rose-500 mb-1">Change Your Gesture</h2>
                  <p className="text-[11px] text-white/40 font-serif italic">Choose how you want to appear</p>
                </div>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Category tabs — horizontally scrollable pills */}
              <div className="px-4 pb-3">
                <div className="flex gap-1 bg-white/[0.03] p-1 rounded-2xl">
                  {CATEGORIES.map((cat, i) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSwipeDirection(i > catIndex ? 1 : -1);
                        setCatIndex(i);
                      }}
                      className="flex-1 relative py-2.5 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all"
                    >
                      {catIndex === i && (
                        <motion.div
                          layoutId="gestureTab"
                          className="absolute inset-0 bg-rose-600 rounded-xl shadow-lg"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 ${catIndex === i ? 'text-white' : 'text-white/35'}`}>
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gesture cards — swipeable, visual tiles */}
              <motion.div
                className="flex-1 overflow-hidden touch-pan-y"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={handleSwipe}
              >
                <AnimatePresence mode="wait" custom={swipeDirection}>
                  <motion.div
                    key={currentCategory.id}
                    custom={swipeDirection}
                    variants={gridVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="px-4 pb-2 overflow-y-auto max-h-[40vh] custom-scrollbar"
                  >
                    <div className="grid grid-cols-2 gap-2.5">
                      {currentCategory.items.map((mod, i) => (
                        <motion.button
                          key={mod.label}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.04, type: "spring", stiffness: 300 }}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => handleSelect(mod.value)}
                          className={`relative p-4 rounded-2xl border text-left transition-all overflow-hidden group ${
                            selectedItem === mod.value
                              ? 'bg-rose-600/20 border-rose-500/50 shadow-[0_0_20px_rgba(225,29,72,0.2)]'
                              : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] active:bg-rose-900/20'
                          }`}
                        >
                          {/* Large emoji as visual anchor */}
                          <span className="text-3xl mb-2 block group-active:scale-110 transition-transform">{mod.emoji}</span>
                          <span className="text-[11px] text-white/90 font-bold block mb-0.5">{mod.label}</span>
                          <span className="text-[9px] text-white/30 block">{mod.desc}</span>

                          {/* Selection check */}
                          <AnimatePresence>
                            {selectedItem === mod.value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute top-2 right-2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center"
                              >
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* Category progress dots */}
              <div className="flex justify-center gap-1.5 py-3">
                {CATEGORIES.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === catIndex ? 'w-5 bg-rose-500' : 'w-1 bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {/* Re-Scan Identity */}
              {onPhotoSelect && (
                <div className="px-4 pb-6 pt-1 border-t border-white/5">
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    📷 Re-Scan Identity
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
