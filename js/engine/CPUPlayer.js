/**
 * CPUPlayer.js — Inteligencia Artificial del Oponente
 * Evalúa la fuerza de la mano y toma decisiones estratégicas.
 */

import { Player } from './Player.js';
import { EnvidoCalc } from './EnvidoCalc.js';

export class CPUPlayer extends Player {
  constructor(name = 'CPU') {
    super(name);
  }

  /**
   * Evalúa la fuerza de la mano (0-100).
   * @param {Card} vira
   * @returns {number}
   */
  evaluateHandStrength(vira) {
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
   * @param {Card} vira
   * @param {Card|null} opponentCard - Carta jugada por el oponente (null si juega primero)
   * @returns {number} Índice de la carta a jugar
   */
  chooseCard(vira, opponentCard = null) {
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
   * @param {Card} vira
   * @param {string} currentTrucoLevel - Nivel actual de truco
   * @returns {boolean}
   */
  shouldCallTruco(vira, currentTrucoLevel = null) {
    const strength = this.evaluateHandStrength(vira);
    const thresholds = {
      null: 55,       // Cantar truco
      truco: 70,      // Retruco
      retruco: 82,    // Vale 9
      vale9: 92,      // Vale juego
    };
    const threshold = thresholds[currentTrucoLevel] ?? 95;
    // Añadir algo de aleatoriedad (±10%)
    const randomFactor = (Math.random() - 0.5) * 20;
    return (strength + randomFactor) > threshold;
  }

  /**
   * Decide si aceptar un canto de Truco del oponente.
   * @param {Card} vira
   * @param {string} trucoLevel - Nivel ofrecido
   * @returns {'quiero'|'no_quiero'|'raise'} 
   */
  respondToTruco(vira, trucoLevel) {
    const strength = this.evaluateHandStrength(vira);
    const randomFactor = (Math.random() - 0.5) * 15;
    const effective = strength + randomFactor;

    const raiseThresholds = {
      truco: 78,
      retruco: 88,
      vale9: 95,
    };

    const acceptThresholds = {
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
   * @param {Card[]} hand
   * @param {Card} vira
   * @returns {boolean}
   */
  shouldCallEnvido(hand, vira) {
    const points = EnvidoCalc.calculate(hand, vira);
    // Cantar envido si tiene 27+ puntos
    const randomFactor = (Math.random() - 0.5) * 6;
    return (points + randomFactor) >= 27;
  }

  /**
   * Decide si aceptar un Envido del oponente.
   * @param {Card[]} hand
   * @param {Card} vira
   * @param {string} envidoLevel - Nivel ofrecido ('envido'|'envido_5'|'falta_envido')
   * @returns {'quiero'|'no_quiero'|'raise'}
   */
  respondToEnvido(hand, vira, envidoLevel) {
    const points = EnvidoCalc.calculate(hand, vira);
    const randomFactor = (Math.random() - 0.5) * 4;
    const effective = points + randomFactor;

    const acceptThresholds = {
      envido: 25,
      envido_5: 28,
      falta_envido: 31,
    };

    const raiseThresholds = {
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
   * @param {Card[]} hand
   * @param {Card} vira
   * @returns {boolean}
   */
  shouldDeclareFlor(hand, vira) {
    // Siempre declarar flor si la tiene (es obligatorio en muchas variantes)
    return EnvidoCalc.hasFlor(hand, vira);
  }

  /**
   * Decide si responder a una Flor cantada por el oponente (Contraflor o quiero).
   * @param {Card[]} hand
   * @param {Card} vira
   * @returns {'contraflor'|'quiero'|'no_quiero'}
   */
  respondToFlor(hand, vira) {
    if (!EnvidoCalc.hasFlor(hand, vira)) return 'no_quiero';
    
    const points = EnvidoCalc.calculateFlor(hand, vira);
    const randomFactor = (Math.random() - 0.5) * 5;
    
    // Si la flor es muy buena (>30 pts), cantar contraflor
    if (points + randomFactor > 30) {
      return 'contraflor';
    }
    
    return 'quiero'; // Con flor me achico (se comparan puntos por 3 pts)
  }

  /**
   * Decide si irse de la mano.
   * @param {Card} vira
   * @returns {boolean}
   */
  shouldFoldHand(vira) {
    const strength = this.evaluateHandStrength(vira);
    return strength < 15; // Abandonar solo si la mano es extremadamente mala
  }
}
