/**
 * Player.js — Jugador Humano
 * Gestiona la mano del jugador humano.
 */

export class Player {
  constructor(name = 'Jugador') {
    this.name = name;
    this.hand = [];
    this.playedCards = [];
  }

  /**
   * Recibe cartas repartidas.
   * @param {Card[]} cards
   */
  receiveCards(cards) {
    this.hand = [...cards];
    this.playedCards = [];
  }

  /**
   * Juega una carta de la mano.
   * @param {number} index - Índice de la carta en la mano
   * @returns {Card}
   */
  playCard(index) {
    if (index < 0 || index >= this.hand.length) {
      throw new Error(`Índice de carta inválido: ${index}`);
    }
    const card = this.hand.splice(index, 1)[0];
    this.playedCards.push(card);
    return card;
  }

  /**
   * Juega una carta específica por su ID.
   * @param {string} cardId
   * @returns {Card}
   */
  playCardById(cardId) {
    const index = this.hand.findIndex(c => c.id === cardId);
    if (index === -1) {
      throw new Error(`Carta no encontrada: ${cardId}`);
    }
    return this.playCard(index);
  }

  /**
   * Obtiene las cartas en mano.
   * @returns {Card[]}
   */
  getHand() {
    return [...this.hand];
  }

  /**
   * Cantidad de cartas en mano.
   * @returns {number}
   */
  get cardsRemaining() {
    return this.hand.length;
  }

  /**
   * Reinicia la mano del jugador.
   */
  reset() {
    this.hand = [];
    this.playedCards = [];
  }
}
