/**
 * ClientEngineProxy.js — Proxy del GameEngine para el Cliente
 * Tiene la misma interfaz pública que GameEngine pero en lugar de 
 * calcular lógica, envía mensajes por red y emite eventos recibidos.
 */

import { Card } from '../engine/Card.js';

export class ClientEngineProxy {
  /**
   * @param {NetworkManager} network 
   */
  constructor(network) {
    this.network = network;
    
    // Objeto mock para que UIRenderer no falle (necesita config y getGameState)
    this.config = {
      targetScore: 24,
      teamNames: ['Nosotros', 'Ellos'],
      isHuman: () => true,
      getPlayerTeam: (idx) => idx % 2 === 0 ? 'team1' : 'team2'
    };
    
    this.latestState = {
      state: 'WAITING_PLAY',
      currentTurn: 'player',
      players: []
    };

    // Callbacks de UI
    this.onStateChange = null;
    this.onRoundStart = null;
    this.onCardPlayed = null;
    this.onBazaResolved = null;
    this.onRoundEnd = null;
    this.onGameOver = null;
    this.onScoreUpdate = null;
    this.onCantoOffered = null;
    this.onCantoResolved = null;
    this.onTurnTransition = null;
    this.onMessage = null;
    this.onDeferredReveal = null;
    this.onFoldHand = null;

    // Escuchar mensajes de red
    this.network.onMessage = this._handleNetworkMessage.bind(this);
  }

  // ─────────────── MÉTODOS DEL ENGINE (UI -> Proxy -> Network) ───────────────

  playCard(playerIndex, cardId) {
    this.network.sendMessage('ACTION', { method: 'playCard', args: [playerIndex, cardId] });
  }

  callTruco(playerIndex) {
    this.network.sendMessage('ACTION', { method: 'callTruco', args: [playerIndex] });
  }

  callEnvido(playerIndex, level) {
    this.network.sendMessage('ACTION', { method: 'callEnvido', args: [playerIndex, level] });
  }

  declareFlor(playerIndex) {
    this.network.sendMessage('ACTION', { method: 'declareFlor', args: [playerIndex] });
  }

  respondToCanto(playerIndex, response, raiseLevel) {
    this.network.sendMessage('ACTION', { method: 'respondToCanto', args: [playerIndex, response, raiseLevel] });
  }

  foldHand(playerIndex) {
    this.network.sendMessage('ACTION', { method: 'foldHand', args: [playerIndex] });
  }

  nextRound() {
    this.network.sendMessage('ACTION', { method: 'nextRound', args: [] });
  }

  // ─────────────── MÉTODOS DE ESTADO ───────────────

  getGameState() {
    return this.latestState;
  }

  getAvailableActions(playerIndex) {
    // Para simplificar, el servidor enviará las acciones disponibles en el estado,
    // o calculamos aquí basándonos en el último estado recibido.
    return this.latestState.availableActions || [];
  }

  getPlayerTeam(playerIndex) {
    return this.config.getPlayerTeam(playerIndex);
  }

  // ─────────────── MANEJO DE MENSAJES (Network -> Proxy -> UI) ───────────────

  _reconstructCards(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this._reconstructCards(item));
    }
    
    // Identificar si el objeto tiene la firma de una carta
    if (obj.numero !== undefined && obj.palo !== undefined && obj.id) {
      return new Card(obj.numero, obj.palo);
    }
    
    const result = {};
    for (const key in obj) {
      result[key] = this._reconstructCards(obj[key]);
    }
    return result;
  }

  _handleNetworkMessage(data) {
    let { type, payload } = data;
    payload = this._reconstructCards(payload);

    if (type === 'SYNC_CONFIG') {
      this.config = { ...this.config, ...payload };
      // Restauramos las funciones mock
      this.config.isHuman = () => true;
      this.config.getPlayerTeam = (idx) => idx % 2 === 0 ? 'team1' : 'team2';
      return;
    }

    if (type === 'SYNC_STATE') {
      this.latestState = payload;
      return;
    }

    // Emisión de eventos
    if (type === 'EVENT') {
      const { eventName, eventData } = payload;
      
      if (eventName === 'onStateChange' && this.onStateChange) this.onStateChange(eventData);
      else if (eventName === 'onRoundStart' && this.onRoundStart) this.onRoundStart(eventData);
      else if (eventName === 'onCardPlayed' && this.onCardPlayed) this.onCardPlayed(eventData);
      else if (eventName === 'onBazaResolved' && this.onBazaResolved) this.onBazaResolved(eventData);
      else if (eventName === 'onRoundEnd' && this.onRoundEnd) this.onRoundEnd(eventData);
      else if (eventName === 'onGameOver' && this.onGameOver) this.onGameOver(eventData);
      else if (eventName === 'onScoreUpdate' && this.onScoreUpdate) this.onScoreUpdate(eventData);
      else if (eventName === 'onCantoOffered' && this.onCantoOffered) this.onCantoOffered(eventData);
      else if (eventName === 'onCantoResolved' && this.onCantoResolved) this.onCantoResolved(eventData);
      else if (eventName === 'onTurnTransition' && this.onTurnTransition) this.onTurnTransition(eventData);
      else if (eventName === 'onDeferredReveal' && this.onDeferredReveal) this.onDeferredReveal(eventData);
      else if (eventName === 'onFoldHand' && this.onFoldHand) this.onFoldHand(eventData);
      else if (eventName === 'onMessage' && this.onMessage) this.onMessage(eventData);
    }
  }
}
