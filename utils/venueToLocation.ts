import type { VenueProfile } from '../types/profiles';
import type { DateLocation, DateVibe } from '../types';

export const VENUE_TYPE_ICONS: Record<string, string> = {
  bar: '🍸',
  restaurant: '🍽️',
  cafe: '☕',
  lounge: '🎷',
  rooftop: '🌃',
  club: '🪩',
  park: '🌳',
  home: '🏠',
  other: '📍',
};

const VENUE_TYPE_IMAGES: Record<string, string> = {
  bar: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1000&auto=format&fit=crop',
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000&auto=format&fit=crop',
  cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1000&auto=format&fit=crop',
  lounge: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1000&auto=format&fit=crop',
  rooftop: 'https://images.unsplash.com/photo-1486334803289-1623f249dd1e?q=80&w=1000&auto=format&fit=crop',
  club: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?q=80&w=1000&auto=format&fit=crop',
  park: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1000&auto=format&fit=crop',
  home: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1000&auto=format&fit=crop',
  other: 'https://images.unsplash.com/photo-1494905998402-395d579af90f?q=80&w=1000&auto=format&fit=crop',
};

const SETTING_DESCRIPTORS: Record<string, string> = {
  loud: 'loud and lively',
  quiet: 'hushed and intimate',
  outdoor: 'open air',
  candlelit: 'warm candlelight',
  live_music: 'live music playing',
  crowded: 'buzzing with people',
  private: 'secluded and private',
  has_view: 'with a stunning view',
  food: 'great food',
  drinks: 'craft cocktails',
};

const NEIGHBORHOOD_DESCRIPTORS: Record<string, string> = {
  downtown: 'in the heart of downtown',
  hipster: 'in a trendy, artsy neighborhood',
  upscale: 'in an upscale district',
  waterfront: 'along the waterfront',
  suburban: 'in a quiet suburban area',
  bohemian: 'in a bohemian quarter',
};

/**
 * Convert a VenueProfile + selected vibes into a DateLocation for the game engine.
 */
export function venueToDateLocation(
  venue: VenueProfile,
  selectedVibes: DateVibe[]
): DateLocation {
  // Build rich environment prompt
  const parts: string[] = [];

  // Venue type + name
  parts.push(`A ${venue.vibe} ${venue.type} called "${venue.name}"`);

  // Neighborhood
  if (venue.neighborhoodFeel) {
    parts.push(NEIGHBORHOOD_DESCRIPTORS[venue.neighborhoodFeel] || '');
  }

  // City
  if (venue.city) {
    parts.push(`in ${venue.city}`);
  }

  // Settings atmosphere
  const settingDescs = venue.settings
    .map((s) => SETTING_DESCRIPTORS[s])
    .filter(Boolean);
  if (settingDescs.length > 0) {
    parts.push(`— ${settingDescs.join(', ')}`);
  }

  // Vibe modifiers
  if (selectedVibes.length > 0) {
    const vibeDescs = selectedVibes.map((v) => v.promptModifier).join(' ');
    parts.push(`. Mood: ${vibeDescs}`);
  }

  const environmentPrompt = parts.filter(Boolean).join(' ');

  // Build description from settings
  const description = settingDescs.length > 0
    ? settingDescs.slice(0, 3).join(', ')
    : venue.vibe;

  return {
    id: `venue-${venue.id}`,
    title: venue.name,
    description,
    icon: VENUE_TYPE_ICONS[venue.type] || '📍',
    environmentPrompt,
    image: VENUE_TYPE_IMAGES[venue.type] || VENUE_TYPE_IMAGES.other,
  };
}
