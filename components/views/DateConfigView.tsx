import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PAGE_VARIANTS, DATE_VIBES } from '../../constants';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { CheckboxGrid } from '../ui/CheckboxGrid';
import type {
  DateConfig,
  DateArc,
  SpecialOccasion,
  ComfortLevel,
  TopicToAvoid,
} from '../../types/profiles';

interface DateConfigViewProps {
  profileId: string;
  venueId: string | null;
  dateNumber: number;
  onConfirm: (config: DateConfig) => void;
  onBack: () => void;
}

const ARC_OPTIONS: { value: DateArc; label: string; icon: string; desc: string }[] = [
  { value: 'slow_burn', label: 'Slow Burn', icon: '🕯️', desc: 'Gradual intensity' },
  { value: 'high_energy', label: 'High Energy', icon: '⚡', desc: 'Fast & electric' },
  { value: 'deep_dive', label: 'Deep Dive', icon: '🌊', desc: 'Vulnerability first' },
  { value: 'ai_reads_room', label: 'AI Reads Room', icon: '🤖', desc: 'Adaptive pacing' },
];

const OCCASION_OPTIONS: { value: SpecialOccasion; label: string }[] = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'first_irl', label: 'First IRL' },
  { value: 'reconnecting', label: 'Reconnecting' },
  { value: 'making_up', label: 'Making Up' },
  { value: 'just_because', label: 'Just Because' },
];

const COMFORT_OPTIONS: { value: ComfortLevel; label: string; desc: string }[] = [
  { value: 'safe', label: 'Safe', desc: 'Keep it light' },
  { value: 'can_go_there', label: 'Can Go There', desc: 'Push some boundaries' },
  { value: 'no_limits', label: 'No Limits', desc: 'Full vulnerability' },
];

const AVOID_OPTIONS: { value: TopicToAvoid; label: string }[] = [
  { value: 'exes', label: 'Exes' },
  { value: 'politics', label: 'Politics' },
  { value: 'religion', label: 'Religion' },
  { value: 'money', label: 'Money' },
  { value: 'weight', label: 'Weight' },
  { value: 'family_drama', label: 'Family' },
  { value: 'past_trauma', label: 'Trauma' },
  { value: 'children', label: 'Children' },
  { value: 'marriage', label: 'Marriage' },
  { value: 'age', label: 'Age' },
];

export const DateConfigView: React.FC<DateConfigViewProps> = ({
  profileId,
  venueId,
  dateNumber,
  onConfirm,
  onBack,
}) => {
  const [arc, setArc] = useState<DateArc>('ai_reads_room');
  const [occasion, setOccasion] = useState<SpecialOccasion | null>(null);
  const [comfort, setComfort] = useState<ComfortLevel>('can_go_there');
  const [topicsToAvoid, setTopicsToAvoid] = useState<TopicToAvoid[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);
  const [aboutYouForHer, setAboutYouForHer] = useState('');
  const [preDateIntel, setPreDateIntel] = useState('');
  const [notesForTonight, setNotesForTonight] = useState('');

  const toggleVibe = (id: string) => {
    if (vibes.includes(id)) {
      setVibes(vibes.filter((v) => v !== id));
    } else if (vibes.length < 2) {
      setVibes([...vibes, id]);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      profileId,
      venueId,
      dateNumber,
      dateArc: arc,
      specialOccasion: occasion,
      comfortLevel: comfort,
      topicsToAvoid,
      vibes,
      aboutYouForHer: aboutYouForHer.trim() || null,
      preDateIntel: preDateIntel.trim() || null,
      notesForTonight: notesForTonight.trim() || null,
    });
  };

  return (
    <motion.div
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full flex flex-col gap-5 pb-8"
    >
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onBack}
          className="text-[9px] uppercase tracking-widest text-white/30 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-xl font-serif italic text-white">Tonight's Config</h2>
        <div className="w-12" />
      </div>

      {dateNumber > 1 && (
        <div className="text-center">
          <span className="text-[9px] uppercase tracking-widest text-rose-500 font-black">
            Date #{dateNumber}
          </span>
        </div>
      )}

      {/* Date Arc */}
      <div>
        <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-3">
          Date Arc
        </span>
        <div className="grid grid-cols-2 gap-2">
          {ARC_OPTIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setArc(a.value)}
              className={`px-3 py-3 rounded-xl border transition-all text-left ${
                arc === a.value
                  ? 'bg-rose-600/30 border-rose-500/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-lg block mb-1">{a.icon}</span>
              <span className="text-[9px] uppercase tracking-widest font-bold text-white/80 block">
                {a.label}
              </span>
              <span className="text-[8px] text-white/30">{a.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Special Occasion */}
      <div>
        <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-3">
          Special Occasion
        </span>
        <div className="flex flex-wrap gap-2">
          {OCCASION_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOccasion(occasion === o.value ? null : o.value)}
              className={`px-3 py-2 rounded-xl text-[9px] uppercase tracking-widest font-bold border transition-all ${
                occasion === o.value
                  ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comfort Level */}
      <div>
        <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-3">
          Comfort Level
        </span>
        <div className="flex gap-2">
          {COMFORT_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setComfort(c.value)}
              className={`flex-1 px-3 py-3 rounded-xl border transition-all text-center ${
                comfort === c.value
                  ? 'bg-rose-600/30 border-rose-500/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-[9px] uppercase tracking-widest font-bold text-white/80 block">
                {c.label}
              </span>
              <span className="text-[8px] text-white/30">{c.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Topics to Avoid */}
      <div>
        <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-3">
          Topics to Avoid
        </span>
        <CheckboxGrid
          options={AVOID_OPTIONS}
          selected={topicsToAvoid}
          onChange={setTopicsToAvoid}
          columns={2}
        />
      </div>

      {/* Vibe Selector */}
      <div>
        <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-3">
          Vibe (1-2)
        </span>
        <div className="flex flex-col gap-2">
          {DATE_VIBES.map((dv) => (
            <button
              key={dv.id}
              type="button"
              onClick={() => toggleVibe(dv.id)}
              disabled={!vibes.includes(dv.id) && vibes.length >= 2}
              className={`w-full p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${
                vibes.includes(dv.id)
                  ? 'bg-rose-600/30 border-rose-500/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 disabled:opacity-30'
              }`}
            >
              <span className="text-xl">{dv.icon}</span>
              <div>
                <span className="text-white font-serif text-sm">{dv.title}</span>
                <span className="text-[8px] text-white/30 block">{dv.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible intel sections */}
      <CollapsibleSection title="About You — For Her" icon="💌">
        <textarea
          value={aboutYouForHer}
          onChange={(e) => setAboutYouForHer(e.target.value)}
          placeholder="Things you want the AI to help you reveal naturally..."
          className="w-full bg-white/5 rounded-xl border border-white/10 p-4 text-sm text-white/80 focus:outline-none focus:border-rose-500 min-h-[80px] resize-none placeholder:text-white/15"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Pre-Date Intel" icon="🕵️">
        <textarea
          value={preDateIntel}
          onChange={(e) => setPreDateIntel(e.target.value)}
          placeholder="Copy-paste interesting texts, things she mentioned, context from earlier convos..."
          className="w-full bg-white/5 rounded-xl border border-white/10 p-4 text-sm text-white/80 focus:outline-none focus:border-rose-500 min-h-[80px] resize-none placeholder:text-white/15"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Notes for Tonight" icon="📝">
        <textarea
          value={notesForTonight}
          onChange={(e) => setNotesForTonight(e.target.value)}
          placeholder="Anything specific you want tonight's experience to include..."
          className="w-full bg-white/5 rounded-xl border border-white/10 p-4 text-sm text-white/80 focus:outline-none focus:border-rose-500 min-h-[80px] resize-none placeholder:text-white/15"
        />
      </CollapsibleSection>

      {/* Launch */}
      <button
        onClick={handleConfirm}
        className="mt-2 w-full py-5 bg-rose-600 rounded-full text-[11px] uppercase tracking-[0.4em] font-black text-white hover:bg-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all"
      >
        Lock It In
      </button>
    </motion.div>
  );
};
