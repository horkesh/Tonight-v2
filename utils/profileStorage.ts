import type { PartnerProfile, VenueProfile } from '../types/profiles';

const PROFILES_KEY = 'tonight_profiles';
const VENUES_KEY = 'tonight_venues';

// ── Partner Profiles ─────────────────────────────────────────────────

export function getProfiles(): PartnerProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PartnerProfile[];
  } catch {
    return [];
  }
}

export function saveProfile(profile: PartnerProfile): void {
  const profiles = getProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = { ...profile, updatedAt: Date.now() };
  } else {
    profiles.push(profile);
  }
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.warn('Failed to save profile:', e);
  }
}

export function deleteProfile(id: string): void {
  const profiles = getProfiles().filter((p) => p.id !== id);
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.warn('Failed to delete profile:', e);
  }
}

// ── Venue Profiles ───────────────────────────────────────────────────

export function getVenues(): VenueProfile[] {
  try {
    const raw = localStorage.getItem(VENUES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VenueProfile[];
  } catch {
    return [];
  }
}

export function saveVenue(venue: VenueProfile): void {
  const venues = getVenues();
  const idx = venues.findIndex((v) => v.id === venue.id);
  if (idx >= 0) {
    venues[idx] = { ...venue, updatedAt: Date.now() };
  } else {
    venues.push(venue);
  }
  try {
    localStorage.setItem(VENUES_KEY, JSON.stringify(venues));
  } catch (e) {
    console.warn('Failed to save venue:', e);
  }
}

export function deleteVenue(id: string): void {
  const venues = getVenues().filter((v) => v.id !== id);
  try {
    localStorage.setItem(VENUES_KEY, JSON.stringify(venues));
  } catch (e) {
    console.warn('Failed to delete venue:', e);
  }
}
