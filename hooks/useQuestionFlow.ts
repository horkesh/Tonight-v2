
import { useState, useEffect, useRef } from 'react';
import { Question, User, VibeStats, ConversationEntry } from '../types';
import { useSessionState } from './useSessionState';
import { generateDynamicQuestions, extractTraitFromInteraction } from '../services/geminiService';

const VIBE_WEIGHTS: Record<string, Partial<VibeStats>> = {
  'Style': { playful: 10, flirty: 5 },
  'Escape': { playful: 5, deep: 10 },
  'Preferences': { comfortable: 10 },
  'Deep': { deep: 15, comfortable: 5 },
  'Intimate': { flirty: 15, deep: 5 },
  'Desire': { flirty: 25, deep: 10 }
};

export function useQuestionFlow(session: ReturnType<typeof useSessionState>) {
  const { state: s, actions: a } = session;

  // Local UI state
  const [selectedCategory, setSelectedCategory] = useState<Question['category'] | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // Wrapper for session flash to maintain API
  const showFlash = (msg: string, duration = 2500) => {
    a.triggerFlash(msg, duration);
  };

  // Automatic reset when leaving the Question view
  useEffect(() => {
    if (s.view !== 'question') {
        setSelectedCategory(null);
        setAvailableQuestions([]);
    }
  }, [s.view]);

  // Bot Logic for Partner answering (Only runs if NOT connected)
  const questionIdRef = useRef(s.activeQuestion?.id);
  useEffect(() => {
      questionIdRef.current = s.activeQuestion?.id;
  }, [s.activeQuestion]);

  useEffect(() => {
    if (s.isConnected) return; // Don't run bot if connected to real person

    const self = a.getSelf();
    // Logic: If I am the Question Owner, I run the bot simulation for my Partner
    if (s.view === 'question' && s.activeQuestion && s.questionOwnerId === self?.id) {
      a.setUsers(prev => prev.map(u => !u.isSelf ? { ...u, status: 'choosing' } : u));

      const timer = setTimeout(() => {
        // Fix 2.8: Guard against stale question
        if (!s.activeQuestion || s.activeQuestion.id !== questionIdRef.current) return;

        const refusalThreshold = s.activeQuestion.category === 'Intimate' ? 0.35 : 0.15;
        const shouldRefuse = Math.random() < refusalThreshold && s.partnerPersona.chemistry < 50;

        if (shouldRefuse) {
          showFlash("Partner: Too direct.");
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

    // Pass full enriched context for personalized question generation
    const questions = await generateDynamicQuestions(
      cat,
      s.userPersona,
      s.partnerPersona,
      s.dateContext,
      {
        conversationLog: s.conversationLog,
        round: s.round,
        vibe: s.vibe,
      }
    );

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
    const targetAction = isBot ? a.setPartnerPersona : a.setUserPersona;
    const question = s.activeQuestion;

    targetAction(p => ({
        ...p,
        memories: [...p.memories, "Chose silence and wine"].slice(-10)
    }));

    // Record refusal in conversation log
    if (question) {
      const newEntry: ConversationEntry = {
        round: s.round,
        category: question.category,
        questionText: question.text,
        answer: "[Refused — took a sip instead]",
        answeredBy: isBot ? 'partner' : 'user',
        askedBy: isBot ? 'user' : 'partner',
      };
      a.setConversationLog(prev => [...prev, newEntry].slice(-20));
    }

    // If I refused, I take a sip.
    if (!isBot) a.takeSip(30);

    a.setQuestionState(null, null); // Clear shared state
    resetCategory();
    a.setView('hub');
    showFlash("Respecting the boundary.");
  };

  const handleAnswerSelect = (opt: string, isBot = false) => {
    const updateTarget = isBot ? a.setPartnerPersona : a.setUserPersona;
    const imageTarget = isBot ? 'partner' : 'self';

    const isDrink = opt.toLowerCase().includes("sip") || opt.toLowerCase().includes("wine");
    const question = s.activeQuestion;

    // Robust template replacement to handle AI inconsistencies
    let entry = opt;
    if (question && question.knowledgeTemplate) {
        let tpl = question.knowledgeTemplate;
        tpl = tpl.replace(/\{option\}|\[option\]|\{answer\}|\[answer\]/gi, opt);

        if (tpl.includes('{') || tpl.includes('}')) {
             entry = `Asked "${question.text}" — answered: "${opt}"`;
        } else if (tpl === question.knowledgeTemplate && !tpl.includes(opt)) {
             entry = `${tpl} ${opt}`;
        } else {
             entry = tpl;
        }
    }

    const isVulnerability = question && ['Deep', 'Intimate', 'Escape', 'Desire'].includes(question.category);

    // 1. Store in memories/secrets
    updateTarget(p => {
      const nextProgress = Math.min(100, p.revealProgress + (isDrink ? 5 : 12));
      return {
        ...p,
        revealProgress: nextProgress,
        memories: !isVulnerability ? [...p.memories, entry].slice(-10) : p.memories,
        secrets: isVulnerability ? [...p.secrets, entry].slice(-5) : p.secrets,
      };
    });

    // 2. Record structured conversation entry
    if (question) {
      const newEntry: ConversationEntry = {
        round: s.round,
        category: question.category,
        questionText: question.text,
        answer: opt,
        answeredBy: isBot ? 'partner' : 'user',
        askedBy: isBot ? 'user' : 'partner',
      };
      a.setConversationLog(prev => [...prev, newEntry].slice(-20));
    }

    // 3. Intelligent Trait Extraction (Async) — pass existing traits to avoid duplicates
    const qText = question?.text || "Context";
    const targetPersona = isBot ? s.partnerPersona : s.userPersona;
    extractTraitFromInteraction(qText, opt, targetPersona.traits).then(trait => {
        if (!trait) return;

        updateTarget(current => {
             const updatedTraits = [...new Set([...current.traits, trait])].slice(0, 6);

             if (s.round % 2 === 0 || !current.imageUrl) {
                 a.updatePersonaImage(imageTarget, updatedTraits, current.revealProgress);
             }

             return { ...current, traits: updatedTraits };
        });

        if (!isBot) {
            a.sendFlash(`Trait Detected: ${trait}`);
        } else {
            showFlash(`Trait Detected: ${trait}`);
        }
    }).catch(() => {});

    if (isDrink) {
        if (!isBot) {
             a.takeSip(30);
             showFlash("VIRTUAL CLINK");
        } else {
             showFlash("Partner took a sip");
        }
    } else if (isVulnerability) {
        if (isBot) {
             showFlash("VULNERABILITY DETECTED");
        } else {
             a.sendFlash("VULNERABILITY DETECTED");
        }
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

    a.setQuestionState(null, null);
    resetCategory();
    a.setView('hub');
  };

  return {
    qState: {
        activeQuestion: s.activeQuestion,
        questionOwnerId: s.questionOwnerId,
        selectedCategory,
        availableQuestions,
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
