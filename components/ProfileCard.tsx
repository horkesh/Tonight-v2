import React, { useMemo } from 'react';
import type { PartnerProfile } from '../types/profiles';
import { getHistoryForProfile } from '../utils/dateHistory';
import { ZODIAC_ICONS } from '../utils/astrology';

interface ProfileCardProps {
  profile: PartnerProfile;
  onClick: () => void;
  onDelete?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onClick, onDelete }) => {
  const history = useMemo(() => getHistoryForProfile(profile.id), [profile.id]);
  const dateCount = history.length;
  const lastDate = history[0];
  const daysAgo = lastDate
    ? Math.floor((Date.now() - lastDate.timestamp) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left flex items-center gap-4 group relative"
    >
      {/* Photo thumbnail */}
      <div className="w-14 h-14 rounded-full overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
        {profile.photo ? (
          <img src={profile.photo} className="w-full h-full object-cover" alt={profile.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-white/20">
            {profile.name[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-serif text-lg truncate">{profile.name}</span>
          {profile.zodiac && (
            <span className="text-base opacity-50" title={profile.zodiac.sign}>
              {ZODIAC_ICONS[profile.zodiac.sign] || ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {dateCount > 0 && (
            <span className="text-[8px] uppercase tracking-widest bg-white/10 text-white/40 px-2 py-0.5 rounded-full">
              {dateCount} {dateCount === 1 ? 'date' : 'dates'}
            </span>
          )}
          {daysAgo !== null && (
            <span className="text-[8px] text-white/30">
              {daysAgo === 0 ? 'today' : `${daysAgo}d ago`}
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
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
