import { create } from 'zustand';
import { User, PersonaState } from '../types';

const INITIAL_PERSONA: PersonaState = {
  traits: [], memories: [], secrets: [], imageUrl: null, lastGeneratedRound: 0, isGenerating: false, 
  revealProgress: 0, chemistry: 0, drunkFactor: 0, appearance: "",
  isProfileComplete: false
};

export interface PresenceState {
  users: User[];
  userPersona: PersonaState;
  partnerPersona: PersonaState;
  guestProfileConfirmed: boolean;
  arrivalEvent: { name: string; avatar: string; type?: 'arrival' | 'welcome' } | null;
  hasSeenArrivalOverlay: boolean;

  setUsers: (users: User[] | ((prev: User[]) => User[])) => void;
  setUserPersona: (persona: PersonaState | ((prev: PersonaState) => PersonaState)) => void;
  setPartnerPersona: (persona: PersonaState | ((prev: PersonaState) => PersonaState)) => void;
  setGuestProfileConfirmed: (confirmed: boolean) => void;
  setArrivalEvent: (event: { name: string; avatar: string; type?: 'arrival' | 'welcome' } | null) => void;
  setHasSeenArrivalOverlay: (seen: boolean) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  users: [],
  userPersona: INITIAL_PERSONA,
  partnerPersona: INITIAL_PERSONA,
  guestProfileConfirmed: true,
  arrivalEvent: null,
  hasSeenArrivalOverlay: false,

  setUsers: (users) => set((state) => ({ users: typeof users === 'function' ? users(state.users) : users })),
  setUserPersona: (persona) => set((state) => ({ userPersona: typeof persona === 'function' ? persona(state.userPersona) : persona })),
  setPartnerPersona: (persona) => set((state) => ({ partnerPersona: typeof persona === 'function' ? persona(state.partnerPersona) : persona })),
  setGuestProfileConfirmed: (confirmed) => set({ guestProfileConfirmed: confirmed }),
  setArrivalEvent: (event) => set({ arrivalEvent: event }),
  setHasSeenArrivalOverlay: (seen) => set({ hasSeenArrivalOverlay: seen }),
}));
