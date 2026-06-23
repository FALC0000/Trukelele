/**
 * FSM.js — Máquina de Estados Finitos para el flujo de cantos
 * Controla las transiciones válidas entre estados del juego.
 */

/**
 * Estados posibles del juego.
 */
export const GameState = {
  // Inicio y flujo general
  GAME_START: 'GAME_START',
  ROUND_START: 'ROUND_START',
  DEALING: 'DEALING',

  // Turno de juego
  WAITING_PLAY: 'WAITING_PLAY',
  CARD_PLAYED: 'CARD_PLAYED',
  BAZA_RESOLVED: 'BAZA_RESOLVED',

  // Envido
  ENVIDO_OFFERED: 'ENVIDO_OFFERED',
  ENVIDO_5_OFFERED: 'ENVIDO_5_OFFERED',
  FALTA_ENVIDO_OFFERED: 'FALTA_ENVIDO_OFFERED',
  ENVIDO_ACCEPTED: 'ENVIDO_ACCEPTED',
  ENVIDO_REJECTED: 'ENVIDO_REJECTED',
  ENVIDO_RESOLVED: 'ENVIDO_RESOLVED',

  // Truco
  TRUCO_OFFERED: 'TRUCO_OFFERED',
  TRUCO_ACCEPTED: 'TRUCO_ACCEPTED',
  TRUCO_REJECTED: 'TRUCO_REJECTED',
  RETRUCO_OFFERED: 'RETRUCO_OFFERED',
  RETRUCO_ACCEPTED: 'RETRUCO_ACCEPTED',
  RETRUCO_REJECTED: 'RETRUCO_REJECTED',
  VALE9_OFFERED: 'VALE9_OFFERED',
  VALE9_ACCEPTED: 'VALE9_ACCEPTED',
  VALE9_REJECTED: 'VALE9_REJECTED',
  VALE_JUEGO_OFFERED: 'VALE_JUEGO_OFFERED',
  VALE_JUEGO_ACCEPTED: 'VALE_JUEGO_ACCEPTED',
  VALE_JUEGO_REJECTED: 'VALE_JUEGO_REJECTED',

  // Flor
  FLOR_DECLARED: 'FLOR_DECLARED',
  CONTRAFLOR_OFFERED: 'CONTRAFLOR_OFFERED',
  FLOR_RESOLVED: 'FLOR_RESOLVED',

  // Fin
  ROUND_END: 'ROUND_END',
  GAME_OVER: 'GAME_OVER',
  HAND_FOLDED: 'HAND_FOLDED',
};

/**
 * Transiciones válidas: estado actual → [estados posibles]
 */
const TRANSITIONS = {
  [GameState.GAME_START]: [GameState.ROUND_START],
  [GameState.ROUND_START]: [GameState.DEALING],
  [GameState.DEALING]: [GameState.WAITING_PLAY],

  [GameState.WAITING_PLAY]: [
    GameState.CARD_PLAYED,
    GameState.ENVIDO_OFFERED,
    GameState.ENVIDO_5_OFFERED,
    GameState.FALTA_ENVIDO_OFFERED,
    GameState.TRUCO_OFFERED,
    GameState.FLOR_DECLARED,
    GameState.HAND_FOLDED,
  ],

  [GameState.CARD_PLAYED]: [GameState.WAITING_PLAY, GameState.BAZA_RESOLVED],
  [GameState.BAZA_RESOLVED]: [GameState.WAITING_PLAY, GameState.ROUND_END],

  // Envido flow
  [GameState.ENVIDO_OFFERED]: [
    GameState.ENVIDO_ACCEPTED,
    GameState.ENVIDO_REJECTED,
    GameState.ENVIDO_5_OFFERED,
    GameState.FALTA_ENVIDO_OFFERED,
    GameState.FLOR_DECLARED,
  ],
  [GameState.ENVIDO_5_OFFERED]: [
    GameState.ENVIDO_ACCEPTED,
    GameState.ENVIDO_REJECTED,
    GameState.FALTA_ENVIDO_OFFERED,
    GameState.FLOR_DECLARED,
  ],
  [GameState.FALTA_ENVIDO_OFFERED]: [
    GameState.ENVIDO_ACCEPTED,
    GameState.ENVIDO_REJECTED,
    GameState.FLOR_DECLARED,
  ],
  [GameState.ENVIDO_ACCEPTED]: [GameState.ENVIDO_RESOLVED],
  [GameState.ENVIDO_REJECTED]: [GameState.ENVIDO_RESOLVED],
  [GameState.ENVIDO_RESOLVED]: [GameState.WAITING_PLAY],

  // Truco flow
  [GameState.TRUCO_OFFERED]: [
    GameState.TRUCO_ACCEPTED,
    GameState.TRUCO_REJECTED,
    GameState.RETRUCO_OFFERED,
  ],
  [GameState.TRUCO_ACCEPTED]: [GameState.WAITING_PLAY],
  [GameState.TRUCO_REJECTED]: [GameState.ROUND_END],

  [GameState.RETRUCO_OFFERED]: [
    GameState.RETRUCO_ACCEPTED,
    GameState.RETRUCO_REJECTED,
    GameState.VALE9_OFFERED,
  ],
  [GameState.RETRUCO_ACCEPTED]: [GameState.WAITING_PLAY],
  [GameState.RETRUCO_REJECTED]: [GameState.ROUND_END],

  [GameState.VALE9_OFFERED]: [
    GameState.VALE9_ACCEPTED,
    GameState.VALE9_REJECTED,
    GameState.VALE_JUEGO_OFFERED,
  ],
  [GameState.VALE9_ACCEPTED]: [GameState.WAITING_PLAY],
  [GameState.VALE9_REJECTED]: [GameState.ROUND_END],

  [GameState.VALE_JUEGO_OFFERED]: [
    GameState.VALE_JUEGO_ACCEPTED,
    GameState.VALE_JUEGO_REJECTED,
  ],
  [GameState.VALE_JUEGO_ACCEPTED]: [GameState.WAITING_PLAY],
  [GameState.VALE_JUEGO_REJECTED]: [GameState.ROUND_END],

  // Flor flow
  [GameState.FLOR_DECLARED]: [
    GameState.FLOR_RESOLVED,
    GameState.CONTRAFLOR_OFFERED,
  ],
  [GameState.CONTRAFLOR_OFFERED]: [GameState.FLOR_RESOLVED],
  [GameState.FLOR_RESOLVED]: [GameState.WAITING_PLAY],

  // Fin de ronda
  [GameState.ROUND_END]: [GameState.ROUND_START, GameState.GAME_OVER],
  [GameState.GAME_OVER]: [GameState.GAME_START],
  [GameState.HAND_FOLDED]: [GameState.ROUND_END],
};

export class FSM {
  constructor() {
    this.state = GameState.GAME_START;
    this.listeners = [];
    this.history = [];
  }

  /**
   * Obtiene el estado actual.
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Verifica si una transición es válida.
   * @param {string} newState
   * @returns {boolean}
   */
  canTransition(newState) {
    const allowed = TRANSITIONS[this.state];
    return allowed && allowed.includes(newState);
  }

  /**
   * Realiza una transición a un nuevo estado.
   * @param {string} newState
   * @throws {Error} Si la transición no es válida
   */
  transition(newState) {
    if (!this.canTransition(newState)) {
      throw new Error(
        `Transición inválida: ${this.state} → ${newState}. ` +
        `Transiciones permitidas: [${(TRANSITIONS[this.state] || []).join(', ')}]`
      );
    }
    const oldState = this.state;
    this.state = newState;
    this.history.push({ from: oldState, to: newState, timestamp: Date.now() });

    // Notificar listeners
    for (const listener of this.listeners) {
      listener(oldState, newState);
    }
  }

  /**
   * Fuerza un estado sin validación (para reseteos).
   * @param {string} newState
   */
  forceState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.history.push({ from: oldState, to: newState, forced: true, timestamp: Date.now() });
    for (const listener of this.listeners) {
      listener(oldState, newState);
    }
  }

  /**
   * Registra un listener de transiciones.
   * @param {Function} callback - (oldState, newState) => void
   */
  onTransition(callback) {
    this.listeners.push(callback);
  }

  /**
   * Obtiene las transiciones posibles desde el estado actual.
   * @returns {string[]}
   */
  getAvailableTransitions() {
    return TRANSITIONS[this.state] || [];
  }

  /**
   * Reinicia la máquina de estados.
   */
  reset() {
    this.state = GameState.GAME_START;
    this.history = [];
  }
}
