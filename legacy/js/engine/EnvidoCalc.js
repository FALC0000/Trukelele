/**
 * EnvidoCalc.js — Cálculo de Envido y Flor
 * Implementa la lógica matemática para calcular los puntos de envido
 * y detectar/puntuar la flor según las reglas del Truco Venezolano.
 */

export class EnvidoCalc {
  /**
   * Calcula los puntos de envido para una mano de 3 cartas.
   * @param {Card[]} hand - Las 3 cartas del jugador
   * @param {Card} vira - La carta vira
   * @returns {number} Puntos de envido
   */
  static calculate(hand, vira) {
    // Primero verificar si hay Perico o Perica
    const perico = hand.find(c => c.isPerico(vira));
    const perica = hand.find(c => c.isPerica(vira));

    // Si tiene Perico, buscar la mejor carta acompañante
    if (perico) {
      const others = hand.filter(c => c !== perico);
      // Si también tiene Perica, Perico + Perica (Flor Reservada tiene su propia lógica)
      // Para envido: Perico aporta 30 + mejor carta acompañante
      let bestCompanion = 0;
      for (const card of others) {
        if (card.isPerica(vira)) {
          // Perica como acompañante del Perico: 29 no aplica aquí, 
          // Perico ya da 30, y la Perica en envido vale como su carta base
          bestCompanion = Math.max(bestCompanion, card.getEnvidoValue());
        } else {
          bestCompanion = Math.max(bestCompanion, card.getEnvidoValue());
        }
      }
      return 30 + bestCompanion;
    }

    // Si tiene Perica (sin Perico)
    if (perica) {
      const others = hand.filter(c => c !== perica);
      let bestCompanion = 0;
      for (const card of others) {
        bestCompanion = Math.max(bestCompanion, card.getEnvidoValue());
      }
      return 29 + bestCompanion;
    }

    // Sin piezas: buscar la mejor pareja del mismo palo
    let bestScore = 0;

    // Agrupar por palo
    const byPalo = {};
    for (const card of hand) {
      if (!byPalo[card.palo]) byPalo[card.palo] = [];
      byPalo[card.palo].push(card);
    }

    for (const palo in byPalo) {
      const cards = byPalo[palo];
      if (cards.length >= 2) {
        // Dos o más cartas del mismo palo: 20 + suma de las dos mejores (por valor envido)
        const values = cards.map(c => c.getEnvidoValue()).sort((a, b) => b - a);
        const score = 20 + values[0] + values[1];
        bestScore = Math.max(bestScore, score);
      }
    }

    // Si no hay pareja, la carta con mayor valor individual
    if (bestScore === 0) {
      for (const card of hand) {
        bestScore = Math.max(bestScore, card.getEnvidoValue());
      }
    }

    return bestScore;
  }

  /**
   * Detecta si la mano tiene Flor (3 cartas del mismo palo o flor con pieza).
   * @param {Card[]} hand - Las 3 cartas del jugador
   * @param {Card} vira - La carta vira
   * @returns {boolean}
   */
  static hasFlor(hand, vira) {
    const perico = hand.find(c => c.isPerico(vira));
    const perica = hand.find(c => c.isPerica(vira));
    
    // Flor Reservada: Perico + Perica + cualquier carta
    if (perico && perica) return true;

    // Con 1 pieza (Perico o Perica) + 2 cartas del mismo palo
    const pieza = perico || perica;
    if (pieza) {
      const others = hand.filter(c => c !== pieza);
      return others[0].palo === others[1].palo;
    }

    // 3 cartas del mismo palo
    const palo = hand[0].palo;
    return hand.every(c => c.palo === palo);
  }

  /**
   * Calcula los puntos de Flor.
   * @param {Card[]} hand - Las 3 cartas del jugador
   * @param {Card} vira - La carta vira
   * @returns {number} Puntos de flor
   */
  static calculateFlor(hand, vira) {
    if (!this.hasFlor(hand, vira)) return 0;

    const perico = hand.find(c => c.isPerico(vira));
    const perica = hand.find(c => c.isPerica(vira));

    // Flor Reservada: Perico + Perica + Cualquier carta
    if (perico && perica) {
      const third = hand.find(c => !c.isPerico(vira) && !c.isPerica(vira));
      return 30 + 29 + (third ? third.getEnvidoValue() : 0);
    }

    // Flor con 1 pieza: Perico (30) o Perica (29) + suma de las otras 2
    const pieza = perico || perica;
    if (pieza) {
      const piezaPoints = perico ? 30 : 29;
      const others = hand.filter(c => c !== pieza);
      return piezaPoints + others[0].getEnvidoValue() + others[1].getEnvidoValue();
    }

    // Flor normal sin piezas: 20 + suma de los 3 valores de envido
    const sum = hand.reduce((acc, c) => acc + c.getEnvidoValue(), 0);
    return 20 + sum;
  }

  /**
   * Verifica si la Flor es Reservada (Perico + Perica + cualquier carta).
   * @param {Card[]} hand
   * @param {Card} vira
   * @returns {boolean}
   */
  static isFlorReservada(hand, vira) {
    const hasPerico = hand.some(c => c.isPerico(vira));
    const hasPerica = hand.some(c => c.isPerica(vira));
    return hasPerico && hasPerica;
  }
}
