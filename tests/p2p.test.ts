import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { P2PService } from '../services/p2p';

// Mock PeerJS since it's a browser-only library
vi.mock('peerjs', () => ({
  Peer: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    connect: vi.fn(),
    destroy: vi.fn(),
    destroyed: false,
    open: true,
  })),
}));

describe('P2PService', () => {
  let service: P2PService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new P2PService();
  });

  afterEach(() => {
    service.teardown();
    vi.useRealTimers();
  });

  describe('message buffering', () => {
    it('buffers messages when no connection is open', () => {
      // No init called, so no connection exists
      service.send({ type: 'SYNC_VIBE', payload: { playful: 10, flirty: 0, deep: 0, comfortable: 0 } });
      // Message should be buffered (no error thrown)
    });

    it('registers and unregisters data listeners', () => {
      const callback = vi.fn();
      const unsub = service.onData(callback);

      // Unsubscribe
      unsub();

      // Listener should be removed (no way to trigger it after unsub without connection)
    });

    it('registers and unregisters connect listeners', () => {
      const callback = vi.fn();
      const unsub = service.onConnect(callback);
      unsub();
    });

    it('registers and unregisters disconnect listeners', () => {
      const callback = vi.fn();
      const unsub = service.onDisconnect(callback);
      unsub();
    });

    it('registers and unregisters status listeners', () => {
      const callback = vi.fn();
      const unsub = service.onStatus(callback);
      unsub();
    });
  });

  describe('teardown', () => {
    it('clears all state on teardown', () => {
      const dataCb = vi.fn();
      const connectCb = vi.fn();
      service.onData(dataCb);
      service.onConnect(connectCb);

      service.teardown();

      // After teardown, isHost should be false
      expect(service.isHost).toBe(false);
    });

    it('can be called multiple times safely', () => {
      service.teardown();
      service.teardown();
      service.teardown();
      // No errors thrown
    });
  });
});
