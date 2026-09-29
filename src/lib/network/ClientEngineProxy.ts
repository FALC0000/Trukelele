/**
 * ClientEngineProxy.ts — Proxy del GameEngine para el Cliente
 * Tiene la misma interfaz pública que GameEngine pero en lugar de 
 * calcular lógica, envía mensajes por red y emite eventos recibidos.
 */

import { Card, Palo } from '../engine/Card';
import { NetworkManager } from './NetworkManager';

export class ClientEngineProxy {
  private network: NetworkManager;
  public localPlayerIndex: number;
  public config: any;
  public latestState: any;
  private _localHand: Card[] = [];
  public players: any[] = [];

  // Callbacks de UI (los mismos que GameEngine)
  public onStateChange: ((gameState: any) => void) | null = null;
  public onRoundStart: ((data: any) => void) | null = null;
  public onCardPlayed: ((data: any) => void) | null = null;
  public onBazaResolved: ((data: any) => void) | null = null;
  public onRoundEnd: ((data: any) => void) | null = null;
  public onGameOver: ((data: any) => void) | null = null;
  public onScoreUpdate: ((data: any) => void) | null = null;
  public onCantoOffered: ((data: any) => void) | null = null;
  public onCantoResolved: ((data: any) => void) | null = null;
  public onTurnTransition: ((data: any) => void) | null = null;
  public onMessage: ((msg: string) => void) | null = null;
  public onDeferredReveal: ((data: any) => void) | null = null;
  public onFoldHand: ((data: any) => void) | null = null;

  // Callback adicional: se llama cada vez que llega SYNC_STATE del Host
  public onSyncState: (() => void) | null = null;
  // Buffer para onRoundStart: se retiene hasta que llega el SYNC_STATE
  private _pendingRoundStartData: any = null;

  constructor(network: NetworkManager) {
    this.network = network;
    this.localPlayerIndex = network.localPlayerIndex || 1;
    
    // Objeto mock para que la UI no falle inicialmente
    this.config = {
      targetScore: 24,
      teamNames: ['Equipo 1', 'Equipo 2'],
      isHuman: () => true,
      getPlayerTeam: (idx: number) => idx % 2 === 0 ? 'team1' : 'team2'
    };
    
    this.latestState = {
      state: 'WAITING_PLAY',
      currentTurn: 'cpu',
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

    this._localHand = [];

    // Array de players mock
    this.players = [];
    for (let i = 0; i < 4; i++) {
      this.players.push({
        name: i === 0 ? 'Host' : `Jugador ${i+1}`,
        getHand: i === this.localPlayerIndex ? () => this._localHand : () => [],
        cardsRemaining: 0
      });
    }

    // Escuchar mensajes de red
    this.network.onMessage = this._handleNetworkMessage.bind(this);
  }

  // ─────────────── MÉTODOS DEL ENGINE (UI -> Proxy -> Network) ───────────────

  public playCard(playerIndex: number, cardId: string): void {
    // Quitar la carta de la mano local del Guest inmediatamente
    this._localHand = this._localHand.filter(c => c.id !== cardId);
    this._syncPlayersHand();
    this.network.sendMessage('ACTION', { method: 'playCard', args: [playerIndex, cardId] });
  }

  public callTruco(playerIndex: number): void {
    this.network.sendMessage('ACTION', { method: 'callTruco', args: [playerIndex] });
  }

  public callEnvido(playerIndex: number, level: string): void {
    this.network.sendMessage('ACTION', { method: 'callEnvido', args: [playerIndex, level] });
  }

  public declareFlor(playerIndex: number): void {
    this.network.sendMessage('ACTION', { method: 'declareFlor', args: [playerIndex] });
  }

  public respondToCanto(playerIndex: number, response: string, raiseLevel?: string): void {
    this.network.sendMessage('ACTION', { method: 'respondToCanto', args: [playerIndex, response, raiseLevel] });
  }

  public foldHand(playerIndex: number): void {
    this.network.sendMessage('ACTION', { method: 'foldHand', args: [playerIndex] });
  }

  public nextRound(): void {
    this.network.sendMessage('ACTION', { method: 'nextRound', args: [] });
  }

  // ─────────────── MÉTODOS DE ESTADO ───────────────

  public getGameState(): any {
    return this.latestState;
  }

  public getAvailableActions(playerIndex: number): string[] {
    return this.latestState.availableActions || [];
  }

  public getPlayerTeam(playerIndex: number): 'team1' | 'team2' {
    return this.config.getPlayerTeam(playerIndex);
  }

  // ─────────────── SYNC HAND ───────────────

  private _syncPlayersHand(): void {
    if (this.players[this.localPlayerIndex]) {
      this.players[this.localPlayerIndex] = {
        ...this.players[this.localPlayerIndex],
        getHand: () => this._localHand,
        cardsRemaining: this._localHand.length
      };
    }
  }

  // ─────────────── MANEJO DE MENSAJES (Network -> Proxy -> UI) ───────────────

  private _reconstructCards(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this._reconstructCards(item));
    }
    
    // Identificar si el objeto tiene la firma de una carta (numero y palo son suficientes)
    if (obj.numero !== undefined && obj.palo !== undefined) {
      return new Card(obj.numero, obj.palo as Palo);
    }
    
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this._reconstructCards(obj[key]);
      }
    }
    return result;
  }

  private _handleNetworkMessage(data: any): void {
    if (!data) return;
    let { type, payload } = data;
    payload = this._reconstructCards(payload);

    if (type === 'SYNC_CONFIG') {
      this.config = { ...this.config, ...payload };
      this.config.isHuman = () => true;
      this.config.getPlayerTeam = (idx: number) => {
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
        payload.players.forEach((p: any) => {
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
      
      // Si había un onRoundStart pendiente, dispararlo ahora que tenemos el estado completo (vira, etc.)
      if (this._pendingRoundStartData) {
        const pendingData = this._pendingRoundStartData;
        this._pendingRoundStartData = null;
        if (this.onRoundStart) {
          this.onRoundStart(pendingData);
        }
      }
      
      // Notificar a la UI
      if (this.onSyncState) {
        this.onSyncState();
      }
      return;
    }

    // Emisión de eventos
    if (type === 'EVENT') {
      const { eventName, eventData } = payload;
      const proxyInstance = this as any;

      // Interceptar onRoundStart para extraer la mano del cliente local
      if (eventName === 'onRoundStart') {
        if (eventData && eventData.players) {
          const myPlayerData = eventData.players.find((p: any) => p.index === this.localPlayerIndex);
          if (myPlayerData && myPlayerData.hand) {
            this._localHand = myPlayerData.hand;
            this._syncPlayersHand();
          }
          
          // Actualizar nombres y cartas
          eventData.players.forEach((p: any) => {
             this.players[p.index] = {
               ...this.players[p.index],
               name: p.name,
               cardsRemaining: p.index === this.localPlayerIndex ? this._localHand.length : 3,
               getHand: p.index === this.localPlayerIndex ? () => this._localHand : () => []
             };
          });
        }
        this._pendingRoundStartData = eventData;
        return;
      }

      // Interceptar onCardPlayed
      if (eventName === 'onCardPlayed') {
        if (this.onCardPlayed) {
          this.onCardPlayed(eventData);
        }
        return;
      }

      // Emitir los demás eventos
      if (typeof proxyInstance[eventName] === 'function' || proxyInstance[eventName]) {
        if (proxyInstance[eventName]) {
          proxyInstance[eventName](eventData);
        }
      }
    }
  }
}
