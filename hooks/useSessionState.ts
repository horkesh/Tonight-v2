
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { User, VibeStats, PersonaState, NetworkMessage, Scene, Question, AppView, DateContext, DateLocation, DateVibe } from '../types';
import { INITIAL_VIBE } from '../constants';
import { generateAbstractAvatar, analyzeUserPhotoForAvatar } from '../services/geminiService';
import { p2p } from '../services/p2p';

const STORAGE_PREFIX = 'tonight_session_v2_';

const INITIAL_PERSONA: PersonaState = {
  traits: [], memories: [], secrets: [], imageUrl: null, lastGeneratedRound: 0, isGenerating: false, 
  revealProgress: 0, chemistry: 0, drunkFactor: 0, appearance: "",
  isProfileComplete: false
};

export function useSessionState() {
  const [view, setViewState] = useState<AppView>('setup');
  const [activePersonaTab, setActivePersonaTab] = useState<'partner' | 'self'>('partner');
  const [vibe, setVibeState] = useState<VibeStats>(INITIAL_VIBE);
  const [round, setRoundState] = useState(0);
  const [sipLevel, setSipLevelState] = useState(0);
  const [clinkActive, setClinkActive] = useState(false);
  const [lastChoiceText, setLastChoiceText] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  
  const [partnerPersona, setPartnerPersonaState] = useState<PersonaState>(INITIAL_PERSONA);
  const [userPersona, setUserPersonaState] = useState<PersonaState>(INITIAL_PERSONA);
  
  const [users, setUsersState] = useState<User[]>([]);
  
  const [currentScene, setCurrentSceneState] = useState<Scene | null>(null);
  const [sceneChoices, setSceneChoices] = useState<Record<string, string>>({});
  
  const [activeQuestion, setActiveQuestionState] = useState<Question | null>(null);
  const [questionOwnerId, setQuestionOwnerIdState] = useState<string | null>(null);

  const [latestReaction, setLatestReaction] = useState<{ content: string; timestamp: number } | null>(null);
  const [incomingToastRequest, setIncomingToastRequest] = useState(false);
  const [isDraftOpen, setIsDraftOpenState] = useState(false);
  
  const [dateContext, setDateContextState] = useState<DateContext | null>(null);
  
  // Rating Logic
  const [myRating, setMyRating] = useState<number | null>(null);
  const [partnerRating, setPartnerRating] = useState<number | null>(null);

  const sessionMeta = useRef<{ userId: string; roomId: string; isHost: boolean } | null>(null);
  const lastDrinkTime = useRef<number>(0);

  // --- Network Wrappers ---
  
  const setVibe = (updater: React.SetStateAction<VibeStats>, broadcast = true) => {
    setVibeState(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) p2p.send({ type: 'SYNC_VIBE', payload: val });
        return val;
    });
  };

  const setRound = (val: number, broadcast = true) => {
    setRoundState(val);
    if (broadcast) p2p.send({ type: 'SYNC_ROUND', payload: val });
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
        if (broadcast) p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'partner', data: val } });
        return val;
    });
  };

  const setUserPersona = (updater: React.SetStateAction<PersonaState>, broadcast = true) => {
    setUserPersonaState(prev => {
        const val = typeof updater === 'function' ? (updater as any)(prev) : updater;
        if (broadcast) p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'user', data: val } });
        return val;
    });
  };

  const setDateContext = (ctx: DateContext | null, broadcast = true) => {
      setDateContextState(ctx);
      if (broadcast) p2p.send({ type: 'SYNC_DATE_CONTEXT', payload: ctx });
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

  const setSipLevel = (val: number) => setSipLevelState(val);

  const clearSession = () => {
      p2p.cleanup();
      localStorage.removeItem('tonight_last_room');
      if (sessionMeta.current) {
          const key = `${STORAGE_PREFIX}${sessionMeta.current.roomId}_${sessionMeta.current.userId}`;
          localStorage.removeItem(key);
      }
      window.location.reload();
  };

  // --- P2P Listener ---
  useEffect(() => {
    const onConnectUnsub = p2p.onConnect(() => {
        setIsConnected(true);
        
        // If I am Host, I push the full state immediately to the new connection
        if (sessionMeta.current?.isHost) {
            console.log("Session: Connected. Sending FULL STATE bundle.");
            p2p.send({ 
                type: 'SYNC_FULL_STATE', 
                payload: {
                    vibe,
                    dateContext,
                    currentScene,
                    users,
                    partnerPersona: userPersona, // Host's Self -> Guest's Partner
                    // Send the Guest's calculated persona (which Host holds in partnerPersona)
                    // so the Guest can adopt it as their own userPersona.
                    guestUserPersona: partnerPersona, 
                    activeQuestion,
                    questionOwnerId,
                    myRating: myRating 
                }
            });
        }
    });

    const onDisconnectUnsub = p2p.onDisconnect(() => {
        setIsConnected(false);
    });

    const onDataUnsub = p2p.onData((msg: NetworkMessage) => {
        switch (msg.type) {
            case 'SYNC_FULL_STATE':
                // Guest receives this
                console.log("Session: Received FULL STATE bundle.");
                setVibeState(msg.payload.vibe);
                setDateContextState(msg.payload.dateContext);
                setCurrentSceneState(msg.payload.currentScene);
                
                // INTELLIGENT USER MERGE
                // The Host sent their view: [Host(isSelf=true), Guest(isSelf=false)]
                // We (the Guest) invert this.
                const incomingUsers: User[] = msg.payload.users;
                const remappedUsers = incomingUsers.map(u => {
                    // If the user was marked isSelf by the sender (Host), they are my Partner.
                    if (u.isSelf) return { ...u, isSelf: false };
                    // If the user was marked NOT Self by the sender (Host), they are ME.
                    return { ...u, isSelf: true };
                });
                setUsersState(remappedUsers);
                
                // 1. Set my Partner to what Host sent (Host's Self)
                setPartnerPersonaState(msg.payload.partnerPersona);
                
                // 2. Set Myself to what Host sent (Host's Partner / Guest Persona)
                if (msg.payload.guestUserPersona) {
                    setUserPersonaState(msg.payload.guestUserPersona);
                }

                if (msg.payload.activeQuestion) {
                    setActiveQuestionState(msg.payload.activeQuestion);
                    setQuestionOwnerIdState(msg.payload.questionOwnerId);
                }
                
                if (msg.payload.myRating) {
                    setPartnerRating(msg.payload.myRating); // Host's rating is my partnerRating
                }

                setIsSynced(true); // GUEST IS NOW SYNCED
                break;

            case 'SYNC_VIBE': setVibe(msg.payload, false); break;
            case 'SYNC_ROUND': setRound(msg.payload, false); break;
            case 'SYNC_VIEW': setView(msg.payload, false); break;
            case 'SYNC_USER': 
                setUsersState(prev => {
                    return msg.payload.map((u: User) => {
                        const existing = prev.find(p => p.id === u.id);
                        return { ...u, isSelf: existing?.isSelf || false };
                    });
                });
                break;
            case 'SYNC_SCENE': 
                setCurrentScene(msg.payload, false); 
                setSceneChoices({});
                break;
            case 'SYNC_SCENE_CHOICE':
                setSceneChoices(prev => ({ ...prev, [msg.payload.userId]: msg.payload.choiceId }));
                break;
            case 'SYNC_QUESTION_STATE': 
                setActiveQuestionState(msg.payload.question);
                setQuestionOwnerIdState(msg.payload.ownerId);
                if (msg.payload.question) setViewState('question');
                break;
            case 'SYNC_PERSONA': 
                const { type, data } = msg.payload;
                // If sender sends 'partner', they are updating ME (their partner) -> I update my USER persona
                // If sender sends 'user', they are updating THEMSELVES -> I update my PARTNER persona
                if (type === 'partner') setUserPersonaState(data); 
                if (type === 'user') setPartnerPersonaState(data);
                break;
            case 'TRIGGER_REACTION':
                setLatestReaction({ content: msg.payload, timestamp: Date.now() });
                break;
            case 'SYNC_TOAST_INVITE':
                setIncomingToastRequest(true);
                break;
            case 'SYNC_DRAFT_STATE':
                setDraftOpen(msg.payload, false);
                break;
            case 'SYNC_DATE_CONTEXT':
                setDateContextState(msg.payload);
                break;
            case 'SYNC_RATING':
                setPartnerRating(msg.payload);
                break;
            case 'TRIGGER_CLINK':
                setClinkActive(true);
                setLatestReaction({ content: "SYNCHRONIZED 🥂", timestamp: Date.now() }); 
                setTimeout(() => setClinkActive(false), 1000);
                if (navigator.vibrate) navigator.vibrate([100, 30, 100]);
                break;
        }
    });
    
    return () => {
        onConnectUnsub();
        onDisconnectUnsub();
        onDataUnsub();
    };
  }, [users, vibe, currentScene, activeQuestion, questionOwnerId, isDraftOpen, userPersona, dateContext, myRating]);

  const getSelf = useCallback(() => users.find(u => u.isSelf), [users]);
  const getPartner = useCallback(() => users.find(u => !u.isSelf), [users]);

  // Effects
  useEffect(() => {
    const root = document.documentElement;
    const blur = partnerPersona.drunkFactor * 0.8;
    root.style.setProperty('--haze-blur', `${blur}px`);
    if (partnerPersona.drunkFactor > 0) document.body.classList.add('haze-active');
    else document.body.classList.remove('haze-active');
  }, [partnerPersona.drunkFactor]);

  useEffect(() => {
    const decayInterval = setInterval(() => {
        setPartnerPersonaState(p => {
            if (p.drunkFactor <= 0) return p;
            return { ...p, drunkFactor: Math.max(0, p.drunkFactor - 0.5) };
        });
    }, 15000); 

    return () => clearInterval(decayInterval);
  }, []);

  useEffect(() => {
    if (round === 0) return;
    const chem = Math.round((vibe.flirty * 0.6) + (vibe.comfortable * 0.4));
    setPartnerPersona(p => ({ ...p, chemistry: chem }));
  }, [vibe.flirty, vibe.comfortable, round]);

  useEffect(() => {
    setUsers(prev => prev.map(u => {
      if (u.isSelf) {
        return userPersona.imageUrl ? { ...u, avatar: userPersona.imageUrl } : u;
      } else {
        return partnerPersona.imageUrl ? { ...u, avatar: partnerPersona.imageUrl } : u;
      }
    }));
  }, [userPersona.imageUrl, partnerPersona.imageUrl]);

  // Actions
  const startApp = (
      hostData: any | null, 
      guestData: any, 
      vibeData: DateVibe | null, 
      locationData: DateLocation | null, 
      roomId: string,
      isHost: boolean
  ) => {
    const name = isHost ? hostData.name : guestData.name;
    const userId = name.toLowerCase().replace(/[^a-z0-9]/g, ''); 
    sessionMeta.current = { userId, roomId, isHost };
    
    // Init P2P - explicitly passing isHost to force role
    p2p.init(userId, roomId, isHost);

    if (isHost) {
        // HOST SETUP
        const partnerName = guestData.name;
        const selfUser: User = { id: userId, name: name, isSelf: true, status: 'online', avatar: null };
        // We use a placeholder ID for partner initially; Sync will resolve this
        const partnerUser: User = { id: 'partner-placeholder', name: partnerName, isSelf: false, status: 'online', avatar: null };
        
        setUsersState([selfUser, partnerUser]);

        const fullAppearanceSelf = `${hostData.age}, ${hostData.sex}, ${hostData.desc}`;
        const fullAppearancePartner = `${guestData.age}, ${guestData.sex}, ${guestData.desc}`;
        
        setUserPersonaState(p => ({ 
            ...p, 
            sex: hostData.sex,
            age: hostData.age,
            appearance: fullAppearanceSelf,
            isProfileComplete: true
        }));
        
        setPartnerPersonaState(p => ({
            ...p,
            sex: guestData.sex,
            age: guestData.age,
            appearance: fullAppearancePartner,
            isProfileComplete: true 
        }));

        if (locationData && vibeData) {
            setDateContext({ location: locationData, vibe: vibeData });
        }

        // Host is immediately synced with themselves
        setIsSynced(true);
        
        // Trigger initial image generation
        updatePersonaImage('self', [], 5, fullAppearanceSelf);
        updatePersonaImage('partner', [], 5, fullAppearancePartner);

        setView('hub');

    } else {
        // GUEST JOINING
        const selfUser: User = { id: userId, name: name, isSelf: true, status: 'online', avatar: null };
        const partnerUser: User = { id: 'host-placeholder', name: 'Partner', isSelf: false, status: 'online', avatar: null };
        setUsersState([selfUser, partnerUser]);

        setUserPersonaState(p => ({ 
            ...p, 
            sex: guestData.sex,
            isProfileComplete: true 
        }));
        
        // Guest is NOT synced. They must wait for HOST data.
        setIsSynced(false);
        setView('hub');
    }
  };

  const completeOnboarding = async (age: string, height: string, style: string) => {
      const sex = userPersona.sex || "person";
      const fullAppearance = `${age}, ${sex}, ${height}, ${style}`;
      
      setUserPersonaState(p => ({
          ...p,
          age,
          height,
          appearance: fullAppearance,
          isProfileComplete: true
      }));

      await updatePersonaImage('self', [], 5, fullAppearance);
      setView('hub');
  };

  const updatePersonaImage = async (target: 'self' | 'partner', traits: string[], progress: number, contextOverride?: string) => {
    const setter = target === 'self' ? setUserPersona : setPartnerPersona;
    const persona = target === 'self' ? userPersona : partnerPersona;
    
    setter(p => ({ ...p, isGenerating: true }));
    try {
      const context = contextOverride || persona.appearance || "Cinematic character";
      const url = await generateAbstractAvatar(traits, progress, context);
      setter(p => ({ ...p, imageUrl: url, lastGeneratedRound: round }));
    } catch {
      setter(p => ({ ...p, imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop" }));
    } finally {
      setter(p => ({ ...p, isGenerating: false }));
    }
  };
  
  const regenerateAvatarFromPhoto = async (base64: string): Promise<string | null> => {
      setUserPersona(p => ({ ...p, isGenerating: true }));
      try {
          const newAppearance = await analyzeUserPhotoForAvatar(base64);
          setUserPersona(p => ({ ...p, appearance: newAppearance }));
          await updatePersonaImage('self', userPersona.traits, userPersona.revealProgress, newAppearance);
          return newAppearance;
      } catch (e) {
           setUserPersona(p => ({ ...p, isGenerating: false }));
           return null;
      }
  };

  const injectVisualModifier = async (modifier: string) => {
    const currentAppearance = userPersona.appearance || "";
    const newAppearance = currentAppearance.includes(modifier) 
        ? currentAppearance 
        : `${currentAppearance}, currently ${modifier}`;
    
    setUserPersona(p => ({ ...p, appearance: newAppearance }));
    await updatePersonaImage('self', userPersona.traits, userPersona.revealProgress, newAppearance);
  };

  const takeSip = (amount: number = 20) => {
    setSipLevelState(prev => {
      const next = prev + amount;
      if (next >= 100) {
         setUserPersona(p => ({ ...p, drunkFactor: Math.min(5, p.drunkFactor + 1) }));
         return 0; 
      }
      return next;
    });
  };

  const handleDrinkAction = () => {
    const now = Date.now();
    const withinClinkRange = (now - lastDrinkTime.current) < 5000 && lastDrinkTime.current !== 0;
    
    if (withinClinkRange) {
      setClinkActive(true);
      p2p.send({ type: 'TRIGGER_CLINK', payload: null });
      if (navigator.vibrate) navigator.vibrate([100, 30, 100]);
      setTimeout(() => setClinkActive(false), 1000);
    }
    
    lastDrinkTime.current = now;
    
    setSipLevel(0);
    setUserPersona(p => ({ ...p, drunkFactor: Math.min(5, p.drunkFactor + 1) }));
    
    return withinClinkRange;
  };

  const clearToastRequest = () => setIncomingToastRequest(false);

  return {
    state: {
      view, activePersonaTab, vibe, round, sipLevel, clinkActive,
      partnerPersona, userPersona, users, lastChoiceText, currentScene, isConnected,
      activeQuestion, questionOwnerId, latestReaction, incomingToastRequest, sceneChoices,
      isDraftOpen, dateContext, isSynced,
      myRating, partnerRating
    },
    actions: {
      setView, setActivePersonaTab, setVibe, setRound, setSipLevel,
      setPartnerPersona, setUserPersona, setUsers, setClinkActive, setLastChoiceText, setCurrentScene, setQuestionState, triggerReaction,
      startApp, completeOnboarding, updatePersonaImage, injectVisualModifier, regenerateAvatarFromPhoto, handleDrinkAction, getSelf, getPartner,
      sendToastInvite, clearToastRequest, submitSceneChoice, setDraftOpen, clearSession, takeSip, simulatePartnerChoice, setDateContext,
      submitRating
    }
  };
}
