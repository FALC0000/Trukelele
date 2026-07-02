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
    this.localPlayerIndex = network.localPlayerIndex || 1;
    
    // Objeto mock para que UIRenderer no falle (necesita config y getGameState)
    this.config = {
      targetScore: 24,
      teamNames: ['Equipo 1', 'Equipo 2'],
      isHuman: () => true,
      getPlayerTeam: (idx) => idx % 2 === 0 ? 'team1' : 'team2'
    };
    
    this.latestState = {
      state: 'WAITING_PLAY',
      currentTurn: 'cpu', // Se sobrescribe por la red
      players: [],
      scores: { team1: 0, team2: 0 },
      vira: null,
      roundNumber: 0,
      envidoPlayed: false,
      florPlayed: false,
      trucoLevel: null,
      bazaCount: 0,
      bazaWins: { player: 0, cpu: 0 },
      currentBaza: { player: null, cpu: null },
      availableActions: []
    };

    // Mano local del Guest (actualizada por onRoundStart y onCardPlayed)
    this._localHand = [];

    // Array de players mock con getHand() para compatibilidad con UIRenderer
    this.players = [];
    for (let i = 0; i < 4; i++) {
      this.players.push({
        name: i === 0 ? 'Host' : `Jugador ${i+1}`,
        getHand: i === this.localPlayerIndex ? () => this._localHand : () => [],
        cardsRemaining: 0
      });
    }

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
    // Quitar la carta de la mano local del Guest inmediatamente
    this._localHand = this._localHand.filter(c => c.id !== cardId);
    this._syncPlayersHand();
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
    return this.latestState.availableActions || [];
  }

  getPlayerTeam(playerIndex) {
    return this.config.getPlayerTeam(playerIndex);
  }

  // ─────────────── SYNC HAND ───────────────

  /**
   * Actualiza el array de players mock con la mano actual.
   */
  _syncPlayersHand() {
    if (this.players[this.localPlayerIndex]) {
      this.players[this.localPlayerIndex] = {
        ...this.players[this.localPlayerIndex],
        getHand: () => this._localHand,
        cardsRemaining: this._localHand.length
      };
    }
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
      
      // En modo ONLINE_2V2, teams cruzados: 0 y 2 -> team1; 1 y 3 -> team2
      // En modo ONLINE_1V1, team1: 0; team2: 1
      this.config.getPlayerTeam = (idx) => {
        if (this.config.mode === 'online_2v2') {
          return (idx === 0 || idx === 2) ? 'team1' : 'team2';
        }
        return idx % 2 === 0 ? 'team1' : 'team2';
      };
      return;
    }

    if (type === 'SYNC_STATE') {
      this.latestState = payload;
      // Sincronizar cardsRemaining de todos los jugadores desde el estado
      if (payload.players) {
        payload.players.forEach(p => {
           if (p.index !== this.localPlayerIndex) {
             this.players[p.index] = {
               ...this.players[p.index],
               name: p.name,
               cardsRemaining: p.cardsRemaining,
               getHand: () => []
             };
           }
        });
      }
      return;
    }

    // Emisión de eventos
    if (type === 'EVENT') {
      const { eventName, eventData } = payload;

      // Interceptar onRoundStart para extraer la mano del cliente local
      if (eventName === 'onRoundStart') {
        if (eventData && eventData.players) {
          const myPlayerData = eventData.players.find(p => p.index === this.localPlayerIndex);
          if (myPlayerData && myPlayerData.hand) {
            this._localHand = myPlayerData.hand;
            this._syncPlayersHand();
          }
          
          // Actualizar nombres y cartas
          eventData.players.forEach(p => {
             this.players[p.index] = {
               ...this.players[p.index],
               name: p.name,
               cardsRemaining: p.index === this.localPlayerIndex ? this._localHand.length : 3, // Inicia con 3 cartas
               getHand: p.index === this.localPlayerIndex ? () => this._localHand : () => []
             };
          });
        }
        if (this.onRoundStart) this.onRoundStart(eventData);
        return;
      }

      // Interceptar onCardPlayed para actualizar mano local si el Guest jugó
      if (eventName === 'onCardPlayed') {
        if (this.onCardPlayed) this.onCardPlayed(eventData);
        return;
      }

      if (eventName === 'onStateChange' && this.onStateChange) this.onStateChange(eventData);
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
