/**
 * NetworkManager.js — Capa de red P2P (WebRTC) usando PeerJS
 * Permite alojar una sala (Host) o conectarse a una (Guest).
 */

export class NetworkManager {
  constructor() {
    this.peer = null;
    this.connections = []; // Array de conexiones (Host usa varias, Guest usa una)
    
    this.isHost = false;
    
    // Callbacks
    this.onConnected = null; // Para Guest
    this.onClientConnected = null; // Para Host: (conn, playerIndex) => void
    this.onDisconnected = null;
    this.onError = null;
    this.onMessage = null; // Función que procesará mensajes entrantes
  }

  /**
   * Crea una sala (actúa como Host).
   * @param {Function} onRoomCreated - Retorna el ID de la sala.
   */
  hostRoom(onRoomCreated) {
    this.isHost = true;
    this.connections = [];
    
    // Generamos un ID corto para la sala
    const roomId = this._generateShortId();
    
    this.peer = new Peer(roomId);

    this.peer.on('open', (id) => {
      console.log('Sala alojada con código:', id);
      if (onRoomCreated) onRoomCreated(id);
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
    });

    this.peer.on('error', (err) => {
      if (this.onError) this.onError(err);
    });
  }

  /**
   * Se une a una sala existente (actúa como Guest).
   * @param {string} roomId 
   */
  joinRoom(roomId) {
    this.isHost = false;
    this.connections = [];
    this.peer = new Peer(); // ID aleatorio para el cliente

    this.peer.on('open', (id) => {
      console.log('Cliente inicializado. Conectando a sala:', roomId);
      const conn = this.peer.connect(roomId);
      
      conn.on('open', () => {
        console.log('¡Conectado a la sala!');
        this.connections.push(conn);
        // Nota: onConnected se disparará cuando recibamos el ASSIGN_INDEX para tener el playerIndex listo
      });

      conn.on('data', (data) => {
        // Capturar la asignación de índice internamente
        if (data.type === 'ASSIGN_INDEX') {
          this.localPlayerIndex = data.payload;
          if (this.onConnected) this.onConnected(this.localPlayerIndex);
        } else {
          if (this.onMessage) this.onMessage(data, conn);
        }
      });

      conn.on('close', () => {
        if (this.onDisconnected) this.onDisconnected();
      });
    });

    this.peer.on('error', (err) => {
      if (this.onError) this.onError(err);
    });
  }

  /**
   * Envía un mensaje a todos los pares conectados.
   */
  sendMessage(type, payload) {
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send({ type, payload });
      }
    });
  }

  /**
   * Envía un mensaje a un cliente específico (solo Host).
   */
  sendMessageTo(playerIndex, type, payload) {
    if (!this.isHost) return;
    const connIndex = playerIndex - 1; // playerIndex 1 está en this.connections[0]
    if (this.connections[connIndex] && this.connections[connIndex].open) {
      this.connections[connIndex].send({ type, payload });
    }
  }

  /**
   * Cierra la conexión.
   */
  disconnect() {
    this.connections.forEach(c => c.close());
    this.connections = [];
    if (this.peer) this.peer.destroy();
  }

  _generateShortId() {
    // Genera un código de 5 letras
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
