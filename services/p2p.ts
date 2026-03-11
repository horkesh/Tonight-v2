
import { Peer } from 'peerjs';
import { NetworkMessage } from '../types';

const ICE_SERVERS: any[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
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

  // Signaling reconnection backoff
  private signalingRetryCount: number = 0;
  private signalingRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private onErrorCallback: ((err: string) => void) | null = null;

  // Guest connection loop backoff
  private connectionAttemptCount: number = 0;

  private static MAX_SIGNALING_RETRIES = 10;
  private static MAX_CONNECTION_ATTEMPTS = 15;
  private static SIGNALING_BASE_DELAY = 2000;   // 2s → 4s → 8s → ... → cap 30s
  private static CONNECTION_BASE_DELAY = 3000;   // 3s → 4.5s → 6.75s → ... → cap 30s

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
    this.onErrorCallback = onError || null;
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
            debug: 2, 
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
          this.signalingRetryCount = 0;
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
          // If we haven't opened yet, handle init errors specifically
          if (!this.peer?.open) {
              clearTimeout(initTimeout);
          }
          
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
          else if (err.type === 'network' || err.type === 'socket-error' || err.type === 'socket-closed' || err.type === 'server-error' || err.type === 'webrtc') {
              if (!this.peer?.open) {
                  // Init failed due to network
                  console.warn(`P2P: Init network error (${err.type}). Retrying...`);
                  this.initRetryCount++;
                  if (this.initRetryCount <= 3) {
                      peer.destroy();
                      setTimeout(() => {
                          if (!this.isDestroyed) this.init(userId, roomId, isHostMode, onError);
                      }, 2000);
                      return;
                  } else {
                      if (onError) onError(`Connection failed (${err.type}). Check network/firewall.`);
                      return;
                  }
              }

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
          if (this.peer && !this.peer.destroyed && !this.isDestroyed) {
              this.signalingRetryCount++;
              if (this.signalingRetryCount > P2PService.MAX_SIGNALING_RETRIES) {
                  console.error('P2P: Max signaling retries reached.');
                  this.emitStatus('Server unreachable');
                  if (this.onErrorCallback) {
                      this.onErrorCallback("Signaling server unreachable. Check your connection.");
                  }
                  return;
              }
              const delay = Math.min(
                  P2PService.SIGNALING_BASE_DELAY * Math.pow(2, this.signalingRetryCount - 1),
                  30000
              );
              console.log(`P2P: Signaling retry ${this.signalingRetryCount}/${P2PService.MAX_SIGNALING_RETRIES} in ${delay}ms`);
              this.emitStatus(`Reconnecting (${this.signalingRetryCount}/${P2PService.MAX_SIGNALING_RETRIES})...`);
              this.signalingRetryTimer = setTimeout(() => {
                  if (this.peer && !this.peer.destroyed && !this.isDestroyed) {
                      this.peer.reconnect();
                  }
              }, delay);
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
      if (this.connectionRetryInterval) { clearTimeout(this.connectionRetryInterval); }
      this.connectionRetryInterval = null;
      this.connectionAttemptCount = 0;
      this.isConnecting = false;

      const attempt = () => {
          if (this.isDestroyed) return;
          if (!this.peer || this.peer.destroyed) return;
          if (this.conn && this.conn.open) return; 
          if (this.isConnecting) return; 

          this.connectionAttemptCount++;
          if (this.connectionAttemptCount > P2PService.MAX_CONNECTION_ATTEMPTS) {
              console.error('P2P: Max connection attempts reached.');
              this.emitStatus('Host not found');
              return;
          }

          console.log(`P2P: Dialing Host (${targetId}) attempt ${this.connectionAttemptCount}/${P2PService.MAX_CONNECTION_ATTEMPTS}...`);
          this.emitStatus(`Searching for Host (${this.connectionAttemptCount})...`);

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

          // Schedule next attempt with escalating backoff (3s → 4.5s → 6.75s → ... → cap 30s)
          const delay = Math.min(
              P2PService.CONNECTION_BASE_DELAY * Math.pow(1.5, this.connectionAttemptCount - 1),
              30000
          );
          this.connectionRetryInterval = setTimeout(attempt, delay);
      };

      attempt();
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
      this.connectionAttemptCount = 0;
      if (this.connectionRetryInterval) {
          clearTimeout(this.connectionRetryInterval);
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
      // Log large or image-bearing messages without stringifying the whole payload
      if (data?.type === 'SYNC_PERSONA' || data?.type === 'SYNC_DATE_CONTEXT' || data?.type === 'SYNC_USER') {
          const hasImage = data.payload?.data?.imageUrl || data.payload?.generatedImage;
          console.log(`P2P: Received ${data.type} (hasImage: ${!!hasImage})`);
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
        // Log large messages for debugging without stringifying
        const hasImage = data.payload?.data?.imageUrl || data.payload?.generatedImage;
        if (hasImage) {
            console.log(`P2P: Sending ${data.type} with image payload`);
        }
        this.conn.send(data);
      } catch (e) {
          console.error("P2P Send Error", e);
          this.bufferMessage(data);
      }
    } else {
        this.bufferMessage(data);
    }
  }
  
  private bufferMessage(data: NetworkMessage) {
      // Buffer if attempting to send before open or during disconnection
      if (this.msgQueue.length < 100) { // Increased buffer size for brief interruptions
          this.msgQueue.push(data);
          console.log(`P2P: Buffered message ${data.type} for later delivery.`);
      } else {
          console.warn("P2P: Message buffer full, dropping message:", data.type);
      }
  }
  
  private flushQueue() {
      if (!this.conn || !this.conn.open) return;
      const queueCopy = [...this.msgQueue];
      this.msgQueue = [];
      for (const msg of queueCopy) {
          if (msg) this.send(msg);
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
      if (this.connectionRetryInterval) clearTimeout(this.connectionRetryInterval);
      this.connectionRetryInterval = null;
      if (this.signalingRetryTimer) clearTimeout(this.signalingRetryTimer);
      this.signalingRetryTimer = null;
      this.signalingRetryCount = 0;
      this.connectionAttemptCount = 0;
      this.onErrorCallback = null;
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
