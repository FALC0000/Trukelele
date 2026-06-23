/**
 * DialogRenderer.js — Renderizado de Modales y Notificaciones
 * Muestra alertas de cantos y la pantalla de resultados.
 */

export class DialogRenderer {
  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'dialog-overlay';
    document.body.appendChild(this.overlay);
    
    this.currentCallback = null;
  }

  /**
   * Muestra un canto hecho por un jugador y pide respuesta.
   */
  showCantoOffer(data, teamNames, onResponse) {
    const { callerName, type, level } = data;
    
    let text = '';
    if (type === 'truco') {
      const texts = { truco: '¡TRUCO!', retruco: '¡QUIERO RETRUCO!', vale9: '¡VALE 9!', vale_juego: '¡VALE JUEGO!' };
      text = texts[level];
    } else if (type === 'envido') {
      const texts = { envido: '¡ENVIDO!', envido_5: '¡ENVIDO 5!', falta_envido: '¡FALTA ENVIDO!' };
      text = texts[level];
    } else if (type === 'flor') {
      text = '¡FLOR!';
    }

    let buttonsHtml = '';
    if (type === 'flor') {
      if (data.opponentHasFlor) {
        buttonsHtml = `
          <div class="dialog-actions">
            <button class="btn-dialog btn-dialog--accept" data-action="contraflor">Contraflor</button>
            <button class="btn-dialog btn-dialog--reject" data-action="no_quiero">Con flor me achico</button>
          </div>
        `;
      } else {
        buttonsHtml = `
          <div class="dialog-actions dialog-actions--full">
            <button class="btn-dialog btn-dialog--accept" data-action="quiero">OK</button>
          </div>
        `;
      }
    } else {
      // Truco o Envido normal
      buttonsHtml = `
        <div class="dialog-actions">
          <button class="btn-dialog btn-dialog--accept" data-action="quiero">Quiero</button>
          <button class="btn-dialog btn-dialog--reject" data-action="no_quiero">No Quiero</button>
        </div>
      `;
      
      // Opciones para subir
      if (type === 'truco' && level !== 'vale_juego') {
        const nextMap = { truco: 'retruco', retruco: 'vale9', vale9: 'vale_juego' };
        const labelMap = { retruco: 'Retruco', vale9: 'Vale 9', vale_juego: 'Vale Juego' };
        const next = nextMap[level];
        buttonsHtml += `
          <div class="dialog-actions dialog-actions--full" style="margin-top: var(--space-sm);">
            <button class="btn-dialog btn-dialog--raise" data-action="${next}">${labelMap[next]}</button>
          </div>
        `;
      } else if (type === 'envido' && level !== 'falta_envido') {
        const nextMap = { envido: 'envido_5', envido_5: 'falta_envido' };
        const labelMap = { envido_5: 'Envido 5', falta_envido: 'Falta Envido' };
        const next = nextMap[level];
        buttonsHtml += `
          <div class="dialog-actions" style="margin-top: var(--space-sm);">
            <button class="btn-dialog btn-dialog--raise" data-action="${next}">${labelMap[next]}</button>
            ${level === 'envido' ? `<button class="btn-dialog btn-dialog--raise" data-action="falta_envido">Falta Envido</button>` : ''}
          </div>
        `;
      }
    }

    this.overlay.innerHTML = `
      <div class="dialog-box">
        <div class="canto-alert">
          <div class="canto-caller">${callerName} canta:</div>
          <div class="canto-text">${text}</div>
        </div>
        ${buttonsHtml}
      </div>
    `;

    this.overlay.classList.add('is-active');

    // Attach events
    const buttons = this.overlay.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hide();
        const action = btn.dataset.action;
        if (action === 'quiero' || action === 'no_quiero') {
          onResponse(action);
        } else {
          onResponse('raise', action);
        }
      });
    });
  }

  /**
   * Muestra la pantalla de transición entre turnos (para 1v1 local).
   */
  showTurnTransition(nextPlayerName, onReady) {
    this.overlay.innerHTML = `
      <div class="dialog-box" style="background: var(--color-bg-dark); border-color: var(--color-gold);">
        <div class="result-subtitle">Cambio de Turno</div>
        <div class="result-title">Turno de ${nextPlayerName}</div>
        <div style="color: var(--color-text-muted); margin-bottom: var(--space-lg);">
          Pasa el dispositivo o cambia de asiento.
        </div>
        <button class="btn-action btn-action--primary" id="btn-ready">Estoy Listo</button>
      </div>
    `;
    
    this.overlay.classList.add('is-active');
    
    document.getElementById('btn-ready').addEventListener('click', () => {
      this.hide();
      onReady();
    });
  }

  /**
   * Muestra el resultado de la ronda, incluyendo envidos diferidos.
   */
  showRoundSummary(data, teamNames, deferred, onNext) {
    const { winner, roundNumber, roundPoints } = data;
    const winnerName = winner === 'team1' ? teamNames[0] : teamNames[1];

    const getMiniCardsHtml = (cards) => {
      if (!cards || cards.length === 0) return '';
      let html = '<div style="display: flex; justify-content: center; gap: 5px; margin-top: 8px;">';
      for (const card of cards) {
        const suitMap = { bastos: 'clubs', oros: 'coins', copas: 'cups', espadas: 'swords' };
        const suitEn = suitMap[card.palo];
        const numStr = card.numero.toString().padStart(2, '0');
        const bgUrl = `assets/cards/card_${suitEn}_${numStr}.svg`;
        html += `<div style="width: 40px; height: 58px; background-image: url('${bgUrl}'); background-size: contain; background-position: center; background-repeat: no-repeat; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.5);"></div>`;
      }
      html += '</div>';
      return html;
    };

    let extraHtml = '';
    if (deferred) {
       if (deferred.envido) {
         const envido = deferred.envido;
         const envidoWinner = envido.winnerTeam === 'team1' ? teamNames[0] : teamNames[1];
         let levelName = envido.level.replace('_', ' ');
         if (envido.level === 'envido_5') levelName = 'Envido 5';
         
         const winningCards = envido.winnerTeam === 'team1' ? envido.team1Cards : envido.team2Cards;
         const cardsHtml = getMiniCardsHtml(winningCards);

         extraHtml += `<div style="font-size: 0.9em; margin-bottom: 15px;">
           <div>Envido (${levelName}): Ganó ${envidoWinner} (+${envido.points} pts) [${envido.team1Points} vs ${envido.team2Points}]</div>
           ${cardsHtml}
         </div>`;
       }
       if (deferred.flor) {
         const flor = deferred.flor;
         const florWinner = flor.winnerTeam === 'team1' ? teamNames[0] : teamNames[1];
         
         const winningCards = flor.winnerTeam === 'team1' ? flor.team1Cards : flor.team2Cards;
         const cardsHtml = getMiniCardsHtml(winningCards);
         
         extraHtml += `<div style="font-size: 0.9em; margin-bottom: 10px;">
           <div>${flor.isContraflor ? 'Contraflor' : 'Flor'}: Ganó ${florWinner} (+${flor.points} pts)</div>
           ${cardsHtml}
         </div>`;
       }
    }

    this.overlay.innerHTML = `
      <div class="dialog-box round-summary">
        <div class="result-subtitle">Ronda ${roundNumber} Finalizada</div>
        <div class="result-title">${winnerName} gana</div>
        <div class="result-points">+${roundPoints} <span>pts</span></div>
        ${extraHtml ? `<div style="margin: var(--space-md) 0; color: var(--color-gold); text-align: center;">${extraHtml}</div>` : ''}
        <div class="dialog-actions dialog-actions--full">
          <button class="btn-action btn-action--primary" id="btn-next-round">Siguiente Ronda</button>
        </div>
      </div>
    `;

    this.overlay.classList.add('is-active');
    
    document.getElementById('btn-next-round').addEventListener('click', () => {
      this.hide();
      onNext();
    });
  }

  /**
   * Muestra el resultado final del juego.
   */
  showGameOver(data, onRestart) {
    const { winnerName, finalScores } = data;

    this.overlay.innerHTML = `
      <div class="dialog-box" style="border-color: var(--color-gold);">
        <div class="result-subtitle">¡FIN DEL JUEGO!</div>
        <div class="result-title">Ganador:<br>${winnerName}</div>
        <div class="result-points">
          ${finalScores.team1} - ${finalScores.team2}
        </div>
        <div class="dialog-actions dialog-actions--full">
          <button class="btn-action btn-action--primary" id="btn-restart">Volver a Jugar</button>
        </div>
      </div>
    `;

    this.overlay.classList.add('is-active');
    
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.hide();
      onRestart();
    });
  }

  /**
   * Muestra un mensaje flotante rápido (toast).
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'player-info anim-fade-in';
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '2000';
    toast.innerHTML = `<span class="player-status">${message}</span>`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s';
      setTimeout(() => toast.remove(), 500);
    }, 2000);
  }

  hide() {
    this.overlay.classList.remove('is-active');
    this.overlay.innerHTML = '';
  }
}
