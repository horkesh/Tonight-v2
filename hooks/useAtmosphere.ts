
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

    // 1. LOCATION (Sets the Stage / Base Colors)
    if (context) {
        switch (context.location.id) {
            case 'lounge': // Velvet Jazz - Warm, dark reds/browns
                bgBase = '#1a0505'; 
                bgCard = '#3f0a0a';
                primary = '#be123c'; // Rose-700
                primaryLight = '#fb7185'; // Rose-400
                break;
            case 'rooftop': // City - Cool deep blues/indigos
                bgBase = '#020617';
                bgCard = '#172554';
                primary = '#6366f1'; // Indigo-500
                primaryLight = '#818cf8'; // Indigo-400
                break;
            case 'study': // Library - Warm stone/amber
                bgBase = '#1c1917'; // Stone-900
                bgCard = '#292524'; // Stone-800
                primary = '#ea580c'; // Orange-600
                primaryLight = '#f97316'; // Orange-500
                break;
            case 'beach': // Coast - Deep Teals
                bgBase = '#022c22'; // Teal-950
                bgCard = '#115e59'; // Teal-800
                primary = '#14b8a6'; // Teal-500
                primaryLight = '#2dd4bf'; // Teal-400
                break;
            case 'car': // Car - Zinc/Red Brake Lights
                bgBase = '#09090b'; // Zinc-950
                bgCard = '#18181b'; // Zinc-900
                primary = '#dc2626'; // Red-600
                primaryLight = '#ef4444'; // Red-500
                break;
        }

        // 2. VIBE (Sets the Atmosphere / Blobs)
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

    // Apply to CSS Variables (Tailwind picks these up)
    root.style.setProperty('--color-bg-base', bgBase);
    root.style.setProperty('--color-bg-card', bgCard);
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-light', primaryLight);
    
    // Apply Atmosphere
    root.style.setProperty('--color-blob-1', blob1);
    root.style.setProperty('--color-blob-2', blob2);
    root.style.setProperty('--bg-speed', speed);

  }, [vibe, context]);
}
