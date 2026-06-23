/**
 * NetworkManager.js — Capa de red P2P (WebRTC) usando PeerJS
 * Permite alojar una sala (Host) o conectarse a una (Guest).
 */

export class NetworkManager {
  constructor() {
    this.peer = null;
    this.connection = null; // En Guest: conexión al Host. En Host: conexión al Guest (1v1)
    
    this.isHost = false;
    
    // Callbacks
    this.onConnected = null;
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
    
    // Generamos un ID corto para la sala
    const roomId = this._generateShortId();
    
    // Conectar a PeerJS usando el roomId corto (puede haber colisión, pero es para simplificar)
    this.peer = new Peer(roomId);

    this.peer.on('open', (id) => {
      console.log('Sala alojada con código:', id);
      if (onRoomCreated) onRoomCreated(id);
    });

    this.peer.on('connection', (conn) => {
      console.log('¡Un jugador se ha conectado!');
      this.connection = conn;
      
      this.connection.on('open', () => {
        if (this.onConnected) this.onConnected();
      });

      this.connection.on('data', (data) => {
        if (this.onMessage) this.onMessage(data);
      });
      
      this.connection.on('close', () => {
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
    this.peer = new Peer(); // ID aleatorio para el cliente

    this.peer.on('open', (id) => {
      console.log('Cliente inicializado. Conectando a sala:', roomId);
      this.connection = this.peer.connect(roomId);

      this.connection.on('open', () => {
        console.log('¡Conectado a la sala!');
        if (this.onConnected) this.onConnected();
      });

      this.connection.on('data', (data) => {
        if (this.onMessage) this.onMessage(data);
      });

      this.connection.on('close', () => {
        if (this.onDisconnected) this.onDisconnected();
      });
    });

    this.peer.on('error', (err) => {
      if (this.onError) this.onError(err);
    });
  }

  /**
   * Envía un mensaje a través de la conexión.
   */
  sendMessage(type, payload) {
    if (!this.connection || !this.connection.open) return;
    this.connection.send({ type, payload });
  }

  /**
   * Cierra la conexión.
   */
  disconnect() {
    if (this.connection) this.connection.close();
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
