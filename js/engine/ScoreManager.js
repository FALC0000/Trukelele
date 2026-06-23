/**
 * ScoreManager.js — Gestión de Puntuación
 * Maneja los puntos de cada equipo/jugador. Partida configurable a 12 o 24 puntos.
 */

export const VALID_TARGETS = [12, 24];

/**
 * Puntos otorgados cuando un canto es ACEPTADO (Quiero).
 */
export const CANTO_POINTS_ACCEPTED = {
  truco: 3,
  retruco: 6,
  vale9: 9,
  // vale_juego se calcula dinámicamente
};

/**
 * Puntos otorgados cuando un canto es RECHAZADO (No Quiero).
 */
export const CANTO_POINTS_REJECTED = {
  truco: 1,
  retruco: 3,
  vale9: 6,
  vale_juego: 9,
};

/**
 * Puntos de envido.
 */
export const ENVIDO_POINTS = {
  envido: 2,
  envido_5: 5,
  // falta_envido se calcula dinámicamente
};

export const ENVIDO_REJECTED_POINTS = 1;

/**
 * Puntos de flor.
 */
export const FLOR_POINTS = 3;
export const CONTRAFLOR_POINTS = 6;
export const CONTRAFLOR_REJECTED_POINTS = 3;

export class ScoreManager {
  /**
   * @param {number} targetScore - Puntuación objetivo (12 o 24)
   */
  constructor(targetScore = 24) {
    if (!VALID_TARGETS.includes(targetScore)) {
      throw new Error(`Puntuación objetivo inválida: ${targetScore}. Usar ${VALID_TARGETS.join(' o ')}`);
    }
    this.targetScore = targetScore;
    this.scores = { team1: 0, team2: 0 };
    this.history = [];
  }

  /**
   * Suma puntos a un equipo.
   * @param {'team1'|'team2'} team
   * @param {number} points
   * @param {string} reason - Razón de los puntos (e.g., "Truco ganado")
   */
  addPoints(team, points, reason = '') {
    const prev = this.scores[team];
    this.scores[team] = Math.min(this.scores[team] + points, this.targetScore);
    this.history.push({
      team,
      points,
      reason,
      prevScore: prev,
      newScore: this.scores[team],
      timestamp: Date.now()
    });
  }

  /**
   * Verifica si alguien ganó la partida.
   * @returns {'team1'|'team2'|null}
   */
  getWinner() {
    if (this.scores.team1 >= this.targetScore) return 'team1';
    if (this.scores.team2 >= this.targetScore) return 'team2';
    return null;
  }

  /**
   * Obtiene los puntos actuales de un equipo.
   * @param {'team1'|'team2'} team
   * @returns {number}
   */
  getScore(team) {
    return this.scores[team];
  }

  /**
   * Calcula los puntos de "Falta Envido" (puntos restantes para ganar).
   * @param {'team1'|'team2'} losingTeam - Equipo que pierde el falta envido
   * @returns {number}
   */
  getFaltaEnvidoPoints(losingTeam) {
    return this.targetScore - this.scores[losingTeam];
  }

  /**
   * Calcula los puntos de "Vale Juego" (todos los puntos restantes).
   * @param {'team1'|'team2'} losingTeam - Equipo que pierde el vale juego
   * @returns {number}
   */
  getValeJuegoPoints(losingTeam) {
    return this.targetScore - this.scores[losingTeam];
  }

  /**
   * Obtiene los puntos del truco según el nivel actual.
   * @param {string} currentLevel - 'truco'|'retruco'|'vale9'|'vale_juego'
   * @param {'team1'|'team2'} losingTeam - Equipo que perdería
   * @returns {number}
   */
  getTrucoPoints(currentLevel, losingTeam) {
    if (currentLevel === 'vale_juego') {
      return this.getValeJuegoPoints(losingTeam);
    }
    return CANTO_POINTS_ACCEPTED[currentLevel] || 1;
  }

  /**
   * Obtiene la puntuación objetivo de la partida.
   * @returns {number}
   */
  getTargetScore() {
    return this.targetScore;
  }

  /**
   * Reinicia la puntuación para una nueva partida.
   * @param {number} [newTarget] - Opcional: nueva puntuación objetivo
   */
  reset(newTarget) {
    if (newTarget !== undefined) {
      if (!VALID_TARGETS.includes(newTarget)) {
        throw new Error(`Puntuación objetivo inválida: ${newTarget}`);
      }
      this.targetScore = newTarget;
    }
    this.scores = { team1: 0, team2: 0 };
    this.history = [];
  }

  /**
   * Obtiene el historial reciente de puntos.
   * @param {number} n - Cantidad de entradas
   * @returns {Array}
   */
  getRecentHistory(n = 5) {
    return this.history.slice(-n);
  }
}
