/**
 * CPUPlayer.ts — Inteligencia Artificial del Oponente
 * Evalúa la fuerza de la mano y toma decisiones estratégicas.
 */

import { Player } from './Player';
import { Card } from './Card';
import { EnvidoCalc } from './EnvidoCalc';

export class CPUPlayer extends Player {
  constructor(name = 'CPU') {
    super(name);
  }

  /**
   * Evalúa la fuerza de la mano (0-100).
   */
  public evaluateHandStrength(vira: Card): number {
    if (this.hand.length === 0) return 0;
    const ranks = this.hand.map(c => c.getRank(vira));
    const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    // Normalizar: rango mín 45, máx 100
    return Math.min(100, ((avgRank - 45) / (100 - 45)) * 100);
  }

  /**
   * Elige qué carta jugar.
   * Estrategia: si va ganando la baza, juega la más baja.
   * Si va perdiendo, juega la más alta.
   * @param vira - La vira de la ronda
   * @param opponentCard - Carta jugada por el oponente (null si juega primero)
   * @returns Índice de la carta a jugar
   */
  public chooseCard(vira: Card, opponentCard: Card | null = null): number {
    if (this.hand.length === 1) return 0;

    const sortedIndices = this.hand
      .map((card, index) => ({ card, index, rank: card.getRank(vira) }))
      .sort((a, b) => a.rank - b.rank);

    if (opponentCard === null) {
      // Juega primero: carta de fuerza media
      const midIndex = Math.floor(sortedIndices.length / 2);
      return sortedIndices[midIndex].index;
    }

    const opponentRank = opponentCard.getRank(vira);

    // Buscar la carta más baja que gane
    const winning = sortedIndices.filter(s => s.rank > opponentRank);
    if (winning.length > 0) {
      // Jugar la más baja que gane (ahorro de cartas fuertes)
      return winning[0].index;
    }

    // No puede ganar: jugar la más baja (sacrificio)
    return sortedIndices[0].index;
  }

  /**
   * Decide si cantar Truco.
   */
  public shouldCallTruco(vira: Card, currentTrucoLevel: string | null = null): boolean {
    const strength = this.evaluateHandStrength(vira);
    const thresholds: Record<string, number> = {
      truco: 70,      // Retruco
      retruco: 82,    // Vale 9
      vale9: 92,      // Vale juego
    };
    // Si currentTrucoLevel es null, queremos cantar 'truco'
    const threshold = currentTrucoLevel ? (thresholds[currentTrucoLevel] ?? 95) : 55;
    // Añadir algo de aleatoriedad (±10%)
    const randomFactor = (Math.random() - 0.5) * 20;
    return (strength + randomFactor) > threshold;
  }

  /**
   * Decide si aceptar un canto de Truco del oponente.
   * @returns 'quiero'|'no_quiero'|'raise'
   */
  public respondToTruco(vira: Card, trucoLevel: string): 'quiero' | 'no_quiero' | 'raise' {
    const strength = this.evaluateHandStrength(vira);
    const randomFactor = (Math.random() - 0.5) * 15;
    const effective = strength + randomFactor;

    const raiseThresholds: Record<string, number> = {
      truco: 78,
      retruco: 88,
      vale9: 95,
    };

    const acceptThresholds: Record<string, number> = {
      truco: 40,
      retruco: 55,
      vale9: 70,
      vale_juego: 85,
    };

    // ¿Debería subir la apuesta?
    const raiseThreshold = raiseThresholds[trucoLevel];
    if (raiseThreshold && effective > raiseThreshold && trucoLevel !== 'vale_juego') {
      return 'raise';
    }

    // ¿Debería aceptar?
    const acceptThreshold = acceptThresholds[trucoLevel] ?? 50;
    if (effective > acceptThreshold) {
      return 'quiero';
    }

    return 'no_quiero';
  }

  /**
   * Decide si cantar Envido.
   */
  public shouldCallEnvido(hand: Card[], vira: Card): boolean {
    const points = EnvidoCalc.calculate(hand, vira);
    // Cantar envido si tiene 27+ puntos
    const randomFactor = (Math.random() - 0.5) * 6;
    return (points + randomFactor) >= 27;
  }

  /**
   * Decide si aceptar un Envido del oponente.
   */
  public respondToEnvido(hand: Card[], vira: Card, envidoLevel: string): 'quiero' | 'no_quiero' | 'raise' {
    const points = EnvidoCalc.calculate(hand, vira);
    const randomFactor = (Math.random() - 0.5) * 4;
    const effective = points + randomFactor;

    const acceptThresholds: Record<string, number> = {
      envido: 25,
      envido_5: 28,
      falta_envido: 31,
    };

    const raiseThresholds: Record<string, number> = {
      envido: 30,
      envido_5: 33,
    };

    // ¿Subir?
    const raiseThreshold = raiseThresholds[envidoLevel];
    if (raiseThreshold && effective > raiseThreshold && envidoLevel !== 'falta_envido') {
      return 'raise';
    }

    // ¿Aceptar?
    const acceptThreshold = acceptThresholds[envidoLevel] ?? 27;
    if (effective > acceptThreshold) {
      return 'quiero';
    }

    return 'no_quiero';
  }

  /**
   * Decide si declarar Flor.
   */
  public shouldDeclareFlor(hand: Card[], vira: Card): boolean {
    return EnvidoCalc.hasFlor(hand, vira);
  }

  /**
   * Decide si responder a una Flor cantada por el oponente.
   */
  public respondToFlor(hand: Card[], vira: Card): 'contraflor' | 'quiero' | 'no_quiero' {
    if (!EnvidoCalc.hasFlor(hand, vira)) return 'no_quiero';
    
    const points = EnvidoCalc.calculateFlor(hand, vira);
    const randomFactor = (Math.random() - 0.5) * 5;
    
    // Si la flor es muy buena (>30 pts), cantar contraflor
    if (points + randomFactor > 30) {
      return 'contraflor';
    }
    
    return 'quiero';
  }

  /**
   * Decide si irse de la mano.
   */
  public shouldFoldHand(vira: Card): boolean {
    const strength = this.evaluateHandStrength(vira);
    return strength < 15; // Abandonar solo si la mano es extremadamente mala
  }
}
