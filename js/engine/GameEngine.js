/**
 * GameEngine.js — Motor Principal del Truco Venezolano
 * Orquesta toda la lógica del juego: rondas, bazas, cantos y puntuación.
 * Soporta modos: vs CPU, 1v1 Local, 2v2 Equipos.
 */

import { Deck } from './Deck.js';
import { Player } from './Player.js';
import { CPUPlayer } from './CPUPlayer.js';
import { ScoreManager } from './ScoreManager.js';
import { EnvidoCalc } from './EnvidoCalc.js';
import { FSM, GameState } from './FSM.js';
import { TurnManager } from './TurnManager.js';
import { GameMode } from './GameConfig.js';

export class GameEngine {
  /**
   * @param {GameConfig} config - Configuración de la partida
   */
  constructor(config) {
    this.config = config;
    this.deck = new Deck();
    this.scoreManager = new ScoreManager(config.targetScore);
    this.fsm = new FSM();
    this.turnManager = new TurnManager();

    // Crear jugadores según el modo
    this.players = [];
    this._createPlayers();

    // Estado de la ronda actual
    this.vira = null;
    this.roundNumber = 0;
    this.manoIndex = 0; // Índice del jugador que es mano (alterna cada ronda)

    // Estado de cantos
    this.trucoLevel = null;       // null | 'truco' | 'retruco' | 'vale9' | 'vale_juego'
    this.trucoCallerTeam = null;  // Equipo que cantó el truco actual
    this.envidoPlayed = false;    // Si ya se jugó envido en esta ronda
    this.florPlayed = false;      // Si ya se declaró flor en esta ronda
    this.envidoLevel = null;      // null | 'envido' | 'envido_5' | 'falta_envido'
    this.envidoCallerTeam = null;
    this.deferredEnvidoResult = null;
    this.deferredFlorResult = null;
    this.pendingCardPlay = null;

    // Callbacks para la UI
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
  }

  /**
   * Crea los jugadores según el modo de juego.
   */
  _createPlayers() {
    const comp = this.config.teamComposition;
    const allPlayers = [...comp.team1, ...comp.team2];

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
   * @param {number} playerIndex
   * @returns {'team1'|'team2'}
   */
  getPlayerTeam(playerIndex) {
    return this.config.getPlayerTeam(playerIndex);
  }

  /**
   * Obtiene el equipo contrario.
   * @param {'team1'|'team2'} team
   * @returns {'team1'|'team2'}
   */
  getOpponentTeam(team) {
    return team === 'team1' ? 'team2' : 'team1';
  }

  // ─────────────── INICIO DE PARTIDA ───────────────

  /**
   * Inicia una nueva partida.
   */
  startGame() {
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
  startRound() {
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

    // Configurar turnos - en modos de 2 jugadores
    const manoTeam = this.manoIndex % 2 === 0 ? 'team1' : 'team2';
    // El jugador mano es el primer jugador del equipo mano
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
   * @param {number} playerIndex - Índice del jugador
   * @param {string} cardId - ID de la carta a jugar
   */
  playCard(playerIndex, cardId) {
    const player = this.players[playerIndex];

    // Auto-cantar flor al jugar la primera carta si la tiene y no la ha cantado
    if (this.turnManager.getBazaCount() === 0 && !this.florPlayed && EnvidoCalc.hasFlor(player.getHand(), this.vira)) {
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

      // En modo 1v1 local, mostrar pantalla de transición
      if (this.config.needsTurnTransition()) {
        const nextPlayerIdx = this.turnManager.getCurrentTurn() === 'player' ? 0 : 1;
        if (this.onTurnTransition) {
          this.onTurnTransition({
            nextPlayer: this.players[nextPlayerIdx].name,
            nextPlayerIndex: nextPlayerIdx
          });
        }
      }

      this._checkCPUAction();
    }
  }

  /**
   * Resuelve la baza actual.
   */
  _resolveBaza() {
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
      // Delay so UI can animate clearing the board
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
  _endRound(winnerTeamOverride = null, isFold = false) {
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
  nextRound() {
    if (this.scoreManager.getWinner()) return;
    this.fsm.forceState(GameState.ROUND_START);
    this.startRound();
  }

  /**
   * Un jugador abandona la mano.
   */
  foldHand(playerIndex) {
    if (this.fsm.getState() !== GameState.WAITING_PLAY) return;
    const foldTeam = this.getPlayerTeam(playerIndex);
    const winnerTeam = this.getOpponentTeam(foldTeam);
    
    // Add 1 point for folding
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
   * @param {number} callerIndex - Índice del jugador que canta
   */
  callTruco(callerIndex) {
    const callerTeam = this.getPlayerTeam(callerIndex);

    // No puede subir su propia apuesta
    if (this.trucoCallerTeam === callerTeam && this.trucoLevel) return;

    const nextLevel = this._getNextTrucoLevel();
    if (!nextLevel) return;

    this.trucoLevel = nextLevel;
    this.trucoCallerTeam = callerTeam;

    const stateMap = {
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
   * @param {number} callerIndex
   * @param {string} level - 'envido' | 'real_envido' | 'falta_envido'
   */
  callEnvido(callerIndex, level = 'envido') {
    if (this.envidoPlayed) return;
    if (this.turnManager.getBazaCount() > 0) return; // Solo primera baza

    const callerTeam = this.getPlayerTeam(callerIndex);
    this.envidoLevel = level;
    this.envidoCallerTeam = callerTeam;

    const stateMap = {
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
   * @param {number} callerIndex
   */
  declareFlor(callerIndex) {
    if (this.florPlayed) return;
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
      this._resolveFlor(callerTeam, false);
    }
  }

  /**
   * Responde a un canto (Quiero / No Quiero / Subir).
   * @param {number} responderIndex
   * @param {'quiero'|'no_quiero'|'raise'} response
   * @param {string} [raiseLevel] - Nivel al que sube (si response es 'raise')
   */
  respondToCanto(responderIndex, response, raiseLevel) {
    const currentState = this.fsm.getState();

    // Determinar qué tipo de canto se está respondiendo
    if (this._isTrucoState(currentState)) {
      this._respondToTruco(responderIndex, response, raiseLevel);
    } else if (this._isEnvidoState(currentState)) {
      this._respondToEnvido(responderIndex, response, raiseLevel);
    } else if (currentState === GameState.FLOR_DECLARED || currentState === GameState.CONTRAFLOR_OFFERED) {
      this._respondToFlor(responderIndex, response);
    }
  }

  _respondToTruco(responderIndex, response, raiseLevel) {
    const responderTeam = this.getPlayerTeam(responderIndex);

    if (response === 'quiero') {
      // Aceptar truco al nivel actual
      const acceptStates = {
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
      const rejectedPoints = this._getTrucoRejectedPoints();

      this.scoreManager.addPoints(callerTeam, rejectedPoints, `Truco rechazado (${this.trucoLevel})`);

      if (this.onCantoResolved) {
        this.onCantoResolved({
          type: 'truco',
          level: this.trucoLevel,
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

      this._endRoundByReject(callerTeam);

    } else if (response === 'raise') {
      // Subir la apuesta
      this.trucoCallerTeam = responderTeam;
      this.callTruco(responderIndex);
    }
  }

  _respondToEnvido(responderIndex, response, raiseLevel) {
    const responderTeam = this.getPlayerTeam(responderIndex);

    if (response === 'quiero') {
      this.envidoPlayed = true;
      this._resolveEnvido();

    } else if (response === 'no_quiero') {
      this.envidoPlayed = true;
      const callerTeam = this.envidoCallerTeam;

      this.scoreManager.addPoints(callerTeam, 1, 'Envido rechazado');

      if (this.onCantoResolved) {
        this.onCantoResolved({
          type: 'envido',
          level: this.envidoLevel,
          accepted: false,
          responderName: this.players[responderIndex].name,
          points: 1,
          winnerTeam: callerTeam
        });
      }

      if (this.onScoreUpdate) {
        this.onScoreUpdate({
          scores: { ...this.scoreManager.scores },
          targetScore: this.config.targetScore,
          lastPoints: { team: callerTeam, points: 1, reason: 'Envido rechazado' }
        });
      }

      this.fsm.forceState(GameState.ENVIDO_RESOLVED);
      this.fsm.forceState(GameState.WAITING_PLAY);
      if (this.onStateChange) this.onStateChange(this.getGameState());
      this._checkCPUAction();

    } else if (response === 'raise') {
      // Subir envido
      this.envidoCallerTeam = responderTeam;
      this.callEnvido(responderIndex, raiseLevel);
    }
  }

  _respondToFlor(responderIndex, response) {
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
  _resolveEnvido() {
    let team1Points = 0;
    let team2Points = 0;
    let team1Cards = null;
    let team2Cards = null;

    const t1Players = this.config.getTeamPlayers('team1');
    const t2Players = this.config.getTeamPlayers('team2');

    for (const p of t1Players) {
      const hand = this.players[p.index].getHand();
      const pts = EnvidoCalc.calculate(hand, this.vira);
      if (pts > team1Points || (pts === team1Points && !team1Cards)) {
        team1Points = pts;
        team1Cards = hand;
      }
    }
    for (const p of t2Players) {
      const hand = this.players[p.index].getHand();
      const pts = EnvidoCalc.calculate(hand, this.vira);
      if (pts > team2Points || (pts === team2Points && !team2Cards)) {
        team2Points = pts;
        team2Cards = hand;
      }
    }

    // Determinar ganador (en empate, gana el mano)
    let winnerTeam;
    if (team1Points > team2Points) {
      winnerTeam = 'team1';
    } else if (team2Points > team1Points) {
      winnerTeam = 'team2';
    } else {
      // Empate: gana el mano
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
        winnerTeam: null, // Diferido
        team1Points: null,
        team2Points: null,
        points: null,
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
  _resolveFlor(winnerTeam, isContraflor) {
    let points = isContraflor ? 6 : 3;
    let team1Flor = 0;
    let team2Flor = 0;
    let team1Cards = null;
    let team2Cards = null;

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
      winnerTeam,
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
        isContraflor,
        winnerTeam: null, // Diferido
        points: null,
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
  _checkCPUAction() {
    if (this.fsm.getState() !== GameState.WAITING_PLAY) return;

    const currentTurn = this.turnManager.getCurrentTurn();
    const cpuIndex = currentTurn === 'player' ? 0 : 1;

    // En modo 2v2, determinar qué jugador de CPU juega
    if (this.config.mode === GameMode.TEAMS_2V2) {
      // Lógica simplificada: turno alterno dentro del equipo
      // Por ahora usamos el primer jugador CPU disponible
    }

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
   * @param {number} cpuIndex
   */
  _executeCPUTurn(cpuIndex) {
    // Guarda de seguridad: solo actuar si el estado FSM es WAITING_PLAY
    if (this.fsm.getState() !== GameState.WAITING_PLAY) return;

    const cpu = this.players[cpuIndex];
    if (!(cpu instanceof CPUPlayer)) return;
    if (cpu.cardsRemaining === 0) return;

    // Verificar que realmente es el turno de esta CPU
    const currentTurn = this.turnManager.getCurrentTurn();
    const expectedSide = cpuIndex === 0 ? 'player' : 'cpu';
    if (currentTurn !== expectedSide) return;

    // Decidir si cantar envido (solo primera baza, primera jugada)
    if (!this.envidoPlayed && this.turnManager.getBazaCount() === 0 && !this.turnManager.currentBaza.player && !this.turnManager.currentBaza.cpu) {
      if (cpu.shouldCallEnvido(cpu.getHand(), this.vira)) {
        this.callEnvido(cpuIndex, 'envido');
        return;
      }
    }

    // Declarar flor si la tiene (antes de truco, ya que es obligatorio)
    if (!this.florPlayed && EnvidoCalc.hasFlor(cpu.getHand(), this.vira)) {
      this.declareFlor(cpuIndex);
      return;
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
    if (!card) return; // Guarda extra por si getHand() está vacío
    this.playCard(cpuIndex, card.id);
  }

  /**
   * Verifica si la CPU debe responder a un canto.
   * @param {string} cantoType - 'truco'|'envido'|'flor'
   * @param {string|null} level - Nivel del canto
   * @param {string} [callerTeamOverride] - Equipo que cantó (opcional, para forzar)
   */
  _checkCPUCantoResponse(cantoType, level, callerTeamOverride) {
    // Determinar el equipo que CANTÓ
    let callerTeam;
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

          const cpu = this.players[p.index];
          if (!(cpu instanceof CPUPlayer)) return;

          let response;
          if (cantoType === 'truco') {
            response = cpu.respondToTruco(this.vira, level);
          } else if (cantoType === 'flor') {
            response = cpu.respondToFlor(cpu.getHand(), this.vira);
          } else {
            response = cpu.respondToEnvido(cpu.getHand(), this.vira, level);
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
        return; // Solo un CPU responde
      }
    }
  }

  // ─────────────── UTILIDADES ───────────────

  _getNextTrucoLevel() {
    const levels = [null, 'truco', 'retruco', 'vale9', 'vale_juego'];
    const currentIdx = levels.indexOf(this.trucoLevel);
    if (currentIdx >= levels.length - 1) return null;
    return levels[currentIdx + 1];
  }

  _getNextEnvidoLevel() {
    const levels = ['envido', 'envido_5', 'falta_envido'];
    const currentIdx = levels.indexOf(this.envidoLevel);
    if (currentIdx >= levels.length - 1) return null;
    return levels[currentIdx + 1];
  }

  _getTrucoRejectedPoints() {
    const pointsMap = { truco: 1, retruco: 3, vale9: 6, vale_juego: 9 };
    return pointsMap[this.trucoLevel] || 1;
  }

  _isTrucoState(state) {
    return [
      GameState.TRUCO_OFFERED, GameState.RETRUCO_OFFERED,
      GameState.VALE9_OFFERED, GameState.VALE_JUEGO_OFFERED
    ].includes(state);
  }

  _isEnvidoState(state) {
    return [
      GameState.ENVIDO_OFFERED, GameState.ENVIDO_5_OFFERED,
      GameState.FALTA_ENVIDO_OFFERED
    ].includes(state);
  }

  _revealDeferredResults() {
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

  _endRoundByReject(winnerTeam) {
    if (this.deferredEnvidoResult || this.deferredFlorResult) {
      this._revealDeferredResults();
    }

    this.fsm.forceState(GameState.ROUND_END);

    if (this.onRoundEnd) {
      this.onRoundEnd({
        winner: winnerTeam,
        roundNumber: this.roundNumber,
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
  getGameState() {
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
   * @param {number} playerIndex
   * @returns {string[]}
   */
  getAvailableActions(playerIndex) {
    const actions = [];
    const state = this.fsm.getState();
    const playerTeam = this.getPlayerTeam(playerIndex);

    if (state === GameState.WAITING_PLAY) {
      const currentTurn = this.turnManager.getCurrentTurn();
      const isMyTurn = (currentTurn === 'player' && playerTeam === 'team1') ||
                       (currentTurn === 'cpu' && playerTeam === 'team2');

      if (isMyTurn && this.players[playerIndex].cardsRemaining > 0) {
        actions.push('play_card');
      }

      // Envido solo en primera baza
      if (!this.envidoPlayed && this.turnManager.getBazaCount() === 0) {
        actions.push('envido', 'envido_5', 'falta_envido');
      }

      // Truco
      if (!this.trucoLevel || this.trucoCallerTeam !== playerTeam) {
        const nextTruco = this._getNextTrucoLevel();
        if (nextTruco) actions.push(nextTruco);
      }

      // Flor
      if (!this.florPlayed && EnvidoCalc.hasFlor(this.players[playerIndex].getHand(), this.vira)) {
        actions.push('flor');
      }

      // Irse al mazo
      if (this.players[playerIndex].cardsRemaining > 0) {
        actions.push('fold_hand');
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
