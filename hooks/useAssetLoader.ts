import { useEffect, useState } from 'react';
import { DATE_LOCATIONS } from '../constants';

export function useAssetLoader() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let loadedCount = 0;
    const imagesToLoad = DATE_LOCATIONS.map(loc => loc.image);
    
    // Add default avatar to preload
    imagesToLoad.push("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop");

    if (imagesToLoad.length === 0) {
      setIsLoaded(true);
      return;
    }

    imagesToLoad.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
          setIsLoaded(true);
        }
      };
      img.onerror = () => {
        // Even if one fails, we don't want to block the app forever
        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
          setIsLoaded(true);
        }
      };
    });
  }, []);

  return isLoaded;
}
