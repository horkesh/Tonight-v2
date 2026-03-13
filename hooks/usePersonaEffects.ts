import { useEffect, useRef } from 'react';
import type { GameState } from '../store/gameState';
import type { PresenceState } from '../store/presenceState';

export function usePersonaEffects(
  gameState: GameState,
  presence: PresenceState,
  triggerFlash: (msg: string, duration?: number) => void
) {
  const lastChemistryMilestone = useRef<number>(0);

  // Haze / Drunk Factor Effect — applied to overlay element instead of body
  useEffect(() => {
    const el = document.getElementById('haze-overlay');
    if (!el) return;
    const blur = presence.partnerPersona.drunkFactor * 0.8;
    if (blur > 0) {
      el.style.backdropFilter = `blur(${blur}px) hue-rotate(${blur * 2}deg)`;
      el.style.opacity = '1';
    } else {
      el.style.backdropFilter = 'none';
      el.style.opacity = '0';
    }
  }, [presence.partnerPersona.drunkFactor]);

  // Keep users[].avatar in sync with persona imageUrl
  useEffect(() => {
    if (presence.userPersona.imageUrl) {
        presence.setUsers(prev => prev.map(u =>
            u.isSelf && u.avatar !== presence.userPersona.imageUrl ? { ...u, avatar: presence.userPersona.imageUrl! } : u
        ));
    }
  }, [presence.userPersona.imageUrl, presence.setUsers]);

  useEffect(() => {
    if (presence.partnerPersona.imageUrl) {
        presence.setUsers(prev => prev.map(u =>
            !u.isSelf && u.avatar !== presence.partnerPersona.imageUrl ? { ...u, avatar: presence.partnerPersona.imageUrl! } : u
        ));
    }
  }, [presence.partnerPersona.imageUrl, presence.setUsers]);

  // Chemistry Update & Milestones
  useEffect(() => {
    if (gameState.round === 0) return;
    const chem = Math.round((gameState.vibe.flirty * 0.6) + (gameState.vibe.comfortable * 0.4));
    presence.setPartnerPersona(p => p.chemistry === chem ? p : { ...p, chemistry: chem });

    const milestones: [number, string][] = [
      [25, "Something's stirring..."],
      [50, "The air just shifted."],
      [75, "Undeniable."],
      [90, "Dangerous territory."],
    ];
    for (const [threshold, message] of milestones) {
      if (chem >= threshold && lastChemistryMilestone.current < threshold) {
        triggerFlash(message, 3500);
        lastChemistryMilestone.current = threshold;
        break;
      }
    }
  }, [gameState.vibe.flirty, gameState.vibe.comfortable, gameState.round, presence.setPartnerPersona]);
}
