import type { PartnerProfile, VenueProfile, DateConfig } from '../types/profiles';

const PROFILES_KEY = 'tonight_profiles';
const VENUES_KEY = 'tonight_venues';
const LAST_SETUP_KEY = 'tonight_last_setup';

export interface LastSetup {
  profileId: string;
  venueId: string | null;
  config: DateConfig;
}

export function saveLastSetup(setup: LastSetup): void {
  try {
    localStorage.setItem(LAST_SETUP_KEY, JSON.stringify(setup));
  } catch {}
}

export function getLastSetup(): LastSetup | null {
  try {
    const raw = localStorage.getItem(LAST_SETUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastSetup;
  } catch {
    return null;
  }
}

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

export function saveProfile(profile: PartnerProfile): boolean {
  const profiles = getProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = { ...profile, updatedAt: Date.now() };
  } else {
    profiles.push(profile);
  }
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    return true;
  } catch (e) {
    console.warn('Failed to save profile:', e);
    return false;
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

export function saveVenue(venue: VenueProfile): boolean {
  const venues = getVenues();
  const idx = venues.findIndex((v) => v.id === venue.id);
  if (idx >= 0) {
    venues[idx] = { ...venue, updatedAt: Date.now() };
  } else {
    venues.push(venue);
  }
  try {
    localStorage.setItem(VENUES_KEY, JSON.stringify(venues));
    return true;
  } catch (e) {
    console.warn('Failed to save venue:', e);
    return false;
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
