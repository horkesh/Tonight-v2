
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { User, VibeStats, PersonaState, Scene, Question, AppView, DateContext, DateLocation, DateVibe, ConversationEntry } from '../types';
import { INITIAL_VIBE } from '../constants';
import { generateLocationImage } from '../services/geminiService';
import { p2p } from '../services/p2p';
import { compressImage } from '../utils/helpers';
import { usePersonaLogic } from './usePersonaLogic';
import { useNetworkSync } from './useNetworkSync';

const SESSION_KEY = 'tonight_active_session';
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop";

const INITIAL_PERSONA: PersonaState = {
  traits: [], memories: [], secrets: [], imageUrl: null, lastGeneratedRound: 0, isGenerating: false, 
  revealProgress: 0, chemistry: 0, drunkFactor: 0, appearance: "",
  isProfileComplete: false
};

export function useSessionState() {
  // --- State Definitions ---
  const [view, setViewState] = useState<AppView>('setup');
  const [vibe, setVibeState] = useState<VibeStats>(INITIAL_VIBE);
  const [round, setRoundState] = useState(0);
  const [sipLevel, setSipLevelState] = useState(0);
  const [clinkActive, setClinkActive] = useState(false);
  const [lastChoiceText, setLastChoiceText] = useState<string>("");
  
  const [partnerPersona, setPartnerPersonaState] = useState<PersonaState>(INITIAL_PERSONA);
  const [userPersona, setUserPersonaState] = useState<PersonaState>(INITIAL_PERSONA);
  const [users, setUsersState] = useState<User[]>([]);
  
  const [currentScene, setCurrentSceneState] = useState<Scene | null>(null);
  const [sceneChoices, setSceneChoices] = useState<Record<string, string>>({});
  
  const [activeQuestion, setActiveQuestionState] = useState<Question | null>(null);
  const [questionOwnerId, setQuestionOwnerIdState] = useState<string | null>(null);

  const [latestReaction, setLatestReaction] = useState<{ content: string; timestamp: number } | null>(null);
  const [flashMessage, setFlashMessageState] = useState<string | null>(null);
  const [incomingToastRequest, setIncomingToastRequest] = useState(false);
  const [isDraftOpen, setIsDraftOpenState] = useState(false);
  
  const [dateContext, setDateContextState] = useState<DateContext | null>(null);
  const [conversationLog, setConversationLogState] = useState<ConversationEntry[]>([]);

  const [myRating, setMyRating] = useState<number | null>(null);
  const [partnerRating, setPartnerRating] = useState<number | null>(null);

  const [guestProfileConfirmed, setGuestProfileConfirmed] = useState(true);
  const [arrivalEvent, setArrivalEvent] = useState<{ name: string; avatar: string; type?: 'arrival' | 'welcome' } | null>(null);

  // Session Info State
  const [sessionInfo, setSessionInfo] = useState<{ userId: string; roomId: string; isHost: boolean } | null>(null);

  // Refs
  const activityCallbacksRef = useRef<{
    onData: ((payload: { type: string; data: any }) => void) | null;
    onChoice: ((payload: { userId: string; choice: number }) => void) | null;
  }>({ onData: null, onChoice: null });

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChemistryMilestone = useRef<number>(0);

  // --- Persona Logic Hook ---
  const { 
    updatePersonaImage,
    regenerateAvatarFromPhoto,
    injectVisualModifier
  } = usePersonaLogic(userPersona, setUserPersonaState, partnerPersona, setPartnerPersonaState);

  // --- Network Sync Hook ---
  const syncActions = useMemo(() => ({
    setUsers: setUsersState,
    setVibe: setVibeState,
    setDateContext: setDateContextState,
    setCurrentScene: setCurrentSceneState,
    setPartnerPersona: setPartnerPersonaState,
    setUserPersona: setUserPersonaState,
    setActiveQuestion: setActiveQuestionState,
    setQuestionOwnerId: setQuestionOwnerIdState,
    setPartnerRating: setPartnerRating,
    setView: setViewState,
    setConversationLog: setConversationLogState,
    setIncomingToastRequest,
    setClinkActive,
    setLatestReaction,
    setArrivalEvent,
    setLastChoiceText,
    setSceneChoices,
    setGuestProfileConfirmed
  }), []);

  const syncState = useMemo(() => ({
    users, vibe, dateContext, currentScene, userPersona, partnerPersona, 
    activeQuestion, questionOwnerId, myRating, view, conversationLog
  }), [users, vibe, dateContext, currentScene, userPersona, partnerPersona, activeQuestion, questionOwnerId, myRating, view, conversationLog]);

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

  const getSelf = useCallback(() => users.find(u => u.isSelf), [users]);
  const getPartner = useCallback(() => users.find(u => !u.isSelf), [users]);

  const takeSip = useCallback(() => {
      setSipLevelState(prev => {
          const val = prev + 1;
          p2p.send({ type: 'SYNC_SIP', payload: val });
          return val;
      });
  }, []);

  const broadcastActivityData = useCallback((type: string, data: any) => {
      p2p.send({ type: 'SYNC_ACTIVITY_DATA', payload: { type, data } });
  }, []);

  const broadcastActivityChoice = useCallback((userId: string, choice: number) => {
      p2p.send({ type: 'SYNC_ACTIVITY_CHOICE', payload: { userId, choice } });
  }, []);

  // --- Effects ---

  // Restore session on mount
  useEffect(() => {
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
  }, [initSession]);

  // Haze / Drunk Factor Effect
  useEffect(() => {
    const root = document.documentElement;
    const blur = partnerPersona.drunkFactor * 0.8;
    root.style.setProperty('--haze-blur', `${blur}px`);
    if (partnerPersona.drunkFactor > 0) document.body.classList.add('haze-active');
    else document.body.classList.remove('haze-active');
  }, [partnerPersona.drunkFactor]);

  // Drunk Factor Decay
  useEffect(() => {
    const decayInterval = setInterval(() => {
        setPartnerPersonaState(p => {
            if (p.drunkFactor <= 0) return p;
            return { ...p, drunkFactor: Math.max(0, p.drunkFactor - 0.5) };
        });
    }, 15000); 
    return () => clearInterval(decayInterval);
  }, []);

  // Keep users[].avatar in sync with persona imageUrl
  useEffect(() => {
    if (userPersona.imageUrl) {
        setUsersState(prev => prev.map(u =>
            u.isSelf && u.avatar !== userPersona.imageUrl ? { ...u, avatar: userPersona.imageUrl! } : u
        ));
    }
  }, [userPersona.imageUrl]);

  useEffect(() => {
    if (partnerPersona.imageUrl) {
        setUsersState(prev => prev.map(u =>
            !u.isSelf && u.avatar !== partnerPersona.imageUrl ? { ...u, avatar: partnerPersona.imageUrl! } : u
        ));
    }
  }, [partnerPersona.imageUrl]);

  // Chemistry Update & Milestones
  useEffect(() => {
    if (round === 0) return;
    const chem = Math.round((vibe.flirty * 0.6) + (vibe.comfortable * 0.4));
    setPartnerPersonaState(p => ({ ...p, chemistry: chem }));

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
  }, [vibe.flirty, vibe.comfortable, round]);

  // --- Broadcasting Actions ---
  
  const setVibe = (updater: React.SetStateAction<VibeStats>, broadcast = true) => {
    setVibeState(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) p2p.send({ type: 'SYNC_VIBE', payload: val });
        return val;
    });
  };

  const setRound = (updater: React.SetStateAction<number>, broadcast = true) => {
    setRoundState(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) p2p.send({ type: 'SYNC_ROUND', payload: val });
        return val;
    });
  };

  const setView = (val: AppView, broadcast = true) => {
    setViewState(val);
    if (broadcast) p2p.send({ type: 'SYNC_VIEW', payload: val });
  };

  const setUsers = (updater: React.SetStateAction<User[]>, broadcast = true) => {
    setUsersState(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) p2p.send({ type: 'SYNC_USER', payload: val });
        return val;
    });
  };

  const setPartnerPersona = (updater: React.SetStateAction<PersonaState>, broadcast = true) => {
    setPartnerPersonaState(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'user', data: val } });
        return val;
    });
  };

  const setUserPersona = (updater: React.SetStateAction<PersonaState>, broadcast = true) => {
    setUserPersonaState(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'partner', data: val } });
        return val;
    });
  };

  const setDateContext = (ctx: DateContext | null, broadcast = true) => {
      setDateContextState(ctx);
      if (broadcast) p2p.send({ type: 'SYNC_DATE_CONTEXT', payload: ctx });
  };

  const setConversationLog = (updater: React.SetStateAction<ConversationEntry[]>, broadcast = true) => {
      setConversationLogState(prev => {
          const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
          if (broadcast) p2p.send({ type: 'SYNC_CONVERSATION_LOG', payload: val });
          return val;
      });
  };

  const setCurrentScene = (scene: Scene | null, broadcast = true) => {
    setCurrentSceneState(scene);
    if (broadcast) {
        p2p.send({ type: 'SYNC_SCENE', payload: scene });
        setSceneChoices({});
    }
  };

  const submitSceneChoice = (choiceId: string) => {
    const self = users.find(u => u.isSelf);
    if (!self) return;
    setSceneChoices(prev => ({ ...prev, [self.id]: choiceId }));
    p2p.send({ type: 'SYNC_SCENE_CHOICE', payload: { userId: self.id, choiceId } });
  };

  const simulatePartnerChoice = (choiceId: string) => {
    const partner = users.find(u => !u.isSelf);
    if (!partner) return;
    setSceneChoices(prev => ({ ...prev, [partner.id]: choiceId }));
  };

  const setQuestionState = (question: Question | null, ownerId: string | null, broadcast = true) => {
    setActiveQuestionState(question);
    setQuestionOwnerIdState(ownerId);
    if (broadcast) {
        p2p.send({ type: 'SYNC_QUESTION_STATE', payload: { question, ownerId } });
    }
  };

  const triggerReaction = (content: string, broadcast = true) => {
    setLatestReaction({ content, timestamp: Date.now() });
    if (broadcast) p2p.send({ type: 'TRIGGER_REACTION', payload: content });
  };
  
  const sendFlash = (content: string) => {
    p2p.send({ type: 'TRIGGER_FLASH', payload: content });
  };

  const sendToastInvite = () => {
    p2p.send({ type: 'SYNC_TOAST_INVITE', payload: null });
  };

  const setDraftOpen = (isOpen: boolean, broadcast = true) => {
    setIsDraftOpenState(isOpen);
    if (broadcast) p2p.send({ type: 'SYNC_DRAFT_STATE', payload: isOpen });
  };

  const submitRating = (rating: number) => {
      setMyRating(rating);
      p2p.send({ type: 'SYNC_RATING', payload: rating });
  };

  const setSipLevel = (updater: React.SetStateAction<number>, broadcast = true) => {
      setSipLevelState(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) p2p.send({ type: 'SYNC_SIP', payload: val });
        return val;
      });
  };

  const registerActivityCallbacks = (onData: (payload: any) => void, onChoice: (payload: any) => void) => {
    activityCallbacksRef.current = { onData, onChoice };
  };

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
        
        setUsersState([selfUser, partnerUser]);

        const fullAppearanceSelf = hostData.appearance || `${hostData.age}, ${hostData.sex}, ${hostData.desc}`;
        const fullAppearancePartner = guestData.appearance || `${guestData.age}, ${guestData.sex}, ${guestData.desc}`;

        setUserPersonaState(p => ({
            ...p,
            sex: hostData.sex,
            age: hostData.age,
            appearance: fullAppearanceSelf,
            background: hostData.desc,
            traits: [],
            isProfileComplete: true,
            imageUrl: initialAvatar || DEFAULT_AVATAR
        }));

        setPartnerPersonaState(p => ({
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
            setDateContext({ location: locationData, vibe: vibeData });
            generateLocationImage(locationData, vibeData, fullAppearanceSelf, fullAppearancePartner).then(async imgUrl => {
                if (!imgUrl) return;
                let finalUrl = imgUrl;
                if (imgUrl.startsWith('data:')) {
                    try {
                        const compressed = await compressImage(imgUrl, 0.6, 1024);
                        finalUrl = `data:image/jpeg;base64,${compressed}`;
                    } catch (e) {
                        console.error("Location image compression failed, using original", e);
                    }
                }
                setDateContext({ location: locationData, vibe: vibeData, generatedImage: finalUrl });
            });
        }
        
        if (!initialAvatar) updatePersonaImage('self', hostTraits || [], 5, fullAppearanceSelf);
        if (!partnerAvatar) updatePersonaImage('partner', partnerTraits || [], 5, fullAppearancePartner);

        setView('hub');

    } else {
        const selfUser: User = { id: userId, name: name || "Guest", isSelf: true, status: 'online', avatar: initialAvatar || DEFAULT_AVATAR };
        const partnerUser: User = { id: 'host-placeholder', name: 'Partner', isSelf: false, status: 'online', avatar: DEFAULT_AVATAR };
        setUsersState([selfUser, partnerUser]);

        setUserPersonaState(p => ({ 
            ...p, 
            sex: guestData.sex,
            isProfileComplete: true,
            imageUrl: initialAvatar || DEFAULT_AVATAR 
        }));
        
        const fullAppearanceSelf = `${guestData.age}, ${guestData.sex}, ${guestData.desc}`;
        setUserPersonaState(p => ({
            ...p,
            age: guestData.age,
            appearance: fullAppearanceSelf,
            traits: guestData.traits || [],
            isProfileComplete: true
        }));
        
        setGuestProfileConfirmed(false);
        setViewState('loading');
    }
  };

  const state = {
    users, vibe, round, sipLevel, activeQuestion, questionOwnerId,
    currentScene, sceneChoices, partnerPersona, userPersona,
    view, isConnected, isSynced, connectionError, connectionStatus,
    latestReaction, flashMessage, incomingToastRequest, isDraftOpen,
    dateContext, conversationLog, myRating, partnerRating,
    guestProfileConfirmed, arrivalEvent,
    lastChoiceText
  };

  const actions = {
    setVibe, setRound, setView, setUsers, setPartnerPersona, setUserPersona,
    setCurrentScene, submitSceneChoice, simulatePartnerChoice,
    setQuestionState, triggerReaction, sendFlash, sendToastInvite,
    setDraftOpen, setDateContext, setConversationLog, submitRating,
    setSipLevel, refreshSync: refreshNetworkSync, retryConnection: retryNetworkConnection, startApp, clearSession,
    registerActivityCallbacks,
    getSelf, getPartner, takeSip, broadcastActivityData, broadcastActivityChoice, triggerFlash,
    updatePersonaImage, regenerateAvatarFromPhoto, injectVisualModifier
  };

  return {
    state,
    actions,
    updatePersonaImage, regenerateAvatarFromPhoto, injectVisualModifier
  };
}
