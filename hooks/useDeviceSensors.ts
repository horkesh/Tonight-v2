
import { useEffect, useRef } from 'react';

interface UseDeviceSensorsProps {
  onPour: () => void;
  onGlanceBack: () => void;
}

export function useDeviceSensors({ onPour, onGlanceBack }: UseDeviceSensorsProps) {
  const lastPourRef = useRef(0);

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
