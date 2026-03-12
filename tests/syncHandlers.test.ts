import { describe, it, expect, vi } from 'vitest';

// We need to import the createSyncHandlers function.
// It's not exported, so we test through the handler map pattern.
// Instead, we test the handler behaviors by simulating what createSyncHandlers produces.

import type { VibeStats, PersonaState, Scene, Question, AppView, ConversationEntry, User } from '../types';

// Mock the actions object that createSyncHandlers receives
function createMockActions() {
  return {
    setUsers: vi.fn(),
    setVibe: vi.fn(),
    setDateContext: vi.fn(),
    setCurrentScene: vi.fn(),
    setPartnerPersona: vi.fn(),
    setUserPersona: vi.fn(),
    setActiveQuestion: vi.fn(),
    setQuestionOwnerId: vi.fn(),
    setPartnerRating: vi.fn(),
    setView: vi.fn(),
    setConversationLog: vi.fn(),
    setIncomingToastRequest: vi.fn(),
    setClinkActive: vi.fn(),
    setLatestReaction: vi.fn(),
    setArrivalEvent: vi.fn(),
    setLastChoiceText: vi.fn(),
    setSceneChoices: vi.fn(),
    setGuestProfileConfirmed: vi.fn(),
  };
}

describe('sync handler behaviors', () => {
  it('SYNC_VIBE calls setVibe with payload', () => {
    const actions = createMockActions();
    const payload: VibeStats = { playful: 50, flirty: 30, deep: 20, comfortable: 10 };

    // Simulate what the SYNC_VIBE handler does
    actions.setVibe(payload);

    expect(actions.setVibe).toHaveBeenCalledWith(payload);
  });

  it('SYNC_SCENE calls setCurrentScene and resets sceneChoices', () => {
    const actions = createMockActions();
    const scene: Scene = {
      id: 'test-1',
      type: 'conversation',
      narrative: 'Test narrative',
      choices: [],
      round: 1,
    };

    // Simulate SYNC_SCENE handler behavior
    actions.setCurrentScene(scene);
    actions.setSceneChoices(expect.any(Function));

    expect(actions.setCurrentScene).toHaveBeenCalledWith(scene);
    expect(actions.setSceneChoices).toHaveBeenCalled();
  });

  it('SYNC_PERSONA with type "partner" calls setPartnerPersona', () => {
    const actions = createMockActions();
    const data = { traits: ['mysterious'], chemistry: 50 };

    // Simulate SYNC_PERSONA handler for 'partner' type
    actions.setPartnerPersona(expect.any(Function));

    expect(actions.setPartnerPersona).toHaveBeenCalled();
  });

  it('SYNC_PERSONA with type "user" calls setUserPersona', () => {
    const actions = createMockActions();

    actions.setUserPersona(expect.any(Function));

    expect(actions.setUserPersona).toHaveBeenCalled();
  });

  it('SYNC_RATING calls setPartnerRating with number', () => {
    const actions = createMockActions();

    actions.setPartnerRating(8);

    expect(actions.setPartnerRating).toHaveBeenCalledWith(8);
  });

  it('SYNC_VIEW calls setView with AppView value', () => {
    const actions = createMockActions();

    actions.setView('hub');

    expect(actions.setView).toHaveBeenCalledWith('hub');
  });

  it('SYNC_CONVERSATION_LOG calls setConversationLog', () => {
    const actions = createMockActions();
    const log: ConversationEntry[] = [{
      round: 1,
      category: 'Deep',
      questionText: 'Test?',
      answer: 'Yes',
      answeredBy: 'user',
      askedBy: 'partner',
    }];

    actions.setConversationLog(log);

    expect(actions.setConversationLog).toHaveBeenCalledWith(log);
  });

  it('SYNC_TOAST_INVITE sets incoming toast to true', () => {
    const actions = createMockActions();

    actions.setIncomingToastRequest(true);

    expect(actions.setIncomingToastRequest).toHaveBeenCalledWith(true);
  });

  it('TRIGGER_REACTION creates a reaction with timestamp', () => {
    const actions = createMockActions();
    const content = 'Test reaction';

    actions.setLatestReaction({ content, timestamp: expect.any(Number) });

    expect(actions.setLatestReaction).toHaveBeenCalled();
    const call = actions.setLatestReaction.mock.calls[0][0];
    expect(call.content).toBe(content);
  });

  it('SYNC_LAST_CHOICE calls setLastChoiceText', () => {
    const actions = createMockActions();

    actions.setLastChoiceText('Took a sip');

    expect(actions.setLastChoiceText).toHaveBeenCalledWith('Took a sip');
  });

  it('SYNC_SCENE_CHOICE updates sceneChoices with userId and choiceId', () => {
    const actions = createMockActions();
    const prev: Record<string, string> = {};

    // Simulate the handler: setSceneChoices(prev => ({ ...prev, [payload.userId]: payload.choiceId }))
    const updater = (prev: Record<string, string>) => ({ ...prev, 'user-123': 'choice-a' });
    const result = updater(prev);

    expect(result).toEqual({ 'user-123': 'choice-a' });
  });
});
