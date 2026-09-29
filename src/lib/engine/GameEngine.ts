/**
 * GameEngine.ts — Motor Principal del Truco Venezolano
 * Orquesta toda la lógica del juego: rondas, bazas, cantos y puntuación.
 * Soporta modos: vs CPU, 1v1 Local (ya no usado, pero configurable), 2v2 Equipos.
 */

import { Card } from './Card';
import { Deck } from './Deck';
import { Player } from './Player';
import { CPUPlayer } from './CPUPlayer';
import { ScoreManager } from './ScoreManager';
import { EnvidoCalc } from './EnvidoCalc';
import { FSM, GameState, GameStateType } from './FSM';
import { TurnManager } from './TurnManager';
import { GameConfig, GameMode } from './GameConfig';

export interface RoundStartData {
  roundNumber: number;
  vira: Card;
  mano: number;
  players: {
    name: string;
    hand: Card[] | null;
    isHuman: boolean;
    index: number;
  }[];
}

export interface CardPlayedData {
  playerIndex: number;
  playerName: string;
  card: Card;
  team: 'team1' | 'team2';
}

export interface BazaResolvedData {
  winner: 'player' | 'cpu' | 'empate';
  playerCard: Card;
  cpuCard: Card;
  bazaNumber: number;
  bazaWins: { player: number; cpu: number };
}

export interface RoundEndData {
  winner: 'team1' | 'team2';
  roundNumber: number;
  roundPoints: number;
  scores: { team1: number; team2: number };
  byReject?: boolean;
}

export interface GameOverData {
  winner: 'team1' | 'team2';
  winnerName: string;
  finalScores: { team1: number; team2: number };
  totalRounds: number;
}

export interface ScoreUpdateData {
  scores: { team1: number; team2: number };
  targetScore: number;
  lastPoints: { team: 'team1' | 'team2'; points: number; reason: string };
}

export interface CantoOfferedData {
  type: 'truco' | 'envido' | 'flor';
  level?: string;
  callerIndex: number;
  callerName: string;
  callerTeam: 'team1' | 'team2';
  respondingTeam: 'team1' | 'team2';
  opponentHasFlor?: boolean;
}

export interface CantoResolvedData {
  type: 'truco' | 'envido' | 'flor';
  level?: string;
  accepted: boolean;
  responderName: string;
  points?: number;
  winnerTeam?: 'team1' | 'team2' | null;
  deferred?: boolean;
}

export interface TurnTransitionData {
  nextPlayer: string;
  nextPlayerIndex: number;
}

export interface DeferredEnvidoResult {
  winnerTeam: 'team1' | 'team2';
  team1Points: number;
  team2Points: number;
  points: number;
  level: string;
  team1Cards: Card[];
  team2Cards: Card[];
}

export interface DeferredFlorResult {
  winnerTeam: 'team1' | 'team2';
  points: number;
  isContraflor: boolean;
  team1Flor: number;
  team2Flor: number;
  team1Cards: Card[] | null;
  team2Cards: Card[] | null;
}

export class GameEngine {
  public config: GameConfig;
  public deck: Deck;
  public scoreManager: ScoreManager;
  public fsm: FSM;
  public turnManager: TurnManager;
  public players: Player[];

  public vira: Card | null = null;
  public roundNumber = 0;
  public manoIndex = 0; // Índice del jugador que es mano (alterna cada ronda)

  // Estado de cantos
  public trucoLevel: 'truco' | 'retruco' | 'vale9' | 'vale_juego' | null = null;
  public trucoCallerTeam: 'team1' | 'team2' | null = null;
  public envidoPlayed = false;
  public florPlayed = false;
  public envidoLevel: 'envido' | 'envido_5' | 'falta_envido' | null = null;
  public envidoCallerTeam: 'team1' | 'team2' | null = null;
  
  public deferredEnvidoResult: DeferredEnvidoResult | null = null;
  public deferredFlorResult: DeferredFlorResult | null = null;
  public pendingCardPlay: { playerIndex: number; cardId: string } | null = null;

  // Timers
  private _cpuActionTimer: NodeJS.Timeout | null = null;

  // Callbacks para la UI
  public onStateChange: ((gameState: any) => void) | null = null;
  public onRoundStart: ((data: RoundStartData) => void) | null = null;
  public onCardPlayed: ((data: CardPlayedData) => void) | null = null;
  public onBazaResolved: ((data: BazaResolvedData) => void) | null = null;
  public onRoundEnd: ((data: RoundEndData) => void) | null = null;
  public onGameOver: ((data: GameOverData) => void) | null = null;
  public onScoreUpdate: ((data: ScoreUpdateData) => void) | null = null;
  public onCantoOffered: ((data: CantoOfferedData) => void) | null = null;
  public onCantoResolved: ((data: CantoResolvedData) => void) | null = null;
  public onTurnTransition: ((data: TurnTransitionData) => void) | null = null;
  public onMessage: ((msg: string) => void) | null = null;
  public onDeferredReveal: ((data: { envido: DeferredEnvidoResult | null; flor: DeferredFlorResult | null }) => void) | null = null;
  public onFoldHand: ((data: { playerIndex: number; playerName: string; team: 'team1' | 'team2' }) => void) | null = null;

  constructor(config: GameConfig) {
    this.config = config;
    this.deck = new Deck();
    this.scoreManager = new ScoreManager(config.targetScore);
    this.fsm = new FSM();
    this.turnManager = new TurnManager();

    // Crear jugadores según el modo
    this.players = [];
    this._createPlayers();
  }

  /**
   * Crea los jugadores según el modo de juego.
   */
  private _createPlayers(): void {
    const comp = this.config.teamComposition;
    const allPlayers = [...comp.team1, ...comp.team2];
    
    // Ordenar por index para que se correspondan con el flujo
    allPlayers.sort((a, b) => a.index - b.index);

    for (const p of allPlayers) {
      if (p.type === 'human') {
        this.players.push(new Player(p.name));
      } else {
        this.players.push(new CPUPlayer(p.name));
      }
    }
  }

  /**
   * Obtiene el equipo de un jugador por su índice.
   */
  public getPlayerTeam(playerIndex: number): 'team1' | 'team2' {
    const team = this.config.getPlayerTeam(playerIndex);
    if (!team) {
      throw new Error(`Equipo no encontrado para jugador ${playerIndex}`);
    }
    return team;
  }

  /**
   * Obtiene el equipo contrario.
   */
  public getOpponentTeam(team: 'team1' | 'team2'): 'team1' | 'team2' {
    return team === 'team1' ? 'team2' : 'team1';
  }

  // ─────────────── INICIO DE PARTIDA ───────────────

  /**
   * Inicia una nueva partida.
   */
  public startGame(): void {
    this.scoreManager.reset();
    this.roundNumber = 0;
    this.manoIndex = 0;
    this.fsm.forceState(GameState.GAME_START);
    this.fsm.transition(GameState.ROUND_START);
    this.startRound();
  }

  // ─────────────── RONDA ───────────────

  /**
   * Inicia una nueva ronda.
   */
  public startRound(): void {
    this.roundNumber++;
    this.deck.reset();

    // Resetear estado de cantos
    this.trucoLevel = null;
    this.trucoCallerTeam = null;
    this.envidoPlayed = false;
    this.florPlayed = false;
    this.envidoLevel = null;
    this.envidoCallerTeam = null;
    this.deferredEnvidoResult = null;
    this.deferredFlorResult = null;
    this.pendingCardPlay = null;

    // Sacar la vira
    this.vira = this.deck.drawVira();

    // Repartir 3 cartas a cada jugador
    for (const player of this.players) {
      player.receiveCards(this.deck.deal(3));
    }

    // Configurar turnos
    const manoPlayerIdx = this.manoIndex % this.players.length;
    this.turnManager.startRound(manoPlayerIdx === 0 ? 'player' : 'cpu');

    this.fsm.forceState(GameState.DEALING);
    this.fsm.transition(GameState.WAITING_PLAY);

    // Alternar mano para la próxima ronda
    this.manoIndex++;

    if (this.onRoundStart) {
      this.onRoundStart({
        roundNumber: this.roundNumber,
        vira: this.vira,
        mano: manoPlayerIdx,
        players: this.players.map((p, i) => ({
          name: p.name,
          hand: this.config.isHuman(i) ? p.getHand() : null,
          isHuman: this.config.isHuman(i),
          index: i
        }))
      });
    }

    // Si el primer turno es CPU, ejecutar su acción
    this._checkCPUAction();
  }

  // ─────────────── JUGAR CARTA ───────────────

  /**
   * Un jugador juega una carta.
   */
  public playCard(playerIndex: number, cardId: string): void {
    const player = this.players[playerIndex];

    if (!this.vira) return;

    // Auto-cantar flor al jugar la primera carta si la tiene y no la ha cantado
    if (this.turnManager.getBazaCount() === 0 && !this.florPlayed && !this.envidoPlayed && EnvidoCalc.hasFlor(player.getHand(), this.vira)) {
      this.pendingCardPlay = { playerIndex, cardId };
      this.declareFlor(playerIndex);
      return;
    }

    const card = player.playCardById(cardId);
    const team = this.getPlayerTeam(playerIndex);
    const side = team === 'team1' ? 'player' : 'cpu';

    this.turnManager.playCard(side, card);

    this.fsm.forceState(GameState.CARD_PLAYED);

    if (this.onCardPlayed) {
      this.onCardPlayed({
        playerIndex,
        playerName: player.name,
        card,
        team
      });
    }

    // Verificar si la baza está completa
    if (this.turnManager.isBazaComplete()) {
      this._resolveBaza();
    } else {
      // Cambiar turno
      this.turnManager.switchTurn();
      this.fsm.forceState(GameState.WAITING_PLAY);

      // Notificar cambio de turno
      if (this.onStateChange) {
        this.onStateChange(this.getGameState());
      }

      this._checkCPUAction();
    }
  }

  /**
   * Resuelve la baza actual.
   */
  private _resolveBaza(): void {
    if (!this.vira) return;

    const result = this.turnManager.resolveBaza(this.vira);

    this.fsm.forceState(GameState.BAZA_RESOLVED);

    if (this.onBazaResolved) {
      this.onBazaResolved({
        ...result,
        bazaWins: { ...this.turnManager.bazaWins }
      });
    }

    // Verificar si la ronda terminó
    if (this.turnManager.isRoundOver()) {
      this._endRound();
    } else {
      // Delay para que la UI pueda animar la limpieza del tablero
      setTimeout(() => {
        this.fsm.forceState(GameState.WAITING_PLAY);
        if (this.onStateChange) {
          this.onStateChange(this.getGameState());
        }
        this._checkCPUAction();
      }, 1500);
    }
  }

  /**
   * Finaliza la ronda y suma puntos.
   */
  private _endRound(winnerTeamOverride: 'team1' | 'team2' | null = null, isFold = false): void {
    const winnerTeam = winnerTeamOverride || (this.turnManager.getRoundWinner() === 'player' ? 'team1' : 'team2');

    // Puntos base de la ronda (sin truco = 1 punto)
    let roundPoints = 1;
    if (!isFold) {
      if (this.trucoLevel) {
        roundPoints = this.scoreManager.getTrucoPoints(this.trucoLevel, this.getOpponentTeam(winnerTeam));
      }
      this.scoreManager.addPoints(winnerTeam, roundPoints, `Ronda ${this.roundNumber}`);
    } else {
      roundPoints = 1;
    }

    if (this.deferredEnvidoResult || this.deferredFlorResult) {
      this._revealDeferredResults();
    }

    this.fsm.forceState(GameState.ROUND_END);

    if (this.onScoreUpdate) {
      this.onScoreUpdate({
        scores: { ...this.scoreManager.scores },
        targetScore: this.config.targetScore,
        lastPoints: { team: winnerTeam, points: roundPoints, reason: `Ronda ${this.roundNumber}` }
      });
    }

    if (this.onRoundEnd) {
      this.onRoundEnd({
        winner: winnerTeam,
        roundNumber: this.roundNumber,
        roundPoints,
        scores: { ...this.scoreManager.scores }
      });
    }

    // Verificar si la partida terminó
    const gameWinner = this.scoreManager.getWinner();
    if (gameWinner) {
      this.fsm.forceState(GameState.GAME_OVER);
      if (this.onGameOver) {
        this.onGameOver({
          winner: gameWinner,
          winnerName: this.config.teamNames[gameWinner === 'team1' ? 0 : 1],
          finalScores: { ...this.scoreManager.scores },
          totalRounds: this.roundNumber
        });
      }
    }
  }

  /**
   * Avanza a la siguiente ronda (llamado por la UI después de mostrar resultados).
   */
  public nextRound(): void {
    if (this.scoreManager.getWinner()) return;
    this.fsm.forceState(GameState.ROUND_START);
    this.startRound();
  }

  /**
   * Un jugador abandona la mano.
   */
  public foldHand(playerIndex: number): void {
    if (this.fsm.getState() !== GameState.WAITING_PLAY) return;
    const foldTeam = this.getPlayerTeam(playerIndex);
    const winnerTeam = this.getOpponentTeam(foldTeam);
    
    // Añadir 1 punto por retirarse
    this.scoreManager.addPoints(winnerTeam, 1, `Oponente se fue al mazo`);
    
    this.fsm.forceState(GameState.HAND_FOLDED);
    
    if (this.onFoldHand) {
      this.onFoldHand({
        playerIndex,
        playerName: this.players[playerIndex].name,
        team: foldTeam
      });
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate({
        scores: { ...this.scoreManager.scores },
        targetScore: this.config.targetScore,
        lastPoints: { team: winnerTeam, points: 1, reason: `Oponente se fue al mazo` }
      });
    }
    
    this._endRound(winnerTeam, true);
  }

  // ─────────────── CANTOS ───────────────

  /**
   * Un jugador canta Truco (o sube la apuesta).
   */
  public callTruco(callerIndex: number): void {
    const callerTeam = this.getPlayerTeam(callerIndex);

    // No puede subir su propia apuesta
    if (this.trucoCallerTeam === callerTeam && this.trucoLevel) return;

    const nextLevel = this._getNextTrucoLevel();
    if (!nextLevel) return;

    this.trucoLevel = nextLevel;
    this.trucoCallerTeam = callerTeam;

    const stateMap: Record<string, GameStateType> = {
      truco: GameState.TRUCO_OFFERED,
      retruco: GameState.RETRUCO_OFFERED,
      vale9: GameState.VALE9_OFFERED,
      vale_juego: GameState.VALE_JUEGO_OFFERED,
    };

    this.fsm.forceState(stateMap[nextLevel]);

    if (this.onCantoOffered) {
      this.onCantoOffered({
        type: 'truco',
        level: nextLevel,
        callerIndex,
        callerName: this.players[callerIndex].name,
        callerTeam,
        respondingTeam: this.getOpponentTeam(callerTeam)
      });
    }

    // Si el oponente es CPU, responder automáticamente
    this._checkCPUCantoResponse('truco', nextLevel, callerTeam);
  }

  /**
   * Un jugador canta Envido.
   */
  public callEnvido(callerIndex: number, level: 'envido' | 'envido_5' | 'falta_envido' = 'envido'): void {
    if (this.envidoPlayed) return;
    if (this.turnManager.getBazaCount() > 0) return; // Solo primera baza
    if (!this.vira) return;

    // Si el jugador tiene flor, no puede cantar envido (debe cantar flor)
    const callerPlayer = this.players[callerIndex];
    if (EnvidoCalc.hasFlor(callerPlayer.getHand(), this.vira)) return;

    const callerTeam = this.getPlayerTeam(callerIndex);
    this.envidoLevel = level;
    this.envidoCallerTeam = callerTeam;

    const stateMap: Record<string, GameStateType> = {
      envido: GameState.ENVIDO_OFFERED,
      envido_5: GameState.ENVIDO_5_OFFERED,
      falta_envido: GameState.FALTA_ENVIDO_OFFERED,
    };

    this.fsm.forceState(stateMap[level]);

    if (this.onCantoOffered) {
      this.onCantoOffered({
        type: 'envido',
        level,
        callerIndex,
        callerName: this.players[callerIndex].name,
        callerTeam,
        respondingTeam: this.getOpponentTeam(callerTeam)
      });
    }

    this._checkCPUCantoResponse('envido', level, callerTeam);
  }

  /**
   * Declara Flor.
   */
  public declareFlor(callerIndex: number): void {
    if (this.florPlayed) return;
    if (this.turnManager.getBazaCount() > 0) return; // Solo primera baza
    if (!this.vira) return;

    const player = this.players[callerIndex];
    if (!EnvidoCalc.hasFlor(player.getHand(), this.vira)) return;

    const callerTeam = this.getPlayerTeam(callerIndex);
    this.florPlayed = true;
    
    // Si se cantó envido previamente, la flor lo anula
    if (this._isEnvidoState(this.fsm.getState())) {
      if (this.onMessage) {
        this.onMessage("Envido cancelado por Flor");
      }
    }
    
    this.envidoPlayed = true; // Flor anula envido

    this.fsm.forceState(GameState.FLOR_DECLARED);

    // Verificar si el oponente también tiene flor
    const opponentTeam = this.getOpponentTeam(callerTeam);
    const opponentPlayers = this.config.getTeamPlayers(opponentTeam);
    let opponentHasFlor = false;

    for (const op of opponentPlayers) {
      const opPlayer = this.players[op.index];
      if (EnvidoCalc.hasFlor(opPlayer.getHand(), this.vira)) {
        opponentHasFlor = true;
        break;
      }
    }

    if (opponentHasFlor) {
      if (this.onCantoOffered) {
        this.onCantoOffered({
          type: 'flor',
          callerIndex,
          callerName: player.name,
          callerTeam,
          respondingTeam: opponentTeam,
          opponentHasFlor: true
        });
      }
      this._checkCPUCantoResponse('flor', null, callerTeam);
    } else {
      if (this.onCantoOffered) {
        this.onCantoOffered({
          type: 'flor',
          callerIndex,
          callerName: player.name,
          callerTeam,
          respondingTeam: opponentTeam,
          opponentHasFlor: false
        });
      }
      // Esperar respuesta en lugar de resolver de inmediato, para el UI popup
      if (!this.config.isHuman(opponentPlayers[0].index)) {
        this._resolveFlor(callerTeam, false);
      }
    }
  }

  /**
   * Responde a un canto (Quiero / No Quiero / Subir).
   */
  public respondToCanto(responderIndex: number, response: 'quiero' | 'no_quiero' | 'raise' | 'contraflor', raiseLevel?: string): void {
    const currentState = this.fsm.getState();

    // Determinar qué tipo de canto se está respondiendo
    if (this._isTrucoState(currentState)) {
      this._respondToTruco(responderIndex, response as any, raiseLevel);
    } else if (this._isEnvidoState(currentState)) {
      this._respondToEnvido(responderIndex, response as any, raiseLevel);
    } else if (currentState === GameState.FLOR_DECLARED || currentState === GameState.CONTRAFLOR_OFFERED) {
      this._respondToFlor(responderIndex, response as any);
    }
  }

  private _respondToTruco(responderIndex: number, response: 'quiero' | 'no_quiero' | 'raise', raiseLevel?: string): void {
    const responderTeam = this.getPlayerTeam(responderIndex);

    if (response === 'quiero') {
      if (!this.trucoLevel) return;
      // Aceptar truco al nivel actual
      const acceptStates: Record<string, GameStateType> = {
        truco: GameState.TRUCO_ACCEPTED,
        retruco: GameState.RETRUCO_ACCEPTED,
        vale9: GameState.VALE9_ACCEPTED,
        vale_juego: GameState.VALE_JUEGO_ACCEPTED,
      };
      this.fsm.forceState(acceptStates[this.trucoLevel]);

      if (this.onCantoResolved) {
        this.onCantoResolved({
          type: 'truco',
          level: this.trucoLevel,
          accepted: true,
          responderName: this.players[responderIndex].name
        });
      }

      this.fsm.forceState(GameState.WAITING_PLAY);
      if (this.onStateChange) this.onStateChange(this.getGameState());
      this._checkCPUAction();

    } else if (response === 'no_quiero') {
      // Rechazar truco - el equipo que cantó gana los puntos del nivel anterior
      const callerTeam = this.trucoCallerTeam;
      if (!callerTeam) return;
      const rejectedPoints = this._getTrucoRejectedPoints();

      this.scoreManager.addPoints(callerTeam, rejectedPoints, `Truco rechazado (${this.trucoLevel})`);

      if (this.onCantoResolved) {
        this.onCantoResolved({
          type: 'truco',
          level: this.trucoLevel || undefined,
          accepted: false,
          responderName: this.players[responderIndex].name,
          points: rejectedPoints,
          winnerTeam: callerTeam
        });
      }

      if (this.onScoreUpdate) {
        this.onScoreUpdate({
          scores: { ...this.scoreManager.scores },
          targetScore: this.config.targetScore,
          lastPoints: { team: callerTeam, points: rejectedPoints, reason: `${this.trucoLevel} rechazado` }
        });
      }

      this._endRoundByReject(callerTeam, rejectedPoints);

    } else if (response === 'raise') {
      // Subir la apuesta
      this.callTruco(responderIndex);
    }
  }

  private _respondToEnvido(responderIndex: number, response: 'quiero' | 'no_quiero' | 'raise', raiseLevel?: string): void {
    const responderTeam = this.getPlayerTeam(responderIndex);

    if (response === 'quiero') {
      this.envidoPlayed = true;
      this._resolveEnvido();

    } else if (response === 'no_quiero') {
      this.envidoPlayed = true;
      const callerTeam = this.envidoCallerTeam;
      if (!callerTeam) return;

      // Calcular puntos basados en el nivel del envido rechazado
      let rejectedPoints = 1;
      if (this.envidoLevel === 'envido_5') {
        rejectedPoints = 2; // Rechazar un Envido 5 vale 2 puntos
      } else if (this.envidoLevel === 'falta_envido') {
        rejectedPoints = 2;
      }

      this.scoreManager.addPoints(callerTeam, rejectedPoints, `Envido rechazado (${this.envidoLevel})`);

      if (this.onCantoResolved) {
        this.onCantoResolved({
          type: 'envido',
          level: this.envidoLevel || undefined,
          accepted: false,
          responderName: this.players[responderIndex].name,
          points: rejectedPoints,
          winnerTeam: callerTeam
        });
      }

      if (this.onScoreUpdate) {
        this.onScoreUpdate({
          scores: { ...this.scoreManager.scores },
          targetScore: this.config.targetScore,
          lastPoints: { team: callerTeam, points: rejectedPoints, reason: 'Envido rechazado' }
        });
      }

      this.fsm.forceState(GameState.ENVIDO_RESOLVED);
      this.fsm.forceState(GameState.WAITING_PLAY);
      if (this.onStateChange) this.onStateChange(this.getGameState());
      this._checkCPUAction();

    } else if (response === 'raise') {
      // Subir envido
      this.callEnvido(responderIndex, raiseLevel as any);
    }
  }

  private _respondToFlor(responderIndex: number, response: 'contraflor' | 'quiero' | 'no_quiero'): void {
    const responderTeam = this.getPlayerTeam(responderIndex);

    if (response === 'contraflor') {
      this.fsm.forceState(GameState.CONTRAFLOR_OFFERED);
      // Resolver contraflor comparando puntos
      this._resolveFlor(null, true);
    } else {
      // Aceptar flor del caller (dar 3 puntos)
      const callerTeam = this.getOpponentTeam(responderTeam);
      this._resolveFlor(callerTeam, false);
    }
  }

  /**
   * Resuelve el envido comparando puntos.
   */
  private _resolveEnvido(): void {
    if (!this.vira) return;

    let team1Points = 0;
    let team2Points = 0;
    let team1Cards: Card[] = [];
    let team2Cards: Card[] = [];

    const t1Players = this.config.getTeamPlayers('team1');
    const t2Players = this.config.getTeamPlayers('team2');

    for (const p of t1Players) {
      const hand = this.players[p.index].getHand();
      const pts = EnvidoCalc.calculate(hand, this.vira);
      if (pts > team1Points || team1Cards.length === 0) {
        team1Points = pts;
        team1Cards = hand;
      }
    }
    for (const p of t2Players) {
      const hand = this.players[p.index].getHand();
      const pts = EnvidoCalc.calculate(hand, this.vira);
      if (pts > team2Points || team2Cards.length === 0) {
        team2Points = pts;
        team2Cards = hand;
      }
    }

    // Determinar ganador (en empate, gana el mano)
    let winnerTeam: 'team1' | 'team2';
    if (team1Points > team2Points) {
      winnerTeam = 'team1';
    } else if (team2Points > team1Points) {
      winnerTeam = 'team2';
    } else {
      // Empate: gana el mano (primer jugador que es mano pertenece al equipo mano)
      winnerTeam = this.manoIndex % 2 === 1 ? 'team1' : 'team2';
    }

    // Calcular puntos
    let points;
    const loserTeam = this.getOpponentTeam(winnerTeam);
    if (this.envidoLevel === 'falta_envido') {
      points = this.scoreManager.getFaltaEnvidoPoints(loserTeam);
    } else {
      points = this.envidoLevel === 'envido_5' ? 5 : 2;
    }

    if (!this.envidoLevel) return;

    // Guardar resultado diferido
    this.deferredEnvidoResult = {
      winnerTeam,
      team1Points,
      team2Points,
      points,
      level: this.envidoLevel,
      team1Cards,
      team2Cards
    };

    if (this.onCantoResolved) {
      this.onCantoResolved({
        type: 'envido',
        level: this.envidoLevel,
        accepted: true,
        responderName: '',
        winnerTeam: null, // Diferido
        deferred: true
      });
    }

    this.fsm.forceState(GameState.ENVIDO_RESOLVED);
    this.fsm.forceState(GameState.WAITING_PLAY);
    if (this.onStateChange) this.onStateChange(this.getGameState());
    this._checkCPUAction();
  }

  /**
   * Resuelve la flor.
   */
  private _resolveFlor(winnerTeam: 'team1' | 'team2' | null, isContraflor: boolean): void {
    if (!this.vira) return;

    let points = isContraflor ? 6 : 3;
    let team1Flor = 0;
    let team2Flor = 0;
    let team1Cards: Card[] | null = null;
    let team2Cards: Card[] | null = null;

    // Guardar los puntos y cartas de cada equipo que tenga flor
    for (const p of this.config.getTeamPlayers('team1')) {
      const player = this.players[p.index];
      if (EnvidoCalc.hasFlor(player.getHand(), this.vira)) {
        team1Flor = Math.max(team1Flor, EnvidoCalc.calculateFlor(player.getHand(), this.vira));
        team1Cards = player.getHand();
      }
    }
    for (const p of this.config.getTeamPlayers('team2')) {
      const player = this.players[p.index];
      if (EnvidoCalc.hasFlor(player.getHand(), this.vira)) {
        team2Flor = Math.max(team2Flor, EnvidoCalc.calculateFlor(player.getHand(), this.vira));
        team2Cards = player.getHand();
      }
    }

    if (isContraflor) {
      winnerTeam = team1Flor >= team2Flor ? 'team1' : 'team2';
    }

    this.deferredFlorResult = {
      winnerTeam: winnerTeam || 'team1', // Fallback
      points,
      isContraflor,
      team1Flor,
      team2Flor,
      team1Cards,
      team2Cards
    };

    if (this.onCantoResolved) {
      this.onCantoResolved({
        type: 'flor',
        accepted: !isContraflor,
        responderName: '',
        winnerTeam: null, // Diferido
        points: undefined,
        deferred: true
      });
    }

    this.fsm.forceState(GameState.FLOR_RESOLVED);
    this.fsm.forceState(GameState.WAITING_PLAY);
    if (this.onStateChange) this.onStateChange(this.getGameState());

    if (this.pendingCardPlay) {
      const { playerIndex, cardId } = this.pendingCardPlay;
      this.pendingCardPlay = null;
      setTimeout(() => {
        this.playCard(playerIndex, cardId);
      }, 500);
    } else {
      this._checkCPUAction();
    }
  }

  // ─────────────── LÓGICA CPU ───────────────

  /**
   * Verifica si es turno de una CPU y ejecuta su acción.
   */
  private _checkCPUAction(): void {
    if (this.fsm.getState() !== GameState.WAITING_PLAY) return;

    const currentTurn = this.turnManager.getCurrentTurn();
    if (!currentTurn) return;

    const cpuIndex = currentTurn === 'player' ? 0 : 1;

    if (!this.config.isHuman(cpuIndex)) {
      const delay = 800 + Math.random() * 600;
      this._cpuActionTimer = setTimeout(() => {
        // Verificar nuevamente que el estado siga siendo válido antes de actuar
        if (this.fsm.getState() === GameState.WAITING_PLAY &&
            this.turnManager.getCurrentTurn() === currentTurn) {
          this._executeCPUTurn(cpuIndex);
        }
      }, delay);
    }
  }

  /**
   * Ejecuta el turno de una CPU.
   */
  private _executeCPUTurn(cpuIndex: number): void {
    if (this.fsm.getState() !== GameState.WAITING_PLAY) return;
    if (!this.vira) return;

    const cpu = this.players[cpuIndex];
    if (!(cpu instanceof CPUPlayer)) return;
    if (cpu.cardsRemaining === 0) return;

    // Verificar que realmente es el turno de esta CPU
    const currentTurn = this.turnManager.getCurrentTurn();
    const expectedSide = cpuIndex === 0 ? 'player' : 'cpu';
    if (currentTurn !== expectedSide) return;

    // Declarar flor si la tiene
    if (!this.florPlayed && this.turnManager.getBazaCount() === 0 && EnvidoCalc.hasFlor(cpu.getHand(), this.vira)) {
      this.declareFlor(cpuIndex);
      return;
    }

    // Decidir si cantar envido
    if (!this.envidoPlayed && this.turnManager.getBazaCount() === 0 && !this.turnManager.currentBaza.player && !this.turnManager.currentBaza.cpu) {
      if (cpu.shouldCallEnvido(cpu.getHand(), this.vira)) {
        this.callEnvido(cpuIndex, 'envido');
        return;
      }
    }

    // Decidir si cantar truco
    if (!this.trucoLevel || this.trucoCallerTeam !== this.getPlayerTeam(cpuIndex)) {
      if (cpu.shouldCallTruco(this.vira, this.trucoLevel)) {
        this.callTruco(cpuIndex);
        return;
      }
    }

    // Jugar carta
    const opponentCard = this.turnManager.currentBaza.player;
    const cardIndex = cpu.chooseCard(this.vira, opponentCard);
    const card = cpu.getHand()[cardIndex];
    if (!card) return;
    this.playCard(cpuIndex, card.id);
  }

  /**
   * Verifica si la CPU debe responder a un canto.
   */
  private _checkCPUCantoResponse(cantoType: 'truco' | 'envido' | 'flor', level: string | null, callerTeamOverride: 'team1' | 'team2' | null): void {
    if (!this.vira) return;

    // Determinar el equipo que CANTÓ
    let callerTeam: 'team1' | 'team2' | null = null;
    if (callerTeamOverride) {
      callerTeam = callerTeamOverride;
    } else if (cantoType === 'truco') {
      callerTeam = this.trucoCallerTeam;
    } else {
      callerTeam = this.envidoCallerTeam;
    }

    if (!callerTeam) return; // Sin caller, no hay respuesta

    const respondingTeam = this.getOpponentTeam(callerTeam);
    const respondingPlayers = this.config.getTeamPlayers(respondingTeam);

    // Buscar el primer CPU que responde
    for (const p of respondingPlayers) {
      if (p.type === 'cpu') {
        setTimeout(() => {
          // Verificar que el estado siga siendo válido para responder
          const currentState = this.fsm.getState();
          const isValidState = this._isTrucoState(currentState) ||
                               this._isEnvidoState(currentState) ||
                               currentState === GameState.FLOR_DECLARED ||
                               currentState === GameState.CONTRAFLOR_OFFERED;
          if (!isValidState) return;
          if (!this.vira) return;

          const cpu = this.players[p.index];
          if (!(cpu instanceof CPUPlayer)) return;

          let response: 'quiero' | 'no_quiero' | 'raise' | 'contraflor';
          if (cantoType === 'truco') {
            response = cpu.respondToTruco(this.vira, level || 'truco');
          } else if (cantoType === 'flor') {
            response = cpu.respondToFlor(cpu.getHand(), this.vira);
          } else {
            response = cpu.respondToEnvido(cpu.getHand(), this.vira, level || 'envido');
          }

          if (response === 'raise') {
            if (cantoType === 'truco') {
              const nextLevel = this._getNextTrucoLevel();
              if (nextLevel) {
                this.respondToCanto(p.index, 'raise', nextLevel);
              } else {
                this.respondToCanto(p.index, 'quiero');
              }
            } else {
              const nextEnvido = this._getNextEnvidoLevel();
              if (nextEnvido) {
                this.respondToCanto(p.index, 'raise', nextEnvido);
              } else {
                this.respondToCanto(p.index, 'quiero');
              }
            }
          } else if (response === 'contraflor') {
            this.respondToCanto(p.index, 'contraflor');
          } else {
            this.respondToCanto(p.index, response);
          }
        }, 1000 + Math.random() * 500);
        return;
      }
    }
  }

  // ─────────────── UTILIDADES ───────────────

  private _getNextTrucoLevel(): 'truco' | 'retruco' | 'vale9' | 'vale_juego' | null {
    const levels: (string | null)[] = [null, 'truco', 'retruco', 'vale9', 'vale_juego'];
    const currentIdx = levels.indexOf(this.trucoLevel);
    if (currentIdx >= levels.length - 1) return null;
    return levels[currentIdx + 1] as any;
  }

  private _getNextEnvidoLevel(): 'envido' | 'envido_5' | 'falta_envido' | null {
    const levels: (string | null)[] = ['envido', 'envido_5', 'falta_envido'];
    if (!this.envidoLevel) return 'envido';
    const currentIdx = levels.indexOf(this.envidoLevel);
    if (currentIdx >= levels.length - 1) return null;
    return levels[currentIdx + 1] as any;
  }

  private _getTrucoRejectedPoints(): number {
    const pointsMap: Record<string, number> = { truco: 1, retruco: 3, vale9: 6, vale_juego: 9 };
    return this.trucoLevel ? (pointsMap[this.trucoLevel] || 1) : 1;
  }

  private _isTrucoState(state: GameStateType): boolean {
    return ( [
      GameState.TRUCO_OFFERED, GameState.RETRUCO_OFFERED,
      GameState.VALE9_OFFERED, GameState.VALE_JUEGO_OFFERED
    ] as readonly GameStateType[] ).includes(state);
  }

  private _isEnvidoState(state: GameStateType): boolean {
    return ( [
      GameState.ENVIDO_OFFERED, GameState.ENVIDO_5_OFFERED,
      GameState.FALTA_ENVIDO_OFFERED
    ] as readonly GameStateType[] ).includes(state);
  }

  private _revealDeferredResults(): void {
    if (this.deferredEnvidoResult) {
      const { winnerTeam, points, level } = this.deferredEnvidoResult;
      this.scoreManager.addPoints(winnerTeam, points, `Envido ganado (${level})`);
      if (this.onScoreUpdate) {
        this.onScoreUpdate({
          scores: { ...this.scoreManager.scores },
          targetScore: this.config.targetScore,
          lastPoints: { team: winnerTeam, points, reason: `Envido (${level})` }
        });
      }
    }
    
    if (this.deferredFlorResult) {
      const { winnerTeam, points, isContraflor } = this.deferredFlorResult;
      this.scoreManager.addPoints(winnerTeam, points, isContraflor ? 'Contraflor ganada' : 'Flor');
      if (this.onScoreUpdate) {
        this.onScoreUpdate({
          scores: { ...this.scoreManager.scores },
          targetScore: this.config.targetScore,
          lastPoints: { team: winnerTeam, points, reason: isContraflor ? 'Contraflor' : 'Flor' }
        });
      }
    }

    if (this.onDeferredReveal) {
      this.onDeferredReveal({
        envido: this.deferredEnvidoResult,
        flor: this.deferredFlorResult
      });
    }
    
    this.deferredEnvidoResult = null;
    this.deferredFlorResult = null;
  }

  private _endRoundByReject(winnerTeam: 'team1' | 'team2', roundPoints: number): void {
    if (this.deferredEnvidoResult || this.deferredFlorResult) {
      this._revealDeferredResults();
    }

    this.fsm.forceState(GameState.ROUND_END);

    if (this.onRoundEnd) {
      this.onRoundEnd({
        winner: winnerTeam,
        roundNumber: this.roundNumber,
        roundPoints,
        byReject: true,
        scores: { ...this.scoreManager.scores }
      });
    }

    const gameWinner = this.scoreManager.getWinner();
    if (gameWinner) {
      this.fsm.forceState(GameState.GAME_OVER);
      if (this.onGameOver) {
        this.onGameOver({
          winner: gameWinner,
          winnerName: this.config.teamNames[gameWinner === 'team1' ? 0 : 1],
          finalScores: { ...this.scoreManager.scores },
          totalRounds: this.roundNumber
        });
      }
    }
  }

  // ─────────────── ESTADO DEL JUEGO ───────────────

  /**
   * Obtiene el estado actual del juego para la UI.
   */
  public getGameState(): any {
    return {
      state: this.fsm.getState(),
      roundNumber: this.roundNumber,
      vira: this.vira,
      scores: { ...this.scoreManager.scores },
      targetScore: this.config.targetScore,
      trucoLevel: this.trucoLevel,
      envidoPlayed: this.envidoPlayed,
      florPlayed: this.florPlayed,
      currentTurn: this.turnManager.getCurrentTurn(),
      bazaCount: this.turnManager.getBazaCount(),
      bazaWins: { ...this.turnManager.bazaWins },
      currentBaza: { ...this.turnManager.currentBaza },
      players: this.players.map((p, i) => ({
        name: p.name,
        cardsRemaining: p.cardsRemaining,
        isHuman: this.config.isHuman(i),
        index: i,
        team: this.getPlayerTeam(i)
      })),
      mode: this.config.mode
    };
  }

  /**
   * Obtiene las acciones disponibles para un jugador humano.
   */
  public getAvailableActions(playerIndex: number): string[] {
    const actions: string[] = [];
    const state = this.fsm.getState();
    const playerTeam = this.getPlayerTeam(playerIndex);

    if (state === GameState.WAITING_PLAY) {
      const currentTurn = this.turnManager.getCurrentTurn();
      const isMyTurn = (currentTurn === 'player' && playerTeam === 'team1') ||
                       (currentTurn === 'cpu' && playerTeam === 'team2');

      if (isMyTurn && this.players[playerIndex].cardsRemaining > 0) {
        actions.push('play_card');
      }

      // Los cantos (truco, envido, flor) y el irse al mazo
      // solo están disponibles en el propio turno
      if (isMyTurn) {
        // Envido solo en primera baza, y no si el jugador tiene flor
        if (!this.envidoPlayed && this.turnManager.getBazaCount() === 0) {
          const playerHand = this.players[playerIndex].getHand();
          if (this.vira) {
            const playerHasFlor = EnvidoCalc.hasFlor(playerHand, this.vira);
            if (!playerHasFlor) {
              actions.push('envido', 'envido_5', 'falta_envido');
            }
          }
        }

        // Truco
        if (!this.trucoLevel || this.trucoCallerTeam !== playerTeam) {
          const nextTruco = this._getNextTrucoLevel();
          if (nextTruco) actions.push(nextTruco);
        }

        // Flor — solo primera baza
        if (this.vira && !this.florPlayed && this.turnManager.getBazaCount() === 0 && EnvidoCalc.hasFlor(this.players[playerIndex].getHand(), this.vira)) {
          actions.push('flor');
        }

        // Irse al mazo
        if (this.players[playerIndex].cardsRemaining > 0) {
          actions.push('fold_hand');
        }
      }
    }

    // Responder a cantos
    if (this._isTrucoState(state) && this.trucoCallerTeam !== playerTeam) {
      actions.push('quiero', 'no_quiero');
      const nextTruco = this._getNextTrucoLevel();
      if (nextTruco) actions.push(nextTruco);
    }

    if (this._isEnvidoState(state) && this.envidoCallerTeam !== playerTeam) {
      actions.push('quiero', 'no_quiero');
      const nextEnvido = this._getNextEnvidoLevel();
      if (nextEnvido) actions.push(nextEnvido);
    }

    return actions;
  }
}
