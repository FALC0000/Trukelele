/**
 * TurnManager.ts — Control de Turnos y Bazas
 * Gestiona quién juega, las bazas y determina el ganador de la ronda.
 */

import { Card } from './Card';

export interface BazaResult {
  winner: 'player' | 'cpu' | 'empate';
  playerCard: Card;
  cpuCard: Card;
  bazaNumber: number;
}

export class TurnManager {
  public mano: 'player' | 'cpu' | null = null;       // Quién es mano (empieza la ronda)
  public currentTurn: 'player' | 'cpu' | null = null; // De quién es el turno actual
  public bazas: BazaResult[] = [];         // Array de bazas jugadas
  public bazaWins: { player: number; cpu: number } = { player: 0, cpu: 0 }; // Bazas ganadas
  public currentBaza: { player: Card | null; cpu: Card | null } = { player: null, cpu: null }; // Baza en curso
  public firstToPlay: 'player' | 'cpu' | null = null; // Quién juega primero en la baza actual

  constructor() {
    this.mano = null;
    this.currentTurn = null;
    this.bazas = [];
    this.bazaWins = { player: 0, cpu: 0 };
    this.currentBaza = { player: null, cpu: null };
    this.firstToPlay = null;
  }

  /**
   * Inicia una nueva ronda.
   * @param mano - Quién es mano
   */
  public startRound(mano: 'player' | 'cpu'): void {
    this.mano = mano;
    this.currentTurn = mano;
    this.firstToPlay = mano;
    this.bazas = [];
    this.bazaWins = { player: 0, cpu: 0 };
    this.currentBaza = { player: null, cpu: null };
  }

  /**
   * Registra una carta jugada.
   */
  public playCard(who: 'player' | 'cpu', card: Card): void {
    this.currentBaza[who] = card;
  }

  /**
   * Verifica si la baza actual está completa (ambos jugaron).
   */
  public isBazaComplete(): boolean {
    return this.currentBaza.player !== null && this.currentBaza.cpu !== null;
  }

  /**
   * Resuelve la baza actual y determina el ganador.
   * @param vira - La carta vira
   */
  public resolveBaza(vira: Card): BazaResult {
    const pCard = this.currentBaza.player;
    const cCard = this.currentBaza.cpu;

    if (!pCard || !cCard) {
      throw new Error('No se puede resolver una baza incompleta');
    }

    const comparison = pCard.compareTo(cCard, vira);
    let winner: 'player' | 'cpu' | 'empate';
    if (comparison > 0) {
      winner = 'player';
      this.bazaWins.player++;
    } else if (comparison < 0) {
      winner = 'cpu';
      this.bazaWins.cpu++;
    } else {
      winner = 'empate';
    }

    const result: BazaResult = {
      winner,
      playerCard: pCard,
      cpuCard: cCard,
      bazaNumber: this.bazas.length + 1
    };
    this.bazas.push(result);

    // Resetear baza actual
    this.currentBaza = { player: null, cpu: null };

    // El ganador de la baza empieza la siguiente (en empate, el mano)
    if (winner === 'empate') {
      this.firstToPlay = this.mano;
      this.currentTurn = this.mano;
    } else {
      this.firstToPlay = winner;
      this.currentTurn = winner;
    }

    return result;
  }

  /**
   * Determina el ganador de la ronda basado en las bazas jugadas.
   * Se juega al mejor de 3 bazas.
   */
  public getRoundWinner(): 'player' | 'cpu' | null {
    const pw = this.bazaWins.player;
    const cw = this.bazaWins.cpu;

    // Ganó 2 bazas
    if (pw >= 2) return 'player';
    if (cw >= 2) return 'cpu';

    // Después de 3 bazas
    if (this.bazas.length >= 3) {
      if (pw > cw) return 'player';
      if (cw > pw) return 'cpu';
      // Todos empates o igual: gana el mano
      return this.mano;
    }

    // Si una baza fue empate y alguien ganó la otra
    if (this.bazas.length >= 2) {
      const hasEmpate = this.bazas.some(b => b.winner === 'empate');
      if (hasEmpate) {
        if (pw === 1 && cw === 0) return 'player';
        if (cw === 1 && pw === 0) return 'cpu';
      }
    }

    // Primera baza empate, segunda con ganador: se juega la tercera
    return null;
  }

  /**
   * Verifica si la ronda ha terminado.
   */
  public isRoundOver(): boolean {
    return this.getRoundWinner() !== null;
  }

  /**
   * Cambia el turno al otro jugador.
   */
  public switchTurn(): void {
    if (!this.currentTurn) return;
    this.currentTurn = this.currentTurn === 'player' ? 'cpu' : 'player';
  }

  /**
   * Obtiene de quién es el turno.
   */
  public getCurrentTurn(): 'player' | 'cpu' | null {
    return this.currentTurn;
  }

  /**
   * Obtiene la cantidad de bazas jugadas.
   */
  public getBazaCount(): number {
    return this.bazas.length;
  }
}
