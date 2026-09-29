/**
 * NetworkManager.ts — Capa de red P2P (WebRTC) usando PeerJS
 * Permite alojar una sala (Host) o conectarse a una (Guest).
 */

import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export class NetworkManager {
  public peer: Peer | null = null;
  public connections: DataConnection[] = []; // Array de conexiones (Host usa varias, Guest usa una)
  public isHost = false;
  public localPlayerIndex = 0;
  
  // Callbacks
  public onConnected: ((playerIndex: number) => void) | null = null; // Para Guest
  public onClientConnected: ((conn: DataConnection, playerIndex: number) => void) | null = null; // Para Host: (conn, playerIndex) => void
  public onDisconnected: (() => void) | null = null;
  public onError: ((err: any) => void) | null = null;
  public onMessage: ((data: any, conn: DataConnection) => void) | null = null; // Procesar mensajes entrantes

  constructor() {
    this.peer = null;
    this.connections = [];
    this.isHost = false;
  }

  /**
   * Inicializa la instancia de Peer de forma dinámica en el cliente.
   */
  private async _getPeerInstance(id?: string): Promise<Peer> {
    if (typeof window === 'undefined') {
      throw new Error('PeerJS solo se puede inicializar en el navegador');
    }
    const PeerClass = (await import('peerjs')).default;
    
    // Opciones estándar para el servidor cloud público de PeerJS con fallback y debug reducido
    const options = {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    };

    if (id) {
      return new PeerClass(id, options);
    }
    return new PeerClass(options);
  }

  /**
   * Crea una sala (actúa como Host).
   * @param onRoomCreated - Retorna el ID de la sala.
   */
  public async hostRoom(onRoomCreated: (id: string) => void): Promise<void> {
    this.isHost = true;
    this.connections = [];
    
    // Generamos un ID corto para la sala
    const roomId = this._generateShortId();
    
    try {
      this.peer = await this._getPeerInstance(roomId);
    } catch (e) {
      console.warn("Error creando instancia de Peer:", e);
      if (this.onError) this.onError(e);
      return;
    }

    this.peer.on('open', (id) => {
      console.log('Sala alojada con código:', id);
      onRoomCreated(id);
    });

    this.peer.on('connection', (conn) => {
      console.log('¡Un jugador se ha conectado!');
      
      conn.on('open', () => {
        this.connections.push(conn);
        // El Host es el index 0. Los clientes son 1, 2, 3...
        const playerIndex = this.connections.length;
        
        // Enviarle su índice
        conn.send({ type: 'ASSIGN_INDEX', payload: playerIndex });
        
        if (this.onClientConnected) this.onClientConnected(conn, playerIndex);
      });

      conn.on('data', (data) => {
        if (this.onMessage) this.onMessage(data, conn);
      });
      
      conn.on('close', () => {
        this.connections = this.connections.filter(c => c !== conn);
        if (this.onDisconnected) this.onDisconnected();
      });
      
      conn.on('error', (err) => {
        if (this.onError) this.onError(err);
      });
    });

    this.peer.on('error', (err) => {
      if (this.onError) this.onError(err);
    });
  }

  /**
   * Se une a una sala existente (actúa como Guest).
   */
  public async joinRoom(roomId: string, playerName = 'Jugador'): Promise<void> {
    this.isHost = false;
    this.connections = [];
    
    try {
      this.peer = await this._getPeerInstance(); // ID aleatorio para el cliente
    } catch (e) {
      if (this.onError) this.onError(e);
      return;
    }

    this.peer.on('open', (id) => {
      console.log('Cliente inicializado. Conectando a sala:', roomId);
      if (!this.peer) return;
      const conn = this.peer.connect(roomId, { metadata: { playerName } });
      
      conn.on('open', () => {
        console.log('¡Conectado a la sala!');
        this.connections.push(conn);
      });

      conn.on('data', (data: any) => {
        // Capturar la asignación de índice internamente
        if (data && data.type === 'ASSIGN_INDEX') {
          this.localPlayerIndex = data.payload;
          if (this.onConnected) this.onConnected(this.localPlayerIndex);
        } else {
          if (this.onMessage) this.onMessage(data, conn);
        }
      });

      conn.on('close', () => {
        this.connections = this.connections.filter(c => c !== conn);
        if (this.onDisconnected) this.onDisconnected();
      });

      conn.on('error', (err) => {
        if (this.onError) this.onError(err);
      });
    });

    this.peer.on('error', (err) => {
      if (this.onError) this.onError(err);
    });
  }

  /**
   * Envía un mensaje a todos los pares conectados.
   */
  public sendMessage(type: string, payload: any): void {
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send({ type, payload });
      }
    });
  }

  /**
   * Envía un mensaje a un cliente específico (solo Host).
   */
  public sendMessageTo(playerIndex: number, type: string, payload: any): void {
    if (!this.isHost) return;
    const connIndex = playerIndex - 1; // playerIndex 1 está en this.connections[0]
    if (this.connections[connIndex] && this.connections[connIndex].open) {
      this.connections[connIndex].send({ type, payload });
    }
  }

  /**
   * Cierra la conexión.
   */
  public disconnect(): void {
    this.connections.forEach(c => c.close());
    this.connections = [];
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  private _generateShortId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
