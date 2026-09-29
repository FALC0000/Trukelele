/**
 * TurnManager.js — Control de Turnos y Bazas
 * Gestiona quién juega, las bazas y determina el ganador de la ronda.
 */

export class TurnManager {
  constructor() {
    this.mano = null;       // Quién es mano (empieza la ronda)
    this.currentTurn = null; // De quién es el turno actual
    this.bazas = [];         // Array de bazas jugadas [{player: Card, cpu: Card, winner: string}]
    this.bazaWins = { player: 0, cpu: 0 }; // Bazas ganadas
    this.currentBaza = { player: null, cpu: null }; // Baza en curso
    this.firstToPlay = null; // Quién juega primero en la baza actual
  }

  /**
   * Inicia una nueva ronda.
   * @param {'player'|'cpu'} mano - Quién es mano
   */
  startRound(mano) {
    this.mano = mano;
    this.currentTurn = mano;
    this.firstToPlay = mano;
    this.bazas = [];
    this.bazaWins = { player: 0, cpu: 0 };
    this.currentBaza = { player: null, cpu: null };
  }

  /**
   * Registra una carta jugada.
   * @param {'player'|'cpu'} who
   * @param {Card} card
   */
  playCard(who, card) {
    this.currentBaza[who] = card;
  }

  /**
   * Verifica si la baza actual está completa (ambos jugaron).
   * @returns {boolean}
   */
  isBazaComplete() {
    return this.currentBaza.player !== null && this.currentBaza.cpu !== null;
  }

  /**
   * Resuelve la baza actual y determina el ganador.
   * @param {Card} vira - La carta vira
   * @returns {{ winner: 'player'|'cpu'|'empate', playerCard: Card, cpuCard: Card }}
   */
  resolveBaza(vira) {
    const pCard = this.currentBaza.player;
    const cCard = this.currentBaza.cpu;

    const comparison = pCard.compareTo(cCard, vira);
    let winner;
    if (comparison > 0) {
      winner = 'player';
      this.bazaWins.player++;
    } else if (comparison < 0) {
      winner = 'cpu';
      this.bazaWins.cpu++;
    } else {
      winner = 'empate';
    }

    const result = {
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
   * @returns {'player'|'cpu'|null} null si la ronda no ha terminado
   */
  getRoundWinner() {
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
   * @returns {boolean}
   */
  isRoundOver() {
    return this.getRoundWinner() !== null;
  }

  /**
   * Cambia el turno al otro jugador.
   */
  switchTurn() {
    this.currentTurn = this.currentTurn === 'player' ? 'cpu' : 'player';
  }

  /**
   * Obtiene de quién es el turno.
   * @returns {'player'|'cpu'}
   */
  getCurrentTurn() {
    return this.currentTurn;
  }

  /**
   * Obtiene la cantidad de bazas jugadas.
   * @returns {number}
   */
  getBazaCount() {
    return this.bazas.length;
  }
}
