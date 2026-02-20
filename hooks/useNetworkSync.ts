import React, { useState, useCallback, useEffect, useRef } from 'react';
import { NetworkMessage, User, VibeStats, PersonaState, Scene, Question, AppView, DateContext, ConversationEntry } from '../types';
import { p2p } from '../services/p2p';

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop";

export function useNetworkSync(
  state: {
    users: User[];
    vibe: VibeStats;
    dateContext: DateContext | null;
    currentScene: Scene | null;
    userPersona: PersonaState;
    partnerPersona: PersonaState;
    activeQuestion: Question | null;
    questionOwnerId: string | null;
    myRating: number | null;
    view: AppView;
    conversationLog: ConversationEntry[];
  },
  actions: {
    setUsers: (users: User[] | ((prev: User[]) => User[])) => void;
    setVibe: (vibe: VibeStats) => void;
    setDateContext: (ctx: DateContext | null) => void;
    setCurrentScene: (scene: Scene | null) => void;
    setPartnerPersona: (updater: (prev: PersonaState) => PersonaState) => void;
    setUserPersona: (updater: (prev: PersonaState) => PersonaState) => void;
    setActiveQuestion: (q: Question | null) => void;
    setQuestionOwnerId: (id: string | null) => void;
    setPartnerRating: (r: number) => void;
    setView: (v: AppView | ((prev: AppView) => AppView)) => void;
    setConversationLog: (log: ConversationEntry[]) => void;
    setIncomingToastRequest: (b: boolean) => void;
    setClinkActive: (b: boolean) => void;
    setLatestReaction: (r: { content: string; timestamp: number } | null) => void;
    setArrivalEvent: (e: any) => void;
    setLastChoiceText: (t: string) => void;
    setSceneChoices: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
    setGuestProfileConfirmed: (b: boolean) => void;
  },
  activityCallbacksRef: React.MutableRefObject<{
    onData: ((payload: { type: string; data: any }) => void) | null;
    onChoice: ((payload: { userId: string; choice: number }) => void) | null;
  }>,
  sessionInfo: { userId: string; isHost: boolean; roomId: string } | null
) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  const hasSeenArrival = useRef(false);
  const handlersRef = useRef<any>({});
  
  // Ref to hold latest state for event listeners
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const sendHeavyAssets = useCallback(() => {
    const fresh = stateRef.current;
    const hostAvatar = fresh.userPersona.imageUrl || DEFAULT_AVATAR;
    const partnerAvatar = fresh.partnerPersona.imageUrl || DEFAULT_AVATAR;

    // Role-swapped: host self image → guest partner, host partner image → guest self
    p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'partner', data: { imageUrl: hostAvatar } } });
    setTimeout(() => {
        p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'user', data: { imageUrl: partnerAvatar } } });
    }, 200);

    setTimeout(() => {
        if (fresh.dateContext?.generatedImage) {
            p2p.send({ type: 'SYNC_DATE_CONTEXT', payload: { generatedImage: fresh.dateContext.generatedImage } });
        }
        p2p.send({ type: 'SYNC_VIEW', payload: fresh.view });
    }, 400);
  }, []);

  const sendFullState = useCallback(() => {
    const s = stateRef.current;
    
    const lightUsers = s.users.map(u => ({ ...u, avatar: null }));
    let lightDateContext = null;
    if (s.dateContext) {
        const { generatedImage, ...rest } = s.dateContext;
        lightDateContext = rest;
    }
    const { imageUrl: uImg, ...uRest } = s.userPersona;
    const { imageUrl: pImg, ...pRest } = s.partnerPersona;

    p2p.send({ type: 'SYNC_VIBE', payload: s.vibe });
    p2p.send({ type: 'SYNC_ROUND', payload: s.currentScene?.round || 0 });
    p2p.send({ type: 'SYNC_USER', payload: lightUsers });

    if (lightDateContext) p2p.send({ type: 'SYNC_DATE_CONTEXT', payload: lightDateContext });
    if (s.currentScene) p2p.send({ type: 'SYNC_SCENE', payload: s.currentScene });

    p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'partner', data: uRest } });
    p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'user', data: pRest } });

    if (s.activeQuestion) {
        p2p.send({ type: 'SYNC_QUESTION_STATE', payload: { question: s.activeQuestion, ownerId: s.questionOwnerId }});
    }

    if (s.conversationLog.length > 0) {
        p2p.send({ type: 'SYNC_CONVERSATION_LOG', payload: s.conversationLog });
    }

    p2p.send({ type: 'SYNC_FINISHED', payload: true });

    setTimeout(() => sendHeavyAssets(), 800);
    setTimeout(() => sendHeavyAssets(), 3000);
  }, [sendHeavyAssets]);

  const sendHello = useCallback(() => {
      const self = stateRef.current.users.find(u => u.isSelf);
      p2p.send({ 
          type: 'SYNC_HELLO', 
          payload: { 
              id: sessionInfo?.userId, 
              name: self?.name || "Guest", 
              avatar: self?.avatar || DEFAULT_AVATAR
          } 
      });
  }, [sessionInfo]);

  // Keep handlers fresh
  useEffect(() => {
    handlersRef.current = {
      SYNC_USERS: (payload: User[]) => {
          actions.setUsers((prev: User[]) => {
              const myId = sessionInfo?.userId;
              return payload.map((u: User) => {
                  const isSelf = u.id === myId
                      || (u.id === 'guest-placeholder' && !sessionInfo?.isHost)
                      || (u.id === 'partner-placeholder' && !sessionInfo?.isHost);
                  const existingUser = prev.find(p => p.id === u.id || (p.isSelf === isSelf));
                  const avatar = u.avatar || existingUser?.avatar || DEFAULT_AVATAR;
                  return { ...u, isSelf, avatar };
              });
          });
      },
      SYNC_VIBE: (payload: VibeStats) => actions.setVibe(payload),
      SYNC_DATE_CONTEXT: (payload: DateContext) => actions.setDateContext(payload), // Simplified merge logic
      SYNC_SCENE: (payload: Scene | null) => { actions.setCurrentScene(payload); actions.setSceneChoices(() => ({})); },
      SYNC_PERSONA: (payload: { type: string; data: any }) => {
          const { type, data } = payload;
          if (type === 'partner') actions.setPartnerPersona((prev: PersonaState) => ({ ...prev, ...data }));
          if (type === 'user') actions.setUserPersona((prev: PersonaState) => ({ ...prev, ...data }));
      },
      SYNC_QUESTION_STATE: (payload: { question: Question | null; ownerId: string | null }) => {
        actions.setActiveQuestion(payload.question);
        actions.setQuestionOwnerId(payload.ownerId);
        if (payload.question) actions.setView('question');
      },
      SYNC_RATING: (payload: number) => actions.setPartnerRating(payload),
      SYNC_VIEW: (payload: AppView) => actions.setView(payload),
      SYNC_CONVERSATION_LOG: (payload: ConversationEntry[]) => actions.setConversationLog(payload),
      SYNC_TOAST_INVITE: () => actions.setIncomingToastRequest(true),
      TRIGGER_CLINK: () => {
        actions.setClinkActive(true);
        actions.setLatestReaction({ content: "SYNCHRONIZED 🥂", timestamp: Date.now() });
        setTimeout(() => actions.setClinkActive(false), 1000);
        if (navigator.vibrate) navigator.vibrate([100, 30, 100]);
      },
      TRIGGER_REACTION: (payload: string) => actions.setLatestReaction({ content: payload, timestamp: Date.now() }),
      TRIGGER_FLASH: (payload: string) => actions.setLatestReaction({ content: payload, timestamp: Date.now() }), // Flash handled as reaction or separate?
      SYNC_LAST_CHOICE: (payload: string) => actions.setLastChoiceText(payload),
      SYNC_SCENE_CHOICE: (payload: { userId: string; choiceId: string }) => {
        actions.setSceneChoices((prev: Record<string, string>) => ({ ...prev, [payload.userId]: payload.choiceId }));
      },
      SYNC_ACTIVITY_DATA: (payload: { type: string; data: any }) => {
        if (activityCallbacksRef.current.onData) activityCallbacksRef.current.onData(payload);
      },
      SYNC_ACTIVITY_CHOICE: (payload: { userId: string; choice: number }) => {
        if (activityCallbacksRef.current.onChoice) activityCallbacksRef.current.onChoice(payload);
      },
      SYNC_FINISHED: () => {
        setIsSynced(true);
        if (!sessionInfo?.isHost) {
            actions.setView((prev: AppView) => (prev === 'setup' || prev === 'loading') ? 'hub' : prev);
            setTimeout(() => {
                if (hasSeenArrival.current) return;
                const host = stateRef.current.users.find((u: User) => !u.isSelf);
                if (host) {
                    hasSeenArrival.current = true;
                    actions.setArrivalEvent({ name: host.name, avatar: host.avatar || DEFAULT_AVATAR, type: 'welcome' });
                }
            }, 500);
        }
      },
      SYNC_HELLO: (payload: any) => {
          if (sessionInfo?.isHost) {
              const { id, name, avatar } = payload;
              const currentPartner = stateRef.current.partnerPersona;
              const isGuestGeneric = name === "Guest";
              const isGuestAvatarDefault = !avatar || avatar === DEFAULT_AVATAR;
              const hasCustomDossier = currentPartner.appearance && currentPartner.appearance.length > 20;

              const effectiveName = (isGuestGeneric && hasCustomDossier) ? (stateRef.current.users.find((u: User) => !u.isSelf)?.name || "Partner") : name;
              const effectiveAvatar = (isGuestAvatarDefault && hasCustomDossier) ? (currentPartner.imageUrl || DEFAULT_AVATAR) : (avatar || DEFAULT_AVATAR);

              actions.setUsers((prev: User[]) => prev.map((u: User) => {
                  if (!u.isSelf) {
                      return { ...u, id, status: 'online', name: effectiveName, avatar: effectiveAvatar };
                  }
                  return u;
              }));
              
              actions.setPartnerPersona((p: PersonaState) => ({ ...p, imageUrl: effectiveAvatar }));
              
              if (!hasSeenArrival.current) {
                  hasSeenArrival.current = true;
                  actions.setArrivalEvent({ name: effectiveName, avatar: effectiveAvatar, type: 'arrival' });
              }
              
              requestAnimationFrame(() => setTimeout(() => sendFullState(), 200));
              setTimeout(() => sendFullState(), 1500);
          }
      },
      REQUEST_SYNC: () => {
          if (sessionInfo?.isHost) {
              sendFullState();
          }
      }
    };
  }, [actions, activityCallbacksRef, sessionInfo, sendFullState]);

  // P2P Listeners
  useEffect(() => {
    const unsubscribeData = p2p.onData((msg: NetworkMessage) => {
      const handler = handlersRef.current[msg.type];
      if (handler) handler(msg.payload);
    });

    const unsubscribeConnect = p2p.onConnect(() => {
      setIsConnected(true);
      setConnectionStatus('Connected');
      setConnectionError(null);
      
      if (sessionInfo?.isHost) {
        requestAnimationFrame(() => setTimeout(sendFullState, 200));
      } else {
        sendHello();
      }
    });

    const unsubscribeDisconnect = p2p.onDisconnect(() => {
      setIsConnected(false);
      setConnectionStatus('Disconnected');
    });

    const unsubscribeStatus = p2p.onStatus((status) => {
      setConnectionStatus(status);
    });

    return () => {
      unsubscribeData();
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeStatus();
    };
  }, [sessionInfo, sendFullState, sendHello]);

  // Auto-Retry Handshake for Guest
  useEffect(() => {
      if (isConnected && !isSynced && sessionInfo && !sessionInfo.isHost) {
          sendHello();
          const interval = setInterval(() => {
              console.log("Session: Auto-retrying Handshake...");
              sendHello();
          }, 2000);
          return () => clearInterval(interval);
      }
  }, [isConnected, isSynced, sessionInfo, sendHello]);

  const retryConnection = () => {
    if (sessionInfo) {
        p2p.init(sessionInfo.userId, sessionInfo.roomId, sessionInfo.isHost, (err) => {
            setConnectionError(err);
            setIsConnected(false);
        });
    }
  };

  const refreshSync = () => {
    if (sessionInfo?.isHost) {
        requestAnimationFrame(() => setTimeout(sendFullState, 50));
    } else {
        sendHello();
    }
  };

  const initSession = useCallback((userId: string, roomId: string, isHost: boolean) => {
      setConnectionError(null);
      p2p.init(userId, roomId, isHost, (err) => {
          setConnectionError(err);
          if (isHost) {
              actions.setView('setup');
              setIsSynced(false);
          }
      });
  }, [actions]);

  return {
    isConnected,
    isSynced,
    connectionError,
    connectionStatus,
    retryConnection,
    refreshSync,
    initSession
  };
}
