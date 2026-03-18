
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { PAGE_VARIANTS, DATE_VIBES, DATE_LOCATIONS, HOST_PROFILE, LOCATION_ICONS } from '../../constants';
import { DateLocation, DateVibe } from '../../types';
import { PastDates } from '../PastDates';
import { ProfileCard } from '../ProfileCard';
import { VenueCard } from '../VenueCard';
import { ProfileEditorView } from './ProfileEditorView';
import { VenueEditorView } from './VenueEditorView';
import { DateConfigView } from './DateConfigView';
import { getProfiles, deleteProfile, getVenues, deleteVenue, getLastSetup, saveLastSetup } from '../../utils/profileStorage';
import { venueToDateLocation } from '../../utils/venueToLocation';
import { useProfileStore } from '../../store/profileStore';
import type { PartnerProfile, VenueProfile, DateConfig } from '../../types/profiles';
import { getDateNumber } from '../../utils/dateHistory';

interface SetupViewProps {
  onStart: (hostData: any, guestData: any, vibe: DateVibe | null, location: DateLocation | null, roomId: string, isHost: boolean, avatar?: string, partnerAvatar?: string, hostTraits?: string[], partnerTraits?: string[]) => void;
}

const generateRoomId = (): string => {
  const ROOM_CODES = [
    'NOIR', 'LUNA', 'SILK', 'JAZZ', 'WINE', 'DEEP', 'DARK', 'SOUL',
    'HAZE', 'GLOW', 'MIST', 'RAIN', 'FIRE', 'KISS', 'REAL', 'WANT'
  ];
  const base = ROOM_CODES[Math.floor(Math.random() * ROOM_CODES.length)];
  const suffix = Math.floor(Math.random() * 90 + 10);
  return `${base}${suffix}`;
};

const buildDefaultConfig = (profileId: string, venueId: string | null, dateNumber: number): DateConfig => ({
  profileId,
  venueId,
  dateNumber,
  dateArc: 'ai_reads_room',
  specialOccasion: null,
  comfortLevel: 'can_go_there',
  topicsToAvoid: [],
  vibes: ['noir'],
  aboutYouForHer: null,
  preDateIntel: null,
  notesForTonight: null,
});

export const SetupView: React.FC<SetupViewProps> = ({ onStart }) => {
  // Step 0=Intro, 1=QuickLaunch, 2=VenuePicker, 3=DateConfig, 4=RoomCode
  // Step 5=ProfilePicker (full), 10=Guest join
  // Step 11=ProfileEditor overlay, 12=VenueEditor overlay
  // Step 20=Manage hub (profiles & venues)
  const [step, setStep] = useState<number>(0);
  const [manageTab, setManageTab] = useState<'profiles' | 'venues'>('profiles');
  const editorReturnRef = useRef<number>(1);
  const [isHost, setIsHost] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [isAutoJoin, setIsAutoJoin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const autoJoinFired = useRef(false);

  // Profile store
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

  // Premade location (when user picks a DATE_LOCATIONS entry instead of a custom venue)
  const [premadeLocation, setPremadeLocation] = useState<DateLocation | null>(null);

  // Guest data
  const [guestName, setGuestName] = useState('');

  // Load profiles and venues
  useEffect(() => {
    setProfiles(getProfiles());
    setVenues(getVenues());
  }, []);

  // Resolve last venue name for quick launch display
  const lastVenueName = useMemo(() => {
    const lastSetup = getLastSetup();
    if (!lastSetup?.venueId) return null;
    const custom = venues.find(v => v.id === lastSetup.venueId);
    if (custom) return custom.name;
    const premade = DATE_LOCATIONS.find(l => l.id === lastSetup.venueId);
    return premade?.title || null;
  }, [venues]);

  useEffect(() => {
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
      setRoomId(generateRoomId());
    }
  }, []);

  const handleManage = () => setStep(20);

  const handleHostStart = () => {
    setIsHost(true);
    // If profiles exist, go to quick launch. Otherwise, go to profile picker (which will prompt to create one).
    const currentProfiles = getProfiles();
    setProfiles(currentProfiles);
    setStep(currentProfiles.length > 0 ? 1 : 5);
  };

  const handleGuestJoin = () => {
    setIsHost(false);
    setStep(10);
    setRoomId('');
  };

  // Quick Launch: tap a profile → instant finalize
  const handleQuickLaunch = (profile: PartnerProfile) => {
    setActiveProfile(profile);

    const lastSetup = getLastSetup();
    const dateNumber = getDateNumber(profile.id);

    // Resolve venue from last setup
    let venue: VenueProfile | null = null;
    if (lastSetup?.venueId) {
      venue = venues.find(v => v.id === lastSetup.venueId) || null;
    }
    setActiveVenue(venue);

    // Build config: reuse last config if available, otherwise defaults
    let config: DateConfig;
    if (lastSetup?.config) {
      config = { ...lastSetup.config, profileId: profile.id, venueId: venue?.id || null, dateNumber };
    } else {
      config = buildDefaultConfig(profile.id, venue?.id || null, dateNumber);
    }
    setActiveDateConfig(config);

    // Finalize immediately
    finalizeWithProfile(profile, venue, config);
  };

  // Full customize flow: select profile then go through venue → config → room code
  const handleSelectProfile = (profile: PartnerProfile) => {
    setActiveProfile(profile);
    setStep(2);
  };

  const handleSelectVenue = (venue: VenueProfile) => {
    setActiveVenue(venue);
    setPremadeLocation(null);
    setStep(3);
  };

  const handleSelectPremadeLocation = (loc: DateLocation) => {
    setPremadeLocation(loc);
    setActiveVenue(null);
    setStep(3);
  };

  const handleSkipVenue = () => {
    setActiveVenue(null);
    setPremadeLocation(null);
    setStep(3);
  };

  const handleDateConfigConfirm = (config: DateConfig) => {
    setActiveDateConfig(config);
    setStep(4);
  };

  const dateNumber = useMemo(() => activeProfile ? getDateNumber(activeProfile.id) : 1, [activeProfile]);

  const inviteLink = `${window.location.origin}?room=${roomId}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert("Link copied! Send it to your date.");
  };

  const finalizeWithProfile = (profile: PartnerProfile, venue: VenueProfile | null, config: DateConfig) => {
    setIsLoading(true);

    // Save setup for next time
    saveLastSetup({ profileId: profile.id, venueId: venue?.id || null, config });

    const hData = {
      name: HOST_PROFILE.name,
      age: String(HOST_PROFILE.age),
      desc: HOST_PROFILE.appearance,
      appearance: HOST_PROFILE.appearance,
      sex: HOST_PROFILE.sex,
    };

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

    let locationData: DateLocation | null = null;
    const selectedVibes = config.vibes
      .map(id => DATE_VIBES.find(v => v.id === id))
      .filter((v): v is DateVibe => v !== undefined);
    const vibeData: DateVibe | null = selectedVibes[0] || null;

    if (premadeLocation) {
      locationData = premadeLocation;
    } else if (venue) {
      locationData = venueToDateLocation(venue, selectedVibes);
    }

    const finalRoomId = roomId.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();

    setTimeout(() => {
      onStart(
        hData, gData, vibeData, locationData, finalRoomId, true,
        HOST_PROFILE.avatarPath || undefined,
        profile.photo || undefined,
        [],
        profile.aiTraits
      );
    }, 500);
  };

  const finalize = () => {
    if (isHost && activeProfile) {
      finalizeWithProfile(activeProfile, activeVenue, activeDateConfig!);
    } else {
      // Guest flow
      setIsLoading(true);
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

  return (
    <div className="w-full max-w-sm flex flex-col items-center min-h-[50vh] justify-center relative z-20">
      <AnimatePresence mode="wait">

        {/* Intro */}
        {step === 0 && (
          <motion.div key="intro" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
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
          </motion.div>
        )}

        {/* Quick Launch — profiles + QR, one tap to go */}
        {step === 1 && (
          <motion.div key="quick-launch" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between mb-1">
                <button onClick={() => setStep(0)} className="text-[9px] uppercase tracking-widest text-white/30 hover:text-white transition-colors">← Back</button>
                <h2 className="text-xl font-serif italic text-white">Who's Tonight?</h2>
                <div className="w-12" />
              </div>

              {/* QR + Room Code — always visible */}
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="bg-white rounded-xl p-2 flex-shrink-0">
                  <QRCodeSVG value={inviteLink} size={80} bgColor="#ffffff" fgColor="#020617" level="M" />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] text-white/30 uppercase tracking-widest mb-1">Room Code</p>
                  <p className="text-2xl font-mono text-white tracking-widest">{roomId}</p>
                  <button onClick={copyInviteLink} className="text-[8px] text-rose-400/60 uppercase tracking-widest mt-1 hover:text-rose-400 transition-colors">
                    Tap to copy link
                  </button>
                </div>
              </div>

              {/* Profile cards — tap to instant launch */}
              {isLoading ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <div className="w-8 h-8 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin"/>
                  <span className="text-[9px] uppercase tracking-widest text-white/30">Encrypting connection...</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleQuickLaunch(p)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-rose-950/20 hover:border-rose-500/20 transition-all text-left group active:scale-[0.98]"
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/10 group-hover:border-rose-500/40 transition-colors">
                          {p.photo ? (
                            <img src={p.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center text-xl text-white/30">
                              {p.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-serif text-lg group-hover:text-rose-200 transition-colors">{p.name}</p>
                          <p className="text-[9px] text-white/30 uppercase tracking-widest truncate">
                            {[p.job, p.aiEstimatedAge, lastVenueName].filter(Boolean).join(' · ') || 'Tap to begin'}
                          </p>
                        </div>
                        <span className="text-rose-500/50 group-hover:text-rose-400 text-xl transition-colors">→</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => { setEditingProfile(undefined); editorReturnRef.current = 1; setStep(11); }}
                    className="w-full p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-rose-500/50 hover:bg-white/5 transition-all text-center group"
                  >
                    <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/30 group-hover:text-white/70 transition-colors">+ New Profile</span>
                  </button>

                  {/* Customize link for full flow */}
                  <button
                    onClick={() => setStep(5)}
                    className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-black hover:text-white/50 transition-colors text-center py-2"
                  >
                    Customize venue & config
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Full Flow: Profile Picker */}
        {step === 5 && (
          <motion.div key="profile-picker" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setStep(1)} className="text-[9px] uppercase tracking-widest text-white/30 hover:text-white transition-colors">← Back</button>
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
                onClick={() => { setEditingProfile(undefined); editorReturnRef.current = 5; setStep(11); }}
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
                <button onClick={() => setStep(5)} className="text-[9px] uppercase tracking-widest text-white/30 hover:text-white transition-colors">← Back</button>
                <h2 className="text-xl font-serif italic text-white">Where Tonight?</h2>
                <div className="w-12" />
              </div>

              {/* Premade locations */}
              <div className="flex flex-col gap-3">
                {DATE_LOCATIONS.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectPremadeLocation(loc)}
                    className="relative w-full p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all text-left flex items-center gap-4 group overflow-hidden"
                  >
                    <img src={loc.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 blur-[2px] group-hover:opacity-25 transition-opacity" />
                    <div className="relative w-12 h-12 rounded-full bg-black/40 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      {LOCATION_ICONS[loc.icon] || '📍'}
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <span className="text-white font-serif text-lg truncate block">{loc.title}</span>
                      <span className="text-[9px] text-white/30 truncate block">{loc.description}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom venues */}
              {venues.length > 0 && (
                <>
                  <p className="text-[8px] uppercase tracking-[0.3em] text-white/20 font-black mt-2">Your Venues</p>
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
                </>
              )}

              <button
                onClick={() => { setEditingVenue(undefined); editorReturnRef.current = 2; setStep(12); }}
                className="w-full p-5 rounded-2xl border-2 border-dashed border-white/10 hover:border-rose-500/50 hover:bg-white/5 transition-all text-center group"
              >
                <span className="text-2xl block mb-2 opacity-30 group-hover:opacity-100 transition-opacity">+</span>
                <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40 group-hover:text-white/80 transition-colors">Add Venue</span>
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

        {/* Host: Room Code / QR (full flow) */}
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
                <QRCodeSVG value={inviteLink} size={160} bgColor="#ffffff" fgColor="#020617" level="M" />
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

        {/* GUEST FLOW */}
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
