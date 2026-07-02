/**
 * HostEngineWrapper.js
 * En el lado del Host, envuelve el GameEngine para:
 * 1. Capturar todos los eventos y enviarlos por red a los Guests.
 * 2. Recibir acciones de red de los Guests y aplicarlas al GameEngine.
 */

export class HostEngineWrapper {
  constructor(engine, network) {
    this.engine = engine;
    this.network = network;

    // Interceptar llamadas
    this._bindEvents();

    // Recibir comandos de los Guests
    this.network.onMessage = (data, conn) => {
      if (data.type === 'ACTION') {
        const { method, args } = data.payload;
        if (typeof this.engine[method] === 'function') {
          this.engine[method](...args);
        }
      }
    };
  }

  _bindEvents() {
    const events = [
      'onStateChange', 'onRoundStart', 'onCardPlayed', 'onBazaResolved',
      'onRoundEnd', 'onGameOver', 'onScoreUpdate', 'onCantoOffered',
      'onCantoResolved', 'onTurnTransition', 'onMessage', 'onDeferredReveal', 'onFoldHand'
    ];

    events.forEach(eventName => {
      // Capturar el handler ACTUAL del engine en el momento de llamar _bindEvents.
      const currentHandler = this.engine[eventName];

      this.engine[eventName] = (eventData) => {
        // Ejecutar localmente para el Host (handler de UI)
        if (currentHandler) currentHandler.call(this.engine, eventData);

        // Para onRoundStart, enviamos a cada cliente su propia mano y ocultamos las de los demás
        if (eventName === 'onRoundStart' && eventData && eventData.players) {
          const totalPlayers = this.engine.config.getTotalPlayers();
          for (let i = 1; i < totalPlayers; i++) {
            const dataToSend = {
              ...eventData,
              players: eventData.players.map((p) => {
                // Incluir la mano SOLO para el jugador destino
                if (p.index === i && !p.hand) {
                  return {
                    ...p,
                    hand: this.engine.players[i] ? this.engine.players[i].getHand() : []
                  };
                }
                // Ocultar las cartas si es otro jugador
                return { ...p, hand: null };
              })
            };
            this.network.sendMessageTo(i, 'EVENT', { eventName, eventData: dataToSend });
          }
        } else {
          // Para otros eventos, hacer broadcast
          this.network.sendMessage('EVENT', { eventName, eventData });
        }

        // Enviar estado actualizado
        this._syncState();
      };
    });
  }

  _syncState() {
    const state = this.engine.getGameState();
    const totalPlayers = this.engine.config.getTotalPlayers();
    
    // Enviar a cada cliente su estado con sus acciones disponibles
    for (let i = 1; i < totalPlayers; i++) {
      const clientState = { ...state };
      clientState.availableActions = this.engine.getAvailableActions(i);
      this.network.sendMessageTo(i, 'SYNC_STATE', clientState);
    }
  }

  start() {
    // Sincronizar configuración inicial con todos
    this.network.sendMessage('SYNC_CONFIG', this.engine.config);
    this.engine.startGame();
    this._syncState();
  }
}
