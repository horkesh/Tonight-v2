
import { useState, useEffect, useCallback } from 'react';
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

export function useAiActions(session: ReturnType<typeof useSessionState>) {
  const { state: s, actions: a } = session;

  const [intelligenceReport, setIntelligenceReport] = useState<IntelligenceReport | null>(null);
  const [twoTruthsData, setTwoTruthsData] = useState<TwoTruthsData | null>(null);
  const [finishSentenceData, setFinishSentenceData] = useState<FinishSentenceData | null>(null);
  const [activityChoices, setActivityChoices] = useState<Record<string, number>>({});

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

    if (activityId === 'twoTruths') {
      // Logic: Pick a subject (randomly or round robin). Default to Partner as subject for now.
      // Actually, let's make the User (host) the subject first for simplicity, or random.
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
    const result = await generateSilentReaction(choice.text, s.vibe);
    
    // Update local vibe silently
    a.setVibe(prev => ({
        playful: Math.min(100, prev.playful + (result.vibeUpdate.playful || 0)),
        flirty: Math.min(100, prev.flirty + (result.vibeUpdate.flirty || 0)),
        deep: Math.min(100, prev.deep + (result.vibeUpdate.deep || 0)),
        comfortable: Math.min(100, prev.comfortable + (result.vibeUpdate.comfortable || 0)),
    }));

    // Trigger local thought bubble
    // We don't have a direct setter for monologue in session state exposed easily, 
    // but the `useInnerMonologue` hook polls. 
    // We can use the reaction system to show the text to self? No, that broadcasts.
    // For now, just flash the narrative.
    showFlash(result.narrative);
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
    const report = await generateIntelligenceReport(s.vibe, s.partnerPersona, rating, s.dateContext);
    setIntelligenceReport(report);
    return true;
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
