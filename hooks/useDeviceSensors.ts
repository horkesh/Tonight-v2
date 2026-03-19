
import { useEffect, useRef } from 'react';

interface UseDeviceSensorsProps {
  onPour: () => void;
  onGlanceBack: () => void;
  onWhisper?: () => void;
}

export function useDeviceSensors({ onPour, onGlanceBack, onWhisper }: UseDeviceSensorsProps) {
  const lastPourRef = useRef(0);
  const lastWhisperRef = useRef(0);

  // "Pour" Gesture (Gyroscope)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
        const beta = e.beta; // Front/Back tilt
        // Fix 2.5: Debounce
        if (beta && beta > 55) { // Tilted back (drinking)
           const now = Date.now();
           if (now - lastPourRef.current > 2000) {
               lastPourRef.current = now;
               onPour();
           }
        }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [onPour]);

  // "Whisper" Gesture — lean-in detected via same tilt, 60s cooldown
  useEffect(() => {
    if (!onWhisper) return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
        const beta = e.beta;
        if (beta && beta > 55) {
           const now = Date.now();
           if (now - lastWhisperRef.current > 60000) {
               lastWhisperRef.current = now;
               onWhisper();
           }
        }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [onWhisper]);

  // "Glance Away" Detection (Visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
        if (!document.hidden) {
            onGlanceBack();
        }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [onGlanceBack]);
}
