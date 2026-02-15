import { useEffect } from 'react';

interface UseDeviceSensorsProps {
  onPour: () => void;
  onGlanceBack: () => void;
}

export function useDeviceSensors({ onPour, onGlanceBack }: UseDeviceSensorsProps) {
  // "Pour" Gesture (Gyroscope)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
        const beta = e.beta; // Front/Back tilt
        if (beta && beta > 55) { // Tilted back (drinking)
           onPour();
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