import { useEffect } from 'react';
import { DATE_LOCATIONS } from '../constants';

/**
 * Non-blocking background image preloader.
 * Warms the browser cache for location images without blocking render.
 */
export function useAssetPreloader() {
  useEffect(() => {
    const preload = () => {
      const imagesToLoad = DATE_LOCATIONS.map(loc => loc.image);
      imagesToLoad.push("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop");

      imagesToLoad.forEach(src => {
        const img = new Image();
        img.src = src;
      });
    };

    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(preload);
      return () => window.cancelIdleCallback(id);
    } else {
      const id = setTimeout(preload, 200);
      return () => clearTimeout(id);
    }
  }, []);
}
