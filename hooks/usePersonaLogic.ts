import React, { useEffect } from 'react';
import { PersonaState, User } from '../types';
import { generateAbstractAvatar, analyzeUserPhotoForAvatar, generateLocationImage } from '../services/geminiService';
import { compressImage } from '../utils/helpers';
import { DateContext } from '../types';

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop";

const INITIAL_PERSONA: PersonaState = {
  traits: [], memories: [], secrets: [], imageUrl: null, lastGeneratedRound: 0, isGenerating: false, 
  revealProgress: 0, chemistry: 0, drunkFactor: 0, appearance: "",
  isProfileComplete: false
};

type PersonaSetter = (updater: React.SetStateAction<PersonaState>) => void;

export function usePersonaLogic(
    userPersona: PersonaState,
    setUserPersona: PersonaSetter,
    partnerPersona: PersonaState,
    setPartnerPersona: PersonaSetter
) {

  // Drunk factor decay
  useEffect(() => {
    const decayInterval = setInterval(() => {
        setPartnerPersona(p => {
            if (p.drunkFactor <= 0) return p;
            return { ...p, drunkFactor: Math.max(0, p.drunkFactor - 0.5) };
        });
    }, 15000); 
    return () => clearInterval(decayInterval);
  }, []);

  const updatePersonaImage = async (target: 'self' | 'partner', traits: string[], progress: number, round: number, contextOverride?: string) => {
    const setter = target === 'self' ? setUserPersona : setPartnerPersona;
    const persona = target === 'self' ? userPersona : partnerPersona;

    setter(p => ({ ...p, isGenerating: true }));

    try {
      const context = contextOverride || persona.appearance || "Cinematic character";
      const url = await generateAbstractAvatar(traits, progress, context);

      let finalUrl = url;
      if (url.startsWith('data:')) {
          const compressed = await compressImage(url, 0.6, 600);
          finalUrl = `data:image/jpeg;base64,${compressed}`;
      }

      setter(p => ({ ...p, imageUrl: finalUrl, lastGeneratedRound: round, isGenerating: false }));
    } catch (e) {
      setter(p => ({ ...p, isGenerating: false }));
    } finally {
        setter(p => { if (p.isGenerating) return { ...p, isGenerating: false }; return p; });
    }
  };

  const regenerateAvatarFromPhoto = async (base64: string, round: number): Promise<string | null> => {
      setUserPersona(p => ({ ...p, isGenerating: true }));
      try {
          const { appearance, traits } = await analyzeUserPhotoForAvatar(base64);
          setUserPersona(p => ({ ...p, appearance: appearance }));
          await updatePersonaImage('self', traits, userPersona.revealProgress, round, appearance);
          return appearance;
      } catch (e) {
           setUserPersona(p => ({ ...p, isGenerating: false }));
           return null;
      }
  };

  const injectVisualModifier = async (modifier: string, round: number, dateContext: DateContext | null, setDateContext: (ctx: DateContext) => void) => {
    const currentAppearance = userPersona.appearance || "";
    const newAppearance = currentAppearance.includes(modifier) ? currentAppearance : `${currentAppearance}, currently ${modifier}`;
    setUserPersona(p => ({ ...p, appearance: newAppearance }));
    await updatePersonaImage('self', userPersona.traits, userPersona.revealProgress, round, newAppearance);

    // Also regenerate location "live feed" with updated pose
    if (dateContext?.location && dateContext?.vibe) {
      const partnerApp = partnerPersona.appearance || "";
      generateLocationImage(dateContext.location, dateContext.vibe, newAppearance, partnerApp).then(async imgUrl => {
        if (!imgUrl || !imgUrl.startsWith('data:')) return;
        try {
          const compressed = await compressImage(imgUrl, 0.6, 1024);
          const finalUrl = `data:image/jpeg;base64,${compressed}`;
          setDateContext({ ...dateContext, generatedImage: finalUrl });
        } catch { /* silently fail */ }
      });
    }
  };

  return {
    updatePersonaImage,
    regenerateAvatarFromPhoto,
    injectVisualModifier,
    INITIAL_PERSONA,
    DEFAULT_AVATAR
  };
}
