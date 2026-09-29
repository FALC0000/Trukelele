/**
 * ScoreManager.ts — Gestión de Puntuación
 * Maneja los puntos de cada equipo/jugador. Partida configurable a 12 o 24 puntos.
 */

export const VALID_TARGETS = [12, 24] as const;
export type TargetScoreType = typeof VALID_TARGETS[number];

/**
 * Puntos otorgados cuando un canto es ACEPTADO (Quiero).
 */
export const CANTO_POINTS_ACCEPTED: Record<string, number> = {
  truco: 3,
  retruco: 6,
  vale9: 9,
  // vale_juego se calcula dinámicamente
};

/**
 * Puntos otorgados cuando un canto es RECHAZADO (No Quiero).
 */
export const CANTO_POINTS_REJECTED: Record<string, number> = {
  truco: 1,
  retruco: 3,
  vale9: 6,
  vale_juego: 9,
};

/**
 * Puntos de envido.
 */
export const ENVIDO_POINTS: Record<string, number> = {
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

export interface ScoreHistoryEntry {
  team: 'team1' | 'team2';
  points: number;
  reason: string;
  prevScore: number;
  newScore: number;
  timestamp: number;
}

export class ScoreManager {
  public targetScore: number;
  public scores: { team1: number; team2: number };
  public history: ScoreHistoryEntry[] = [];

  constructor(targetScore = 24) {
    if (!VALID_TARGETS.includes(targetScore as any)) {
      throw new Error(`Puntuación objetivo inválida: ${targetScore}. Usar ${VALID_TARGETS.join(' o ')}`);
    }
    this.targetScore = targetScore;
    this.scores = { team1: 0, team2: 0 };
    this.history = [];
  }

  /**
   * Suma puntos a un equipo.
   */
  public addPoints(team: 'team1' | 'team2', points: number, reason = ''): void {
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
   */
  public getWinner(): 'team1' | 'team2' | null {
    if (this.scores.team1 >= this.targetScore) return 'team1';
    if (this.scores.team2 >= this.targetScore) return 'team2';
    return null;
  }

  /**
   * Obtiene los puntos actuales de un equipo.
   */
  public getScore(team: 'team1' | 'team2'): number {
    return this.scores[team];
  }

  /**
   * Calcula los puntos de "Falta Envido" (puntos restantes para ganar).
   */
  public getFaltaEnvidoPoints(losingTeam: 'team1' | 'team2'): number {
    return this.targetScore - this.scores[losingTeam];
  }

  /**
   * Calcula los puntos de "Vale Juego" (todos los puntos restantes).
   */
  public getValeJuegoPoints(losingTeam: 'team1' | 'team2'): number {
    return this.targetScore - this.scores[losingTeam];
  }

  /**
   * Obtiene los puntos del truco según el nivel actual.
   * @param currentLevel - 'truco'|'retruco'|'vale9'|'vale_juego'
   * @param losingTeam - Equipo que perdería
   */
  public getTrucoPoints(currentLevel: string, losingTeam: 'team1' | 'team2'): number {
    if (currentLevel === 'vale_juego') {
      return this.getValeJuegoPoints(losingTeam);
    }
    return CANTO_POINTS_ACCEPTED[currentLevel] || 1;
  }

  /**
   * Obtiene la puntuación objetivo de la partida.
   */
  public getTargetScore(): number {
    return this.targetScore;
  }

  /**
   * Reinicia la puntuación para una nueva partida.
   */
  public reset(newTarget?: number): void {
    if (newTarget !== undefined) {
      if (!VALID_TARGETS.includes(newTarget as any)) {
        throw new Error(`Puntuación objetivo inválida: ${newTarget}`);
      }
      this.targetScore = newTarget;
    }
    this.scores = { team1: 0, team2: 0 };
    this.history = [];
  }

  /**
   * Obtiene el historial reciente de puntos.
   */
  public getRecentHistory(n = 5): ScoreHistoryEntry[] {
    return this.history.slice(-n);
  }
}
