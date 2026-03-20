
import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { GlassCard } from './ui/GlassCard';

interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (modifier: string) => void;
  onPhotoSelect?: (base64: string) => void;
}

const CATEGORIES = [
  {
    id: 'posture',
    label: 'Posture',
    icon: '🧘',
    items: [
      { label: 'Lean In', value: 'leaning forward, intense eye contact, intimate' },
      { label: 'Lean Back', value: 'leaning back, relaxed posture, confident' },
      { label: 'Power', value: 'standing tall, commanding presence, authoritative' },
      { label: 'Reserved', value: 'arms crossed, guarded, observing' },
      { label: 'Casual', value: 'slouching slightly, comfortable, at ease' },
    ]
  },
  {
    id: 'face',
    label: 'Expression',
    icon: '👁️',
    items: [
      { label: 'Smirk', value: 'cocky half-smile, playful, arrogant' },
      { label: 'Genuine', value: 'warm genuine smile, eyes crinkling' },
      { label: 'Serious', value: 'deadpan expression, poker face, noir' },
      { label: 'Biting Lip', value: 'biting lower lip, nervous or flirtatious' },
      { label: 'Laughing', value: 'head thrown back laughing, joyful' },
      { label: 'Gaze', value: 'piercing stare, looking directly at camera' },
    ]
  },
  {
    id: 'action',
    label: 'Action',
    icon: '🍷',
    items: [
      { label: 'Sip', value: 'holding wine glass near lips, sipping' },
      { label: 'Toast', value: 'raising glass for a toast, celebrating' },
      { label: 'Thinking', value: 'hand on chin, pensive, deep thought' },
      { label: 'Hair', value: 'running hand through hair, fixing appearance' },
      { label: 'Shrug', value: 'shrugging shoulders, indifferent' },
    ]
  },
  {
    id: 'vibe',
    label: 'Atmosphere',
    icon: '✨',
    items: [
      { label: 'Messy', value: 'slightly disheveled, loose tie/hair, undone' },
      { label: 'Shadows', value: 'hidden in shadows, mysterious, noir lighting' },
      { label: 'Glowing', value: 'soft candlelight on face, romantic glow' },
      { label: 'Sharp', value: 'high contrast, sharp focus, intense detail' },
      { label: 'Blur', value: 'soft focus, dreamlike, hazy memory' },
    ]
  }
];

const SWIPE_THRESHOLD = 40;

export const AvatarEditor: React.FC<AvatarEditorProps> = ({ isOpen, onClose, onSelect, onPhotoSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catIndex, setCatIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);

  const activeCat = CATEGORIES[catIndex].id;

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
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[60] bg-transparent"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -20, y: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-24 left-6 z-[70] w-80"
          >
            <GlassCard className="p-0 bg-obsidian-950/90 border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden">

              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-white/5 bg-white/5">
                 <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-[0.3em] font-black text-rose-500">Mirror Check</span>
                    <span className="text-[9px] text-white/30 font-serif italic">Adjust your signal</span>
                 </div>
                 <button onClick={onClose} className="text-white/20 hover:text-white text-xs">✕</button>
              </div>

              {/* Category Tabs — tap or swipe */}
              <div className="flex overflow-x-auto no-scrollbar p-2 gap-1 bg-black/20 relative">
                {CATEGORIES.map((cat, i) => (
                    <button
                        key={cat.id}
                        onClick={() => {
                          setSwipeDirection(i > catIndex ? 1 : -1);
                          setCatIndex(i);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] uppercase tracking-wider font-bold transition-all whitespace-nowrap relative ${
                            activeCat === cat.id
                            ? 'text-white shadow-lg'
                            : 'bg-transparent text-white/40 hover:bg-white/5 hover:text-white/70'
                        }`}
                    >
                        {activeCat === cat.id && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-rose-600 rounded-lg"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10 text-sm">{cat.icon}</span>
                        <span className="relative z-10">{cat.label}</span>
                    </button>
                ))}
              </div>

              {/* Swipeable Modifiers Grid */}
              <motion.div
                className="relative touch-pan-y"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={handleSwipe}
              >
                <div className="p-4 min-h-[200px]">
                  <AnimatePresence mode="wait" custom={swipeDirection}>
                    <motion.div
                      key={currentCategory.id}
                      custom={swipeDirection}
                      variants={gridVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar"
                    >
                      {currentCategory.items.map((mod, i) => (
                        <motion.button
                          key={mod.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          whileTap={{ scale: 0.95, backgroundColor: 'rgba(225, 29, 72, 0.15)' }}
                          onClick={() => onSelect(mod.value)}
                          className="px-3 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-[10px] uppercase tracking-wider text-white/70 hover:text-white transition-all text-left flex items-center justify-between group"
                        >
                          <span>{mod.label}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500">→</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Category progress dots */}
                <div className="flex justify-center gap-1.5 pb-3">
                  {CATEGORIES.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i === catIndex ? 'w-4 bg-rose-500' : 'w-1 bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Re-Scan Action */}
              {onPhotoSelect && (
                  <div className="p-4 border-t border-white/5 bg-black/20">
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
                        className="w-full py-3 rounded-xl bg-rose-900/20 border border-rose-500/20 hover:bg-rose-900/40 text-[10px] uppercase tracking-widest text-rose-200 font-bold flex items-center justify-center gap-2 transition-all"
                      >
                         <span>📷</span> Re-Scan Identity
                      </motion.button>
                  </div>
              )}
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
