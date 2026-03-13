import React from 'react';
import type { VenueProfile } from '../types/profiles';
import { VENUE_TYPE_ICONS } from '../utils/venueToLocation';

const VIBE_COLORS: Record<string, string> = {
  upscale: 'bg-amber-600/30 text-amber-300',
  casual: 'bg-blue-600/30 text-blue-300',
  intimate: 'bg-rose-600/30 text-rose-300',
  energetic: 'bg-orange-600/30 text-orange-300',
  chill: 'bg-emerald-600/30 text-emerald-300',
};

interface VenueCardProps {
  venue: VenueProfile;
  onClick: () => void;
  onDelete?: () => void;
}

export const VenueCard: React.FC<VenueCardProps> = ({ venue, onClick, onDelete }) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left flex items-center gap-4 group relative"
    >
      <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
        {VENUE_TYPE_ICONS[venue.type] || '📍'}
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-white font-serif text-lg truncate block">{venue.name}</span>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full ${VIBE_COLORS[venue.vibe] || 'bg-white/10 text-white/40'}`}>
            {venue.vibe}
          </span>
          {venue.city && (
            <span className="text-[8px] text-white/30 truncate">{venue.city}</span>
          )}
        </div>
      </div>

      {onDelete && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-rose-500 text-xs p-2"
        >
          ✕
        </div>
      )}
    </button>
  );
};
