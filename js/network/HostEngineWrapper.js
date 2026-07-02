/**
 * HostEngineWrapper.js
 * En el lado del Host, envuelve el GameEngine para:
 * 1. Capturar todos los eventos y enviarlos por red al Guest.
 * 2. Recibir acciones de red del Guest y aplicarlas al GameEngine.
 */

export class HostEngineWrapper {
  constructor(engine, network) {
    this.engine = engine;
    this.network = network;

    // Interceptar llamadas
    this._bindEvents();

    // Recibir comandos del Guest
    this.network.onMessage = (data) => {
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
      // Esto permite llamar _bindEvents() después de ui.init() para capturar
      // correctamente los handlers registrados por la UI.
      const currentHandler = this.engine[eventName];

      this.engine[eventName] = (eventData) => {
        // Para onRoundStart, enriquecer el eventData con la mano del Guest (player index 1)
        // para que el ClientEngineProxy pueda extraerla.
        let dataToSend = eventData;
        if (eventName === 'onRoundStart' && eventData && eventData.players) {
          dataToSend = {
            ...eventData,
            players: eventData.players.map((p) => {
              // Incluir la mano del jugador 1 (Guest) siempre
              if (p.index === 1 && !p.hand) {
                return {
                  ...p,
                  hand: this.engine.players[1] ? this.engine.players[1].getHand() : []
                };
              }
              return p;
            })
          };
        }

        // Ejecutar localmente para el Host (handler de UI)
        if (currentHandler) currentHandler.call(this.engine, eventData);

        // Enviar por red al Guest (con la mano enriquecida si es onRoundStart)
        this.network.sendMessage('EVENT', { eventName, eventData: dataToSend });

        // Enviar estado actualizado
        this._syncState();
      };
    });
  }

  _syncState() {
    const state = this.engine.getGameState();
    // Añadimos las acciones disponibles para el Guest (playerIndex = 1 en 1v1)
    state.availableActions = this.engine.getAvailableActions(1);
    this.network.sendMessage('SYNC_STATE', state);
  }

  start() {
    // Sincronizar configuración inicial
    this.network.sendMessage('SYNC_CONFIG', this.engine.config);
    this.engine.startGame();
    this._syncState();
  }
}
