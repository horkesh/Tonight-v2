
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
