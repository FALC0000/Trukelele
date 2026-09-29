/**
 * Deck.js — Baraja Española de 40 cartas
 * Sin 8s ni 9s. Palos: Oros, Copas, Espadas, Bastos.
 */

import { Card, PALOS } from './Card.js';

const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export class Deck {
  constructor() {
    this.cards = [];
    this.vira = null;
    this._build();
  }

  /**
   * Construye las 40 cartas de la baraja.
   */
  _build() {
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
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Reparte n cartas desde el tope de la baraja.
   * @param {number} n - Cantidad de cartas a repartir
   * @returns {Card[]}
   */
  deal(n) {
    if (n > this.cards.length) {
      throw new Error(`No hay suficientes cartas. Quedan ${this.cards.length}, se pidieron ${n}`);
    }
    return this.cards.splice(0, n);
  }

  /**
   * Toma la primera carta como vira (carta de muestra).
   * @returns {Card} La carta vira
   */
  drawVira() {
    if (this.cards.length === 0) {
      throw new Error('No hay cartas en la baraja para la vira');
    }
    this.vira = this.cards.splice(0, 1)[0];
    return this.vira;
  }

  /**
   * Reinicia la baraja, reconstruye y mezcla.
   */
  reset() {
    this._build();
    this.shuffle();
    this.vira = null;
  }

  /**
   * Cantidad de cartas restantes.
   */
  get remaining() {
    return this.cards.length;
  }
}
