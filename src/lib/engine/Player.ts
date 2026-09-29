/**
 * Player.ts — Jugador Humano
 * Gestiona la mano del jugador humano.
 */

import { Card } from './Card';

export class Player {
  public name: string;
  public hand: Card[] = [];
  public playedCards: Card[] = [];

  constructor(name = 'Jugador') {
    this.name = name;
    this.hand = [];
    this.playedCards = [];
  }

  /**
   * Recibe cartas repartidas.
   */
  public receiveCards(cards: Card[]): void {
    this.hand = [...cards];
    this.playedCards = [];
  }

  /**
   * Juega una carta de la mano por su índice.
   */
  public playCard(index: number): Card {
    if (index < 0 || index >= this.hand.length) {
      throw new Error(`Índice de carta inválido: ${index}`);
    }
    const card = this.hand.splice(index, 1)[0];
    this.playedCards.push(card);
    return card;
  }

  /**
   * Juega una carta específica por su ID.
   */
  public playCardById(cardId: string): Card {
    const index = this.hand.findIndex(c => c.id === cardId);
    if (index === -1) {
      throw new Error(`Carta no encontrada: ${cardId}`);
    }
    return this.playCard(index);
  }

  /**
   * Obtiene las cartas en mano.
   */
  public getHand(): Card[] {
    return [...this.hand];
  }

  /**
   * Cantidad de cartas en mano.
   */
  public get cardsRemaining(): number {
    return this.hand.length;
  }

  /**
   * Reinicia la mano del jugador.
   */
  public reset(): void {
    this.hand = [];
    this.playedCards = [];
  }
}
