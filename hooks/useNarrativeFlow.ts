
import { useState, useEffect, useCallback, useRef } from 'react';
import { NarrativeSuggestion } from '../types';
import { generateNarrativeSuggestion } from '../services/geminiService';
import { getNarrativeArcForRound } from '../constants';
import { useProfileStore } from '../store/profileStore';
import { buildPromptContext } from '../services/prompts/promptContext';
import { useSessionState } from './useSessionState';

export function useNarrativeFlow(session: ReturnType<typeof useSessionState>) {
  const { state: s, actions: a } = session;

  const [narrativeSuggestion, setNarrativeSuggestion] = useState<NarrativeSuggestion | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [overrideActive, setOverrideActive] = useState(false);
  const lastSuggestionRound = useRef(-1);

  // Fetch narrative suggestion when view changes to hub
  useEffect(() => {
    if (s.view !== 'hub') {
      // Reset override when leaving hub
      setOverrideActive(false);
      return;
    }

    // Only host generates suggestions
    if (!s.isHost) return;

    // Don't re-fetch for same round
    if (lastSuggestionRound.current === s.round) return;

    // Round 8+ — don't fetch, suggest morning edition directly
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

      try {
        const { activeProfile, activeVenue, activeDateConfig } = useProfileStore.getState();
        const promptContext = buildPromptContext(activeProfile, activeVenue, activeDateConfig);

        const suggestion = await generateNarrativeSuggestion(
          s.round,
          s.vibe,
          s.partnerPersona.chemistry,
          s.conversationLog,
          promptContext
        );

        setNarrativeSuggestion(suggestion);
        lastSuggestionRound.current = s.round;
      } catch {
        // Fallback to arc rules
        const arc = getNarrativeArcForRound(s.round);
        const fallbackCategory = arc.categories[Math.floor(Math.random() * arc.categories.length)];
        const fallbackActivity = arc.activities[Math.floor(Math.random() * arc.activities.length)];

        if (fallbackCategory) {
          setNarrativeSuggestion({
            suggestedAction: 'question',
            suggestedCategory: fallbackCategory as any,
            reasoning: 'AI unavailable — following the arc.',
            transitionNarrative: 'The conversation finds its own rhythm...',
          });
        } else if (fallbackActivity) {
          setNarrativeSuggestion({
            suggestedAction: 'activity',
            suggestedActivity: fallbackActivity,
            reasoning: 'AI unavailable — following the arc.',
            transitionNarrative: 'Time for something different...',
          });
        }
        lastSuggestionRound.current = s.round;
      } finally {
        setIsLoadingSuggestion(false);
      }
    };

    fetchSuggestion();
  }, [s.view, s.round, s.isHost]);

  const acceptSuggestion = useCallback(() => {
    if (!narrativeSuggestion) return null;
    return narrativeSuggestion;
  }, [narrativeSuggestion]);

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
      acceptSuggestion,
      overrideSuggestion,
    },
  };
}
