/**
 * UIRenderer.js — Orquestador de la Interfaz de Usuario
 * Conecta el GameEngine con todos los componentes visuales (Board, Scoreboard, Dialogs).
 */

import { BoardRenderer } from './BoardRenderer.js';
import { ScoreboardRenderer } from './ScoreboardRenderer.js';
import { DialogRenderer } from './DialogRenderer.js';
import { MenuRenderer } from './MenuRenderer.js';
import { GameState } from '../engine/FSM.js';
import { SoundManager } from './SoundManager.js';

export class UIRenderer {
  /**
   * @param {GameEngine} engine - Motor del juego
   */
  constructor(engine) {
    this.engine = engine;
    this.config = engine.config;

    this.board = new BoardRenderer('board-container');
    this.scoreboard = new ScoreboardRenderer('scoreboard-container');
    this.dialogs = new DialogRenderer();
    this.menu = new MenuRenderer('menu-container');

    this.controlBar = document.getElementById('control-bar');
    
    // Identificar el jugador humano que "mira" la pantalla
    // En vs CPU y 2v2 es index 0. En 1v1 cambia según el turno.
    this.localViewIndex = 0;
  }

  /**
   * Inicializa la interfaz y enlaza los eventos del motor.
   */
  init() {
    this.board.init();
    this.scoreboard.init(this.config.teamNames[0], this.config.teamNames[1], this.config.targetScore);
    
    // Bind engine events
    this.engine.onStateChange = this.handleStateChange.bind(this);
    this.engine.onRoundStart = this.handleRoundStart.bind(this);
    this.engine.onCardPlayed = this.handleCardPlayed.bind(this);
    this.engine.onBazaResolved = this.handleBazaResolved.bind(this);
    this.engine.onRoundEnd = this.handleRoundEnd.bind(this);
    this.engine.onGameOver = this.handleGameOver.bind(this);
    this.engine.onScoreUpdate = this.handleScoreUpdate.bind(this);
    this.engine.onCantoOffered = this.handleCantoOffered.bind(this);
    this.engine.onCantoResolved = this.handleCantoResolved.bind(this);
    this.engine.onTurnTransition = this.handleTurnTransition.bind(this);
    this.engine.onDeferredReveal = this.handleDeferredReveal.bind(this);
    this.engine.onFoldHand = this.handleFoldHand.bind(this);
    this.engine.onMessage = this.handleMessage.bind(this);

    // Initial render
    this.updateAll();
  }

  updateAll() {
    const state = this.engine.getGameState();
    this.board.render(state);
    this.updateControls();
    
    // Renderizar mano local si corresponde
    if (this.config.isHuman(this.localViewIndex)) {
      // Obtener la mano: si el engine expone players[] con getHand(), usarlo.
      // Tanto GameEngine como ClientEngineProxy deben exponer this.players[i].getHand()
      const localPlayerObj = this.engine.players ? this.engine.players[this.localViewIndex] : null;
      const localHand = localPlayerObj && typeof localPlayerObj.getHand === 'function'
        ? localPlayerObj.getHand()
        : null;

      if (localHand && this.board.elements.p1Hand) {
        this.board.renderLocalHand(
          localHand,
          state.vira,
          this.handleCardClick.bind(this)
        );
      }
    }

    // Renderizar mano oponente
    if (this.board.elements.p2Hand) {
      const opponentIdx = this.localViewIndex === 0 ? 1 : 0;
      const opponentState = state.players ? state.players.find(p => {
        const team = this.engine.getPlayerTeam ? this.engine.getPlayerTeam(opponentIdx) : (opponentIdx % 2 === 0 ? 'team1' : 'team2');
        return p.team !== this.engine.getPlayerTeam(this.localViewIndex);
      }) : null;
      const p2Cards = opponentState ? opponentState.cardsRemaining
        : (this.engine.players && this.engine.players[opponentIdx] ? this.engine.players[opponentIdx].cardsRemaining : 0);
      this.board.renderOpponentHand(p2Cards || 0);
    }

    // Actualizar historial de bazas en la mesa
    if (this.board.updateBazaHistory) {
      // GameEngine tiene turnManager.bazas; ClientEngineProxy no.
      // Solo llamar si existe el turnManager.
      if (this.engine.turnManager && this.engine.turnManager.bazas) {
        this.board.updateBazaHistory(this.engine.turnManager.bazas);
      }
    }
  }

  // ─────────────── EVENT HANDLERS (UI -> Engine) ───────────────

  handleCardClick(cardId) {
    const state = this.engine.getGameState();
    if (state.state !== GameState.WAITING_PLAY) return;
    
    // Solo permitir jugar si es mi turno
    const currentTurnTeam = state.currentTurn === 'player' ? 'team1' : 'team2';
    const myTeam = this.engine.getPlayerTeam(this.localViewIndex);
    
    if (currentTurnTeam !== myTeam) return;

    this.engine.playCard(this.localViewIndex, cardId);
  }

  handleActionClick(action) {
    switch (action) {
      case 'truco':
      case 'retruco':
      case 'vale9':
      case 'vale_juego':
        this.engine.callTruco(this.localViewIndex);
        break;
      case 'envido':
      case 'envido_5':
      case 'falta_envido':
        this.engine.callEnvido(this.localViewIndex, action);
        break;
      case 'flor':
        this.engine.declareFlor(this.localViewIndex);
        break;
      case 'fold_hand':
        this.engine.foldHand(this.localViewIndex);
        break;
    }
  }

  // ─────────────── EVENT HANDLERS (Engine -> UI) ───────────────

  handleStateChange(state) {
    this.board.render(state);
    this.updateControls();
    
    // Habilitar/deshabilitar cartas según turno
    const currentTurnTeam = state.currentTurn === 'player' ? 'team1' : 'team2';
    const myTeam = this.engine.getPlayerTeam(this.localViewIndex);
    
    this.board.setCardsEnabled(
      state.state === GameState.WAITING_PLAY && currentTurnTeam === myTeam
    );
  }

  handleRoundStart(data) {
    this.dialogs.showToast('Nueva Ronda');
    SoundManager.playDeal();
    this.updateAll();
  }

  handleCardPlayed(data) {
    SoundManager.playCardPlay();
    
    // Si fue el oponente, actualizamos su mano (quitamos una carta oculta)
    if (data.playerIndex !== this.localViewIndex) {
      const state = this.engine.getGameState();
      const oppIdx = data.playerIndex;
      const oppCards = state.players
        ? (state.players.find(p => p.index === oppIdx) || {}).cardsRemaining
        : 0;
      this.board.renderOpponentHand(oppCards || 0);
    }

    // Animamos la carta jugada
    this.board.playCardAnim(data);
    
    // Si fui yo, re-renderizo mi mano
    if (data.playerIndex === this.localViewIndex) {
      const state = this.engine.getGameState();
      const localPlayerObj = this.engine.players ? this.engine.players[this.localViewIndex] : null;
      const localHand = localPlayerObj && typeof localPlayerObj.getHand === 'function'
        ? localPlayerObj.getHand()
        : [];
      this.board.renderLocalHand(
        localHand,
        state.vira,
        this.handleCardClick.bind(this)
      );
    }
  }

  handleBazaResolved(data) {
    // Sonido según el resultado de la baza
    if (data.winner === 'player') {
      SoundManager.playWin();
    } else if (data.winner === 'cpu') {
      SoundManager.playLose();
    } else {
      SoundManager.playChime();
    }

    setTimeout(() => {
      this.board.clearPlayZone(data.winner === 'player' ? 'team1' : (data.winner === 'cpu' ? 'team2' : 'empate'));
      this.updateAll();
    }, 1500);
  }

  handleRoundEnd(data) {
    setTimeout(() => {
      this.dialogs.showRoundSummary(data, this.config.teamNames, this.lastDeferredReveal, () => {
        this.lastDeferredReveal = null;
        this.engine.nextRound();
      });
    }, 2000);
  }

  handleDeferredReveal(data) {
    this.lastDeferredReveal = data;
  }

  handleFoldHand(data) {
    this.dialogs.showToast(`${data.playerName} se ha ido al mazo.`);
    SoundManager.speak('Me voy al mazo');
    this.updateAll();
  }

  handleMessage(msg) {
    this.dialogs.showToast(msg);
  }

  handleGameOver(data) {
    setTimeout(() => {
      this.dialogs.showGameOver(data, () => {
        window.location.reload(); // Reiniciar app entera
      });
    }, 2500);
  }

  handleScoreUpdate(data) {
    this.scoreboard.update(data.scores, data.targetScore);
    const teamName = this.config.teamNames[data.lastPoints.team === 'team1' ? 0 : 1];
    this.scoreboard.addHistoryItem(teamName, data.lastPoints.points, data.lastPoints.reason);
  }

  handleCantoOffered(data) {
    // Generar voz cantando la jugada
    let voiceText = '';
    if (data.type === 'truco') voiceText = `¡${data.level}!`;
    else if (data.type === 'envido') voiceText = `¡${data.level.replace('_', ' ')}!`;
    else if (data.type === 'flor') voiceText = '¡Flor!';
    
    SoundManager.speak(voiceText);

    // Si el canto requiere mi respuesta
    const respondingTeam = data.respondingTeam;
    const myTeam = this.engine.getPlayerTeam(this.localViewIndex);
    
    if (respondingTeam === myTeam) {
      this.dialogs.showCantoOffer(data, this.config.teamNames, (response, raiseLevel) => {
        this.engine.respondToCanto(this.localViewIndex, response, raiseLevel);
      });
    } else {
      // Solo muestro toast informativo
      let text = '';
      if (data.type === 'truco') text = `canta ${data.level.replace('_', ' ')}`;
      if (data.type === 'envido') text = `canta ${data.level.replace('_', ' ')}`;
      if (data.type === 'flor') text = 'declara FLOR';
      this.dialogs.showToast(`${data.callerName} ${text}`);
    }
  }

  handleCantoResolved(data) {
    let msg = '';
    let voiceText = '';
    
    if (data.type === 'truco') {
      msg = data.accepted ? `¡${data.responderName} quiso!` : `¡${data.responderName} no quiso!`;
      voiceText = data.accepted ? '¡Quiero!' : '¡No quiero!';
    } else if (data.type === 'envido') {
      msg = data.accepted ? '¡Envido aceptado!' : '¡Envido rechazado!';
      voiceText = data.accepted ? '¡Quiero!' : '¡No quiero!';
      if (data.accepted && !data.deferred) {
        msg += ` ${data.team1Points} vs ${data.team2Points}`;
      } else if (data.accepted && data.deferred) {
        msg += ` (Se revela al final)`;
      }
    } else if (data.type === 'flor') {
      msg = data.isContraflor ? 'Contraflor ganada' : 'Flor anotada';
      voiceText = data.isContraflor ? '¡Contraflor!' : '¡Flor!';
    }
    
    SoundManager.speak(voiceText);
    this.dialogs.showToast(msg);
  }

  handleTurnTransition(data) {
    // Ocultar manos
    this.board.elements.p1Hand.innerHTML = '';
    
    this.dialogs.showTurnTransition(data.nextPlayer, () => {
      this.localViewIndex = data.nextPlayerIndex;
      this.updateAll();
    });
  }

  // ─────────────── CONTROLES (Botones Inferiores) ───────────────

  updateControls() {
    const actions = this.engine.getAvailableActions(this.localViewIndex);
    
    // Mapear acciones a botones
    const btnMap = {
      truco: 'Truco',
      retruco: 'Retruco',
      vale9: 'Vale 9',
      vale_juego: 'Vale Juego',
      envido: 'Envido',
      envido_5: 'Envido 5',
      falta_envido: 'Falta Envido',
      flor: 'Flor',
      fold_hand: 'Irse al mazo'
    };

    let html = '';
    
    // Ignoramos 'play_card' y respuestas ('quiero', 'no_quiero') porque se manejan diferente
    for (const action of actions) {
      if (btnMap[action]) {
        html += `<button class="btn-action" data-action="${action}">${btnMap[action]}</button>`;
      }
    }

    this.controlBar.innerHTML = html;

    // Attach events
    const btns = this.controlBar.querySelectorAll('button');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleActionClick(btn.dataset.action);
      });
    });
  }
}
