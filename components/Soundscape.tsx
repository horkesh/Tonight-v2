import React, { useEffect, useRef } from 'react';
import { VibeStats } from '../types';

interface SoundscapeProps {
  vibe: VibeStats;
}

export const Soundscape: React.FC<SoundscapeProps> = ({ vibe }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  
  // Heartbeat Ref
  const heartbeatOscRef = useRef<OscillatorNode | null>(null);
  const heartbeatGainRef = useRef<GainNode | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);

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

        // 2. Heartbeat Layer (Pulse)
        startHeartbeat();
      }
    };

    const startHeartbeat = () => {
        if (!audioCtxRef.current) return;
        
        // Dynamic BPM logic
        // Flirty increases BPM (excitement). Deep decreases BPM (comfort).
        let bpm = 60;
        if (vibe.flirty > 50) bpm = 90;
        if (vibe.deep > 60) bpm = 50;

        const beatInterval = (60 / bpm) * 1000;

        heartbeatIntervalRef.current = window.setInterval(() => {
            if (!audioCtxRef.current) return;
            const t = audioCtxRef.current.currentTime;
            
            const osc = audioCtxRef.current.createOscillator();
            const gain = audioCtxRef.current.createGain();
            
            osc.frequency.setValueAtTime(50, t);
            // Kick drum envelope
            osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
            
            gain.gain.setValueAtTime(0.05 + (vibe.flirty * 0.001), t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

            osc.connect(gain);
            gain.connect(audioCtxRef.current.destination);
            
            osc.start(t);
            osc.stop(t + 0.6);
        }, beatInterval);
    };

    window.addEventListener('click', startAudio, { once: true });
    
    return () => {
      oscillatorRef.current?.stop();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      audioCtxRef.current?.close();
    };
  }, [vibe]); // Restart heartbeat if vibe changes significantly? 
  // For simplicity, we just update the drone here, advanced heartbeat BPM update would require clearing interval.
  
  // Re-run heartbeat interval on vibe change
  useEffect(() => {
      if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          
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
      }
  }, [vibe.flirty, vibe.deep]);

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
  }, [vibe]);

  return null;
};