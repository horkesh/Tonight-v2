
export type SoundId = 'clink' | 'answer' | 'activity' | 'vulnerability' | 'milestone' | 'arrival_swell' | 'ui_tap';

type SoundCategory = 'ui' | 'ambient' | 'feedback';

const SOUND_CONFIG: Record<SoundId, { url: string; volume: number; category: SoundCategory }> = {
  clink:          { url: '/sounds/clink.mp3',          volume: 0.7, category: 'feedback' },
  answer:         { url: '/sounds/answer.mp3',         volume: 0.4, category: 'ui' },
  activity:       { url: '/sounds/activity.mp3',       volume: 0.5, category: 'ui' },
  vulnerability:  { url: '/sounds/vulnerability.mp3',  volume: 0.5, category: 'feedback' },
  milestone:      { url: '/sounds/milestone.mp3',      volume: 0.6, category: 'feedback' },
  arrival_swell:  { url: '/sounds/arrival_swell.mp3',  volume: 0.6, category: 'ambient' },
  ui_tap:         { url: '/sounds/ui_tap.mp3',         volume: 0.3, category: 'ui' },
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private bufferCache = new Map<SoundId, AudioBuffer>();
  private categoryVolumes: Record<SoundCategory, number> = { ui: 1, ambient: 1, feedback: 1 };
  private muted = false;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  private async loadBuffer(id: SoundId): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(id)) return this.bufferCache.get(id)!;

    const config = SOUND_CONFIG[id];
    if (!config) return null;

    try {
      const response = await fetch(config.url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.getContext().decodeAudioData(arrayBuffer);
      this.bufferCache.set(id, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.warn(`SoundManager: Failed to load ${id}`, e);
      return null;
    }
  }

  async play(id: SoundId): Promise<void> {
    if (this.muted) return;

    const config = SOUND_CONFIG[id];
    if (!config) return;

    const ctx = this.getContext();

    // Resume suspended context (requires user gesture first time)
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { return; }
    }

    const buffer = await this.loadBuffer(id);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = config.volume * this.categoryVolumes[config.category];

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  }

  setCategoryVolume(category: SoundCategory, volume: number) {
    this.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  teardown() {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.bufferCache.clear();
  }
}

export const soundManager = new SoundManager();
