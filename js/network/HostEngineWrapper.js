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
      // Guardar el handler original si existiera (ej. UI local del Host)
      const originalHandler = this.engine[eventName];

      this.engine[eventName] = (eventData) => {
        // Ejecutar localmente para el Host
        if (originalHandler) originalHandler.call(this.engine, eventData);

        // Enviar por red al Guest
        this.network.sendMessage('EVENT', { eventName, eventData });

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
