
import { useEffect, useCallback } from 'react';
import {
  Scene,
  IntelligenceReport,
  TwoTruthsData,
  FinishSentenceData,
  VibeStats,
  Choice,
  ActivityPayload
} from '../types';
import {
  generateScene,
  generateIntelligenceReport,
  analyzeImageAction,
  generateSilentReaction,
  generateTwoTruthsOneLie,
  generateFinishSentence,
  generatePlaylistSongs
} from '../services/geminiService';
import { useSessionState } from './useSessionState';
import { useAiStore } from '../store/aiState';
import { applyVibeDeltas } from '../utils/helpers';
import { saveDateToHistory, buildHistoryEntry, extractHighlights } from '../utils/dateHistory';
import { useProfileStore } from '../store/profileStore';
import { getPromptContext } from '../services/prompts/promptContext';
import { soundManager } from '../services/soundManager';

export function useAiActions(session: ReturnType<typeof useSessionState>) {
  const { state: s, actions: a } = session;

  const {
    intelligenceReport, setIntelligenceReport,
    twoTruthsData, setTwoTruthsData,
    finishSentenceData, setFinishSentenceData,
    activityChoices, setActivityChoices,
    playlistData, setPlaylistData,
    playlistChoices, setPlaylistChoices
  } = useAiStore();

  // --- Activity P2P Handlers ---
  useEffect(() => {
    // Register callbacks with session state to handle incoming activity data
    a.registerActivityCallbacks(
      // onData
      (payload) => {
        if (payload.type === 'twoTruths') {
          setTwoTruthsData(payload.data);
          setActivityChoices({});
          a.setView('twoTruths', false); // Don't broadcast view again, handled by logic flow
        } else if (payload.type === 'finishSentence') {
          setFinishSentenceData(payload.data);
          setActivityChoices({});
          a.setView('finishSentence', false);
        } else if (payload.type === 'playlist') {
          setPlaylistData(payload.data);
          setPlaylistChoices({});
          a.setView('playlist', false);
        }
      },
      // onChoice
      (payload) => {
        setActivityChoices(prev => ({ ...prev, [payload.userId]: payload.choice }));
      },
      // onPlaylistChoice
      (payload) => {
        setPlaylistChoices(prev => ({ ...prev, [payload.userId]: payload.choices }));
      }
    );
  }, []);

  const handleActivitySelect = async (activityId: string) => {
    const self = a.getSelf();
    const partner = a.getPartner();
    if (!self || !partner) return;

    a.triggerFlash("Initializing Activity...");
    soundManager.play('activity');

    try {
      if (activityId === 'twoTruths') {
        const isUserSubject = Math.random() > 0.5;
        const subjectPersona = isUserSubject ? s.userPersona : s.partnerPersona;
        const guesserPersona = isUserSubject ? s.partnerPersona : s.userPersona;
        const subjectName = isUserSubject ? self.name : partner.name;

        const data = await generateTwoTruthsOneLie(
          subjectPersona,
          guesserPersona,
          subjectName,
          s.vibe,
          s.conversationLog,
          s.dateContext,
          getPromptContext()
        );

        const fullData: TwoTruthsData = {
          ...data,
          subjectId: isUserSubject ? self.id : partner.id,
          subjectName: subjectName
        };

        setTwoTruthsData(fullData);
        setActivityChoices({});
        a.setView('twoTruths');
        a.broadcastActivityData({ type: 'twoTruths', data: fullData });

      } else if (activityId === 'finishSentence') {
        const isUserSubject = Math.random() > 0.5;
        const subjectPersona = isUserSubject ? s.userPersona : s.partnerPersona;
        const guesserPersona = isUserSubject ? s.partnerPersona : s.userPersona;
        const subjectName = isUserSubject ? self.name : partner.name;
        const guesserName = isUserSubject ? partner.name : self.name;

        const data = await generateFinishSentence(
          subjectPersona,
          guesserPersona,
          subjectName,
          guesserName,
          s.vibe,
          s.conversationLog,
          s.dateContext,
          getPromptContext()
        );

        const fullData: FinishSentenceData = {
          ...data,
          subjectId: isUserSubject ? self.id : partner.id,
          subjectName: subjectName
        };

        setFinishSentenceData(fullData);
        setActivityChoices({});
        a.setView('finishSentence');
        a.broadcastActivityData({ type: 'finishSentence', data: fullData });

      } else if (activityId === 'playlist') {
        const data = await generatePlaylistSongs(
          s.userPersona, s.partnerPersona, s.vibe,
          s.conversationLog, s.dateContext, getPromptContext()
        );
        setPlaylistData(data);
        setPlaylistChoices({});
        a.setView('playlist');
        a.broadcastActivityData({ type: 'playlist', data });

      } else {
        // Standard Scene-based Activity (Truth or Drink, etc)
        a.setView('loading');
        const scene = await generateScene(
          s.vibe,
          s.round,
          s.partnerPersona,
          s.userPersona,
          s.dateContext,
          s.lastChoiceText,
          activityId,
          getPromptContext()
        );
        a.setCurrentScene(scene);
        a.setView('activity');
      }
    } catch (error) {
      console.error("Activity generation failed:", error);
      a.triggerFlash("Activity failed — returning to hub");
      a.setView('hub');
    }
  };

  const submitActivityChoice = (index: number) => {
    const selfId = a.getSelf()?.id;
    if (!selfId) return;
    
    setActivityChoices(prev => ({ ...prev, [selfId]: index }));
    a.broadcastActivityChoice(selfId, index);
  };

  const handleSilentChoice = async (choiceId: string, showFlash: (msg: string) => void) => {
    const choice = s.currentScene?.choices.find(c => c.id === choiceId);
    if (!choice) return;

    showFlash("Thought recorded...");
    try {
      const result = await generateSilentReaction(choice.text, s.vibe);

      a.setVibe(prev => applyVibeDeltas(prev, result.vibeUpdate));

      showFlash(result.narrative);
    } catch (error) {
      console.error("Silent reaction failed:", error);
      showFlash("Signal interference...");
    }
  };

  const processImage = async (base64: string, type: 'drink' | 'selfie' | 'general') => {
    return await analyzeImageAction(base64, type, s.vibe);
  };

  const applyChoiceImpact = (choiceId: string) => {
    const choice = s.currentScene?.choices.find(c => c.id === choiceId);
    if (choice?.vibeEffect) {
        a.setVibe(v => applyVibeDeltas(v, choice.vibeEffect));
    }
    
    // Logic for ending date or next round
    const nextRound = s.round + 1;
    a.setRound(nextRound);
    
    if (nextRound > 8) { // End condition
        return true; // Should exit to rating
    }
    return false;
  };

  const finalizeReport = async (rating: number) => {
    a.triggerFlash("Compiling Final Dossier...");
    const partnerName = a.getPartner()?.name || 'Unknown';
    const locationTitle = s.dateContext?.location?.title || 'Unknown Location';

    const activeProfileId = useProfileStore.getState().activeProfile?.id;
    const highlights = extractHighlights(s.conversationLog);
    const partnerAvatar = s.partnerPersona.imageUrl;
    const saveHistory = (report: IntelligenceReport) => {
      try {
        saveDateToHistory(buildHistoryEntry(report, {
          partnerName,
          location: locationTitle,
          vibe: s.vibe,
          chemistry: s.partnerPersona.chemistry,
          profileId: activeProfileId,
          highlights,
          partnerAvatar,
        }));
      } catch (e) {
        console.warn('Failed to save date history:', e);
      }
    };

    try {
      const report = await generateIntelligenceReport(s.vibe, s.partnerPersona, rating, s.dateContext, getPromptContext());
      report.caseNumber = `TNT-${Date.now().toString(36).toUpperCase()}`;
      setIntelligenceReport(report);
      saveHistory(report);
      return true;
    } catch (error) {
      console.error("Intelligence report generation failed:", error);
      a.triggerFlash("Dossier compilation failed");
      const fallback = {
        publicationName: 'Tonight Intelligence',
        headline: "Transmission Lost",
        lede: "The intelligence network experienced interference during compilation.",
        summary: "This session's data was recorded but the final report could not be generated. The connection between agents was real — even if the paperwork wasn't.",
        vibeAnalysis: JSON.stringify(s.vibe),
        closingThought: '',
        barTab: [],
        date: new Date().toISOString(),
        partnerRating: rating,
        caseNumber: `TNT-${Date.now().toString(36).toUpperCase()}`
      } satisfies IntelligenceReport;
      setIntelligenceReport(fallback);
      saveHistory(fallback);
      return true;
    }
  };

  const handleTwoTruthsComplete = (correct: boolean) => {
    a.triggerFlash(correct ? "Insight Verified" : "Deception Successful");
    // Update chemistry/vibe
    if (correct) {
        a.setVibe(v => ({ ...v, deep: Math.min(100, v.deep + 10) }));
    } else {
        a.setVibe(v => ({ ...v, playful: Math.min(100, v.playful + 10) }));
    }
    setTimeout(() => a.setView('hub'), 2000);
  };

  const handleFinishSentenceComplete = (matched: boolean) => {
    if (matched) {
        a.triggerFlash("Resonance Detected");
        a.setPartnerPersona(p => ({ ...p, chemistry: Math.min(100, p.chemistry + 15) }));
    } else {
        a.triggerFlash("Divergence Recorded");
    }
    setTimeout(() => a.setView('hub'), 2000);
  };

  const submitPlaylistChoice = (choices: number[]) => {
    const selfId = a.getSelf()?.id;
    if (!selfId) return;
    setPlaylistChoices(prev => ({ ...prev, [selfId]: choices }));
    a.broadcastPlaylistChoice(selfId, choices);
  };

  const handlePlaylistComplete = (matchCount: number) => {
    const labels = ['Different wavelengths', 'Found common ground', 'Tuned in', 'Same frequency'];
    a.triggerFlash(labels[Math.min(matchCount, 3)]);
    if (matchCount >= 2) {
      a.setVibe(v => ({ ...v, comfortable: Math.min(100, v.comfortable + 10), flirty: Math.min(100, v.flirty + 5) }));
    }
    setTimeout(() => a.setView('hub'), 2000);
  };

  const simulateActivityPartner = () => {
    const partner = a.getPartner();
    if (!partner) return;

    // Use actual option count from current activity data
    // For FinishSentence, the subject has an extra "None of these" option (index 3)
    let optionCount = twoTruthsData?.statements?.length || finishSentenceData?.options?.length || 3;
    if (finishSentenceData && partner.id === finishSentenceData.subjectId) {
      optionCount = finishSentenceData.options.length + 1; // Include "None of these"
    }
    const randomChoice = Math.floor(Math.random() * optionCount);
    setActivityChoices(prev => ({ ...prev, [partner.id]: randomChoice }));
  };

  return {
    aiState: {
        intelligenceReport,
        currentScene: s.currentScene,
        twoTruthsData,
        finishSentenceData,
        activityChoices,
        playlistData,
        playlistChoices
    },
    aiActions: {
        handleActivitySelect,
        submitActivityChoice,
        handleSilentChoice,
        processImage,
        applyChoiceImpact,
        finalizeReport,
        handleTwoTruthsComplete,
        handleFinishSentenceComplete,
        simulateActivityPartner,
        submitPlaylistChoice,
        handlePlaylistComplete
    }
  };
}
