
import { useEffect } from 'react';
import { VibeStats, DateContext } from '../types';

export function useAtmosphere(vibe: VibeStats, context: DateContext | null) {
  useEffect(() => {
    const root = document.documentElement;

    // Default Theme (Noir / Setup)
    let bgBase = '#020617'; // obsidian-950
    let bgCard = '#0f172a'; // obsidian-900
    let primary = '#e11d48'; // rose-600
    let primaryLight = '#f43f5e'; // rose-500
    
    let blob1 = '#4c0519';
    let blob2 = '#1e1b4b';
    let speed = '30s';
    
    // Atmospheric Bleed Defaults
    let shadowTint = 'rgba(0,0,0,0.2)';
    let highlightTint = 'rgba(255,255,255,0.05)';

    // 1. LOCATION (Sets the Stage / Base Colors)
    if (context && context.location && context.vibe) {
        switch (context.location.id) {
            case 'lounge': // Velvet Jazz - Warm, dark reds/browns
                bgBase = '#1a0505'; 
                bgCard = '#3f0a0a';
                primary = '#be123c'; 
                primaryLight = '#fb7185';
                shadowTint = 'rgba(60, 10, 20, 0.4)'; // Red/Brown shadow
                highlightTint = 'rgba(255, 200, 200, 0.1)';
                break;
            case 'rooftop': // City - Cool deep blues/indigos
                bgBase = '#020617';
                bgCard = '#172554';
                primary = '#6366f1'; 
                primaryLight = '#818cf8'; 
                shadowTint = 'rgba(10, 20, 60, 0.5)'; // Deep blue shadow
                highlightTint = 'rgba(200, 220, 255, 0.15)'; // Cyan highlight
                break;
            case 'study': // Library - Warm stone/amber
                bgBase = '#1c1917'; 
                bgCard = '#292524'; 
                primary = '#ea580c'; 
                primaryLight = '#f97316'; 
                shadowTint = 'rgba(40, 25, 10, 0.5)'; // Warm brown shadow
                highlightTint = 'rgba(255, 220, 180, 0.1)'; // Firelight highlight
                break;
            case 'beach': // Coast - Deep Teals
                bgBase = '#022c22'; 
                bgCard = '#115e59'; 
                primary = '#14b8a6'; 
                primaryLight = '#2dd4bf'; 
                shadowTint = 'rgba(0, 30, 30, 0.5)'; // Teal shadow
                highlightTint = 'rgba(200, 255, 255, 0.1)'; // Moon highlight
                break;
            case 'car': // Car - Zinc/Red Brake Lights
                bgBase = '#09090b'; 
                bgCard = '#18181b'; 
                primary = '#dc2626'; 
                primaryLight = '#ef4444'; 
                shadowTint = 'rgba(20, 5, 5, 0.6)'; // Brake light shadow
                highlightTint = 'rgba(255, 200, 200, 0.05)';
                break;
        }

        // 2. VIBE (Sets the Atmosphere / Blobs & Bleed Modifiers)
        // We subtly shift the highlight tint based on the current vibe dominance
        if (vibe.flirty > 60) {
            highlightTint = 'rgba(255, 100, 150, 0.2)'; // Blush highlight
            blob1 = '#be185d'; // Pinkish red
            speed = '15s'; // Faster heartbeat
        } else if (vibe.deep > 60) {
            shadowTint = 'rgba(10, 10, 40, 0.8)'; // Deep shadow
            blob2 = '#1e1b4b'; // Deep indigo
            speed = '45s'; // Slow, contemplative
        } else if (vibe.playful > 60) {
            blob1 = '#d97706'; // Amber
            speed = '10s'; // Energetic
        } else if (vibe.comfortable > 60) {
            blob2 = '#064e3b'; // Emerald/Forest
            speed = '60s'; // Very relaxed
        } else {
            // Fallback to initial context vibe if no live stat is dominant
            switch (context.vibe.id) {
                case 'electric':
                    blob1 = '#ec4899'; // Pink
                    blob2 = '#3b82f6'; // Blue
                    speed = '10s'; // High energy
                    break;
                case 'noir':
                    blob1 = '#3f3f46'; // Zinc
                    blob2 = '#000000'; // Black
                    speed = '60s'; // Very slow smoke
                    break;
                case 'cozy':
                    blob1 = '#7c2d12'; // Orange
                    blob2 = '#78350f'; // Amber
                    speed = '40s'; // Slow warmth
                    break;
                case 'playful':
                    blob1 = '#f59e0b'; // Amber
                    blob2 = '#10b981'; // Emerald
                    speed = '15s'; // Fast fun
                    break;
                case 'elegant':
                    blob1 = '#4c0519'; // Rose
                    blob2 = '#312e81'; // Indigo
                    speed = '35s'; // Steady
                    break;
            }
        }
    }

    // Apply to CSS Variables (Tailwind picks these up)
    root.style.setProperty('--color-bg-base', bgBase);
    root.style.setProperty('--color-bg-card', bgCard);
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-light', primaryLight);
    
    // Apply Atmosphere
    root.style.setProperty('--color-blob-1', blob1);
    root.style.setProperty('--color-blob-2', blob2);
    root.style.setProperty('--bg-speed', speed);
    
    // Apply Bleed
    root.style.setProperty('--shadow-tint', shadowTint);
    root.style.setProperty('--highlight-tint', highlightTint);

  }, [vibe, context]);
}
