import { create } from 'zustand';
import type { PartnerProfile, VenueProfile, DateConfig } from '../types/profiles';

export interface ProfileState {
  activeProfile: PartnerProfile | null;
  activeVenue: VenueProfile | null;
  activeDateConfig: DateConfig | null;

  setActiveProfile: (profile: PartnerProfile | null) => void;
  setActiveVenue: (venue: VenueProfile | null) => void;
  setActiveDateConfig: (config: DateConfig | null) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  activeProfile: null,
  activeVenue: null,
  activeDateConfig: null,

  setActiveProfile: (profile) => set({ activeProfile: profile }),
  setActiveVenue: (venue) => set({ activeVenue: venue }),
  setActiveDateConfig: (config) => set({ activeDateConfig: config }),
}));
