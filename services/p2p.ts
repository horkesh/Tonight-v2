
import { Peer } from 'peerjs';
import { NetworkMessage } from '../types';

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.stunprotocol.org:3478' },
    // Free TURN servers for NAT traversal when STUN fails
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

export class P2PService {
  private peer: Peer | null = null;
  private conn: any = null;
  
  // Listeners
  private listeners: ((data: NetworkMessage) => void)[] = [];
  private onConnectCallbacks: (() => void)[] = [];
  private onDisconnectCallbacks: (() => void)[] = [];
  private onStatusCallbacks: ((status: string) => void)[] = [];
  
  private connectionRetryInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastPongTime: number = 0;
  
  private myId: string = '';
  private targetId: string = '';
  public isHost: boolean = false;
  
  // Message Buffer for pre-open sends
  private msgQueue: NetworkMessage[] = [];
  private isConnecting: boolean = false;
  private isDestroyed: boolean = false;
  private initRetryCount: number = 0;

  constructor() {
      // Ensure cleanup on page unload to release Peer ID
      if (typeof window !== 'undefined') {
          window.addEventListener('beforeunload', () => this.teardown());
      }
  }

  init(userId: string, roomId: string, isHostMode: boolean, onError?: (err: string) => void) {
    if (this.peer && !this.peer.destroyed) {
        console.warn("P2P: Already initialized. Destroying previous instance.");
        // Preserve external listeners across re-init (Fix: teardown clears them)
        const savedListeners = [...this.listeners];
        const savedOnConnect = [...this.onConnectCallbacks];
        const savedOnDisconnect = [...this.onDisconnectCallbacks];
        const savedOnStatus = [...this.onStatusCallbacks];
        this.teardown();
        this.listeners = savedListeners;
        this.onConnectCallbacks = savedOnConnect;
        this.onDisconnectCallbacks = savedOnDisconnect;
        this.onStatusCallbacks = savedOnStatus;
    }

    this.isDestroyed = false;
    const sanitizedRoom = roomId.replace(/[^a-z0-9]/gi, '').toLowerCase();
    
    // Host uses a fixed ID based on room. Guest uses random or user-based ID.
    // NOTE: If Host refreshes, they might need to wait for the old peer to timeout on the server.
    const hostId = `tonight-v2-${sanitizedRoom}-host`;
    const peerId = isHostMode ? hostId : undefined; 
    
    console.log(`P2P: Initializing. Room: ${roomId}, Mode: ${isHostMode ? 'HOST' : 'GUEST'}`);
    this.emitStatus('Registering...');

    const initTimeout = setTimeout(() => {
        if (!this.peer || (!this.peer.open && !this.peer.disconnected)) {
            console.warn("P2P: Initialization timeout. Signaling server may be unreachable.");
            this.emitStatus('Signaling Timeout');
            if (onError) onError("Signaling server unreachable. Check connection.");
        }
    }, 10000);

    try {
        console.log("P2P: Creating Peer instance...");
        if (typeof Peer === 'undefined') {
            console.error("P2P: PeerJS library not found in global scope.");
        }

        const peer = new Peer(peerId, {
            debug: 3, 
            config: {
                iceServers: ICE_SERVERS
            }
        });

        if (!peer) {
            clearTimeout(initTimeout);
            throw new Error("Peer constructor returned null");
        }

        peer.on('open', (id) => {
          clearTimeout(initTimeout);
          if (this.isDestroyed) { peer.destroy(); return; }
          console.log(`P2P: Registered as ${isHostMode ? 'HOST' : 'GUEST'} with ID: ${id}`);
          this.initRetryCount = 0; 
          this.emitStatus(isHostMode ? 'Waiting for Guest...' : 'Searching for Host...');
          this.isHost = isHostMode;
          this.myId = id;
          this.peer = peer;
          this.setupPeerEvents(peer);

          if (!isHostMode) {
              this.targetId = hostId;
              this.startConnectionLoop(hostId);
          }
        });

        peer.on('error', (err: any) => {
          clearTimeout(initTimeout);
          console.error('P2P Error:', err.type, err.message || '');

          if (err.type === 'unavailable-id' && isHostMode) {
             // Host's peer ID is still claimed by the PeerJS server from a previous session.
             // Auto-retry after a delay (server usually releases within 5-10s).
             this.initRetryCount++;
             if (this.initRetryCount <= 3) {
                 console.warn(`P2P: Host ID taken. Auto-retrying in 5s (attempt ${this.initRetryCount}/3)...`);
                 peer.destroy();
                 setTimeout(() => {
                     if (!this.isDestroyed) {
                         this.init(userId, roomId, isHostMode, onError);
                     }
                 }, 5000);
             } else {
                 console.error("P2P: Host ID unavailable after 3 retries.");
                 this.initRetryCount = 0;
                 if (onError) onError("Room active. Please wait 30s or use a new room.");
             }
          }
          else if (err.type === 'peer-unavailable' && !isHostMode) {
             console.log("P2P: Host unavailable, retrying...");
             this.emitStatus('Host not found, retrying...');
             this.isConnecting = false;
          }
          else if (err.type === 'disconnected') {
              console.warn("P2P: Disconnected from signaling. Attempting reconnect...");
              if (this.peer && !this.peer.destroyed) this.peer.reconnect();
          }
          else if (err.type === 'network' || err.type === 'socket-error' || err.type === 'socket-closed' || err.type === 'server-error') {
              console.warn(`P2P: Network-level error (${err.type}). Will auto-recover.`);
              // Don't call onError for transient network issues
          }
          else if (onError) {
              onError(`Connection Error: ${err.type}`);
          }
        });
    } catch (e) {
        console.error("P2P Init Exception", e);
        if (onError) onError("Failed to initialize network.");
    }
  }

  private setupPeerEvents(peer: Peer) {
      peer.on('connection', (conn) => {
          console.log('P2P: Incoming connection from', conn.peer);
          // Host Logic: Accept connection. 
          // If a previous connection exists, close it (single partner model).
          if (this.conn) {
              console.log('P2P: Closing previous connection to accept new one.');
              this.conn.close();
          }
          this.handleConnection(conn);
      });

      peer.on('disconnected', () => {
          console.log('P2P: Signaling disconnected');
          // PeerJS auto-reconnects usually, but we can force check
          if (this.peer && !this.peer.destroyed) {
              this.peer.reconnect();
          }
      });
      
      peer.on('close', () => {
         if (this.isHost && !this.isDestroyed) {
             // Host lost peer, might need restart or UI prompt
             console.warn("P2P: Host peer destroyed.");
         }
      });
  }

  private startConnectionLoop(targetId: string) {
      if (this.connectionRetryInterval) clearInterval(this.connectionRetryInterval);
      
      this.isConnecting = false;

      const attempt = () => {
          if (this.isDestroyed) return;
          if (!this.peer || this.peer.destroyed) return;
          if (this.conn && this.conn.open) return; 
          if (this.isConnecting) return; 

          console.log(`P2P: Dialing Host (${targetId})...`);
          this.emitStatus('Searching for Host...');

          if (this.conn) {
              this.conn.close();
              this.conn = null;
          }

          try {
              this.isConnecting = true;
              const conn = this.peer.connect(targetId, {
                  reliable: true,
                  serialization: 'binary'  // Binary supports auto-chunking for large messages (images)
              });
              
              if (conn) {
                  this.handleConnection(conn);
                  // Safety timeout to reset connecting flag if 'open' never fires (common peerjs bug)
                  setTimeout(() => { 
                      if (!this.conn || !this.conn.open) this.isConnecting = false; 
                  }, 5000);
              } else {
                  this.isConnecting = false;
              }
          } catch (e) {
              console.error("P2P Connect Exception", e);
              this.isConnecting = false;
          }
      };

      attempt();
      this.connectionRetryInterval = setInterval(attempt, 4000); 
  }

  private handleConnection(conn: any) {
    this.conn = conn;
    
    conn.on('open', () => {
      // Fix 3.2: Zombie connection check
      if (this.conn !== conn) {
          console.warn("P2P: Closing zombie connection.");
          conn.close();
          return;
      }

      console.log(`P2P: Data Channel Open with ${conn.peer}`);
      this.emitStatus('Connected');
      this.isConnecting = false;
      if (this.connectionRetryInterval) {
          clearInterval(this.connectionRetryInterval);
          this.connectionRetryInterval = null;
      }
      
      this.startHeartbeat();
      this.flushQueue();
      this.onConnectCallbacks.forEach(cb => cb());
    });

    conn.on('data', (data: any) => {
      if (data && data.type === 'PING') {
          this.send({ type: 'PONG' });
          return;
      }
      if (data && data.type === 'PONG') {
          this.lastPongTime = Date.now();
          return;
      }
      // Log large or image-bearing messages
      if (data?.type === 'SYNC_PERSONA' || data?.type === 'SYNC_DATE_CONTEXT' || data?.type === 'SYNC_USER') {
          try {
              const json = JSON.stringify(data);
              const sizeKB = Math.round(json.length / 1024);
              const hasImage = json.includes('data:image') || json.includes('unsplash');
              console.log(`P2P: Received ${data.type} (${sizeKB}KB, hasImage: ${hasImage})`);
          } catch (_) { console.log(`P2P: Received ${data.type}`); }
      }
      this.listeners.forEach(cb => cb(data));
    });

    conn.on('close', () => {
        console.log('P2P: Connection Closed');
        this.stopHeartbeat();
        if (this.conn === conn) this.conn = null;
        this.isConnecting = false;
        this.onDisconnectCallbacks.forEach(cb => cb());
        
        // Guest Auto-Reconnect Logic
        if (!this.isHost && this.targetId && !this.isDestroyed) {
            console.log("P2P: Lost connection. Reconnecting...");
            this.startConnectionLoop(this.targetId);
        }
    });

    conn.on('error', (err: any) => {
        console.warn("P2P Connection Error:", err);
        this.isConnecting = false;
    });
  }

  private startHeartbeat() {
      this.stopHeartbeat();
      this.lastPongTime = Date.now();
      
      this.heartbeatInterval = setInterval(() => {
          if (!this.conn || !this.conn.open) {
              this.stopHeartbeat();
              return;
          }
          // Fix 3.3: Heartbeat buffer check
          // If buffered amount is high, don't ping yet
          if (this.conn.dataChannel?.bufferedAmount > 16000) return;

          if (Date.now() - this.lastPongTime > 15000) {
              console.warn("P2P: Heartbeat timed out.");
              this.conn.close(); 
              return;
          }
          
          try {
             this.conn.send({ type: 'PING' });
          } catch (e) {
             console.warn("P2P: Ping send failed, resetting timeout window");
             this.lastPongTime = Date.now(); // Prevent false timeout on transient error
          }
      }, 3000); 
  }

  private stopHeartbeat() {
      if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
      }
  }

  send(data: NetworkMessage) {
    if (this.conn && this.conn.open) {
      try {
        // Log large messages for debugging
        try {
            const json = JSON.stringify(data);
            const sizeKB = Math.round(json.length / 1024);
            if (sizeKB > 10) {
                console.log(`P2P: Sending ${data.type} (${sizeKB}KB)`);
            }
        } catch (_) { /* logging only */ }
        this.conn.send(data);
      } catch (e) {
          console.error("P2P Send Error", e);
      }
    } else {
        // Buffer if attempting to send before open
        if (this.msgQueue.length < 50) { // Limit buffer size
            this.msgQueue.push(data);
        } else {
            console.warn("P2P: Message buffer full, dropping message:", data.type);
        }
    }
  }
  
  private flushQueue() {
      if (!this.conn || !this.conn.open) return;
      while (this.msgQueue.length > 0) {
          const msg = this.msgQueue.shift();
          this.send(msg);
      }
  }

  onData(cb: (data: NetworkMessage) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  onConnect(cb: () => void) {
    this.onConnectCallbacks.push(cb);
    return () => {
        this.onConnectCallbacks = this.onConnectCallbacks.filter(c => c !== cb);
    };
  }

  onDisconnect(cb: () => void) {
      this.onDisconnectCallbacks.push(cb);
      return () => {
          this.onDisconnectCallbacks = this.onDisconnectCallbacks.filter(c => c !== cb);
      };
  }

  onStatus(cb: (status: string) => void) {
      this.onStatusCallbacks.push(cb);
      return () => {
          this.onStatusCallbacks = this.onStatusCallbacks.filter(c => c !== cb);
      };
  }

  private emitStatus(status: string) {
      console.log(`P2P Status: ${status}`);
      this.onStatusCallbacks.forEach(cb => cb(status));
  }
  
  teardown() {
      this.isDestroyed = true;
      this.stopHeartbeat();
      if (this.connectionRetryInterval) clearInterval(this.connectionRetryInterval);
      this.connectionRetryInterval = null;
      this.msgQueue = [];
      this.isConnecting = false;
      
      // Fix 1.3: Clear listeners
      this.listeners = [];
      this.onConnectCallbacks = [];
      this.onDisconnectCallbacks = [];
      this.onStatusCallbacks = [];
      
      if (this.conn) {
          this.conn.close();
      }
      if (this.peer) {
          this.peer.destroy();
      }
      
      this.peer = null;
      this.conn = null;
      this.isHost = false;
      this.targetId = '';
  }
}

export const p2p = new P2PService();
