import React, { useState, useEffect, useRef } from 'react';
import { User, AppView, DateLocation, DateVibe } from '../types';
import { generateLocationImage } from '../services/geminiService';
import { p2p } from '../services/p2p';
import { compressImage } from '../utils/helpers';
import type { GameState } from '../store/gameState';
import type { PresenceState } from '../store/presenceState';
import { DEFAULT_AVATAR } from '../constants';

const SESSION_KEY = 'tonight_active_session';

export function useSessionLifecycle(
  gameState: GameState,
  presence: PresenceState,
  initSession: (userId: string, roomId: string, isHost: boolean) => void,
  setViewState: React.Dispatch<React.SetStateAction<AppView>>,
  setView: (val: AppView, broadcast?: boolean) => void,
  updatePersonaImage: (target: 'self' | 'partner', traits: string[], revealProgress: number, round: number, context: string) => void,
  sessionInfo: { userId: string; roomId: string; isHost: boolean } | null,
  setSessionInfo: React.Dispatch<React.SetStateAction<{ userId: string; roomId: string; isHost: boolean } | null>>
) {

  const persistSession = (userId: string, roomId: string, isHost: boolean) => {
      const data = { userId, roomId, isHost, timestamp: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  };

  const clearSession = () => {
      p2p.teardown();
      localStorage.removeItem(SESSION_KEY);
      setSessionInfo(null);
      window.location.reload();
  };

  // Restore session on mount
  const restoreAttempted = useRef(false);
  useEffect(() => {
      if (restoreAttempted.current) return;
      restoreAttempted.current = true;

      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) {
          console.log("Session: Magic link detected, skipping session restore.");
          localStorage.removeItem(SESSION_KEY);
          return;
      }

      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
          try {
              const { userId, roomId, isHost, timestamp } = JSON.parse(saved);
              if (Date.now() - timestamp < 1000 * 60 * 15) {
                  console.log("Session: Restoring existing session...");
                  setSessionInfo({ userId, roomId, isHost });
                  initSession(userId, roomId, isHost);

                  setViewState('loading');
                  if (isHost) {
                      setTimeout(() => setViewState('hub'), 800);
                  }

                  setTimeout(() => {
                      setViewState(prev => {
                          if (prev === 'loading') {
                              console.log("Session: Restore timeout — returning to setup.");
                              localStorage.removeItem(SESSION_KEY);
                              setSessionInfo(null);
                              p2p.teardown();
                              return 'setup';
                          }
                          return prev;
                      });
                  }, 15000);
              } else {
                  console.log("Session: Stale session found, clearing.");
                  localStorage.removeItem(SESSION_KEY);
              }
          } catch (e) {
              localStorage.removeItem(SESSION_KEY);
          }
      }

      return () => {
          console.log("Session: Unmounting, tearing down P2P.");
          p2p.teardown();
      };
  }, [initSession]);

  const startApp = (
      hostData: any | null,
      guestData: any,
      vibeData: DateVibe | null,
      locationData: DateLocation | null,
      roomId: string,
      isHost: boolean,
      initialAvatar?: string,
      partnerAvatar?: string,
      hostTraits?: string[],
      partnerTraits?: string[]
  ) => {
    const name = isHost ? hostData.name : guestData.name;
    const effectiveName = name || `Guest`;
    const userId = `${effectiveName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.floor(Math.random() * 10000)}`;

    setSessionInfo({ userId, roomId, isHost });
    persistSession(userId, roomId, isHost);
    initSession(userId, roomId, isHost);

    if (isHost) {
        const partnerName = guestData.name;
        const selfUser: User = { id: userId, name: name, isSelf: true, status: 'online', avatar: initialAvatar || DEFAULT_AVATAR };
        const partnerUser: User = { id: 'partner-placeholder', name: partnerName, isSelf: false, status: 'online', avatar: partnerAvatar || DEFAULT_AVATAR };

        presence.setUsers([selfUser, partnerUser]);

        const fullAppearanceSelf = hostData.appearance || `${hostData.age}, ${hostData.sex}, ${hostData.desc}`;
        const fullAppearancePartner = guestData.appearance || `${guestData.age}, ${guestData.sex}, ${guestData.desc}`;

        presence.setUserPersona(p => ({
            ...p,
            sex: hostData.sex,
            age: hostData.age,
            appearance: fullAppearanceSelf,
            background: hostData.desc,
            traits: [],
            isProfileComplete: true,
            imageUrl: initialAvatar || DEFAULT_AVATAR
        }));

        presence.setPartnerPersona(p => ({
            ...p,
            sex: guestData.sex,
            age: guestData.age,
            appearance: fullAppearancePartner,
            background: guestData.desc,
            traits: [],
            isProfileComplete: true,
            imageUrl: partnerAvatar || DEFAULT_AVATAR
        }));

        if (locationData && vibeData) {
            gameState.setDateContext({ location: locationData, vibe: vibeData });
            generateLocationImage(locationData, vibeData, fullAppearanceSelf, fullAppearancePartner).then(async imgUrl => {
                if (!imgUrl) return;
                let finalUrl = imgUrl;
                if (imgUrl.startsWith('data:')) {
                    try {
                        const compressed = await compressImage(imgUrl, 0.5, 800);
                        finalUrl = `data:image/jpeg;base64,${compressed}`;
                    } catch (e) {
                        console.error("Location image compression failed, using original", e);
                    }
                }
                gameState.setDateContext({ location: locationData, vibe: vibeData, generatedImage: finalUrl });
            });
        }

        if (!initialAvatar) updatePersonaImage('self', hostTraits || [], 0, 0, fullAppearanceSelf);
        if (!partnerAvatar) updatePersonaImage('partner', partnerTraits || [], 0, 0, fullAppearancePartner);

        setView('hub');

    } else {
        const selfUser: User = { id: userId, name: name || "Guest", isSelf: true, status: 'online', avatar: initialAvatar || DEFAULT_AVATAR };
        const partnerUser: User = { id: 'host-placeholder', name: 'Partner', isSelf: false, status: 'online', avatar: DEFAULT_AVATAR };
        presence.setUsers([selfUser, partnerUser]);

        const fullAppearanceSelf = `${guestData.age}, ${guestData.sex}, ${guestData.desc}`;
        presence.setUserPersona(p => ({
            ...p,
            sex: guestData.sex,
            age: guestData.age,
            appearance: fullAppearanceSelf,
            traits: guestData.traits || [],
            isProfileComplete: true,
            imageUrl: initialAvatar || DEFAULT_AVATAR
        }));

        presence.setGuestProfileConfirmed(false);
        setViewState('loading');
    }
  };

  return { startApp, clearSession };
}
