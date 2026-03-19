
import { useState, useCallback, useRef, useMemo } from 'react';
import { ActivityPayload } from '../types';
import { p2p } from '../services/p2p';
import { usePersonaLogic } from './usePersonaLogic';
import { useNetworkSync } from './useNetworkSync';
import { useBroadcastingState } from './useBroadcastingState';
import { useSessionLifecycle } from './useSessionLifecycle';
import { usePersonaEffects } from './usePersonaEffects';
import { useGameStore } from '../store/gameState';
import { usePresenceStore } from '../store/presenceState';

export function useSessionState() {
  const gameState = useGameStore();
  const presence = usePresenceStore();

  // --- Session info (owned here to break circular dep between network sync & lifecycle) ---
  const [sessionInfo, setSessionInfo] = useState<{ userId: string; roomId: string; isHost: boolean } | null>(null);

  // --- UI state not owned by other hooks ---
  const [activePersonaTab, setActivePersonaTab] = useState<'partner' | 'self'>('partner');
  // hasSeenArrivalOverlay now lives in presenceState store for persistence across reconnections

  // --- Activity callbacks ref ---
  const activityCallbacksRef = useRef<{
    onData: ((payload: ActivityPayload) => void) | null;
    onChoice: ((payload: { userId: string; choice: number }) => void) | null;
    onPlaylistChoice: ((payload: { userId: string; choices: number[] }) => void) | null;
  }>({ onData: null, onChoice: null, onPlaylistChoice: null });

  // --- Broadcasting State (all P2P-broadcasting wrappers + local UI state) ---
  const broadcasting = useBroadcastingState(gameState, presence);

  // --- Persona Logic ---
  const personaLogic = usePersonaLogic(
    presence.userPersona,
    broadcasting.setUserPersona,
    presence.partnerPersona,
    broadcasting.setPartnerPersona
  );
  const { updatePersonaImage } = personaLogic;

  // --- Network Sync ---
  // Zustand setters are stable references — this memo never recomputes, which is correct
  const syncActions = useMemo(() => ({
    setVibe: gameState.setVibe,
    setCurrentScene: gameState.setCurrentScene,
    setSceneChoices: gameState.setSceneChoices,
    setActiveQuestion: gameState.setActiveQuestion,
    setQuestionOwnerId: gameState.setQuestionOwnerId,
    setDateContext: gameState.setDateContext,
    setConversationLog: gameState.setConversationLog,
    setPartnerRating: gameState.setPartnerRating,
    setUsers: presence.setUsers,
    setPartnerPersona: presence.setPartnerPersona,
    setUserPersona: presence.setUserPersona,
    setGuestProfileConfirmed: presence.setGuestProfileConfirmed,
    setArrivalEvent: presence.setArrivalEvent,
    setView: broadcasting.rawSetters.setViewState,
    setIncomingToastRequest: broadcasting.rawSetters.setIncomingToastRequest,
    setClinkActive: broadcasting.rawSetters.setClinkActive,
    setLatestReaction: broadcasting.rawSetters.setLatestReaction,
    setLastChoiceText: broadcasting.rawSetters.setLastChoiceTextState,
    setDraftOpen: broadcasting.rawSetters.setIsDraftOpenState,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const syncState = useMemo(() => ({
    users: presence.users,
    vibe: gameState.vibe,
    dateContext: gameState.dateContext,
    currentScene: gameState.currentScene,
    userPersona: presence.userPersona,
    partnerPersona: presence.partnerPersona,
    activeQuestion: gameState.activeQuestion,
    questionOwnerId: gameState.questionOwnerId,
    myRating: gameState.myRating,
    view: broadcasting.view,
    conversationLog: gameState.conversationLog,
  }), [presence.users, gameState.vibe, gameState.dateContext, gameState.currentScene, presence.userPersona, presence.partnerPersona, gameState.activeQuestion, gameState.questionOwnerId, gameState.myRating, broadcasting.view, gameState.conversationLog]);

  const {
    isConnected, isSynced, connectionError, connectionStatus,
    retryConnection: retryNetworkConnection,
    refreshSync: refreshNetworkSync,
    initSession
  } = useNetworkSync(syncState, syncActions, activityCallbacksRef, sessionInfo);

  // --- Session Lifecycle ---
  const lifecycle = useSessionLifecycle(
    gameState, presence, initSession,
    broadcasting.rawSetters.setViewState,
    broadcasting.setView,
    updatePersonaImage,
    sessionInfo, setSessionInfo
  );

  // --- Persona Effects (side-effect only) ---
  usePersonaEffects(gameState, presence, broadcasting.triggerFlash);

  // --- Activity callback registration ---
  const registerActivityCallbacks = (
    onData: (payload: ActivityPayload) => void,
    onChoice: (payload: { userId: string; choice: number }) => void,
    onPlaylistChoice?: (payload: { userId: string; choices: number[] }) => void
  ) => {
    activityCallbacksRef.current = { onData, onChoice, onPlaylistChoice: onPlaylistChoice || null };
  };

  // --- Compose return ---
  const state = {
    users: presence.users,
    vibe: gameState.vibe,
    round: gameState.round,
    sipLevel: gameState.sipLevel,
    activeQuestion: gameState.activeQuestion,
    questionOwnerId: gameState.questionOwnerId,
    currentScene: gameState.currentScene,
    sceneChoices: gameState.sceneChoices,
    partnerPersona: presence.partnerPersona,
    userPersona: presence.userPersona,
    view: broadcasting.view,
    isConnected,
    isSynced,
    connectionError,
    connectionStatus,
    latestReaction: broadcasting.latestReaction,
    flashMessage: broadcasting.flashMessage,
    incomingToastRequest: broadcasting.incomingToastRequest,
    isDraftOpen: broadcasting.isDraftOpen,
    dateContext: gameState.dateContext,
    conversationLog: gameState.conversationLog,
    myRating: gameState.myRating,
    partnerRating: gameState.partnerRating,
    guestProfileConfirmed: presence.guestProfileConfirmed,
    arrivalEvent: presence.arrivalEvent,
    lastChoiceText: broadcasting.lastChoiceText,
    activePersonaTab,
    hasSeenArrivalOverlay: presence.hasSeenArrivalOverlay,
    isHost: sessionInfo?.isHost ?? false,
  };

  const actions = {
    setVibe: broadcasting.setVibe,
    setRound: broadcasting.setRound,
    setView: broadcasting.setView,
    setUsers: broadcasting.setUsers,
    setPartnerPersona: broadcasting.setPartnerPersona,
    setUserPersona: broadcasting.setUserPersona,
    setCurrentScene: broadcasting.setCurrentScene,
    submitSceneChoice: broadcasting.submitSceneChoice,
    simulatePartnerChoice: broadcasting.simulatePartnerChoice,
    setQuestionState: broadcasting.setQuestionState,
    triggerReaction: broadcasting.triggerReaction,
    sendFlash: broadcasting.sendFlash,
    sendToastInvite: broadcasting.sendToastInvite,
    setDraftOpen: broadcasting.setDraftOpen,
    setDateContext: broadcasting.setDateContext,
    setConversationLog: broadcasting.setConversationLog,
    submitRating: broadcasting.submitRating,
    setSipLevel: broadcasting.setSipLevel,
    setLastChoiceText: broadcasting.setLastChoiceText,
    refreshSync: refreshNetworkSync,
    retryConnection: retryNetworkConnection,
    startApp: lifecycle.startApp,
    clearSession: lifecycle.clearSession,
    registerActivityCallbacks,
    getSelf: broadcasting.getSelf,
    getPartner: broadcasting.getPartner,
    takeSip: broadcasting.takeSip,
    broadcastActivityData: broadcasting.broadcastActivityData,
    broadcastActivityChoice: broadcasting.broadcastActivityChoice,
    broadcastPlaylistChoice: broadcasting.broadcastPlaylistChoice,
    triggerFlash: broadcasting.triggerFlash,
    updatePersonaImage,
    regenerateAvatarFromPhoto: async (base64: string) => {
      return personaLogic.regenerateAvatarFromPhoto(base64, gameState.round);
    },
    injectVisualModifier: async (modifier: string) => {
      return personaLogic.injectVisualModifier(modifier, gameState.round, gameState.dateContext, broadcasting.setDateContext);
    },
    setActivePersonaTab,
    clearArrivalEvent: useCallback(() => {
        presence.setArrivalEvent(null);
        presence.setHasSeenArrivalOverlay(true);
    }, [presence.setArrivalEvent, presence.setHasSeenArrivalOverlay]),
    confirmGuestProfile: (name: string, background: string) => {
        presence.setGuestProfileConfirmed(true);
        if (name) {
            presence.setUsers(prev => {
                const next = prev.map(u => u.isSelf ? { ...u, name } : u);
                const lightUsers = next.map(u => ({ ...u, avatar: null }));
                p2p.send({ type: 'SYNC_USER', payload: lightUsers });
                return next;
            });
        }
        if (background) {
            presence.setUserPersona(prev => {
                const next = { ...prev, background };
                const { imageUrl, ...rest } = next;
                p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'partner', data: rest } });
                return next;
            });
        }
    },
  };

  return { state, actions, updatePersonaImage };
}
