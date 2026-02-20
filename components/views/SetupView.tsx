
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_VARIANTS, DATE_VIBES, DATE_LOCATIONS } from '../../constants';
import { DateLocation, DateVibe } from '../../types';
import { CameraModal } from '../CameraModal';
import { analyzeUserPhotoForAvatar, generateAbstractAvatar } from '../../services/geminiService';
import { compressImage } from '../../utils/helpers';

interface SetupViewProps {
  onStart: (hostData: any, guestData: any, vibe: DateVibe | null, location: DateLocation | null, roomId: string, isHost: boolean, avatar?: string, partnerAvatar?: string, hostTraits?: string[], partnerTraits?: string[]) => void;
}

export const SetupView: React.FC<SetupViewProps> = ({ onStart }) => {
  const [step, setStep] = useState<number>(0); // 0=Intro, 1=HostDossier, 2=PartnerDossier, 3=Config, 4=Final
  const [isHost, setIsHost] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [isAutoJoin, setIsAutoJoin] = useState(false);
  
  // Host Data
  const [hostName, setHostName] = useState('');
  const [hostDesc, setHostDesc] = useState('');
  // Hidden state for API consistency, auto-filled by AI
  const [hostAge, setHostAge] = useState('30');
  const [hostGender, setHostGender] = useState('Unknown');
  const [hostTraits, setHostTraits] = useState<string[]>([]);
  const [hostAppearance, setHostAppearance] = useState(''); // AI visual description from photo scan

  // Partner (Target) Data (Defined by Host)
  const [partnerName, setPartnerName] = useState('');
  const [partnerDesc, setPartnerDesc] = useState('');
  // Hidden state
  const [partnerAge, setPartnerAge] = useState('30');
  const [partnerGender, setPartnerGender] = useState('Unknown');
  const [partnerTraits, setPartnerTraits] = useState<string[]>([]);
  const [partnerAppearance, setPartnerAppearance] = useState(''); // AI visual description

  // Guest Self Data
  const [guestName, setGuestName] = useState('');
  const [guestDesc, setGuestDesc] = useState('');
  const [guestAge, setGuestAge] = useState('30');
  const [guestGender, setGuestGender] = useState('Unknown');
  const [guestTraits, setGuestTraits] = useState<string[]>([]);
  const [guestAppearance, setGuestAppearance] = useState('');

  // Avatars
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [partnerAvatarImage, setPartnerAvatarImage] = useState<string | null>(null);
  const [guestAvatarImage, setGuestAvatarImage] = useState<string | null>(null);
  
  const [showCamera, setShowCamera] = useState(false);
  const [activeCameraTarget, setActiveCameraTarget] = useState<'self' | 'partner' | 'guest'>('self');

  // File Input Refs
  const selfFileInputRef = useRef<HTMLInputElement>(null);
  const partnerFileInputRef = useRef<HTMLInputElement>(null);
  const guestFileInputRef = useRef<HTMLInputElement>(null);

  // Date Settings
  const [selectedLocation, setSelectedLocation] = useState<DateLocation | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<DateVibe | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const autoJoinFired = useRef(false);

  useEffect(() => {
    // Check for Magic Link
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');

    if (urlRoom) {
        setRoomId(urlRoom);
        setIsHost(false);
        setIsAutoJoin(true);
        setIsLoading(true); // Show spinner immediately
        setStep(10);
        // Guard against React Strict Mode double-fire
        if (autoJoinFired.current) return;
        autoJoinFired.current = true;
        // Defer finalize to next tick so state is set
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
        const suffix = Math.floor(Math.random() * 90 + 10); // 10-99
        setRoomId(`${base}${suffix}`);
    }
  }, []);

  const handleHostStart = () => {
    setIsHost(true);
    setStep(1); // Go to Host Dossier
  };

  const handleGuestJoin = () => {
    setIsHost(false);
    setStep(10); // Jump to Guest Join Screen
    setRoomId(''); 
  };

  const finalize = () => {
    setIsLoading(true);
    
    const hData = isHost ? {
        name: hostName,
        age: hostAge,
        desc: hostDesc || "A mysterious figure.",
        appearance: hostAppearance, // AI visual description from photo (for avatar regen)
        sex: hostGender
    } : null;

    const gData = isHost
        ? {
            name: partnerName || "The Guest",
            age: partnerAge,
            desc: partnerDesc || "An intriguing guest.",
            appearance: partnerAppearance,
            sex: partnerGender
          }
        : {
            name: guestName || "Guest",
            age: guestAge,
            desc: guestDesc || "Connecting...",
            appearance: guestAppearance,
            sex: guestGender,
            traits: guestTraits
          };
    
    const finalRoomId = roomId.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const finalHostAvatar = avatarImage || undefined;
    const finalPartnerAvatar = partnerAvatarImage || undefined;
    const finalGuestAvatar = guestAvatarImage || undefined;

    // For Guest, we send their avatar as 'initialAvatar'
    const myAvatar = isHost ? finalHostAvatar : finalGuestAvatar;

    setTimeout(() => {
        onStart(
            hData, 
            gData, 
            selectedVibe, 
            selectedLocation, 
            finalRoomId, 
            isHost, 
            myAvatar, 
            finalPartnerAvatar,
            hostTraits,
            partnerTraits
        );
    }, 500);
  };

  const processAndGeneratePersona = async (base64Input: string, target: 'self' | 'partner' | 'guest') => {
      setIsProcessingImage(true);
      try {
          const base64 = base64Input.includes(',') ? base64Input.split(',')[1] : base64Input;
          
          // 1. Analyze Photo with Gemini
          const { appearance, traits, estimatedAge, gender } = await analyzeUserPhotoForAvatar(base64);
          
          // 2. Generate Abstract Avatar
          let generatedAvatarUrl = await generateAbstractAvatar(traits, 15, appearance);
          if (!generatedAvatarUrl) {
               generatedAvatarUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop";
          }
          
          // Store avatar + hidden AI metadata (age, gender, appearance, traits for avatar regen).
          // Do NOT auto-fill the description textarea — user fills in background/career/interests manually.
          // Traits are stored internally for avatar generation but NOT shown on persona card UI.

          if (target === 'self') {
              setAvatarImage(generatedAvatarUrl);
              setHostAge(estimatedAge);
              setHostGender(gender);
              setHostAppearance(appearance);
              setHostTraits(traits);
          } else if (target === 'partner') {
              setPartnerAvatarImage(generatedAvatarUrl);
              setPartnerAge(estimatedAge);
              setPartnerGender(gender);
              setPartnerAppearance(appearance);
              setPartnerTraits(traits);
          } else if (target === 'guest') {
              setGuestAvatarImage(generatedAvatarUrl);
              setGuestAge(estimatedAge);
              setGuestGender(gender);
              setGuestAppearance(appearance);
              setGuestTraits(traits);
          }
      } catch (e) {
          console.error("Persona Gen Failed", e);
      } finally {
          setIsProcessingImage(false);
      }
  };

  const handleCameraCapture = async (base64: string) => {
      const compressed = await compressImage(`data:image/jpeg;base64,${base64}`);
      await processAndGeneratePersona(compressed, activeCameraTarget);
      setShowCamera(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'self' | 'partner' | 'guest') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const result = reader.result as string;
              const compressed = await compressImage(result, 0.7, 600);
              await processAndGeneratePersona(compressed, target);
          };
          reader.readAsDataURL(file);
      }
  };

  const copyInviteLink = () => {
      const url = `${window.location.origin}?room=${roomId}`;
      navigator.clipboard.writeText(url);
      alert("Link copied! Send it to your date.");
  };

  const renderIntro = () => (
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
    </div>
  );

  const renderIdentityForm = (
      title: string, 
      name: string, setName: (v: string) => void,
      desc: string, setDesc: (v: string) => void,
      onNext: () => void,
      avatarTarget: 'self' | 'partner' | 'guest'
  ) => {
    let currentAvatar;
    if (avatarTarget === 'self') currentAvatar = avatarImage;
    else if (avatarTarget === 'partner') currentAvatar = partnerAvatarImage;
    else currentAvatar = guestAvatarImage;

    let fileRef;
    if (avatarTarget === 'self') fileRef = selfFileInputRef;
    else if (avatarTarget === 'partner') fileRef = partnerFileInputRef;
    else fileRef = guestFileInputRef;

    const canUseCamera = (isHost && avatarTarget === 'self') || (!isHost && avatarTarget === 'guest');
    
    return (
        <div className="w-full flex flex-col gap-6">
            <h2 className="text-2xl font-serif italic text-white text-center">{title}</h2>
            
            <div className="flex flex-col items-center gap-6">
                <div 
                    className="relative group cursor-pointer" 
                    onClick={() => { 
                        if (canUseCamera) {
                            setActiveCameraTarget(avatarTarget); 
                            setShowCamera(true); 
                        } else {
                            fileRef.current?.click();
                        }
                    }}
                >
                    <div className="w-32 h-32 rounded-full border-2 border-white/10 bg-white/5 overflow-hidden flex items-center justify-center hover:border-rose-500 transition-colors relative shadow-2xl">
                        {isProcessingImage && (
                             <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center gap-2">
                                 <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"/>
                                 <span className="text-[8px] uppercase tracking-widest text-rose-500 animate-pulse">Scanning...</span>
                             </div>
                        )}
                        {currentAvatar ? (
                            <img src={currentAvatar} className="w-full h-full object-cover" alt="Avatar" />
                        ) : (
                            <div className="flex flex-col items-center opacity-30 group-hover:opacity-100 transition-opacity">
                                <span className="text-4xl mb-2">{canUseCamera ? '📷' : '📁'}</span>
                                <span className="text-[8px] uppercase tracking-widest">Add Photo</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 w-full justify-center">
                    {canUseCamera && (
                        <button 
                            onClick={() => { setActiveCameraTarget(avatarTarget); setShowCamera(true); }}
                            className="text-[9px] uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-colors"
                        >
                            Open Camera
                        </button>
                    )}
                    <button 
                        onClick={() => fileRef.current?.click()}
                        className={`text-[9px] uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-colors ${!canUseCamera ? 'min-w-[100px]' : ''}`}
                    >
                        Upload Photo
                    </button>
                </div>

                <input 
                    type="file" 
                    ref={fileRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, avatarTarget)}
                />
            </div>

            <div className="space-y-4 px-2">
                <input 
                    value={name} onChange={e => setName(e.target.value)} autoFocus={avatarTarget !== 'partner'}
                    placeholder="Enter Name" className="w-full bg-transparent border-b border-white/20 p-2 text-center text-3xl font-serif focus:outline-none focus:border-rose-500 transition-colors placeholder:text-white/10"
                />
                
                <div className="relative">
                    <span className="text-[9px] text-rose-500 uppercase tracking-widest font-black block mb-2">Background</span>
                    <textarea
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder="Career, interests, what they're into... (helps personalize questions)"
                        className="w-full bg-white/5 rounded-2xl border border-white/10 p-4 text-sm font-sans text-white/80 focus:outline-none focus:border-rose-500 transition-colors min-h-[120px] resize-none"
                    />
                </div>
            </div>

            <button 
                disabled={!name || isProcessingImage || !currentAvatar}
                onClick={onNext}
                className="mt-4 w-full py-4 bg-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] font-black hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
                Confirm Identity
            </button>
            
            {avatarTarget === 'guest' && (
                <button 
                    onClick={finalize}
                    className="text-[9px] text-white/20 uppercase tracking-widest hover:text-white transition-colors"
                >
                    Skip (Use Host's Invite)
                </button>
            )}
        </div>
    );
  };

  const renderConfig = () => (
    <div className="w-full flex flex-col gap-6 relative z-10">
       <h2 className="text-2xl font-serif italic text-white text-center mb-2">Set the Scene</h2>

       {/* LOCATION PICKER */}
       {!selectedLocation ? (
         <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="text-[10px] uppercase tracking-widest text-white/40 text-center mb-2">Select Location</span>
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {DATE_LOCATIONS.map(loc => (
                    <button 
                        key={loc.id}
                        onClick={() => setSelectedLocation(loc)}
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left flex items-center gap-4 group"
                    >
                        <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                             {loc.icon === 'sax' ? '🎷' : loc.icon === 'city' ? '🌃' : loc.icon === 'book' ? '📚' : loc.icon === 'wave' ? '🌊' : '🚘'}
                        </div>
                        <div>
                            <span className="text-white font-serif text-lg">{loc.title}</span>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">{loc.description.split(',')[0]}</p>
                        </div>
                    </button>
                ))}
            </div>
         </div>
       ) : (
         <button 
            onClick={() => { setSelectedLocation(null); setSelectedVibe(null); }}
            className="w-full p-4 rounded-2xl bg-rose-900/40 border border-rose-500/30 flex items-center justify-between group shadow-xl backdrop-blur-md"
         >
            <div className="flex items-center gap-4">
                <span className="text-2xl">{selectedLocation.icon === 'sax' ? '🎷' : selectedLocation.icon === 'city' ? '🌃' : selectedLocation.icon === 'book' ? '📚' : selectedLocation.icon === 'wave' ? '🌊' : '🚘'}</span>
                <div className="text-left">
                    <span className="text-[9px] uppercase tracking-widest text-rose-400 font-black">Location</span>
                    <div className="text-white font-serif">{selectedLocation.title}</div>
                </div>
            </div>
            <span className="text-xs text-white/30 group-hover:text-white uppercase tracking-wider font-bold">Change</span>
         </button>
       )}

       {/* VIBE PICKER */}
       {selectedLocation && !selectedVibe && (
         <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="w-px h-8 bg-white/10 mx-auto my-2" />
             <span className="text-[10px] uppercase tracking-widest text-white/40 text-center mb-2">Select Vibe</span>
             <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {DATE_VIBES.map(vibe => (
                    <button 
                        key={vibe.id}
                        onClick={() => setSelectedVibe(vibe)}
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left flex items-center gap-4 group"
                    >
                        <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                             {vibe.icon}
                        </div>
                        <div>
                            <span className="text-white font-serif">{vibe.title}</span>
                             <p className="text-[10px] text-white/40 uppercase tracking-wider">{vibe.description}</p>
                        </div>
                    </button>
                ))}
             </div>
         </div>
       )}

       {/* START BUTTON */}
       {selectedLocation && selectedVibe && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
              <button 
                onClick={() => setStep(4)}
                className="w-full py-5 bg-rose-600 rounded-full text-[11px] uppercase tracking-[0.4em] font-black text-white hover:bg-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all"
              >
                  Initiate Sequence
              </button>
           </div>
       )}
    </div>
  );

  return (
    <div className="w-full max-w-sm flex flex-col items-center min-h-[50vh] justify-center relative z-20">
      <AnimatePresence mode="wait">
        
        {/* Intro */}
        {step === 0 && (
          <motion.div key="intro" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
            {renderIntro()}
          </motion.div>
        )}

        {/* Host: Self Identity */}
        {step === 1 && (
           <motion.div key="host-self" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
                {renderIdentityForm("Your Identity", hostName, setHostName, hostDesc, setHostDesc, () => setStep(2), "self")}
           </motion.div>
        )}

        {/* Host: Partner Identity */}
        {step === 2 && (
           <motion.div key="host-partner" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
                {renderIdentityForm("Partner Dossier", partnerName, setPartnerName, partnerDesc, setPartnerDesc, () => setStep(3), "partner")}
           </motion.div>
        )}

        {/* Host: Config */}
        {step === 3 && (
            <motion.div key="config" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full">
                {renderConfig()}
            </motion.div>
        )}

        {/* Host: Finalize (Room Code) */}
        {step === 4 && (
            <motion.div key="final" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="w-full text-center">
                <span className="text-[10px] uppercase tracking-[0.4em] font-black text-rose-500 mb-6 block">Secure Channel Open</span>
                <div onClick={copyInviteLink} className="p-8 bg-white/5 border border-white/10 rounded-[32px] mb-8 cursor-pointer hover:bg-white/10 transition-colors group">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Access Code</p>
                    <h1 className="text-5xl font-mono text-white tracking-widest">{roomId}</h1>
                    <span className="text-[9px] text-rose-400 mt-4 block opacity-50 group-hover:opacity-100 transition-opacity">Tap to Copy Invite Link</span>
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
                    /* Magic link auto-join: clean spinner, no input needed */
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
                    /* Manual guest join: code input + connect button */
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
      </AnimatePresence>

      <CameraModal 
        isOpen={showCamera} 
        onClose={() => setShowCamera(false)} 
        onCapture={handleCameraCapture} 
        instruction="Capture Identity" 
      />
    </div>
  );
};
