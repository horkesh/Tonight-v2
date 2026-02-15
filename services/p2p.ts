
import { Peer } from 'peerjs';

export class P2PService {
  private peer: Peer | null = null;
  private conn: any = null;
  private listeners: ((data: any) => void)[] = [];
  private onConnectCallbacks: (() => void)[] = [];
  private onDisconnectCallbacks: (() => void)[] = [];
  
  private connectionRetryInterval: ReturnType<typeof setInterval> | null = null;
  
  private myId: string = '';
  private targetId: string = '';
  public isHost: boolean = false;

  init(userId: string, roomId: string, isHostMode: boolean) {
    this.cleanup(); // Ensure clean state

    const sanitizedRoom = roomId.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const hostId = `tonight-v2-${sanitizedRoom}-host`;
    
    // If I am the host, I must grab the Host ID.
    // If I am the guest, I must generate a random ID and connect to Host ID.
    
    const peerId = isHostMode ? hostId : undefined; // Undefined lets PeerJS assign random ID
    
    console.log(`P2P: Initializing. Room: ${roomId}, Mode: ${isHostMode ? 'HOST' : 'GUEST'}`);

    const peer = new Peer(peerId, { debug: 1 });

    peer.on('open', (id) => {
      console.log(`P2P: Registered as ${isHostMode ? 'HOST' : 'GUEST'} with ID: ${id}`);
      this.isHost = isHostMode;
      this.myId = id;
      this.peer = peer;
      this.setupPeerEvents(peer);

      if (!isHostMode) {
          this.targetId = hostId;
          this.connectToPeer(hostId);
      }
    });

    peer.on('error', (err: any) => {
      console.error('P2P Error:', err);
      if (err.type === 'unavailable-id' && isHostMode) {
         console.warn("P2P: Host ID is taken. This room code might be in use.");
      }
      if (err.type === 'peer-unavailable' && !isHostMode) {
         console.warn("P2P: Host not found. Retrying...");
         // Handled by retry interval
      }
    });
  }

  private setupPeerEvents(peer: Peer) {
      peer.on('connection', (conn) => {
          console.log('P2P: Incoming connection from', conn.peer);
          this.handleConnection(conn);
      });

      peer.on('disconnected', () => {
          console.log('P2P: Peer disconnected from signaling server');
          if (this.peer && !this.peer.destroyed) {
              this.peer.reconnect();
          }
      });
  }

  private connectToPeer(targetId: string) {
      if (!this.peer || this.peer.destroyed) return;
      if (this.conn && this.conn.open) return;

      console.log(`P2P: Dialing ${targetId}...`);
      
      const attempt = () => {
          if (this.conn && this.conn.open) return;
          if (!this.peer || this.peer.destroyed) return;

          const conn = this.peer.connect(targetId, { reliable: true });
          
          if (conn) {
              conn.on('error', (err) => console.warn("Conn Error", err));
              this.setupConnectionListeners(conn);
              this.conn = conn; // optimistically set
          }
      };

      attempt();
      
      if (this.connectionRetryInterval) clearInterval(this.connectionRetryInterval);
      this.connectionRetryInterval = setInterval(() => {
          if (this.conn && this.conn.open) {
              if (this.connectionRetryInterval) {
                  clearInterval(this.connectionRetryInterval);
                  this.connectionRetryInterval = null;
              }
          } else {
              console.log("P2P: Retrying connection...");
              attempt();
          }
      }, 3000);
  }

  private handleConnection(conn: any) {
    if (this.conn && this.conn.open) {
        console.log("P2P: Replacing existing connection");
        this.conn.close();
    }
    this.conn = conn;
    this.setupConnectionListeners(conn);
  }

  private setupConnectionListeners(conn: any) {
    conn.on('open', () => {
      console.log(`P2P: Data Channel Open with ${conn.peer}`);
      if (this.connectionRetryInterval) {
          clearInterval(this.connectionRetryInterval);
          this.connectionRetryInterval = null;
      }
      this.onConnectCallbacks.forEach(cb => cb());
    });

    conn.on('data', (data: any) => {
      this.listeners.forEach(cb => cb(data));
    });

    conn.on('close', () => {
        console.log('P2P: Connection Closed');
        this.conn = null;
        this.onDisconnectCallbacks.forEach(cb => cb());
        
        // If Guest, auto-reconnect
        if (!this.isHost && this.targetId) {
            setTimeout(() => this.connectToPeer(this.targetId), 1000);
        }
    });
  }

  send(data: any) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    } 
  }

  onData(cb: (data: any) => void) {
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
  
  cleanup() {
      if (this.connectionRetryInterval) clearInterval(this.connectionRetryInterval);
      this.connectionRetryInterval = null;
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
      this.listeners = [];
      this.onConnectCallbacks = [];
      this.onDisconnectCallbacks = [];
  }
}

export const p2p = new P2PService();
