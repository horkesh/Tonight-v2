
import { useEffect, useCallback } from 'react';
import { 
  Scene, 
  IntelligenceReport, 
  TwoTruthsData, 
  FinishSentenceData,
  VibeStats,
  Choice
} from '../types';
import { 
  generateScene, 
  generateIntelligenceReport, 
  analyzeImageAction, 
  generateSilentReaction,
  generateTwoTruthsOneLie,
  generateFinishSentence
} from '../services/geminiService';
import { useSessionState } from './useSessionState';
import { useAiStore } from '../store/aiState';

export function useAiActions(session: ReturnType<typeof useSessionState>) {
  const { state: s, actions: a } = session;

  const {
    intelligenceReport, setIntelligenceReport,
    twoTruthsData, setTwoTruthsData,
    finishSentenceData, setFinishSentenceData,
    activityChoices, setActivityChoices
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
        }
      },
      // onChoice
      (payload) => {
        setActivityChoices(prev => ({ ...prev, [payload.userId]: payload.choice }));
      }
    );
  }, []);

  const handleActivitySelect = async (activityId: string) => {
    const self = a.getSelf();
    const partner = a.getPartner();
    if (!self || !partner) return;

    a.triggerFlash("Initializing Activity...");

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
          s.dateContext
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
          s.dateContext
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
          activityId
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

      a.setVibe(prev => ({
          playful: Math.min(100, prev.playful + (result.vibeUpdate.playful || 0)),
          flirty: Math.min(100, prev.flirty + (result.vibeUpdate.flirty || 0)),
          deep: Math.min(100, prev.deep + (result.vibeUpdate.deep || 0)),
          comfortable: Math.min(100, prev.comfortable + (result.vibeUpdate.comfortable || 0)),
      }));

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
        a.setVibe(v => ({
            playful: Math.min(100, v.playful + (choice.vibeEffect.playful || 0)),
            flirty: Math.min(100, v.flirty + (choice.vibeEffect.flirty || 0)),
            deep: Math.min(100, v.deep + (choice.vibeEffect.deep || 0)),
            comfortable: Math.min(100, v.comfortable + (choice.vibeEffect.comfortable || 0)),
        }));
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
    try {
      const report = await generateIntelligenceReport(s.vibe, s.partnerPersona, rating, s.dateContext);
      setIntelligenceReport(report);
      return true;
    } catch (error) {
      console.error("Intelligence report generation failed:", error);
      a.triggerFlash("Dossier compilation failed");
      // Return a minimal fallback report so the UI isn't stuck
      setIntelligenceReport({
        headline: "Transmission Lost",
        lede: "The intelligence network experienced interference during compilation.",
        summary: "This session's data was recorded but the final report could not be generated. The connection between agents was real — even if the paperwork wasn't.",
        vibeAnalysis: s.vibe,
        barTab: [],
        rating
      } as any);
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

  const simulateActivityPartner = () => {
    const partner = a.getPartner();
    if (!partner) return;
    
    // Random choice 0-2 (assuming 3 options)
    const randomChoice = Math.floor(Math.random() * 3);
    setActivityChoices(prev => ({ ...prev, [partner.id]: randomChoice }));
  };

  return {
    aiState: {
        intelligenceReport,
        currentScene: s.currentScene,
        twoTruthsData,
        finishSentenceData,
        activityChoices
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
        simulateActivityPartner
    }
  };
}
