
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { PAGE_VARIANTS, DATE_VIBES, HOST_PROFILE } from '../../constants';
import { DateLocation, DateVibe } from '../../types';
import { PastDates } from '../PastDates';
import { ProfileCard } from '../ProfileCard';
import { VenueCard } from '../VenueCard';
import { ProfileEditorView } from './ProfileEditorView';
import { VenueEditorView } from './VenueEditorView';
import { DateConfigView } from './DateConfigView';
import { getProfiles, deleteProfile, getVenues, deleteVenue } from '../../utils/profileStorage';
import { venueToDateLocation } from '../../utils/venueToLocation';
import { useProfileStore } from '../../store/profileStore';
import type { PartnerProfile, VenueProfile, DateConfig } from '../../types/profiles';
import { getDateNumber } from '../../utils/dateHistory';

interface SetupViewProps {
  onStart: (hostData: any, guestData: any, vibe: DateVibe | null, location: DateLocation | null, roomId: string, isHost: boolean, avatar?: string, partnerAvatar?: string, hostTraits?: string[], partnerTraits?: string[]) => void;
}

const IntroStep: React.FC<{ handleHostStart: () => void; handleGuestJoin: () => void; handleManage: () => void }> = ({ handleHostStart, handleGuestJoin, handleManage }) => (
  <div className="flex flex-col items-center gap-6 w-full">
    <h1 className="text-6xl font-serif text-white tracking-tighter mb-4">Tonight</h1>
    <button onClick={handleHostStart} className="w-full p-6 bg-rose-600 rounded-[32px] border border-rose-500/30 hover:bg-rose-500 transition-all text-left group relative overflow-hidden">
      <span className="relative z-10 text-[10px] uppercase tracking-[0.4em] font-black text-white/80 block mb-2">Host</span>
      <span className="relative z-10 text-2xl font-serif italic text-white">Create Experience</span>
      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-4xl opacity-50 group-hover:scale-110 transition-transform">🍷</div>
    </button>
    <button onClick={handleGuestJoin} className="w-full p-6 bg-white/5 rounded-[32px] border border-white/10 hover:bg-white/10 transition-all text-left group">
      <span className="text-[10px] uppercase tracking-[0.4em] font-black text-white/40 block mb-2">Guest</span>
      <span className="text-2xl font-serif italic text-white/80">Enter Room Code</span>
      <div className="ml-auto float-right -mt-6 text-3xl opacity-30 group-hover:opacity-100 transition-opacity">🗝️</div>
    </button>
    <button onClick={handleManage} className="mt-2 text-[9px] uppercase tracking-[0.3em] font-black text-white/20 hover:text-white/60 transition-colors">
      Manage Profiles & Venues
    </button>
    <PastDates />
  </div>
);

export const SetupView: React.FC<SetupViewProps> = ({ onStart }) => {
  // Step 0=Intro, 1=ProfilePicker, 2=VenuePicker, 3=DateConfig, 4=RoomCode
  // Step 10=Guest join, 11=ProfileEditor overlay, 12=VenueEditor overlay
  // Step 20=Manage hub (profiles & venues)
  const [step, setStep] = useState<number>(0);
  const [manageTab, setManageTab] = useState<'profiles' | 'venues'>('profiles');
  // Track where editors should return: management hub or date flow
  const editorReturnRef = useRef<number>(1);
  const [isHost, setIsHost] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [isAutoJoin, setIsAutoJoin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const autoJoinFired = useRef(false);

  // Profile store — use selectors to minimize re-renders
  const activeProfile = useProfileStore(s => s.activeProfile);
  const activeVenue = useProfileStore(s => s.activeVenue);
  const activeDateConfig = useProfileStore(s => s.activeDateConfig);
  const setActiveProfile = useProfileStore(s => s.setActiveProfile);
  const setActiveVenue = useProfileStore(s => s.setActiveVenue);
  const setActiveDateConfig = useProfileStore(s => s.setActiveDateConfig);

  // Profile/venue lists
  const [profiles, setProfiles] = useState<PartnerProfile[]>([]);
  const [venues, setVenues] = useState<VenueProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<PartnerProfile | undefined>(undefined);
  const [editingVenue, setEditingVenue] = useState<VenueProfile | undefined>(undefined);

  // Guest data (unchanged from original)
  const [guestName, setGuestName] = useState('');

  // Load profiles and venues
  useEffect(() => {
    setProfiles(getProfiles());
    setVenues(getVenues());
  }, []);

  useEffect(() => {
    // Check for Magic Link
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');

    if (urlRoom) {
        setRoomId(urlRoom);
        setIsHost(false);
        setIsAutoJoin(true);
        setIsLoading(true);
        setStep(10);
        if (autoJoinFired.current) return;
        autoJoinFired.current = true;
        setTimeout(() => {
            const finalRoomId = urlRoom.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
            onStart(
                null,
                { name: "Guest", age: "Unknown", desc: "Connecting...", sex: "Neutral", traits: [] },
                null, null, finalRoomId, false, undefined, undefined, [], []
            );
        }, 100);
        return;
    } else {
        const ROOM_CODES = [
            'NOIR', 'LUNA', 'SILK', 'JAZZ', 'WINE', 'DEEP', 'DARK', 'SOUL',
            'HAZE', 'GLOW', 'MIST', 'RAIN', 'FIRE', 'KISS', 'REAL', 'WANT'
        ];
        const base = ROOM_CODES[Math.floor(Math.random() * ROOM_CODES.length)];
        const suffix = Math.floor(Math.random() * 90 + 10);
        setRoomId(`${base}${suffix}`);
    }
  }, []);

  const handleManage = () => {
    setStep(20);
  };

  const handleHostStart = () => {
    setIsHost(true);
    setStep(1); // Go to Profile Picker
  };

  const handleGuestJoin = () => {
    setIsHost(false);
    setStep(10);
    setRoomId('');
  };

  const handleSelectProfile = (profile: PartnerProfile) => {
    setActiveProfile(profile);
    setStep(2); // Go to Venue Picker
  };

  const handleSelectVenue = (venue: VenueProfile) => {
    setActiveVenue(venue);
    setStep(3); // Go to DateConfig
  };

  const handleSkipVenue = () => {
    setActiveVenue(null);
    setStep(3);
  };

  const handleDateConfigConfirm = (config: DateConfig) => {
    setActiveDateConfig(config);
    setStep(4); // Go to Room Code
  };

  const finalize = () => {
    setIsLoading(true);

    if (isHost && activeProfile) {
      // Build hostData from HOST_PROFILE constant
      const hData = {
        name: HOST_PROFILE.name,
        age: String(HOST_PROFILE.age),
        desc: HOST_PROFILE.appearance,
        appearance: HOST_PROFILE.appearance,
        sex: HOST_PROFILE.sex,
      };

      // Build partner (guest) data from active profile
      const profile = activeProfile;
      const partnerBackground = [
        profile.job,
        profile.interests.length > 0 ? `Interests: ${profile.interests.join(', ')}` : null,
        profile.personalityTraits.length > 0 ? `Personality: ${profile.personalityTraits.join(', ')}` : null,
        profile.aspiration ? `Aspiration: ${profile.aspiration}` : null,
      ].filter(Boolean).join('. ');

      const gData = {
        name: profile.name,
        age: profile.aiEstimatedAge || 'Unknown',
        desc: partnerBackground || "An intriguing guest.",
        appearance: profile.aiAppearance || '',
        sex: profile.aiGender || 'Unknown',
      };

      // Derive location + vibe from venue + config
      let locationData: DateLocation | null = null;
      let vibeData: DateVibe | null = null;

      if (activeVenue && activeDateConfig) {
        const selectedVibes = activeDateConfig.vibes
          .map(id => DATE_VIBES.find(v => v.id === id))
          .filter((v): v is DateVibe => v !== undefined);
        locationData = venueToDateLocation(activeVenue, selectedVibes);
        vibeData = selectedVibes[0] || null;
      }

      const finalRoomId = roomId.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();

      setTimeout(() => {
        onStart(
          hData,
          gData,
          vibeData,
          locationData,
          finalRoomId,
          true,
          HOST_PROFILE.avatarPath || undefined,
          profile.photo || undefined,
          [],
          profile.aiTraits
        );
      }, 500);
    } else {
      // Guest flow
      const gData = {
        name: guestName || "Guest",
        age: "Unknown",
        desc: "Connecting...",
        sex: "Neutral",
        traits: [],
      };
      const finalRoomId = roomId.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();

      setTimeout(() => {
        onStart(null, gData, null, null, finalRoomId, false, undefined, undefined, [], []);
      }, 500);
    }
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    alert("Link copied! Send it to your date.");
  };

  const dateNumber = useMemo(() => activeProfile ? getDateNumber(activeProfile.id) : 1, [activeProfile]);

  return (
    <div className="w-full max-w-sm flex flex-col items-center min-h-[50vh] justify-center relative z-20">
      <AnimatePresence mode="wait">

        {/* Intro */}
        {step === 0 && (
          <motion.div key="intro" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
            <IntroStep handleHostStart={handleHostStart} handleGuestJoin={handleGuestJoin} handleManage={handleManage} />
          </motion.div>
        )}

        {/* Host: Profile Picker */}
        {step === 1 && (
          <motion.div key="profile-picker" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setStep(0)} className="text-[9px] uppercase tracking-widest text-white/30 hover:text-white transition-colors">← Back</button>
                <h2 className="text-xl font-serif italic text-white">Who's Tonight?</h2>
                <div className="w-12" />
              </div>

              {profiles.length > 0 && (
                <div className="flex flex-col gap-3">
                  {profiles.map(p => (
                    <ProfileCard
                      key={p.id}
                      profile={p}
                      onClick={() => handleSelectProfile(p)}
                      onDelete={() => {
                        deleteProfile(p.id);
                        setProfiles(getProfiles());
                      }}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={() => { setEditingProfile(undefined); editorReturnRef.current = 1; setStep(11); }}
                className="w-full p-5 rounded-2xl border-2 border-dashed border-white/10 hover:border-rose-500/50 hover:bg-white/5 transition-all text-center group"
              >
                <span className="text-2xl block mb-2 opacity-30 group-hover:opacity-100 transition-opacity">+</span>
                <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40 group-hover:text-white/80 transition-colors">New Profile</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Host: Venue Picker */}
        {step === 2 && (
          <motion.div key="venue-picker" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setStep(1)} className="text-[9px] uppercase tracking-widest text-white/30 hover:text-white transition-colors">← Back</button>
                <h2 className="text-xl font-serif italic text-white">Where Tonight?</h2>
                <div className="w-12" />
              </div>

              {venues.length > 0 && (
                <div className="flex flex-col gap-3">
                  {venues.map(v => (
                    <VenueCard
                      key={v.id}
                      venue={v}
                      onClick={() => handleSelectVenue(v)}
                      onDelete={() => {
                        deleteVenue(v.id);
                        setVenues(getVenues());
                      }}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={() => { setEditingVenue(undefined); editorReturnRef.current = 2; setStep(12); }}
                className="w-full p-5 rounded-2xl border-2 border-dashed border-white/10 hover:border-rose-500/50 hover:bg-white/5 transition-all text-center group"
              >
                <span className="text-2xl block mb-2 opacity-30 group-hover:opacity-100 transition-opacity">+</span>
                <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40 group-hover:text-white/80 transition-colors">New Venue</span>
              </button>

              <button
                onClick={handleSkipVenue}
                className="text-[9px] text-white/20 uppercase tracking-widest hover:text-white transition-colors text-center mt-2"
              >
                Skip — Use Default Location
              </button>
            </div>
          </motion.div>
        )}

        {/* Host: Date Config */}
        {step === 3 && activeProfile && (
            <DateConfigView
              key="date-config"
              profileId={activeProfile.id}
              venueId={activeVenue?.id || null}
              dateNumber={dateNumber}
              onConfirm={handleDateConfigConfirm}
              onBack={() => setStep(2)}
            />
        )}

        {/* Host: Room Code / QR */}
        {step === 4 && (
          <motion.div key="final" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full text-center">
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-rose-500 mb-6 block">Secure Channel Open</span>
            <div onClick={copyInviteLink} className="p-8 bg-white/5 border border-white/10 rounded-[32px] mb-4 cursor-pointer hover:bg-white/10 transition-colors group">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Access Code</p>
              <h1 className="text-5xl font-mono text-white tracking-widest">{roomId}</h1>
              <span className="text-[9px] text-rose-400 mt-4 block opacity-50 group-hover:opacity-100 transition-opacity">Tap to Copy Invite Link</span>
            </div>
            <div className="mb-8 flex flex-col items-center">
              <div className="p-4 bg-white rounded-2xl">
                <QRCodeSVG value={`${window.location.origin}?room=${roomId}`} size={160} bgColor="#ffffff" fgColor="#020617" level="M" />
              </div>
              <span className="text-[9px] text-white/30 uppercase tracking-widest mt-3">Scan to join</span>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin"/>
                <span className="text-[9px] uppercase tracking-widest text-white/30">Encrypting connection...</span>
              </div>
            ) : (
              <button onClick={finalize} className="w-full py-5 bg-white rounded-full text-[11px] uppercase tracking-[0.4em] font-black text-black hover:bg-white/90 shadow-xl transition-all">
                Enter Room
              </button>
            )}
          </motion.div>
        )}

        {/* GUEST FLOW — Enter code and connect immediately */}
        {step === 10 && (
          <motion.div key="guest-join" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
            {isAutoJoin ? (
              <div className="flex flex-col items-center gap-6 pt-16">
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-white/10 rounded-full" />
                  <div className="absolute inset-0 border-t-2 border-rose-500 rounded-full animate-spin" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-serif text-white">Joining</h3>
                  <p className="text-[10px] uppercase tracking-widest text-rose-500/80 font-black mt-2">Room {roomId}</p>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-serif italic text-white text-center mb-8">Join Experience</h2>
                <input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  autoFocus
                  className="w-full bg-transparent border-b border-white/20 p-4 text-center text-4xl font-mono tracking-widest focus:outline-none focus:border-rose-500 transition-colors placeholder:text-white/10 mb-8"
                />

                {isLoading ? (
                  <div className="flex flex-col items-center gap-4 mt-8">
                    <div className="w-8 h-8 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin"/>
                    <span className="text-[9px] uppercase tracking-widest text-white/30">Dialing Host...</span>
                  </div>
                ) : (
                  <button
                    disabled={roomId.length < 3}
                    onClick={finalize}
                    className="w-full py-4 bg-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] font-black hover:bg-white/20 disabled:opacity-20 transition-all"
                  >
                    Connect
                  </button>
                )}

                {!isLoading && (
                  <button onClick={() => setStep(0)} className="mt-6 text-[9px] text-white/20 uppercase tracking-widest w-full hover:text-white">Cancel</button>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Profile Editor Overlay */}
        {step === 11 && (
            <ProfileEditorView
              key="profile-editor"
              profile={editingProfile}
              onSave={() => {
                setProfiles(getProfiles());
                setStep(editorReturnRef.current);
              }}
              onCancel={() => setStep(editorReturnRef.current)}
            />
        )}

        {/* Venue Editor Overlay */}
        {step === 12 && (
            <VenueEditorView
              key="venue-editor"
              venue={editingVenue}
              onSave={() => {
                setVenues(getVenues());
                setStep(editorReturnRef.current);
              }}
              onCancel={() => setStep(editorReturnRef.current)}
            />
        )}

        {/* Manage Profiles & Venues */}
        {step === 20 && (
          <motion.div key="manage" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setStep(0)} className="text-[9px] uppercase tracking-widest text-white/30 hover:text-white transition-colors">← Back</button>
                <h2 className="text-xl font-serif italic text-white">Dossiers</h2>
                <div className="w-12" />
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setManageTab('profiles')}
                  className={`flex-1 py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] font-black transition-all ${manageTab === 'profiles' ? 'bg-rose-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  Profiles
                </button>
                <button
                  onClick={() => setManageTab('venues')}
                  className={`flex-1 py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] font-black transition-all ${manageTab === 'venues' ? 'bg-rose-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  Venues
                </button>
              </div>

              {/* Profiles Tab */}
              {manageTab === 'profiles' && (
                <div className="flex flex-col gap-3">
                  {profiles.map(p => (
                    <ProfileCard
                      key={p.id}
                      profile={p}
                      onClick={() => { setEditingProfile(p); editorReturnRef.current = 20; setStep(11); }}
                      onDelete={() => {
                        deleteProfile(p.id);
                        setProfiles(getProfiles());
                      }}
                    />
                  ))}
                  <button
                    onClick={() => { setEditingProfile(undefined); editorReturnRef.current = 20; setStep(11); }}
                    className="w-full p-5 rounded-2xl border-2 border-dashed border-white/10 hover:border-rose-500/50 hover:bg-white/5 transition-all text-center group"
                  >
                    <span className="text-2xl block mb-2 opacity-30 group-hover:opacity-100 transition-opacity">+</span>
                    <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40 group-hover:text-white/80 transition-colors">New Profile</span>
                  </button>
                </div>
              )}

              {/* Venues Tab */}
              {manageTab === 'venues' && (
                <div className="flex flex-col gap-3">
                  {venues.map(v => (
                    <VenueCard
                      key={v.id}
                      venue={v}
                      onClick={() => { setEditingVenue(v); editorReturnRef.current = 20; setStep(12); }}
                      onDelete={() => {
                        deleteVenue(v.id);
                        setVenues(getVenues());
                      }}
                    />
                  ))}
                  <button
                    onClick={() => { setEditingVenue(undefined); editorReturnRef.current = 20; setStep(12); }}
                    className="w-full p-5 rounded-2xl border-2 border-dashed border-white/10 hover:border-rose-500/50 hover:bg-white/5 transition-all text-center group"
                  >
                    <span className="text-2xl block mb-2 opacity-30 group-hover:opacity-100 transition-opacity">+</span>
                    <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40 group-hover:text-white/80 transition-colors">New Venue</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
