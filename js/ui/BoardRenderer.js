/**
 * BoardRenderer.js — Renderizado de la Mesa de Juego
 * Gestiona la representación visual de los jugadores, la mesa y las cartas jugadas.
 */

import { CardRenderer } from './CardRenderer.js';

export class BoardRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Contenedor no encontrado: ${containerId}`);
    
    this.elements = {
      p1Area: null,
      p2Area: null,
      playZone: null,
      viraContainer: null,
      p1Hand: null,
      p2Hand: null,
    };
  }

  /**
   * Inicializa la estructura del tablero.
   */
  init() {
    this.container.innerHTML = `
      <div class="table-area">
        <!-- CPU / Oponente (Arriba) -->
        <div class="player-area player-area--top" id="p2-area">
          <div class="player-info">
            <span class="player-name" id="p2-name">Oponente</span>
            <span class="player-status" id="p2-status"></span>
          </div>
          <div class="hand hand--cpu" id="p2-hand"></div>
        </div>

        <!-- Zona Central (Mesa) -->
        <div class="play-area">
          <div class="play-zone" id="play-zone"></div>
          
          <div class="vira-container" id="vira-container">
            <div class="deck-stack">
              <div class="card card--facedown deck-card"></div>
              <div class="card card--facedown deck-card"></div>
              <div class="card card--facedown deck-card"></div>
              <div id="vira-slot" class="vira-slot"></div>
            </div>
          </div>
        </div>

        <!-- Historial de Bazas (HUD inferior izquierdo) -->
        <div class="baza-history" id="baza-history" style="display: none;">
          <div class="baza-history__title">Bazas</div>
          <div class="baza-history__list" id="baza-history-list"></div>
        </div>

        <!-- Jugador Local (Abajo) -->
        <div class="player-area player-area--bottom" id="p1-area">
          <div class="hand" id="p1-hand"></div>
          <div class="player-info">
            <span class="player-name" id="p1-name">Jugador</span>
            <span class="player-status" id="p1-status"></span>
          </div>
        </div>
      </div>
    `;

    this.elements.p1Area = document.getElementById('p1-area');
    this.elements.p2Area = document.getElementById('p2-area');
    this.elements.playZone = document.getElementById('play-zone');
    this.elements.viraSlot = document.getElementById('vira-slot');
    this.elements.p1Hand = document.getElementById('p1-hand');
    this.elements.p2Hand = document.getElementById('p2-hand');
    this.elements.p1Name = document.getElementById('p1-name');
    this.elements.p2Name = document.getElementById('p2-name');
    this.elements.bazaHistory = document.getElementById('baza-history');
    this.elements.bazaHistoryList = document.getElementById('baza-history-list');
  }

  /**
   * Actualiza el tablero con el estado actual.
   * @param {Object} state - Estado del juego desde GameEngine
   */
  render(state) {
    if (!state) return;

    // Renderizar Vira
    this.elements.viraSlot.innerHTML = '';
    if (state.vira) {
      const viraEl = CardRenderer.createCard(state.vira, { isVira: true });
      this.elements.viraSlot.appendChild(viraEl);
    }

    // Identificar jugador local y oponente para la vista (asumimos vista desde team1)
    const localPlayer = state.players.find(p => p.team === 'team1');
    const opponentPlayer = state.players.find(p => p.team === 'team2');

    // Nombres
    if (localPlayer) this.elements.p1Name.textContent = localPlayer.name;
    if (opponentPlayer) this.elements.p2Name.textContent = opponentPlayer.name;

    // Turnos
    this.elements.p1Area.classList.toggle('is-turn', state.currentTurn === 'player');
    this.elements.p2Area.classList.toggle('is-turn', state.currentTurn === 'cpu');

    // Renderizar mano local (si es turno local o siempre visible)
    // Nota: en modo 1v1 local, la mano se renderiza desde UIRenderer usando renderLocalHand
  }

  /**
   * Renderiza una mano específica en el área inferior.
   * @param {Card[]} hand
   * @param {Card} vira
   * @param {Function} onCardClick
   */
  renderLocalHand(hand, vira, onCardClick) {
    this.elements.p1Hand.innerHTML = '';
    
    if (!hand) return;

    hand.forEach((card, index) => {
      const el = CardRenderer.createCard(card, {
        viraCard: vira,
        animDelayIndex: index
      });
      
      el.addEventListener('click', () => {
        if (!el.classList.contains('card--disabled')) {
          onCardClick(card.id);
        }
      });
      
      this.elements.p1Hand.appendChild(el);
    });
  }

  /**
   * Renderiza cartas boca abajo para el oponente.
   * @param {number} count
   */
  renderOpponentHand(count) {
    this.elements.p2Hand.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const el = CardRenderer.createCard(null, { isFaceDown: true, animDelayIndex: i });
      this.elements.p2Hand.appendChild(el);
    }
  }

  /**
   * Anima y renderiza una carta jugada en la zona central.
   * @param {Object} data
   */
  playCardAnim(data) {
    const { card, team, vira } = data;
    const el = CardRenderer.createCard(card, { viraCard: vira, isPlayed: true });
    
    el.classList.add('played-card');
    el.classList.add(team === 'team1' ? 'played-card--p1' : 'played-card--p2');
    
    // Configurar transformaciones aleatorias mediante variables CSS
    el.style.setProperty('--rand-x', `${Math.random() * 24 - 12}px`);
    el.style.setProperty('--rand-y', `${Math.random() * 24 - 12}px`);
    el.style.setProperty('--rand-r', `${Math.random() * 12 - 6}deg`);
    
    // Añadir animación de entrada
    el.style.opacity = '0';
    this.elements.playZone.appendChild(el);
    
    // Forzar reflow
    void el.offsetWidth;
    
    el.style.opacity = '1';
  }

  /**
   * Actualiza el HUD del historial de bazas jugadas en la ronda.
   * @param {Array} bazas
   */
  updateBazaHistory(bazas) {
    if (!bazas || bazas.length === 0) {
      this.elements.bazaHistory.style.display = 'none';
      this.elements.bazaHistoryList.innerHTML = '';
      return;
    }

    this.elements.bazaHistory.style.display = 'flex';
    this.elements.bazaHistoryList.innerHTML = '';

    bazas.forEach((baza, idx) => {
      const item = document.createElement('div');
      item.className = 'baza-history-item';

      const pCard = baza.playerCard;
      const cCard = baza.cpuCard;
      const winner = baza.winner; // 'player' | 'cpu' | 'empate'

      const label = document.createElement('span');
      label.className = 'baza-history-item__label';
      label.textContent = `Baza ${idx + 1}`;

      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'baza-history-item__cards';

      // Mini carta Jugador
      if (pCard) {
        const pMini = document.createElement('div');
        pMini.className = `baza-mini-card ${winner === 'player' ? 'baza-mini-card--winner' : ''}`;
        pMini.dataset.palo = pCard.palo;
        const paloAbbr = pCard.palo.charAt(0).toUpperCase();
        pMini.innerHTML = `<span>${pCard.numero} ${paloAbbr}</span><span>${pCard.getSymbol()}</span>`;
        cardsContainer.appendChild(pMini);
      }

      // Mini carta CPU
      if (cCard) {
        const cMini = document.createElement('div');
        cMini.className = `baza-mini-card ${winner === 'cpu' ? 'baza-mini-card--winner' : ''}`;
        cMini.dataset.palo = cCard.palo;
        const paloAbbr = cCard.palo.charAt(0).toUpperCase();
        cMini.innerHTML = `<span>${cCard.numero} ${paloAbbr}</span><span>${cCard.getSymbol()}</span>`;
        cardsContainer.appendChild(cMini);
      }

      item.appendChild(label);
      item.appendChild(cardsContainer);
      this.elements.bazaHistoryList.appendChild(item);
    });
  }

  /**
   * Limpia la zona central (al resolver baza o ronda).
   * @param {string} winnerTeam
   */
  clearPlayZone(winnerTeam) {
    const cards = Array.from(this.elements.playZone.querySelectorAll('.card'));
    
    cards.forEach(card => {
      // Añadir clase de animación según ganador
      if (winnerTeam === 'team1') {
        card.classList.add('anim-sweep-p1');
      } else if (winnerTeam === 'team2') {
        card.classList.add('anim-sweep-p2');
      } else {
        card.style.opacity = '0'; // Empate, fade out simple
      }
    });

    // Remover del DOM después de la animación
    setTimeout(() => {
      this.elements.playZone.innerHTML = '';
    }, 600);
  }

  /**
   * Habilita o deshabilita las cartas locales.
   * @param {boolean} enabled
   */
  setCardsEnabled(enabled) {
    const cards = this.elements.p1Hand.querySelectorAll('.card');
    cards.forEach(card => {
      if (enabled) {
        card.classList.remove('card--disabled');
      } else {
        card.classList.add('card--disabled');
      }
    });
  }
}
