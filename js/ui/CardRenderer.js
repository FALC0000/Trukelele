/**
 * CardRenderer.js — Renderizado Visual de Cartas
 * Crea los elementos DOM para las cartas con sus estilos premium.
 */

export class CardRenderer {
  /**
   * Crea el elemento DOM para una carta.
   * @param {Object} card - Objeto Card del motor
   * @param {Object} options - Opciones de renderizado
   * @param {boolean} options.isFaceDown - Si la carta está boca abajo
   * @param {boolean} options.isVira - Si es la carta vira
   * @param {Card} options.viraCard - La carta vira actual (para calcular Perico/Perica)
   * @param {boolean} options.isPlayed - Si la carta ya fue jugada
   * @param {number} options.animDelayIndex - Índice para retraso de animación
   * @returns {HTMLElement}
   */
  static createCard(card, options = {}) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = card?.id || 'facedown';

    if (options.isFaceDown || !card) {
      el.classList.add('card--facedown');
      el.style.backgroundImage = `url('assets/cards/card_back.svg')`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
      
    } else {
      // Configuración de la carta boca arriba
      el.dataset.palo = card.palo;

      // Determinar si es carta especial
      let isSpecial = false;
      if (options.viraCard) {
        if (card.isPerico(options.viraCard) || card.isPerica(options.viraCard)) {
          isSpecial = true;
        }
      }
      
      if (isSpecial) {
        el.classList.add('card--special');
      }

      if (options.isVira) {
        el.classList.add('card--vira');
      }

      if (options.isPlayed) {
        el.classList.add('card--played');
      }

      // Establecer imagen de fondo real
      const suitMap = {
        bastos: 'clubs',
        oros: 'coins',
        copas: 'cups',
        espadas: 'swords'
      };
      const suitEn = suitMap[card.palo];
      const numStr = card.numero.toString().padStart(2, '0');
      const bgUrl = `assets/cards/card_${suitEn}_${numStr}.svg`;
      
      el.style.backgroundImage = `url('${bgUrl}')`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';

      // Estructura interna solo para Perico/Perica
      if (isSpecial) {
        const specialName = card.isPerico(options.viraCard) ? 'PERICO' : 'PERICA';
        el.innerHTML = `
          <div class="card__special-badge" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); color: gold; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; z-index: 10;">${specialName}</div>
        `;
      }
    }

    // Animación de reparto (deal)
    if (options.animDelayIndex !== undefined) {
      el.classList.add('anim-deal');
      el.classList.add(`anim-deal-${options.animDelayIndex + 1}`);
    }

    return el;
  }

  /**
   * Obtiene un nombre corto para mostrar en la carta.
   * @private
   */
  static _getShortName(card, isSpecial, viraCard) {
    if (isSpecial) {
      if (card.isPerico(viraCard)) return 'PERICO';
      if (card.isPerica(viraCard)) return 'PERICA';
    }
    
    // Nombres fijos especiales
    if (card.numero === 1 && card.palo === 'espadas') return 'ESPADILLA';
    if (card.numero === 1 && card.palo === 'bastos') return 'BASTILLO';
    if (card.numero === 7 && card.palo === 'espadas') return '7 ESPADA';
    if (card.numero === 7 && card.palo === 'oros') return '7 ORO';

    // Figuras
    if (card.numero === 12) return 'REY';
    if (card.numero === 11) return 'CABALLO';
    if (card.numero === 10) return 'SOTA';

    // Comunes
    return card.palo;
  }
}
