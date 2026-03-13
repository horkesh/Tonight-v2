import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PAGE_VARIANTS } from '../../constants';
import { CheckboxGrid } from '../ui/CheckboxGrid';
import { saveVenue } from '../../utils/profileStorage';
import type {
  VenueProfile,
  VenueType,
  VenueVibe,
  VenueSetting,
  NeighborhoodFeel,
} from '../../types/profiles';

interface VenueEditorViewProps {
  venue?: VenueProfile;
  onSave: (venue: VenueProfile) => void;
  onCancel: () => void;
}

const VENUE_TYPES: { value: VenueType; label: string; icon: string }[] = [
  { value: 'bar', label: 'Bar', icon: '🍸' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'cafe', label: 'Café', icon: '☕' },
  { value: 'lounge', label: 'Lounge', icon: '🎷' },
  { value: 'rooftop', label: 'Rooftop', icon: '🌃' },
  { value: 'club', label: 'Club', icon: '🪩' },
  { value: 'park', label: 'Park', icon: '🌳' },
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'other', label: 'Other', icon: '📍' },
];

const VENUE_VIBES: { value: VenueVibe; label: string }[] = [
  { value: 'upscale', label: 'Upscale' },
  { value: 'casual', label: 'Casual' },
  { value: 'intimate', label: 'Intimate' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'chill', label: 'Chill' },
];

const SETTING_OPTIONS: { value: VenueSetting; label: string }[] = [
  { value: 'loud', label: 'Loud' },
  { value: 'quiet', label: 'Quiet' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'candlelit', label: 'Candlelit' },
  { value: 'live_music', label: 'Live Music' },
  { value: 'crowded', label: 'Crowded' },
  { value: 'private', label: 'Private' },
  { value: 'has_view', label: 'Has View' },
  { value: 'food', label: 'Food' },
  { value: 'drinks', label: 'Drinks' },
];

const NEIGHBORHOOD_OPTIONS: { value: NeighborhoodFeel; label: string }[] = [
  { value: 'downtown', label: 'Downtown' },
  { value: 'hipster', label: 'Hipster' },
  { value: 'upscale', label: 'Upscale' },
  { value: 'waterfront', label: 'Waterfront' },
  { value: 'suburban', label: 'Suburban' },
  { value: 'bohemian', label: 'Bohemian' },
];

function createEmptyVenue(): VenueProfile {
  return {
    id: `venue-${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    name: '',
    type: 'bar',
    vibe: 'intimate',
    settings: [],
    city: null,
    neighborhoodFeel: null,
  };
}

export const VenueEditorView: React.FC<VenueEditorViewProps> = ({
  venue: existingVenue,
  onSave,
  onCancel,
}) => {
  const [v, setV] = useState<VenueProfile>(existingVenue || createEmptyVenue());

  const update = <K extends keyof VenueProfile>(key: K, value: VenueProfile[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!v.name.trim()) return;
    const saved = { ...v, updatedAt: Date.now() };
    saveVenue(saved);
    onSave(saved);
  };

  return (
    <motion.div
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full flex flex-col gap-6 pb-8"
    >
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onCancel}
          className="text-[9px] uppercase tracking-widest text-white/30 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-xl font-serif italic text-white">
          {existingVenue ? 'Edit Venue' : 'New Venue'}
        </h2>
        <div className="w-12" />
      </div>

      {/* Name */}
      <input
        value={v.name}
        onChange={(e) => update('name', e.target.value)}
        placeholder="Venue Name"
        autoFocus
        className="w-full bg-transparent border-b border-white/20 p-2 text-center text-3xl font-serif focus:outline-none focus:border-rose-500 transition-colors placeholder:text-white/10"
      />

      {/* Type */}
      <div>
        <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-3">
          Type
        </span>
        <div className="grid grid-cols-3 gap-2">
          {VENUE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => update('type', t.value)}
              className={`px-3 py-3 rounded-xl text-[9px] uppercase tracking-widest font-bold border transition-all flex flex-col items-center gap-1 ${
                v.type === t.value
                  ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vibe */}
      <div>
        <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-3">
          Vibe
        </span>
        <div className="flex flex-wrap gap-2">
          {VENUE_VIBES.map((vb) => (
            <button
              key={vb.value}
              type="button"
              onClick={() => update('vibe', vb.value)}
              className={`px-4 py-2.5 rounded-xl text-[9px] uppercase tracking-widest font-bold border transition-all ${
                v.vibe === vb.value
                  ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              {vb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div>
        <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-3">
          Settings
        </span>
        <CheckboxGrid
          options={SETTING_OPTIONS}
          selected={v.settings}
          onChange={(s) => update('settings', s)}
          columns={2}
        />
      </div>

      {/* City + Neighborhood */}
      <div className="space-y-4">
        <input
          value={v.city || ''}
          onChange={(e) => update('city', e.target.value || null)}
          placeholder="City"
          className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-rose-500 placeholder:text-white/15"
        />
        <div>
          <span className="text-[9px] text-white/40 uppercase tracking-widest block mb-3">
            Neighborhood Feel
          </span>
          <div className="flex flex-wrap gap-2">
            {NEIGHBORHOOD_OPTIONS.map((n) => (
              <button
                key={n.value}
                type="button"
                onClick={() =>
                  update('neighborhoodFeel', v.neighborhoodFeel === n.value ? null : n.value)
                }
                className={`px-3 py-2 rounded-xl text-[9px] uppercase tracking-widest font-bold border transition-all ${
                  v.neighborhoodFeel === n.value
                    ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        disabled={!v.name.trim()}
        onClick={handleSave}
        className="mt-2 w-full py-5 bg-rose-600 rounded-full text-[11px] uppercase tracking-[0.4em] font-black text-white hover:bg-rose-500 disabled:opacity-20 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all"
      >
        {existingVenue ? 'Update Venue' : 'Save Venue'}
      </button>
    </motion.div>
  );
};
