
import { useState } from 'react';
import { Scene, IntelligenceReport } from '../types';
import { generateScene, generateIntelligenceReport, analyzeImageAction, generateSilentReaction } from '../services/geminiService';
import { useSessionState } from './useSessionState';

export function useAiActions(session: ReturnType<typeof useSessionState>) {
  const { state: s, actions: a } = session;
  
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [intelligenceReport, setIntelligenceReport] = useState<IntelligenceReport | null>(null);

  const handleActivitySelect = async (activityId: string) => {
    a.setView('loading');
    
    // Last Call Check
    if (s.round >= 10 && activityId !== 'lastCall') {
        const scene = await generateScene(s.vibe, s.round + 1, s.partnerPersona, s.userPersona, s.dateContext, s.lastChoiceText, 'lastCall');
        a.setCurrentScene(scene);
        a.setRound(s.round + 1);
        a.setView('activity');
        return;
    }

    try {
      const scene = await generateScene(s.vibe, s.round + 1, s.partnerPersona, s.userPersona, s.dateContext, s.lastChoiceText, activityId);
      if (activityId === 'twist') scene.type = 'twist';
      
      a.setCurrentScene(scene);
      a.setRound(s.round + 1);
      a.setView('activity');
    } catch {
      a.setView('hub');
    }
  };

  const handlePlotTwist = async () => {
    a.setView('loading');
    try {
      const scene = await generateScene(s.vibe, s.round + 1, s.partnerPersona, s.userPersona, s.dateContext, s.lastChoiceText, 'twist');
      scene.type = 'twist'; // Force twist type
      a.setCurrentScene(scene);
      a.setRound(s.round + 1);
      a.setView('activity');
    } catch {
      a.setView('hub');
    }
  };

  const handleChoice = (choiceId: string, showFlash: (msg: string) => void) => {
    const choice = s.currentScene?.choices?.find(c => c.id === choiceId);
    if (!choice) return;

    if (choice.text.includes("Call the Cab")) {
        a.setView('rating');
        return;
    }
    
    a.setLastChoiceText(choice.text);
    a.setVibe(v => ({
      playful: Math.min(100, Math.max(0, (v.playful || 0) + (choice.vibeEffect.playful || 0))),
      flirty: Math.min(100, Math.max(0, (v.flirty || 0) + (choice.vibeEffect.flirty || 0))),
      deep: Math.min(100, Math.max(0, (v.deep || 0) + (choice.vibeEffect.deep || 0))),
      comfortable: Math.min(100, Math.max(0, (v.comfortable || 0) + (choice.vibeEffect.comfortable || 0))),
    }));

    if (choice.symbol === '🥃') {
        if(a.handleDrinkAction()) showFlash("VIRTUAL CLINK 🥃");
    }
    a.setView('hub');
  };

  const handleSilentChoice = async (choiceId: string, showFlash: (msg: string) => void) => {
    const choice = s.currentScene?.choices?.find(c => c.id === choiceId);
    if (!choice) return;
    
    showFlash("Thought left unsaid...");
    
    const result = await generateSilentReaction(choice.text, s.vibe);
    
    a.setVibe(v => ({
      ...v,
      deep: Math.min(100, v.deep + (result.vibeUpdate.deep || 5)),
      flirty: Math.min(100, v.flirty + (result.vibeUpdate.flirty || 0))
    }));

    if (s.currentScene) {
        a.setCurrentScene({ ...s.currentScene, narrative: result.narrative }, false);
    }
    
    setTimeout(() => a.setView('hub'), 3000);
  };

  const finalizeReport = async (rating: number) => {
    a.setView('loading');
    try {
      const report = await generateIntelligenceReport(s.vibe, s.partnerPersona, rating, s.dateContext);
      setIntelligenceReport(report);
      return true;
    } catch {
      a.setView('hub');
      return false;
    }
  };

  const processImage = async (base64: string, type: 'drink' | 'selfie') => {
      return await analyzeImageAction(base64, type, s.vibe);
  };

  return {
    aiState: { currentScene: s.currentScene, intelligenceReport },
    aiActions: { handleActivitySelect, handlePlotTwist, handleChoice, handleSilentChoice, finalizeReport, processImage }
  };
}
