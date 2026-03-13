
import { useState, useEffect, useCallback, useRef } from 'react';
import { NarrativeSuggestion, Question } from '../types';
import { generateNarrativeSuggestion } from '../services/geminiService';
import { getNarrativeArcForRound } from '../constants';
import { useProfileStore } from '../store/profileStore';
import { buildPromptContext } from '../services/prompts/promptContext';
import { useSessionState } from './useSessionState';

function buildFallbackSuggestion(round: number): NarrativeSuggestion | null {
  const arc = getNarrativeArcForRound(round);
  const fallbackCategory = arc.categories[Math.floor(Math.random() * arc.categories.length)];
  const fallbackActivity = arc.activities[Math.floor(Math.random() * arc.activities.length)];

  if (fallbackCategory) {
    return {
      suggestedAction: 'question',
      suggestedCategory: fallbackCategory as Question['category'],
      reasoning: 'AI unavailable — following the arc.',
      transitionNarrative: 'The conversation finds its own rhythm...',
    };
  }
  if (fallbackActivity) {
    return {
      suggestedAction: 'activity',
      suggestedActivity: fallbackActivity,
      reasoning: 'AI unavailable — following the arc.',
      transitionNarrative: 'Time for something different...',
    };
  }
  return null;
}

export function useNarrativeFlow(session: ReturnType<typeof useSessionState>) {
  const { state: s } = session;

  const [narrativeSuggestion, setNarrativeSuggestion] = useState<NarrativeSuggestion | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [overrideActive, setOverrideActive] = useState(false);
  const lastSuggestionRound = useRef(-1);

  // Snapshot latest values for the async fetch to avoid stale closures
  const stateRef = useRef(s);
  stateRef.current = s;

  useEffect(() => {
    if (s.view !== 'hub') {
      setOverrideActive(false);
      return;
    }

    if (!s.isHost) return;
    if (lastSuggestionRound.current === s.round) return;

    // Round 8+ — suggest morning edition directly
    if (s.round >= 8) {
      setNarrativeSuggestion({
        suggestedAction: 'activity',
        suggestedActivity: 'morning_edition',
        reasoning: 'The evening has reached its crescendo.',
        transitionNarrative: 'Every great night deserves its final chapter.',
      });
      lastSuggestionRound.current = s.round;
      return;
    }

    const fetchSuggestion = async () => {
      setIsLoadingSuggestion(true);
      setNarrativeSuggestion(null);
      setOverrideActive(false);

      const currentRound = stateRef.current.round;

      try {
        const { activeProfile, activeVenue, activeDateConfig } = useProfileStore.getState();
        const promptContext = buildPromptContext(activeProfile, activeVenue, activeDateConfig);

        // Read fresh state values via ref to avoid stale closure
        const snap = stateRef.current;
        const suggestion = await generateNarrativeSuggestion(
          snap.round,
          snap.vibe,
          snap.partnerPersona.chemistry,
          snap.conversationLog,
          promptContext
        );

        setNarrativeSuggestion(suggestion);
        lastSuggestionRound.current = currentRound;
      } catch {
        const fallback = buildFallbackSuggestion(currentRound);
        if (fallback) setNarrativeSuggestion(fallback);
        lastSuggestionRound.current = currentRound;
      } finally {
        setIsLoadingSuggestion(false);
      }
    };

    fetchSuggestion();
  }, [s.view, s.round, s.isHost]);

  const overrideSuggestion = useCallback(() => {
    setOverrideActive(true);
  }, []);

  return {
    narrativeState: {
      narrativeSuggestion,
      isLoadingSuggestion,
      overrideActive,
    },
    narrativeActions: {
      overrideSuggestion,
    },
  };
}
