/**
 * MenuRenderer.js v4.0 — Menú Principal Clásico
 * Estilo: Club Privado de Cartas · Casino Profesional
 * Tipografía: Cinzel (romano) + Lato (cuerpo)
 */

import { GameMode, GameModeLabels, GameModeIcons, GameModeDescriptions } from '../engine/GameConfig.js';

export class MenuRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Contenedor de menú no encontrado: ${containerId}`);
    this.selectedMode  = GameMode.VS_CPU;
    this.selectedScore = 24;
    this._mouseMoveHandler = null;
  }

  show(onStart) {
    this.container.innerHTML = `
      <div class="trk-menu" id="trk-menu">

        <!-- Fondo: gradientes cálidos + luz cenital -->
        <div class="trk-bg" aria-hidden="true">
          <div class="trk-blob trk-blob--1"></div>
          <div class="trk-blob trk-blob--2"></div>
          <div class="trk-spotlight"></div>
        </div>

        <!-- Contenido -->
        <div class="trk-content">

          <!-- Emblema superior -->
          <div class="trk-emblem" aria-hidden="true">
            <span class="trk-emblem__suit trk-emblem__suit--left">♠</span>
            <span class="trk-emblem__suit trk-emblem__suit--right">♦</span>
          </div>

          <!-- Título -->
          <header class="trk-header">
            <h1 class="trk-title"><span class="trk-title__inner">TRUKELELE</span></h1>
            <div class="trk-divider">
              <span class="trk-divider__line"></span>
              <span class="trk-divider__ornament">✦</span>
              <span class="trk-divider__text">Truco Venezolano</span>
              <span class="trk-divider__ornament">✦</span>
              <span class="trk-divider__line"></span>
            </div>
          </header>

          <!-- Modo de juego -->
          <section class="trk-section">
            <p class="trk-section-label">Modo de Juego</p>
            <div class="trk-mode-cards-container">
              ${this._createModeCard(GameMode.VS_CPU)}
              ${this._createModeCard(GameMode.ONLINE_1V1)}
              ${this._createModeCard(GameMode.ONLINE_2V2)}
            </div>
          </section>

          <!-- Puntuación -->
          <section class="trk-section">
            <p class="trk-section-label">Puntuación Objetivo</p>
            <div class="trk-score-row">
              <button class="trk-score-btn ${this.selectedScore === 12 ? 'is-active' : ''}" data-score="12" id="trk-score-12">
                <span class="trk-score-btn__num">12</span>
                <span class="trk-score-btn__label">Partida Rápida</span>
              </button>
              <button class="trk-score-btn ${this.selectedScore === 24 ? 'is-active' : ''}" data-score="24" id="trk-score-24">
                <span class="trk-score-btn__num">24</span>
                <span class="trk-score-btn__label">Partida Clásica</span>
              </button>
            </div>
          </section>

          <!-- Nombre -->
          <section class="trk-section">
            <p class="trk-section-label">Tu Nombre</p>
            <div class="trk-input-wrap">
              <input
                type="text" id="trk-player-name" class="trk-input"
                placeholder="Escribe tu nombre..."
                maxlength="15"
                value="${localStorage.getItem('trukelele_player_name') || ''}"
                autocomplete="off"
              >
            </div>
          </section>

          <!-- CTA -->
          <button class="trk-btn-start" id="trk-btn-start">
            Comenzar Partida
          </button>

          <!-- Pie -->
          <p class="trk-footer">
            <span class="trk-footer__ornament">♠ ♥ ♦ ♣</span>
            <span>Baraja Española · 40 cartas</span>
            <span class="trk-footer__ornament">♠ ♥ ♦ ♣</span>
          </p>

        </div>
      </div>

      <style>
        /* Contenedor */
        .trk-menu {
          position: fixed; inset: 0;
          background: #0C0A08;
          display: flex; align-items: flex-start;
          justify-content: center;
          z-index: 5000;
          overflow-y: auto; -webkit-overflow-scrolling: touch;
          font-family: 'Lato', sans-serif;
        }

        /* Fondo */
        .trk-bg {
          position: fixed; inset: 0;
          pointer-events: none; overflow: hidden; z-index: 0;
        }
        .trk-blob {
          position: absolute; border-radius: 50%;
          filter: blur(90px); will-change: transform;
        }
        .trk-blob--1 {
          width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(12,68,34,0.5), transparent);
          top: -250px; left: -150px; opacity: 0.6;
          animation: blobFloat1 14s ease-in-out infinite;
        }
        .trk-blob--2 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(139,105,20,0.25), transparent);
          bottom: -200px; right: -150px; opacity: 0.5;
          animation: blobFloat2 18s ease-in-out infinite;
        }
        .trk-spotlight {
          position: absolute;
          width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle at center, rgba(201,168,76,0.04) 0%, transparent 65%);
          top: -100px; left: 50%; transform: translateX(-50%);
          pointer-events: none;
        }

        /* Contenido */
        .trk-content {
          position: relative; z-index: 10;
          width: 100%; max-width: 520px;
          padding: 2.5rem 1.5rem 3.5rem;
          display: flex; flex-direction: column;
          gap: 1.6rem; align-items: stretch;
        }

        /* Emblema */
        .trk-emblem {
          display: flex; justify-content: center;
          gap: 1.2rem; opacity: 0.18; font-size: 1.8rem;
        }
        .trk-emblem__suit--left  { color: #C8D4DA; }
        .trk-emblem__suit--right { color: #C9A84C; }

        /* Título */
        .trk-header { text-align: center; width: 100%; }
        .trk-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(2.6rem, 12vw, 5rem);
          font-weight: 700; color: #C9A84C;
          line-height: 1; margin-bottom: 0.8rem;
          display: block; text-align: center;
          text-shadow: 0 2px 4px rgba(0,0,0,0.6), 0 0 30px rgba(139,105,20,0.2);
        }
        /* Compensar trailing letter-spacing para centrado óptico real */
        .trk-title__inner {
          display: inline-block;
          letter-spacing: 0.14em;
          margin-right: -0.14em;
        }
        .trk-divider {
          display: flex; align-items: center;
          justify-content: center; gap: 0.5rem;
        }
        .trk-divider__line {
          flex: 1; max-width: 50px; height: 1px;
          background: linear-gradient(to right, transparent, rgba(201,168,76,0.3), transparent);
        }
        .trk-divider__ornament { font-size: 0.65rem; color: rgba(201,168,76,0.5); }
        .trk-divider__text {
          font-family: 'Lato', sans-serif;
          font-size: 0.8rem; font-weight: 400;
          letter-spacing: 0.18em; text-transform: uppercase; color: #9A8060;
        }

        /* Secciones */
        .trk-section { display: flex; flex-direction: column; gap: 0.55rem; }
        .trk-section-label {
          font-family: 'Lato', sans-serif;
          font-size: 0.72rem; font-weight: 700;
          color: #9A8060; text-transform: uppercase; letter-spacing: 0.18em;
        }

        /* ── MODO CARDS — Estilo Naipes Verticales ── */
        .trk-mode-cards-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.8rem;
          perspective: 1000px;
          margin-top: 0.4rem;
        }

        .trk-mode-card {
          position: relative;
          height: 160px;
          background: linear-gradient(160deg, #1A140F, #0E0A07);
          border: 1px solid rgba(139, 105, 20, 0.4);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          box-shadow: 0 4px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02);
          color: #E8D8B8;
          transform-style: preserve-3d;
        }

        /* Marco interior ornamental (estilo carta) */
        .trk-mode-card::before {
          content: '';
          position: absolute;
          inset: 5px;
          border: 1px solid rgba(139, 105, 20, 0.25);
          border-radius: 6px;
          pointer-events: none;
        }

        /* Textura sutil */
        .trk-mode-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Ccircle cx='1' cy='1' r='0.5' fill='rgba(0,0,0,0.03)'/%3E%3C/svg%3E");
          border-radius: inherit;
          pointer-events: none;
        }

        /* Elevación en hover */
        .trk-mode-card:hover {
          background: linear-gradient(160deg, #221A14, #120D0A);
          transform: translateY(-8px) rotateX(4deg);
          box-shadow: 0 12px 24px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.5);
          z-index: 2;
        }

        /* Estado activo (seleccionado) */
        .trk-mode-card.is-active {
          background: linear-gradient(160deg, #2A1F16, #16100B);
          transform: translateY(-12px) rotateX(4deg);
          box-shadow: 0 16px 32px rgba(0,0,0,0.9), 0 0 0 2px #C9A84C, 0 0 20px rgba(201,168,76,0.3);
          border-color: #C9A84C;
          z-index: 3;
        }

        /* Emblema central de la carta */
        .trk-mode-card__emblem {
          font-size: 3.2rem;
          line-height: 1;
          color: #8B6914; /* Oro oscuro / bronce */
          margin-bottom: 0.5rem;
          transition: transform 0.35s ease, color 0.35s ease;
          position: relative;
          z-index: 5;
        }

        .trk-mode-card:hover .trk-mode-card__emblem { transform: scale(1.08); }
        .trk-mode-card.is-active .trk-mode-card__emblem {
          color: #C9A84C; /* Brillo dorado */
          transform: scale(1.15);
          text-shadow: 0 2px 15px rgba(201,168,76,0.4);
        }

        /* Nombre del modo */
        .trk-mode-card__name {
          font-family: 'Cinzel', serif;
          font-size: 0.8rem;
          font-weight: 700;
          color: inherit;
          text-align: center;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 0 0.5rem;
          line-height: 1.1;
          position: relative;
          z-index: 5;
        }

        /* Pequeña etiqueta de jugadores */
        .trk-mode-card__badge {
          position: absolute;
          bottom: 12px;
          font-family: 'Lato', sans-serif;
          font-size: 0.55rem;
          font-weight: 700;
          color: #9A8060;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          background: rgba(255,255,255,0.03);
          padding: 3px 8px;
          border-radius: 100px;
          border: 1px solid rgba(139,105,20,0.2);
          z-index: 5;
        }

        .trk-mode-card.is-active .trk-mode-card__badge {
          background: rgba(139,105,20,0.25);
          color: #E8D8B8;
          border-color: rgba(201,168,76,0.4);
        }

        /* Score buttons */
        .trk-score-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
        .trk-score-btn {
          background: rgba(26, 20, 16, 0.9);
          border: 1px solid rgba(201, 168, 76, 0.12);
          border-radius: 8px; padding: 0.85rem;
          cursor: pointer; color: #F5F0E8;
          transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          -webkit-tap-highlight-color: transparent;
        }
        .trk-score-btn:hover {
          background: rgba(35, 28, 21, 0.95);
          border-color: rgba(201, 168, 76, 0.28); transform: translateY(-1px);
        }
        .trk-score-btn.is-active {
          background: rgba(35, 28, 21, 0.98);
          border-color: rgba(201, 168, 76, 0.42);
          box-shadow: inset 0 0 15px rgba(139,105,20,0.05);
        }
        .trk-score-btn__num {
          font-family: 'Cinzel', serif; font-size: 1.6rem; font-weight: 700;
          line-height: 1; color: #C9A84C;
        }
        .trk-score-btn.is-active .trk-score-btn__num { text-shadow: 0 2px 8px rgba(139,105,20,0.3); }
        .trk-score-btn__label {
          font-family: 'Lato', sans-serif; font-size: 0.72rem;
          letter-spacing: 0.1em; color: #9A8060; font-weight: 400; text-transform: uppercase;
        }

        /* Input */
        .trk-input-wrap {
          background: rgba(12, 10, 8, 0.8);
          border: 1px solid rgba(201, 168, 76, 0.14);
          border-radius: 8px; transition: all 0.25s ease; overflow: hidden;
        }
        .trk-input-wrap:focus-within {
          border-color: rgba(201, 168, 76, 0.38);
          box-shadow: 0 0 0 3px rgba(139,105,20,0.08);
        }
        .trk-input {
          width: 100%; background: transparent; border: none; outline: none;
          color: #F5F0E8; font-family: 'Lato', sans-serif;
          font-size: 1rem; font-weight: 400;
          padding: 0.82rem 1rem; caret-color: #C9A84C; letter-spacing: 0.03em;
        }
        .trk-input::placeholder { color: #7A6848; font-weight: 300; font-style: italic; font-size: 0.92rem; }

        /* CTA */
        .trk-btn-start {
          position: relative;
          background: linear-gradient(135deg, #8B6914 0%, #C9A84C 55%, #B8942A 100%);
          color: #0C0A08; border: none; border-radius: 8px;
          padding: 0.95rem 2rem;
          font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase; cursor: pointer;
          transition: all 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          box-shadow: 0 4px 20px rgba(139,105,20,0.35), 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18);
          -webkit-tap-highlight-color: transparent; margin-top: 0.5rem;
        }
        .trk-btn-start::before {
          content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        }
        .trk-btn-start:hover {
          background: linear-gradient(135deg, #9A7518 0%, #D4B04A 55%, #C9A84C 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(139,105,20,0.45), 0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.22);
        }
        .trk-btn-start:active { transform: translateY(0); }

        /* Footer */
        .trk-footer {
          font-family: 'Lato', sans-serif; font-size: 0.7rem; font-weight: 300;
          color: #7A6848; letter-spacing: 0.14em; text-align: center;
          text-transform: uppercase;
          display: flex; align-items: center; justify-content: center; gap: 0.8rem;
        }
        .trk-footer__ornament { letter-spacing: 0.3em; font-size: 0.6rem; }

        /* Entradas escalonadas */
        .trk-content > * {
          opacity: 0; transform: translateY(10px);
          animation: fadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        .trk-content > *:nth-child(1) { animation-delay: 0.05s; }
        .trk-content > *:nth-child(2) { animation-delay: 0.12s; }
        .trk-content > *:nth-child(3) { animation-delay: 0.20s; }
        .trk-content > *:nth-child(4) { animation-delay: 0.27s; }
        .trk-content > *:nth-child(5) { animation-delay: 0.34s; }
        .trk-content > *:nth-child(6) { animation-delay: 0.41s; }
        .trk-content > *:nth-child(7) { animation-delay: 0.48s; }

        @media (min-height: 700px) { .trk-menu { align-items: center; } }
        @media (max-width: 500px) {
          .trk-content { padding: 1.8rem 1rem 3rem; gap: 1.25rem; }
          .trk-title { font-size: clamp(2.2rem, 14vw, 3.5rem); }
          .trk-mode-card__desc { display: none; }
          .trk-mode-card { padding: 0.8rem 0.3rem; }
        }
      </style>
    `;

    const modeCards = this.container.querySelectorAll('.trk-mode-card');
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('is-active'));
        card.classList.add('is-active');
        this.selectedMode = card.dataset.mode;
      });
    });

    const scoreBtns = this.container.querySelectorAll('.trk-score-btn');
    scoreBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        scoreBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.selectedScore = parseInt(btn.dataset.score);
      });
    });

    document.getElementById('trk-btn-start').addEventListener('click', () => {
      const nameInput = document.getElementById('trk-player-name');
      let playerName = nameInput ? nameInput.value.trim() : '';
      if (!playerName) playerName = 'Jugador 1';
      localStorage.setItem('trukelele_player_name', playerName);
      this.hide();
      onStart({ mode: this.selectedMode, targetScore: this.selectedScore, playerName });
    });
  }

  _createModeCard(mode) {
    const isActive = this.selectedMode === mode ? 'is-active' : '';

    // Datos enriquecidos por modo
    const meta = {
      [GameMode.VS_CPU]:      { suit: '♠', badge: '1 JUG', name: 'VS CPU' },
      [GameMode.ONLINE_1V1]:  { suit: '♦', badge: '1 VS 1', name: 'ONLINE' },
      [GameMode.ONLINE_2V2]:  { suit: '♥', badge: '2 VS 2', name: 'PAREJAS' },
    };
    const { suit, badge, name } = meta[mode] || { suit: '♣', badge: '—', name: '' };

    return `
      <div class="trk-mode-card ${isActive}" data-mode="${mode}" role="button" tabindex="0" aria-pressed="${isActive ? 'true' : 'false'}">
        <div class="trk-mode-card__emblem">${suit}</div>
        <div class="trk-mode-card__name">${name}</div>
        <div class="trk-mode-card__badge">${badge}</div>
      </div>
    `;
  }

  showNetworkOptions(onHost, onJoin, is2v2 = false) {
    this.container.innerHTML = `
      <div class="trk-menu" style="font-family:'Lato',sans-serif;">
        <div class="trk-bg" aria-hidden="true">
          <div class="trk-blob trk-blob--1"></div>
          <div class="trk-blob trk-blob--2"></div>
          <div class="trk-spotlight"></div>
        </div>
        <div class="trk-content" style="text-align:center;max-width:440px;">
          <div class="trk-emblem" aria-hidden="true">
            <span class="trk-emblem__suit trk-emblem__suit--left">♠</span>
            <span class="trk-emblem__suit trk-emblem__suit--right">♦</span>
          </div>
          <header class="trk-header">
            <h2 class="trk-title" style="font-size:clamp(1.8rem,8vw,3rem);">ONLINE ${is2v2 ? '2V2' : '1V1'}</h2>
            <div class="trk-divider">
              <span class="trk-divider__line"></span>
              <span class="trk-divider__ornament">✦</span>
              <span class="trk-divider__text">Juega contra amigos</span>
              <span class="trk-divider__ornament">✦</span>
              <span class="trk-divider__line"></span>
            </div>
          </header>
          <div style="display:flex;flex-direction:column;gap:0.7rem;margin-top:0.5rem;">
            <button class="trk-btn-start" id="btn-host"
              style="background:linear-gradient(135deg,#0A1F10,#12361C);color:#C8D4B4;border:1px solid rgba(18,54,28,0.6);box-shadow:0 4px 16px rgba(0,0,0,0.5);">
              Crear Sala — Host
            </button>
            <div class="trk-divider" style="margin:0.1rem 0;">
              <span class="trk-divider__line"></span>
              <span class="trk-divider__text">o unirse</span>
              <span class="trk-divider__line"></span>
            </div>
            <div class="trk-input-wrap">
              <input type="text" id="input-room-id" class="trk-input"
                placeholder="Código de sala..." style="text-transform:uppercase;letter-spacing:0.15em;" autocomplete="off">
            </div>
            <button class="trk-btn-start" id="btn-join"
              style="background:linear-gradient(135deg,#1A1008,#2A1C0C);color:#C9A84C;border:1px solid rgba(201,168,76,0.3);box-shadow:0 4px 16px rgba(0,0,0,0.4);">
              Unirse a Sala
            </button>
            <button id="btn-back"
              style="font-family:'Cinzel',serif;font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;color:#7A6848;cursor:pointer;background:transparent;border:none;margin-top:0.3rem;padding:0.4rem;">
              ← Volver al Menú
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-host').addEventListener('click', onHost);
    document.getElementById('btn-join').addEventListener('click', () => {
      const roomId = document.getElementById('input-room-id').value.trim().toUpperCase();
      if (roomId) onJoin(roomId);
      else alert('Por favor, ingresa un código de sala válido.');
    });
    document.getElementById('btn-back').addEventListener('click', () => location.reload());
  }

  hide() {
    if (this._mouseMoveHandler) {
      window.removeEventListener('mousemove', this._mouseMoveHandler);
      this._mouseMoveHandler = null;
    }
    this.container.innerHTML = '';
  }
}
