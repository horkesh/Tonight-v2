import React, { useState, useCallback, useEffect, useRef } from 'react';
import { NetworkMessage, User, VibeStats, PersonaState, Scene, Question, AppView, DateContext, ConversationEntry, ActivityPayload } from '../types';
import { p2p } from '../services/p2p';
import { DEFAULT_AVATAR } from '../constants';

// ── Shared type definitions ───────────────────────────────────────────────────

export interface NetworkSyncState {
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
}

export interface NetworkSyncActions {
  setUsers: (users: User[] | ((prev: User[]) => User[])) => void;
  setVibe: (vibe: VibeStats) => void;
  setDateContext: (ctx: DateContext | null | ((prev: DateContext | null) => DateContext | null)) => void;
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
  setLatestReaction: (r: { content: string; timestamp: number; duration?: number } | null) => void;
  setArrivalEvent: (e: { name: string; avatar: string; type?: 'arrival' | 'welcome' } | null) => void;
  setLastChoiceText: (t: string) => void;
  setSceneChoices: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  setGuestProfileConfirmed: (b: boolean) => void;
  setDraftOpen: (b: boolean) => void;
}

type SyncHandlerMap = Partial<Record<NetworkMessage['type'], (payload: any) => void>>;

interface SyncHandlerInput {
  actions: NetworkSyncActions;
  sessionInfo: { userId: string; isHost: boolean; roomId: string } | null;
  stateRef: React.MutableRefObject<NetworkSyncState>;
  activityCallbacksRef: React.MutableRefObject<{
    onData: ((payload: ActivityPayload) => void) | null;
    onChoice: ((payload: { userId: string; choice: number }) => void) | null;
    onPlaylistChoice: ((payload: { userId: string; choices: number[] }) => void) | null;
  }>;
  hasSeenArrival: React.MutableRefObject<boolean>;
  setIsSynced: React.Dispatch<React.SetStateAction<boolean>>;
  sendFullState: () => void;
  lastHelloTime: React.MutableRefObject<number>;
  syncFinishedProcessed: React.MutableRefObject<boolean>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNetworkSync(
  state: NetworkSyncState,
  actions: NetworkSyncActions,
  activityCallbacksRef: React.MutableRefObject<{
    onData: ((payload: ActivityPayload) => void) | null;
    onChoice: ((payload: { userId: string; choice: number }) => void) | null;
    onPlaylistChoice: ((payload: { userId: string; choices: number[] }) => void) | null;
  }>,
  sessionInfo: { userId: string; isHost: boolean; roomId: string } | null
) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  const hasSeenArrival = useRef(false);
  const handlersRef = useRef<SyncHandlerMap>({});
  const sentAssetsCache = useRef<{ hostAvatar?: string; partnerAvatar?: string; generatedImage?: string }>({});
  const lastHelloTime = useRef(0);
  const syncFinishedProcessed = useRef(false);
  
  // Ref to hold latest state for event listeners
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const sendHeavyAssets = useCallback(() => {
    const fresh = stateRef.current;
    const hostAvatar = fresh.userPersona.imageUrl || DEFAULT_AVATAR;
    const partnerAvatar = fresh.partnerPersona.imageUrl || DEFAULT_AVATAR;
    const generatedImage = fresh.dateContext?.generatedImage;

    let delay = 0;

    // Role-swapped: host self image → guest partner, host partner image → guest self
    if (sentAssetsCache.current.hostAvatar !== hostAvatar) {
        sentAssetsCache.current.hostAvatar = hostAvatar;
        setTimeout(() => {
            p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'partner', data: { imageUrl: hostAvatar } } });
        }, delay);
        delay += 200;
    }

    if (sentAssetsCache.current.partnerAvatar !== partnerAvatar) {
        sentAssetsCache.current.partnerAvatar = partnerAvatar;
        setTimeout(() => {
            p2p.send({ type: 'SYNC_PERSONA', payload: { type: 'user', data: { imageUrl: partnerAvatar } } });
        }, delay);
        delay += 200;
    }

    if (generatedImage && sentAssetsCache.current.generatedImage !== generatedImage) {
        sentAssetsCache.current.generatedImage = generatedImage;
        setTimeout(() => {
            p2p.send({ type: 'SYNC_DATE_CONTEXT', payload: { generatedImage: generatedImage } });
        }, delay);
        delay += 200;
    }

    setTimeout(() => {
        p2p.send({ type: 'SYNC_VIEW', payload: fresh.view });
    }, delay + 100);
  }, []);

  const sendFullState = useCallback(() => {
    const s = stateRef.current;

    const lightUsers = s.users.map(u => ({ ...u, avatar: null }));
    let lightDateContext: Partial<DateContext> | null = null;
    if (s.dateContext) {
        const { generatedImage, ...rest } = s.dateContext;
        lightDateContext = rest;
    }
    const { imageUrl: _uImg, ...uRest } = s.userPersona;
    const { imageUrl: _pImg, ...pRest } = s.partnerPersona;

    // Single batched message replaces 12+ individual sends
    p2p.send({
      type: 'SYNC_FULL_STATE',
      payload: {
        vibe: s.vibe,
        round: s.currentScene?.round || 0,
        users: lightUsers,
        dateContext: lightDateContext,
        currentScene: s.currentScene,
        userPersona: uRest,
        partnerPersona: pRest,
        questionState: s.activeQuestion ? { question: s.activeQuestion, ownerId: s.questionOwnerId } : null,
        conversationLog: s.conversationLog,
      }
    });

    p2p.send({ type: 'SYNC_FINISHED', payload: true });

    setTimeout(() => sendHeavyAssets(), 500);
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

  // P2P Listeners
  useEffect(() => {
    handlersRef.current = createSyncHandlers({
        actions,
        sessionInfo,
        stateRef,
        activityCallbacksRef,
        hasSeenArrival,
        setIsSynced,
        sendFullState,
        lastHelloTime,
        syncFinishedProcessed
    });

    const unsubscribeData = p2p.onData((msg: NetworkMessage) => {
      const handler = handlersRef.current[msg.type];
      if (handler) handler(msg.payload);
    });

    const unsubscribeConnect = p2p.onConnect(() => {
      setIsConnected(true);
      setConnectionStatus('Connected');
      setConnectionError(null);
      
      if (sessionInfo?.isHost) {
        // Host sends full state after receiving SYNC_HELLO, not on raw connect
        // (avoids sending 24+ messages in the first 500ms)
      } else {
        sendHello();
      }
    });

    const unsubscribeDisconnect = p2p.onDisconnect(() => {
      setIsConnected(false);
      setConnectionStatus('Disconnected');
      // Reset sync guards so reconnection can re-process SYNC_FINISHED
      syncFinishedProcessed.current = false;
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

function mergeUsers(
    payload: User[],
    sessionInfo: { userId: string; isHost: boolean; roomId: string } | null,
    prev: User[]
): User[] {
    const myId = sessionInfo?.userId;
    return payload.map((u: User) => {
        const isSelf = u.id === myId
            || (u.id === 'guest-placeholder' && !sessionInfo?.isHost)
            || (u.id === 'partner-placeholder' && !sessionInfo?.isHost);
        const existingUser = prev.find((p: User) => p.id === u.id || (p.isSelf === isSelf));
        const avatar = u.avatar || existingUser?.avatar || DEFAULT_AVATAR;
        return { ...u, isSelf, avatar };
    });
}

function mergeDateContext(prev: DateContext | null, payload: Partial<DateContext>): DateContext {
    if (!prev) return payload as DateContext;
    return { ...prev, ...payload };
}

function createSyncHandlers({
    actions,
    sessionInfo,
    stateRef,
    activityCallbacksRef,
    hasSeenArrival,
    setIsSynced,
    sendFullState,
    lastHelloTime,
    syncFinishedProcessed
}: SyncHandlerInput): SyncHandlerMap {
    return {
      SYNC_USER: (payload: User[]) => {
          actions.setUsers((prev: User[]) => mergeUsers(payload, sessionInfo, prev));
      },
      SYNC_VIBE: (payload: VibeStats) => actions.setVibe(payload),
      SYNC_DATE_CONTEXT: (payload: Partial<DateContext>) => {
          actions.setDateContext((prev: DateContext | null) => mergeDateContext(prev, payload));
      },
      SYNC_SCENE: (payload: Scene | null) => { actions.setCurrentScene(payload); actions.setSceneChoices(() => ({})); },
      SYNC_PERSONA: (payload: { type: 'user' | 'partner'; data: Partial<PersonaState> }) => {
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
      TRIGGER_FLASH: (payload: string | { content: string; duration?: number }) => {
          const content = typeof payload === 'string' ? payload : payload.content;
          const duration = typeof payload === 'string' ? 2000 : (payload.duration || 2000);
          actions.setLatestReaction({ content, timestamp: Date.now(), duration });
      },
      SYNC_DRAFT_STATE: (payload: boolean) => actions.setDraftOpen(payload),
      SYNC_LAST_CHOICE: (payload: string) => actions.setLastChoiceText(payload),
      SYNC_SCENE_CHOICE: (payload: { userId: string; choiceId: string }) => {
        actions.setSceneChoices((prev: Record<string, string>) => ({ ...prev, [payload.userId]: payload.choiceId }));
      },
      SYNC_ACTIVITY_DATA: (payload: ActivityPayload) => {
        if (activityCallbacksRef.current.onData) activityCallbacksRef.current.onData(payload);
      },
      SYNC_ACTIVITY_CHOICE: (payload: { userId: string; choice: number }) => {
        if (activityCallbacksRef.current.onChoice) activityCallbacksRef.current.onChoice(payload);
      },
      SYNC_PLAYLIST_CHOICE: (payload: { userId: string; choices: number[] }) => {
        if (activityCallbacksRef.current.onPlaylistChoice) activityCallbacksRef.current.onPlaylistChoice(payload);
      },
      SYNC_FINISHED: () => {
        if (!sessionInfo?.isHost) {
            // Guard against duplicate SYNC_FINISHED processing
            if (syncFinishedProcessed && syncFinishedProcessed.current) return;
            if (syncFinishedProcessed) syncFinishedProcessed.current = true;

            setTimeout(() => {
                setIsSynced(true);
                actions.setView((prev: AppView) => (prev === 'setup' || prev === 'loading') ? 'hub' : prev);
                if (hasSeenArrival.current) return;
                const host = stateRef.current.users.find((u: User) => !u.isSelf);
                const hostAvatar = stateRef.current.partnerPersona.imageUrl || host?.avatar || DEFAULT_AVATAR;
                if (host) {
                    hasSeenArrival.current = true;
                    actions.setArrivalEvent({ name: host.name, avatar: hostAvatar, type: 'welcome' });
                }
            }, 1500); // Wait for sendHeavyAssets to complete
        } else {
            setIsSynced(true);
        }
      },
      SYNC_HELLO: (payload: { id: string; name: string; avatar: string }) => {
          if (sessionInfo?.isHost) {
              // Prevent rapid re-processing of SYNC_HELLO (5s debounce via ref, not window global)
              const now = Date.now();
              if (lastHelloTime && lastHelloTime.current && now - lastHelloTime.current < 5000) return;
              if (lastHelloTime) lastHelloTime.current = now;

              const { id, name, avatar } = payload;
              const currentPartner = stateRef.current.partnerPersona;
              const isGuestGeneric = name === "Guest";
              const isGuestAvatarDefault = !avatar || avatar === DEFAULT_AVATAR;
              const hasCustomAvatar = currentPartner.imageUrl && currentPartner.imageUrl !== DEFAULT_AVATAR;
              const hasCustomDossier = currentPartner.appearance && currentPartner.appearance.length > 5;

              const effectiveName = (isGuestGeneric && hasCustomDossier) ? (stateRef.current.users.find((u: User) => !u.isSelf)?.name || "Partner") : name;
              const effectiveAvatar = (isGuestAvatarDefault && hasCustomAvatar) ? currentPartner.imageUrl : (avatar || DEFAULT_AVATAR);

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

              setIsSynced(true);

              // Single delayed sendFullState (was sending twice — 200ms and 1500ms)
              requestAnimationFrame(() => setTimeout(() => sendFullState(), 300));
          }
      },
      SYNC_FULL_STATE: (payload: Extract<NetworkMessage, { type: 'SYNC_FULL_STATE' }>['payload']) => {
          // Unpack batched state into individual setters
          if (payload.vibe) actions.setVibe(payload.vibe);
          if (payload.users) {
              actions.setUsers((prev: User[]) => mergeUsers(payload.users, sessionInfo, prev));
          }
          if (payload.dateContext) {
              actions.setDateContext((prev: DateContext | null) => mergeDateContext(prev, payload.dateContext));
          }
          if (payload.currentScene) {
              actions.setCurrentScene(payload.currentScene);
              actions.setSceneChoices(() => ({}));
          }
          if (payload.userPersona) actions.setPartnerPersona((prev: PersonaState) => ({ ...prev, ...payload.userPersona }));
          if (payload.partnerPersona) actions.setUserPersona((prev: PersonaState) => ({ ...prev, ...payload.partnerPersona }));
          if (payload.questionState) {
              actions.setActiveQuestion(payload.questionState.question);
              actions.setQuestionOwnerId(payload.questionState.ownerId);
          }
          if (payload.conversationLog?.length > 0) actions.setConversationLog(payload.conversationLog);
      },
      REQUEST_SYNC: () => {
          if (sessionInfo?.isHost) {
              sendFullState();
          }
      }
    };
}
