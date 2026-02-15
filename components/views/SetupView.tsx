
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { PAGE_VARIANTS, DATE_VIBES, DATE_LOCATIONS } from '../../constants';
import { DateLocation, DateVibe } from '../../types';

interface SetupViewProps {
  onStart: (hostData: any, guestData: any, vibe: DateVibe | null, location: DateLocation | null, roomId: string, isHost: boolean) => void;
}

export const SetupView: React.FC<SetupViewProps> = ({ onStart }) => {
  const [step, setStep] = useState<number>(0); // 0=Intro, 1=Host, 2=GuestProfile, 3=Location, 4=Vibe, 5=Code
  const [isHost, setIsHost] = useState(false);
  const [roomId, setRoomId] = useState('');
  
  // Host Data (Man)
  const [hostName, setHostName] = useState('');
  const [hostAge, setHostAge] = useState('');
  const [hostDesc, setHostDesc] = useState('');

  // Guest Data (Woman - defined by Host)
  const [guestName, setGuestName] = useState('');
  const [guestAge, setGuestAge] = useState('');
  const [guestDesc, setGuestDesc] = useState('');

  // Join Data (Guest entering)
  const [joinName, setJoinName] = useState('');

  // Date Settings
  const [selectedLocation, setSelectedLocation] = useState<DateLocation | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<DateVibe | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!roomId) {
        const ROOM_CODES = [
            'NOIR', 'LUNA', 'SILK', 'JAZZ', 'WINE', 'DEEP', 'DARK', 'SOUL', 
            'HAZE', 'GLOW', 'MIST', 'RAIN', 'FIRE', 'KISS', 'REAL', 'WANT', 
            'SLOW', 'SOFT', 'BLUE', 'GOLD', 'LATE', 'ECHO', 'VIBE', 'MUSE'
        ];
        setRoomId(ROOM_CODES[Math.floor(Math.random() * ROOM_CODES.length)]);
    }
  }, []);

  const handleHostStart = () => {
    setIsHost(true);
    setStep(1);
  };

  const handleGuestJoin = () => {
    setIsHost(false);
    setStep(10); // Jump to Guest Join Screen
    setRoomId(''); // Clear the pre-generated code for guest so they can type
  };

  const finalize = () => {
    setIsLoading(true);
    
    // Normalize data structures for onStart
    const hData = isHost ? { name: hostName, age: hostAge, desc: hostDesc, sex: 'Man' } : null;
    const gData = isHost ? { name: guestName, age: guestAge, desc: guestDesc, sex: 'Woman' } : { name: joinName, sex: 'Woman' };
    
    // For Guest joining, we pass nulls for context/partner info as they will sync it
    const finalRoomId = isHost ? roomId : roomId.toUpperCase();

    setTimeout(() => {
        onStart(hData, gData, selectedVibe, selectedLocation, finalRoomId, isHost);
    }, 500);
  };

  // --- Step Components ---

  const renderIntro = () => (
    <div className="flex flex-col items-center gap-8 w-full">
        <h1 className="text-6xl font-serif text-white tracking-tighter mb-4">Tonight</h1>
        <button onClick={handleHostStart} className="w-full p-6 bg-rose-600 rounded-[32px] border border-rose-500/30 hover:bg-rose-500 transition-all text-left group relative overflow-hidden">
            <span className="relative z-10 text-[10px] uppercase tracking-[0.4em] font-black text-white/80 block mb-2">I am the Architect</span>
            <span className="relative z-10 text-2xl font-serif italic text-white">Design the Date</span>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-4xl opacity-50 group-hover:scale-110 transition-transform">🍷</div>
        </button>
        <button onClick={handleGuestJoin} className="w-full p-6 bg-white/5 rounded-[32px] border border-white/10 hover:bg-white/10 transition-all text-left group">
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-white/40 block mb-2">I have an Invite</span>
            <span className="text-2xl font-serif italic text-white/80">Join the Night</span>
            <div className="ml-auto float-right -mt-6 text-3xl opacity-30 group-hover:opacity-100 transition-opacity">🗝️</div>
        </button>
    </div>
  );

  const renderHostInfo = () => (
    <div className="w-full flex flex-col gap-6">
        <h2 className="text-2xl font-serif italic text-white text-center">Your Profile</h2>
        <input 
            value={hostName} onChange={e => setHostName(e.target.value)}
            placeholder="Name" className="w-full bg-white/5 border-b border-white/10 p-4 text-center text-xl font-serif focus:outline-none focus:border-rose-500 transition-colors"
        />
        <input 
            type="number" value={hostAge} onChange={e => setHostAge(e.target.value)}
            placeholder="Age" className="w-full bg-white/5 border-b border-white/10 p-4 text-center text-xl font-serif focus:outline-none focus:border-rose-500 transition-colors"
        />
        <textarea 
            value={hostDesc} onChange={e => setHostDesc(e.target.value)}
            placeholder="Description (e.g. Tall, tuxedo, stoic)" 
            className="w-full bg-white/5 rounded-2xl p-4 text-sm font-serif min-h-[100px] focus:outline-none focus:border-rose-500 transition-colors"
        />
        <button 
            disabled={!hostName || !hostAge || !hostDesc}
            onClick={() => setStep(2)}
            className="mt-4 w-full py-4 bg-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] font-black hover:bg-white/20 disabled:opacity-20"
        >
            Next: The Muse
        </button>
    </div>
  );

  const renderGuestInfo = () => (
    <div className="w-full flex flex-col gap-6">
        <h2 className="text-2xl font-serif italic text-white text-center">Her Profile</h2>
        <p className="text-[10px] text-white/30 text-center uppercase tracking-widest -mt-4 mb-2">How do you perceive her?</p>
        <input 
            value={guestName} onChange={e => setGuestName(e.target.value)}
            placeholder="Name" className="w-full bg-white/5 border-b border-white/10 p-4 text-center text-xl font-serif focus:outline-none focus:border-rose-500 transition-colors"
        />
        <input 
            type="number" value={guestAge} onChange={e => setGuestAge(e.target.value)}
            placeholder="Age" className="w-full bg-white/5 border-b border-white/10 p-4 text-center text-xl font-serif focus:outline-none focus:border-rose-500 transition-colors"
        />
        <textarea 
            value={guestDesc} onChange={e => setGuestDesc(e.target.value)}
            placeholder="Description (e.g. Elegant red dress, mysterious smile)" 
            className="w-full bg-white/5 rounded-2xl p-4 text-sm font-serif min-h-[100px] focus:outline-none focus:border-rose-500 transition-colors"
        />
        <button 
            disabled={!guestName || !guestAge || !guestDesc}
            onClick={() => setStep(3)}
            className="mt-4 w-full py-4 bg-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] font-black hover:bg-white/20 disabled:opacity-20"
        >
            Next: Set the Scene
        </button>
    </div>
  );

  const renderLocation = () => (
    <div className="w-full flex flex-col gap-4 h-[400px]">
        <h2 className="text-2xl font-serif italic text-white text-center mb-4">Select Location</h2>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {DATE_LOCATIONS.map(loc => (
                <button 
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center gap-4 transition-all ${
                        selectedLocation?.id === loc.id 
                        ? 'bg-rose-900/40 border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.3)]' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                >
                    <div className="text-2xl">{loc.icon === 'sax' ? '🎷' : loc.icon === 'city' ? '🌃' : loc.icon === 'book' ? '📚' : loc.icon === 'wave' ? '🌊' : '🚘'}</div>
                    <div>
                        <h4 className="font-serif text-white">{loc.title}</h4>
                        <p className="text-[10px] text-white/40">{loc.description}</p>
                    </div>
                </button>
            ))}
        </div>
        <button 
            disabled={!selectedLocation}
            onClick={() => setStep(4)}
            className="mt-4 w-full py-4 bg-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] font-black hover:bg-white/20 disabled:opacity-20"
        >
            Next: Set the Vibe
        </button>
    </div>
  );

  const renderVibe = () => (
    <div className="w-full flex flex-col gap-4 h-[400px]">
        <h2 className="text-2xl font-serif italic text-white text-center mb-4">Select Vibe</h2>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {DATE_VIBES.map(vibe => (
                <button 
                    key={vibe.id}
                    onClick={() => setSelectedVibe(vibe)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center gap-4 transition-all ${
                        selectedVibe?.id === vibe.id 
                        ? 'bg-rose-900/40 border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.3)]' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                >
                    <div className="text-2xl">{vibe.icon}</div>
                    <div>
                        <h4 className="font-serif text-white">{vibe.title}</h4>
                        <p className="text-[10px] text-white/40">{vibe.description}</p>
                    </div>
                </button>
            ))}
        </div>
        <button 
            disabled={!selectedVibe}
            onClick={() => setStep(5)}
            className="mt-4 w-full py-4 bg-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] font-black hover:bg-white/20 disabled:opacity-20"
        >
            Generate Invitation
        </button>
    </div>
  );

  const renderFinalHost = () => (
    <div className="flex flex-col items-center gap-8 w-full text-center">
        <div className="flex flex-col gap-2">
            <span className="text-[10px] text-rose-500 uppercase tracking-[0.5em] font-black">Coordinates</span>
            <div className="text-6xl font-serif tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                {roomId}
            </div>
            <p className="text-[9px] text-white/30 uppercase mt-2">Share this code with her</p>
        </div>

        <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/5">
             <div className="flex items-center gap-3 mb-2">
                 <span className="text-xl">{selectedLocation?.icon === 'sax' ? '🎷' : '📍'}</span>
                 <span className="text-sm font-serif text-white">{selectedLocation?.title}</span>
             </div>
             <div className="flex items-center gap-3">
                 <span className="text-xl">{selectedVibe?.icon}</span>
                 <span className="text-sm font-serif text-white">{selectedVibe?.title}</span>
             </div>
        </div>

        <button 
            onClick={finalize} 
            className="w-full p-6 rounded-[32px] bg-rose-600 border border-rose-500/30 hover:bg-rose-500 active:scale-95 transition-all shadow-[0_10px_30px_rgba(225,29,72,0.3)]"
        >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" /> : <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white">Enter Room</span>}
        </button>
    </div>
  );

  const renderGuestJoin = () => (
    <div className="w-full flex flex-col gap-6">
        <h2 className="text-2xl font-serif italic text-white text-center">Authentication</h2>
        <input 
            value={joinName} onChange={e => setJoinName(e.target.value)}
            placeholder="Your Name" className="w-full bg-white/5 border-b border-white/10 p-4 text-center text-xl font-serif focus:outline-none focus:border-rose-500 transition-colors"
        />
        <input 
            value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())} maxLength={4}
            placeholder="COORDINATES" className="w-full bg-white/5 border-b border-white/10 p-4 text-center text-3xl font-serif tracking-widest uppercase focus:outline-none focus:border-rose-500 transition-colors"
        />
        <button 
            disabled={!joinName || roomId.length < 4}
            onClick={finalize}
            className="mt-8 w-full p-6 rounded-[32px] bg-rose-600 border border-rose-500/30 hover:bg-rose-500 active:scale-95 transition-all shadow-[0_10px_30px_rgba(225,29,72,0.3)] flex items-center justify-center"
        >
             {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white">Connect</span>}
        </button>
    </div>
  );

  return (
    <motion.div key="setup-wizard" variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="flex items-center justify-center pt-10 px-4 min-h-[60vh]">
        <GlassCard className="w-full max-w-sm p-8 flex flex-col items-center bg-black/40 border-white/5 rounded-[48px]">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={step} 
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full"
                >
                    {step === 0 && renderIntro()}
                    {step === 1 && renderHostInfo()}
                    {step === 2 && renderGuestInfo()}
                    {step === 3 && renderLocation()}
                    {step === 4 && renderVibe()}
                    {step === 5 && renderFinalHost()}
                    {step === 10 && renderGuestJoin()}
                </motion.div>
            </AnimatePresence>

            {step > 0 && step !== 5 && !isLoading && (
                <button onClick={() => setStep(step === 10 ? 0 : step - 1)} className="mt-8 text-[9px] text-white/20 uppercase tracking-[0.3em] font-black hover:text-white transition-colors">
                    Back
                </button>
            )}
        </GlassCard>
    </motion.div>
  );
};
