import { VibeStats } from '../types';

/** Return the key of the highest vibe stat */
export const getDominantVibe = (vibe: VibeStats): keyof VibeStats => {
  const entries = Object.entries(vibe) as [keyof VibeStats, number][];
  return entries.reduce((a, b) => a[1] >= b[1] ? a : b)[0];
};

/** Clamp-add vibe deltas onto current stats (max 100 per field) */
export const applyVibeDeltas = (current: VibeStats, deltas: Partial<VibeStats>): VibeStats => ({
  playful: Math.min(100, current.playful + (deltas.playful || 0)),
  flirty: Math.min(100, current.flirty + (deltas.flirty || 0)),
  deep: Math.min(100, current.deep + (deltas.deep || 0)),
  comfortable: Math.min(100, current.comfortable + (deltas.comfortable || 0)),
});

export const compressImage = async (base64: string, quality: number = 0.7, maxWidth: number = 800): Promise<string> => {
  return new Promise((resolve) => {
    // Fix 3.8: Timeout to prevent hang
    const timer = setTimeout(() => {
        resolve(base64.replace(/^data:image\/\w+;base64,/, '')); 
    }, 10000);

    const img = new Image();
    
    // Fix 2.3: Correct URL handling
    if (base64.startsWith('http')) {
        img.crossOrigin = 'anonymous';
        img.src = base64;
    } else {
        img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    }
    
    img.onload = () => {
      clearTimeout(timer);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { 
        // Fallback: return original stripped of prefix if possible
        resolve(base64.replace(/^data:image\/\w+;base64,/, '')); 
        return; 
      }

      try {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl.split(',')[1]);
      } catch (e) {
        resolve(base64.replace(/^data:image\/\w+;base64,/, ''));
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      // Fallback on error
      resolve(base64.replace(/^data:image\/\w+;base64,/, ''));
    };
  });
};
