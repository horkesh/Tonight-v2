
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

export const AvatarEditor: React.FC<AvatarEditorProps> = ({ isOpen, onClose, onSelect, onPhotoSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCat, setActiveCat] = useState('posture');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onPhotoSelect) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Send only base64 data, strip prefix
            onPhotoSelect(result.split(',')[1]);
            onClose();
        };
        reader.readAsDataURL(file);
    }
  };

  const currentCategory = CATEGORIES.find(c => c.id === activeCat);

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

              {/* Category Tabs */}
              <div className="flex overflow-x-auto no-scrollbar p-2 gap-1 bg-black/20">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCat(cat.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
                            activeCat === cat.id 
                            ? 'bg-rose-600 text-white shadow-lg' 
                            : 'bg-transparent text-white/40 hover:bg-white/5 hover:text-white/70'
                        }`}
                    >
                        <span className="text-sm">{cat.icon}</span>
                        {cat.label}
                    </button>
                ))}
              </div>
              
              {/* Modifiers Grid */}
              <div className="p-4 grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {currentCategory?.items.map((mod, i) => (
                    <motion.button
                        key={mod.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => onSelect(mod.value)}
                        className="px-3 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-[10px] uppercase tracking-wider text-white/70 hover:text-white transition-all text-left flex items-center justify-between group"
                    >
                        <span>{mod.label}</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500">→</span>
                    </motion.button>
                    ))}
                </AnimatePresence>
              </div>

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
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 rounded-xl bg-rose-900/20 border border-rose-500/20 hover:bg-rose-900/40 text-[10px] uppercase tracking-widest text-rose-200 font-bold flex items-center justify-center gap-2 transition-all"
                      >
                         <span>📷</span> Re-Scan Identity
                      </button>
                  </div>
              )}
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
