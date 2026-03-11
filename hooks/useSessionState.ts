
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { User, VibeStats, PersonaState, Scene, Question, AppView, DateContext, DateLocation, DateVibe, ConversationEntry } from '../types';
import { generateLocationImage } from '../services/geminiService';
import { p2p } from '../services/p2p';
import { compressImage } from '../utils/helpers';
import { usePersonaLogic } from './usePersonaLogic';
import { useNetworkSync } from './useNetworkSync';
import { useGameStore } from '../store/gameState';
import { usePresenceStore } from '../store/presenceState';

const SESSION_KEY = 'tonight_active_session';
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop";

export function useSessionState() {
  // --- Domain Stores ---
  const gameState = useGameStore();
  const presence = usePresenceStore();

  // --- UI / Session State ---
  const [view, setViewState] = useState<AppView>('setup');
  const [clinkActive, setClinkActive] = useState(false);
  const [lastChoiceText, setLastChoiceTextState] = useState<string>("");
  const [latestReaction, setLatestReaction] = useState<{ content: string; timestamp: number; duration?: number } | null>(null);
  const [flashMessage, setFlashMessageState] = useState<string | null>(null);
  const [incomingToastRequest, setIncomingToastRequest] = useState(false);
  const [isDraftOpen, setIsDraftOpenState] = useState(false);
  const [activePersonaTab, setActivePersonaTab] = useState<'partner' | 'self'>('partner');
  const [hasSeenArrivalOverlay, setHasSeenArrivalOverlay] = useState(false);

  // Session Info State
  const [sessionInfo, setSessionInfo] = useState<{ userId: string; roomId: string; isHost: boolean } | null>(null);

  // Refs
  const activityCallbacksRef = useRef<{
    onData: ((payload: { type: string; data: any }) => void) | null;
    onChoice: ((payload: { userId: string; choice: number }) => void) | null;
  }>({ onData: null, onChoice: null });

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChemistryMilestone = useRef<number>(0);

  // --- Broadcasting Wrappers ---
  // These wrap the raw setters to add P2P broadcasting capabilities
  
  const setVibe = useCallback((updater: React.SetStateAction<VibeStats>, broadcast = true) => {
    gameState.setVibe(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) p2p.send({ type: 'SYNC_VIBE', payload: val });
        return val;
    });
  }, [gameState.setVibe]);

  const setRound = useCallback((updater: React.SetStateAction<number>, broadcast = true) => {
    gameState.setRound(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) p2p.send({ type: 'SYNC_ROUND', payload: val });
        return val;
    });
  }, [gameState.setRound]);

  const setView = useCallback((val: AppView, broadcast = true) => {
    setViewState(val);
    if (broadcast) p2p.send({ type: 'SYNC_VIEW', payload: val });
  }, []);

  const setUsers = useCallback((updater: React.SetStateAction<User[]>, broadcast = true) => {
    presence.setUsers(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) {
            const lightUsers = val.map((u: User) => ({ ...u, avatar: null }));
            p2p.send({ type: 'SYNC_USER', payload: lightUsers });
        }
        return val;
    });
  }, [presence.setUsers]);

  const setPartnerPersona = useCallback((updater: React.SetStateAction<PersonaState>, broadcast = true) => {
    presence.setPartnerPersona(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) {
            const { imageUrl, ...rest } = val;
            p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'user', data: rest } });
            if (val.imageUrl && val.imageUrl !== prev.imageUrl) {
                p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'user', data: { imageUrl: val.imageUrl } } });
            }
        }
        return val;
    });
  }, [presence.setPartnerPersona]);

  const setUserPersona = useCallback((updater: React.SetStateAction<PersonaState>, broadcast = true) => {
    presence.setUserPersona(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) {
            const { imageUrl, ...rest } = val;
            p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'partner', data: rest } });
            if (val.imageUrl && val.imageUrl !== prev.imageUrl) {
                p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'partner', data: { imageUrl: val.imageUrl } } });
            }
        }
        return val;
    });
  }, [presence.setUserPersona]);

  // --- Persona Logic Hook ---
  const personaLogic = usePersonaLogic(
    presence.userPersona,
    setUserPersona, // Use broadcasting wrapper
    presence.partnerPersona,
    setPartnerPersona // Use broadcasting wrapper
  );
  const { updatePersonaImage } = personaLogic;

  const setDateContext = useCallback((updater: DateContext | null | ((prev: DateContext | null) => DateContext | null), broadcast = true) => {
      gameState.setDateContext(prev => {
          const val = typeof updater === 'function' ? updater(prev) : updater;
          if (broadcast) {
              if (val) {
                  const { generatedImage, ...rest } = val;
                  p2p.send({ type: 'SYNC_DATE_CONTEXT', payload: rest });
                  if (val.generatedImage && val.generatedImage !== prev?.generatedImage) {
                      p2p.send({ type: 'SYNC_DATE_CONTEXT', payload: { generatedImage: val.generatedImage } });
                  }
              } else {
                  p2p.send({ type: 'SYNC_DATE_CONTEXT', payload: null });
              }
          }
          return val;
      });
  }, [gameState.setDateContext]);

  const setConversationLog = useCallback((updater: React.SetStateAction<ConversationEntry[]>, broadcast = true) => {
      gameState.setConversationLog(prev => {
          const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
          if (broadcast) p2p.send({ type: 'SYNC_CONVERSATION_LOG', payload: val });
          return val;
      });
  }, [gameState.setConversationLog]);

  const setCurrentScene = useCallback((scene: Scene | null, broadcast = true) => {
    gameState.setCurrentScene(scene);
    if (broadcast) {
        p2p.send({ type: 'SYNC_SCENE', payload: scene });
        gameState.setSceneChoices({});
    }
  }, [gameState.setCurrentScene, gameState.setSceneChoices]);

  const submitSceneChoice = useCallback((choiceId: string) => {
    const self = presence.users.find(u => u.isSelf);
    if (!self) return;
    gameState.setSceneChoices(prev => ({ ...prev, [self.id]: choiceId }));
    p2p.send({ type: 'SYNC_SCENE_CHOICE', payload: { userId: self.id, choiceId } });
  }, [presence.users, gameState.setSceneChoices]);

  const simulatePartnerChoice = useCallback((choiceId: string) => {
    const partner = presence.users.find(u => !u.isSelf);
    if (!partner) return;
    gameState.setSceneChoices(prev => ({ ...prev, [partner.id]: choiceId }));
  }, [presence.users, gameState.setSceneChoices]);

  const setQuestionState = useCallback((question: Question | null, ownerId: string | null, broadcast = true) => {
    gameState.setActiveQuestion(question);
    gameState.setQuestionOwnerId(ownerId);
    if (broadcast) {
        p2p.send({ type: 'SYNC_QUESTION_STATE', payload: { question, ownerId } });
    }
  }, [gameState.setActiveQuestion, gameState.setQuestionOwnerId]);

  const triggerReaction = useCallback((content: string, broadcast = true) => {
    setLatestReaction({ content, timestamp: Date.now() });
    if (broadcast) p2p.send({ type: 'TRIGGER_REACTION', payload: content });
  }, []);
  
  const sendFlash = useCallback((content: string, duration?: number) => {
    p2p.send({ type: 'TRIGGER_FLASH', payload: { content, duration } });
  }, []);

  const sendToastInvite = useCallback(() => {
    p2p.send({ type: 'SYNC_TOAST_INVITE', payload: null });
  }, []);

  const setDraftOpen = useCallback((isOpen: boolean, broadcast = true) => {
    setIsDraftOpenState(isOpen);
    if (broadcast) p2p.send({ type: 'SYNC_DRAFT_STATE', payload: isOpen });
  }, []);

  const submitRating = useCallback((rating: number) => {
      gameState.setMyRating(rating);
      p2p.send({ type: 'SYNC_RATING', payload: rating });
  }, [gameState.setMyRating]);

  const setSipLevel = useCallback((updater: React.SetStateAction<number>, broadcast = true) => {
      gameState.setSipLevel(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) p2p.send({ type: 'SYNC_SIP', payload: val });
        return val;
      });
  }, [gameState.setSipLevel]);

  const setLastChoiceText = useCallback((text: string, broadcast = true) => {
      setLastChoiceTextState(text);
      if (broadcast) p2p.send({ type: 'SYNC_LAST_CHOICE', payload: text });
  }, []);

  // --- Network Sync Hook Integration ---
  // Pass RAW setters to useNetworkSync so received P2P messages update state without re-broadcasting.
  // UI-facing actions (above) use the broadcasting wrappers.

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

    setView: setViewState,
    setIncomingToastRequest,
    setClinkActive,
    setLatestReaction,
    setLastChoiceText: setLastChoiceTextState,
  }), [gameState, presence]);

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
    view,
    conversationLog: gameState.conversationLog
  }), [presence.users, gameState.vibe, gameState.dateContext, gameState.currentScene, presence.userPersona, presence.partnerPersona, gameState.activeQuestion, gameState.questionOwnerId, gameState.myRating, view, gameState.conversationLog]);

  const {
    isConnected,
    isSynced,
    connectionError,
    connectionStatus,
    retryConnection: retryNetworkConnection,
    refreshSync: refreshNetworkSync,
    initSession
  } = useNetworkSync(syncState, syncActions, activityCallbacksRef, sessionInfo);

  // --- Helpers ---
  const triggerFlash = (msg: string, duration = 2500) => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlashMessageState(msg);
      flashTimerRef.current = setTimeout(() => setFlashMessageState(null), duration);
  };

  const persistSession = (userId: string, roomId: string, isHost: boolean) => {
      const data = { userId, roomId, isHost, timestamp: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  };

  const clearSession = () => {
      p2p.teardown();
      localStorage.removeItem(SESSION_KEY);
      setSessionInfo(null);
      window.location.reload();
  };

  const getSelf = useCallback(() => presence.users.find(u => u.isSelf), [presence.users]);
  const getPartner = useCallback(() => presence.users.find(u => !u.isSelf), [presence.users]);

  const takeSip = useCallback((amount = 1) => {
      gameState.setSipLevel(prev => {
          const val = prev + amount;
          p2p.send({ type: 'SYNC_SIP', payload: val });
          return val;
      });
  }, [gameState.setSipLevel]);

  const broadcastActivityData = useCallback((type: string, data: any) => {
      p2p.send({ type: 'SYNC_ACTIVITY_DATA', payload: { type, data } });
  }, []);

  const broadcastActivityChoice = useCallback((userId: string, choice: number) => {
      p2p.send({ type: 'SYNC_ACTIVITY_CHOICE', payload: { userId, choice } });
  }, []);

  const registerActivityCallbacks = (onData: (payload: any) => void, onChoice: (payload: any) => void) => {
    activityCallbacksRef.current = { onData, onChoice };
  };

  // --- Effects ---

  // Restore session on mount
  const restoreAttempted = useRef(false);
  useEffect(() => {
      if (restoreAttempted.current) return;
      restoreAttempted.current = true;

      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) {
          console.log("Session: Magic link detected, skipping session restore.");
          localStorage.removeItem(SESSION_KEY);
          return;
      }

      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
          try {
              const { userId, roomId, isHost, timestamp } = JSON.parse(saved);
              if (Date.now() - timestamp < 1000 * 60 * 5) {
                  console.log("Session: Restoring existing session...");
                  setSessionInfo({ userId, roomId, isHost });
                  initSession(userId, roomId, isHost);
                  
                  setViewState('loading');
                  if (isHost) {
                      setTimeout(() => setViewState('hub'), 800);
                  }
                  
                  setTimeout(() => {
                      setViewState(prev => {
                          if (prev === 'loading') {
                              console.log("Session: Restore timeout — returning to setup.");
                              localStorage.removeItem(SESSION_KEY);
                              setSessionInfo(null);
                              p2p.teardown();
                              return 'setup';
                          }
                          return prev;
                      });
                  }, 8000);
              } else {
                  console.log("Session: Stale session found, clearing.");
                  localStorage.removeItem(SESSION_KEY);
              }
          } catch (e) {
              localStorage.removeItem(SESSION_KEY);
          }
      }
      
      return () => {
          // Cleanup on unmount to prevent resource leaks/zombie connections
          console.log("Session: Unmounting, tearing down P2P.");
          p2p.teardown();
      };
  }, [initSession]);

  // Haze / Drunk Factor Effect
  useEffect(() => {
    const root = document.documentElement;
    const blur = presence.partnerPersona.drunkFactor * 0.8;
    root.style.setProperty('--haze-blur', `${blur}px`);
    if (presence.partnerPersona.drunkFactor > 0) document.body.classList.add('haze-active');
    else document.body.classList.remove('haze-active');
  }, [presence.partnerPersona.drunkFactor]);

  // Keep users[].avatar in sync with persona imageUrl
  useEffect(() => {
    if (presence.userPersona.imageUrl) {
        presence.setUsers(prev => prev.map(u =>
            u.isSelf && u.avatar !== presence.userPersona.imageUrl ? { ...u, avatar: presence.userPersona.imageUrl! } : u
        ));
    }
  }, [presence.userPersona.imageUrl, presence.setUsers]);

  useEffect(() => {
    if (presence.partnerPersona.imageUrl) {
        presence.setUsers(prev => prev.map(u =>
            !u.isSelf && u.avatar !== presence.partnerPersona.imageUrl ? { ...u, avatar: presence.partnerPersona.imageUrl! } : u
        ));
    }
  }, [presence.partnerPersona.imageUrl, presence.setUsers]);

  // Chemistry Update & Milestones
  useEffect(() => {
    if (gameState.round === 0) return;
    const chem = Math.round((gameState.vibe.flirty * 0.6) + (gameState.vibe.comfortable * 0.4));
    presence.setPartnerPersona(p => ({ ...p, chemistry: chem }));

    const milestones: [number, string][] = [
      [25, "Something's stirring..."],
      [50, "The air just shifted."],
      [75, "Undeniable."],
      [90, "Dangerous territory."],
    ];
    for (const [threshold, message] of milestones) {
      if (chem >= threshold && lastChemistryMilestone.current < threshold) {
        triggerFlash(message, 3500);
        lastChemistryMilestone.current = threshold;
        break;
      }
    }
  }, [gameState.vibe.flirty, gameState.vibe.comfortable, gameState.round, presence.setPartnerPersona]);

  // --- Start App Logic ---
  const startApp = (
      hostData: any | null, 
      guestData: any, 
      vibeData: DateVibe | null, 
      locationData: DateLocation | null, 
      roomId: string, 
      isHost: boolean,
      initialAvatar?: string,
      partnerAvatar?: string,
      hostTraits?: string[],
      partnerTraits?: string[]
  ) => {
    const name = isHost ? hostData.name : guestData.name;
    const effectiveName = name || `Guest`;
    const userId = `${effectiveName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.floor(Math.random() * 10000)}`;
    
    setSessionInfo({ userId, roomId, isHost });
    persistSession(userId, roomId, isHost);
    
    initSession(userId, roomId, isHost);

    if (isHost) {
        const partnerName = guestData.name;
        const selfUser: User = { id: userId, name: name, isSelf: true, status: 'online', avatar: initialAvatar || DEFAULT_AVATAR };
        const partnerUser: User = { id: 'partner-placeholder', name: partnerName, isSelf: false, status: 'online', avatar: partnerAvatar || DEFAULT_AVATAR };
        
        presence.setUsers([selfUser, partnerUser]);

        const fullAppearanceSelf = hostData.appearance || `${hostData.age}, ${hostData.sex}, ${hostData.desc}`;
        const fullAppearancePartner = guestData.appearance || `${guestData.age}, ${guestData.sex}, ${guestData.desc}`;

        presence.setUserPersona(p => ({
            ...p,
            sex: hostData.sex,
            age: hostData.age,
            appearance: fullAppearanceSelf,
            background: hostData.desc,
            traits: [],
            isProfileComplete: true,
            imageUrl: initialAvatar || DEFAULT_AVATAR
        }));

        presence.setPartnerPersona(p => ({
            ...p,
            sex: guestData.sex,
            age: guestData.age,
            appearance: fullAppearancePartner,
            background: guestData.desc,
            traits: [],
            isProfileComplete: true,
            imageUrl: partnerAvatar || DEFAULT_AVATAR
        }));

        if (locationData && vibeData) {
            gameState.setDateContext({ location: locationData, vibe: vibeData });
            generateLocationImage(locationData, vibeData, fullAppearanceSelf, fullAppearancePartner).then(async imgUrl => {
                if (!imgUrl) return;
                let finalUrl = imgUrl;
                if (imgUrl.startsWith('data:')) {
                    try {
                        const compressed = await compressImage(imgUrl, 0.5, 800);
                        finalUrl = `data:image/jpeg;base64,${compressed}`;
                    } catch (e) {
                        console.error("Location image compression failed, using original", e);
                    }
                }
                gameState.setDateContext({ location: locationData, vibe: vibeData, generatedImage: finalUrl });
            });
        }
        
        if (!initialAvatar) updatePersonaImage('self', hostTraits || [], 0, 0, fullAppearanceSelf);
        if (!partnerAvatar) updatePersonaImage('partner', partnerTraits || [], 0, 0, fullAppearancePartner);

        setView('hub');

    } else {
        const selfUser: User = { id: userId, name: name || "Guest", isSelf: true, status: 'online', avatar: initialAvatar || DEFAULT_AVATAR };
        const partnerUser: User = { id: 'host-placeholder', name: 'Partner', isSelf: false, status: 'online', avatar: DEFAULT_AVATAR };
        presence.setUsers([selfUser, partnerUser]);

        presence.setUserPersona(p => ({ 
            ...p, 
            sex: guestData.sex,
            isProfileComplete: true,
            imageUrl: initialAvatar || DEFAULT_AVATAR 
        }));
        
        const fullAppearanceSelf = `${guestData.age}, ${guestData.sex}, ${guestData.desc}`;
        presence.setUserPersona(p => ({
            ...p,
            age: guestData.age,
            appearance: fullAppearanceSelf,
            traits: guestData.traits || [],
            isProfileComplete: true
        }));
        
        presence.setGuestProfileConfirmed(false);
        setViewState('loading');
    }
  };

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
    view,
    isConnected,
    isSynced,
    connectionError,
    connectionStatus,
    latestReaction,
    flashMessage,
    incomingToastRequest,
    isDraftOpen,
    dateContext: gameState.dateContext,
    conversationLog: gameState.conversationLog,
    myRating: gameState.myRating,
    partnerRating: gameState.partnerRating,
    guestProfileConfirmed: presence.guestProfileConfirmed,
    arrivalEvent: presence.arrivalEvent,
    lastChoiceText,
    activePersonaTab,
    hasSeenArrivalOverlay
  };

  const actions = {
    setVibe, setRound, setView, setUsers, setPartnerPersona, setUserPersona,
    setCurrentScene, submitSceneChoice, simulatePartnerChoice,
    setQuestionState, triggerReaction, sendFlash, sendToastInvite,
    setDraftOpen, setDateContext, setConversationLog, submitRating,
    setSipLevel, setLastChoiceText, refreshSync: refreshNetworkSync, retryConnection: retryNetworkConnection, startApp, clearSession,
    registerActivityCallbacks,
    getSelf, getPartner, takeSip, broadcastActivityData, broadcastActivityChoice, triggerFlash,
    updatePersonaImage,
    regenerateAvatarFromPhoto: async (base64: string) => {
      return personaLogic.regenerateAvatarFromPhoto(base64, gameState.round);
    },
    injectVisualModifier: async (modifier: string) => {
      return personaLogic.injectVisualModifier(modifier, gameState.round, gameState.dateContext, setDateContext);
    },
    setActivePersonaTab,
    clearArrivalEvent: useCallback(() => {
        presence.setArrivalEvent(null);
        setHasSeenArrivalOverlay(true);
    }, [presence.setArrivalEvent]),
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
    }
  };

  return {
    state,
    actions,
    updatePersonaImage
  };
}
