
import React, { useEffect, useRef } from 'react';
import { VibeStats, DateLocation } from '../types';

interface SoundscapeProps {
  vibe: VibeStats;
  location?: DateLocation | null;
}

export const Soundscape: React.FC<SoundscapeProps> = ({ vibe, location }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  
  // Heartbeat Ref
  const heartbeatIntervalRef = useRef<number | null>(null);

  // Effect 1: Init Audio Context (Run Once)
  useEffect(() => {
    const startAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // 1. Drone Layer
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        const filter = audioCtxRef.current.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(40, audioCtxRef.current.currentTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, audioCtxRef.current.currentTime);
        gain.gain.setValueAtTime(0.02, audioCtxRef.current.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start();

        oscillatorRef.current = osc;
        gainRef.current = gain;
        filterRef.current = filter;
      }
    };

    window.addEventListener('click', startAudio, { once: true });
    
    return () => {
      oscillatorRef.current?.stop();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      audioCtxRef.current?.close();
    };
  }, []); 
  
  // Effect 2: Heartbeat BPM Update
  useEffect(() => {
    // Clear existing
    if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
    }

    // Only start if AudioContext exists
    if (!audioCtxRef.current) return;

    let bpm = 60;
    if (vibe.flirty > 50) bpm = 90;
    if (vibe.deep > 60) bpm = 50;
    const beatInterval = (60 / bpm) * 1000;

    heartbeatIntervalRef.current = window.setInterval(() => {
        if (!audioCtxRef.current) return;
        const t = audioCtxRef.current.currentTime;
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        
        osc.frequency.setValueAtTime(vibe.deep > 50 ? 40 : 60, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.4);
        
        gain.gain.setValueAtTime(0.03 + (vibe.flirty * 0.001), t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start(t);
        osc.stop(t + 0.5);
    }, beatInterval);

    return () => {
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [vibe.flirty, vibe.deep]); // Only dependent on relevant vibes

  // Effect 3: Drone Modulation
  useEffect(() => {
    if (audioCtxRef.current && oscillatorRef.current && filterRef.current) {
      const time = audioCtxRef.current.currentTime;
      // Shift frequency based on Playful/Deep
      const freq = 40 + (vibe.deep * 0.5) - (vibe.playful * 0.2);
      oscillatorRef.current.frequency.exponentialRampToValueAtTime(Math.max(20, freq), time + 2);
      
      // Shift filter based on Flirty/Comfortable
      const filterFreq = 200 + (vibe.flirty * 10);
      filterRef.current.frequency.exponentialRampToValueAtTime(filterFreq, time + 2);
    }
  }, [vibe.deep, vibe.playful, vibe.flirty]);

  return null;
};
