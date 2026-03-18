import React, { useState, useCallback, useRef } from 'react';
import { User, VibeStats, PersonaState, Scene, Question, AppView, DateContext, ConversationEntry, ActivityPayload } from '../types';
import { p2p } from '../services/p2p';
import type { GameState } from '../store/gameState';
import type { PresenceState } from '../store/presenceState';

export function useBroadcastingState(
  gameState: GameState,
  presence: PresenceState
) {
  // --- Local UI State ---
  const [view, setViewState] = useState<AppView>('setup');
  const [clinkActive, setClinkActive] = useState(false);
  const [lastChoiceText, setLastChoiceTextState] = useState<string>("");
  const [latestReaction, setLatestReaction] = useState<{ content: string; timestamp: number; duration?: number } | null>(null);
  const [flashMessage, setFlashMessageState] = useState<string | null>(null);
  const [incomingToastRequest, setIncomingToastRequest] = useState(false);
  const [isDraftOpen, setIsDraftOpenState] = useState(false);

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Broadcasting Wrappers ---

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

  const triggerFlash = (msg: string, duration = 2500) => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlashMessageState(msg);
      flashTimerRef.current = setTimeout(() => setFlashMessageState(null), duration);
  };

  const getSelf = useCallback(() => presence.users.find(u => u.isSelf), [presence.users]);
  const getPartner = useCallback(() => presence.users.find(u => !u.isSelf), [presence.users]);

  const takeSip = useCallback((amount = 1) => {
      setSipLevel(prev => prev + amount);
  }, [setSipLevel]);

  const broadcastActivityData = useCallback((payload: ActivityPayload) => {
      p2p.send({ type: 'SYNC_ACTIVITY_DATA', payload });
  }, []);

  const broadcastActivityChoice = useCallback((userId: string, choice: number) => {
      p2p.send({ type: 'SYNC_ACTIVITY_CHOICE', payload: { userId, choice } });
  }, []);

  return {
    // UI state
    view, clinkActive, lastChoiceText, latestReaction, flashMessage,
    incomingToastRequest, isDraftOpen,

    // Raw setters (for network sync — updates without re-broadcasting)
    rawSetters: {
      setViewState, setClinkActive, setLatestReaction,
      setIncomingToastRequest, setLastChoiceTextState, setIsDraftOpenState,
    },

    // Broadcasting wrappers
    setVibe, setRound, setView, setUsers, setPartnerPersona, setUserPersona,
    setDateContext, setConversationLog, setCurrentScene, submitSceneChoice,
    simulatePartnerChoice, setQuestionState, triggerReaction, sendFlash,
    sendToastInvite, setDraftOpen, submitRating, setSipLevel, setLastChoiceText,

    // Helpers
    triggerFlash, getSelf, getPartner, takeSip,
    broadcastActivityData, broadcastActivityChoice,
  };
}
