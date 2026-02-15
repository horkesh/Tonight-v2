
import { useState, useEffect } from 'react';
import { Question, User, VibeStats } from '../types';
import { useSessionState } from './useSessionState';
import { generateDynamicQuestions, extractTraitFromInteraction } from '../services/geminiService';

const VIBE_WEIGHTS: Record<string, Partial<VibeStats>> = {
  'Style': { playful: 10, flirty: 5 },
  'Escape': { playful: 5, deep: 10 },
  'Preferences': { comfortable: 10 },
  'Deep': { deep: 15, comfortable: 5 },
  'Intimate': { flirty: 15, deep: 5 }
};

export function useQuestionFlow(session: ReturnType<typeof useSessionState>) {
  const { state: s, actions: a } = session;
  
  // Local UI state
  const [selectedCategory, setSelectedCategory] = useState<Question['category'] | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  const showFlash = (msg: string, duration = 2500) => {
    setFlashMessage(msg);
    setTimeout(() => setFlashMessage(null), duration);
  };

  // Automatic reset when leaving the Question view
  useEffect(() => {
    if (s.view !== 'question') {
        setSelectedCategory(null);
        setAvailableQuestions([]);
    }
  }, [s.view]);

  // Bot Logic for Partner answering (Only runs if NOT connected)
  useEffect(() => {
    if (s.isConnected) return; // Don't run bot if connected to real person

    const self = a.getSelf();
    // Logic: If I am the Question Owner, I run the bot simulation for my Partner
    if (s.view === 'question' && s.activeQuestion && s.questionOwnerId === self?.id) {
      a.setUsers(prev => prev.map(u => !u.isSelf ? { ...u, status: 'choosing' } : u));
      
      const timer = setTimeout(() => {
        if (!s.activeQuestion) return; 

        const refusalThreshold = s.activeQuestion.category === 'Intimate' ? 0.35 : 0.15;
        const shouldRefuse = Math.random() < refusalThreshold && s.partnerPersona.chemistry < 50;

        if (shouldRefuse) {
          showFlash("Partner: Too direct. 🍷");
          handleRefuse(true);
        } else {
          const randomChoice = s.activeQuestion.options[Math.floor(Math.random() * s.activeQuestion.options.length)];
          handleAnswerSelect(randomChoice, true);
        }
        
        a.setUsers(prev => prev.map(u => !u.isSelf ? { ...u, status: 'online' } : u));
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [s.view, s.activeQuestion, s.questionOwnerId, s.users, s.partnerPersona.chemistry, s.isConnected]);

  const handleCategorySelect = async (cat: Question['category']) => {
    setSelectedCategory(cat);
    setIsGeneratingQuestions(true);
    showFlash(`Generating ${cat} Intel...`, 2000);
    
    const self = a.getSelf();
    if (!self) return;

    // Use AI to generate questions dynamically based on personas
    const questions = await generateDynamicQuestions(cat, s.userPersona, s.partnerPersona);
    
    setAvailableQuestions(questions);
    setIsGeneratingQuestions(false);
  };

  const resetCategory = () => {
    setSelectedCategory(null);
    setAvailableQuestions([]);
    setIsGeneratingQuestions(false);
  };

  const handleQuestionSelect = (q: Question) => {
    // Sync Question to Partner
    const myId = a.getSelf()?.id || null;
    a.setQuestionState(q, myId);
    setAskedQuestionIds(prev => [...prev, q.id]);
    showFlash(`Requesting Disclosure`, 1200);
    // Reset status to online, as we are done choosing
    a.setUsers(prev => prev.map(u => u.isSelf ? { ...u, status: 'online' } : u));
  };

  const handleRefuse = (isBot = false) => {
    // If UI triggered (isBot=false), User is refusing -> Update UserPersona
    // If Bot triggered (isBot=true), Partner is refusing -> Update PartnerPersona
    const targetAction = isBot ? a.setPartnerPersona : a.setUserPersona;

    targetAction(p => ({ 
        ...p, 
        memories: [...p.memories, "Chose silence and wine"].slice(-10)
    }));
    
    // If I refused, I take a sip.
    if (!isBot) a.takeSip(30);
    
    a.setQuestionState(null, null); // Clear shared state
    resetCategory();
    a.setView('hub');
    showFlash("🥃 Respecting the boundary.");
  };

  const handleAnswerSelect = (opt: string, isBot = false) => {
    // If UI triggered (isBot=false), User is answering -> Update UserPersona
    // If Bot triggered (isBot=true), Partner is answering -> Update PartnerPersona
    const updateTarget = isBot ? a.setPartnerPersona : a.setUserPersona;
    const imageTarget = isBot ? 'partner' : 'self';

    const isDrink = opt.toLowerCase().includes("sip") || opt.toLowerCase().includes("wine");
    const question = s.activeQuestion;
    const entry = question ? question.knowledgeTemplate.replace('{option}', opt) : opt;
    
    // Logic: Deep, Intimate, and Escape questions count as Vulnerabilities (Secrets)
    const isVulnerability = question && ['Deep', 'Intimate', 'Escape'].includes(question.category);

    // 1. Immediate Update (Memories, Progress, Secrets)
    // We removed the naive trait splitting here.
    updateTarget(p => {
      const nextProgress = Math.min(100, p.revealProgress + (isDrink ? 5 : 12));
      return {
        ...p, 
        revealProgress: nextProgress, 
        memories: [...p.memories, entry].slice(-10), 
        secrets: isVulnerability ? [...p.secrets, entry].slice(-5) : p.secrets,
      };
    });

    // 2. Intelligent Trait Extraction (Async)
    const qText = question?.text || "Context";
    extractTraitFromInteraction(qText, opt).then(trait => {
        if (!trait) return;
        
        updateTarget(current => {
             // Avoid duplicates
             const updatedTraits = [...new Set([...current.traits, trait])].slice(0, 6);
             
             // Trigger image update if needed (moved here to ensure it uses the NEW trait)
             if (s.round % 2 === 0 || !current.imageUrl) {
                 a.updatePersonaImage(imageTarget, updatedTraits, current.revealProgress);
             }
             
             return { ...current, traits: updatedTraits };
        });
        
        if (!isBot) showFlash(`Trait Detected: ${trait}`);
    });

    if (isDrink) {
        if (!isBot) {
             a.takeSip(30); // Take a large sip
             showFlash("VIRTUAL CLINK 🥃");
        } else {
             showFlash("Partner took a sip 🥃");
        }
    } else if (isVulnerability) {
        showFlash("VULNERABILITY DETECTED 🔓");
    }

    // Update Vibe based on Question Category
    if (question && VIBE_WEIGHTS[question.category]) {
        const delta = VIBE_WEIGHTS[question.category];
        a.setVibe(v => ({
            playful: Math.min(100, v.playful + (delta.playful || 0)),
            flirty: Math.min(100, v.flirty + (delta.flirty || 0)),
            deep: Math.min(100, v.deep + (delta.deep || 0)),
            comfortable: Math.min(100, v.comfortable + (delta.comfortable || 0)),
        }));
    }
    
    a.setQuestionState(null, null); // Clear shared state
    resetCategory();
    a.setView('hub');
  };

  return {
    qState: { 
        activeQuestion: s.activeQuestion, 
        questionOwnerId: s.questionOwnerId, 
        selectedCategory, 
        availableQuestions, 
        flashMessage,
        isGeneratingQuestions 
    },
    qActions: { 
        handleCategorySelect, 
        handleQuestionSelect, 
        handleRefuse, 
        handleAnswerSelect, 
        showFlash,
        resetCategory 
    }
  };
}
