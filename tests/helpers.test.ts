import { describe, it, expect } from 'vitest';
import { applyVibeDeltas } from '../utils/helpers';
import type { VibeStats } from '../types';

describe('applyVibeDeltas', () => {
  const base: VibeStats = { playful: 20, flirty: 30, deep: 10, comfortable: 50 };

  it('applies positive deltas', () => {
    const result = applyVibeDeltas(base, { playful: 10, deep: 5 });
    expect(result).toEqual({ playful: 30, flirty: 30, deep: 15, comfortable: 50 });
  });

  it('clamps at 100', () => {
    const result = applyVibeDeltas(base, { comfortable: 80 });
    expect(result.comfortable).toBe(100);
  });

  it('handles zero deltas (empty object)', () => {
    const result = applyVibeDeltas(base, {});
    expect(result).toEqual(base);
  });

  it('handles all fields at once', () => {
    const result = applyVibeDeltas(base, { playful: 5, flirty: 5, deep: 5, comfortable: 5 });
    expect(result).toEqual({ playful: 25, flirty: 35, deep: 15, comfortable: 55 });
  });

  it('clamps multiple fields past 100', () => {
    const high: VibeStats = { playful: 95, flirty: 98, deep: 90, comfortable: 100 };
    const result = applyVibeDeltas(high, { playful: 10, flirty: 10, deep: 15, comfortable: 5 });
    expect(result).toEqual({ playful: 100, flirty: 100, deep: 100, comfortable: 100 });
  });

  it('treats undefined delta fields as zero', () => {
    const result = applyVibeDeltas(base, { playful: 10 });
    expect(result.flirty).toBe(30);
    expect(result.deep).toBe(10);
    expect(result.comfortable).toBe(50);
  });

  it('preserves original (no mutation)', () => {
    const original = { ...base };
    applyVibeDeltas(base, { playful: 50 });
    expect(base).toEqual(original);
  });
});
