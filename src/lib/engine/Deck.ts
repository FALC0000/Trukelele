/**
 * Deck.ts — Baraja Española de 40 cartas
 * Sin 8s ni 9s. Palos: Oros, Copas, Espadas, Bastos.
 */

import { Card, PALOS } from './Card';

const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export class Deck {
  public cards: Card[] = [];
  public vira: Card | null = null;

  constructor() {
    this._build();
  }

  /**
   * Construye las 40 cartas de la baraja.
   */
  private _build(): void {
    this.cards = [];
    for (const palo of PALOS) {
      for (const numero of NUMEROS) {
        this.cards.push(new Card(numero, palo));
      }
    }
  }

  /**
   * Mezcla la baraja usando el algoritmo Fisher-Yates.
   */
  public shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Reparte n cartas desde el tope de la baraja.
   */
  public deal(n: number): Card[] {
    if (n > this.cards.length) {
      throw new Error(`No hay suficientes cartas. Quedan ${this.cards.length}, se pidieron ${n}`);
    }
    return this.cards.splice(0, n);
  }

  /**
   * Toma la primera carta como vira (carta de muestra).
   */
  public drawVira(): Card {
    if (this.cards.length === 0) {
      throw new Error('No hay cartas en la baraja para la vira');
    }
    this.vira = this.cards.splice(0, 1)[0];
    return this.vira;
  }

  /**
   * Reinicia la baraja, reconstruye y mezcla.
   */
  public reset(): void {
    this._build();
    this.shuffle();
    this.vira = null;
  }

  /**
   * Cantidad de cartas restantes.
   */
  public get remaining(): number {
    return this.cards.length;
  }
}
