/**
 * HostEngineWrapper.ts
 * En el lado del Host, envuelve el GameEngine para:
 * 1. Capturar todos los eventos y enviarlos por red a los Guests.
 * 2. Recibir acciones de red de los Guests y aplicarlas al GameEngine.
 */

import { GameEngine } from '../engine/GameEngine';
import { NetworkManager } from './NetworkManager';

export class HostEngineWrapper {
  private engine: GameEngine;
  private network: NetworkManager;

  constructor(engine: GameEngine, network: NetworkManager) {
    this.engine = engine;
    this.network = network;

    // Recibir comandos de los Guests
    this.network.onMessage = (data: any) => {
      if (data && data.type === 'ACTION') {
        const { method, args } = data.payload;
        const engineInstance = this.engine as any;
        if (typeof engineInstance[method] === 'function') {
          engineInstance[method](...args);
        }
      }
    };
  }

  public bindEvents(): void {
    const events = [
      'onStateChange', 'onRoundStart', 'onCardPlayed', 'onBazaResolved',
      'onRoundEnd', 'onGameOver', 'onScoreUpdate', 'onCantoOffered',
      'onCantoResolved', 'onTurnTransition', 'onMessage', 'onDeferredReveal', 'onFoldHand'
    ] as const;

    events.forEach(eventName => {
      const engineInstance = this.engine as any;
      // Capturar el handler ACTUAL del engine en el momento de llamar bindEvents
      const currentHandler = engineInstance[eventName];

      engineInstance[eventName] = (eventData: any) => {
        // Ejecutar localmente para el Host (handler de UI)
        if (currentHandler) {
          currentHandler.call(this.engine, eventData);
        }

        // Para onRoundStart, enviamos a cada cliente su propia mano y ocultamos las de los demás
        if (eventName === 'onRoundStart' && eventData && eventData.players) {
          const totalPlayers = this.engine.config.getTotalPlayers();
          for (let i = 1; i < totalPlayers; i++) {
            const dataToSend = {
              ...eventData,
              players: eventData.players.map((p: any) => {
                if (p.index === i) {
                  return {
                    ...p,
                    hand: this.engine.players[i] ? this.engine.players[i].getHand() : (p.hand || [])
                  };
                }
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

  private _syncState(): void {
    const state = this.engine.getGameState();
    const totalPlayers = this.engine.config.getTotalPlayers();

    // Enviar a cada cliente su estado con sus acciones disponibles
    for (let i = 1; i < totalPlayers; i++) {
      const clientState = { ...state };
      clientState.availableActions = this.engine.getAvailableActions(i);
      this.network.sendMessageTo(i, 'SYNC_STATE', clientState);
    }
  }

  public start(): void {
    // Sincronizar configuración inicial con todos
    this.network.sendMessage('SYNC_CONFIG', this.engine.config);
    this.engine.startGame();
    this._syncState();
  }
}
