/**
 * MenuRenderer.js — Renderizado del Menú Principal
 * Muestra las opciones de configuración de partida.
 */

import { GameMode, GameModeLabels, GameModeIcons, GameModeDescriptions } from '../engine/GameConfig.js';

export class MenuRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Contenedor de menú no encontrado: ${containerId}`);
    
    this.selectedMode = GameMode.VS_CPU;
    this.selectedScore = 24;
  }

  /**
   * Muestra el menú de inicio.
   * @param {Function} onStart - Callback (config) => void
   */
  show(onStart) {
    this.container.innerHTML = `
      <div class="menu-container">
        <div class="menu-content">
          <div class="menu-header">
            <h1 class="menu-title">TRUKELELE</h1>
            <p class="menu-subtitle">El Truco Venezolano Premium</p>
          </div>

          <div class="menu-section">
            <h2 class="menu-section-title">Modo de Juego</h2>
            <div class="mode-selector">
              ${this._createModeOption(GameMode.VS_CPU)}
              ${this._createModeOption(GameMode.LOCAL_1V1)}
              ${this._createModeOption(GameMode.TEAMS_2V2)}
              ${this._createModeOption(GameMode.ONLINE_PVP)}
            </div>
          </div>

          <div class="menu-section">
            <h2 class="menu-section-title">Puntuación Objetivo</h2>
            <div class="score-selector">
              <button class="btn-score ${this.selectedScore === 12 ? 'is-active' : ''}" data-score="12">12 Puntos (Rápida)</button>
              <button class="btn-score ${this.selectedScore === 24 ? 'is-active' : ''}" data-score="24">24 Puntos (Clásica)</button>
            </div>
          </div>

          <button class="btn-action btn-action--primary btn-start" id="btn-start-game">
            COMENZAR PARTIDA
          </button>
        </div>
      </div>
      
      <style>
        .menu-container {
          position: fixed;
          inset: 0;
          background: var(--color-bg-dark);
          background-image: radial-gradient(circle at center, #1a2332 0%, #0a0f1a 100%);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          z-index: 5000;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        .menu-content {
          width: 100%;
          max-width: 600px;
          padding: var(--space-xl) var(--space-md);
          padding-bottom: var(--space-2xl);
        }
        
        .menu-header {
          text-align: center;
          margin-bottom: var(--space-xl);
          padding-top: var(--space-lg);
        }
        
        .menu-title {
          font-size: clamp(2rem, 10vw, 4rem);
          color: var(--color-gold);
          letter-spacing: 4px;
          margin-bottom: var(--space-xs);
          text-shadow: var(--shadow-glow-gold);
        }
        
        .menu-subtitle {
          font-size: clamp(0.9rem, 3vw, 1.2rem);
          color: var(--color-text-secondary);
        }
        
        .menu-section {
          margin-bottom: var(--space-lg);
        }
        
        .menu-section-title {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: var(--space-sm);
        }
        
        .mode-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-sm);
        }
        
        .mode-card {
          background: var(--color-bg-card);
          border: 2px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-lg);
          padding: var(--space-md) var(--space-sm);
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-normal);
          -webkit-tap-highlight-color: transparent;
        }
        
        .mode-card:hover,
        .mode-card:active {
          background: var(--color-bg-surface);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .mode-card.is-active {
          border-color: var(--color-gold);
          background: rgba(246, 199, 68, 0.05);
          box-shadow: var(--shadow-glow-gold);
        }
        
        .mode-icon {
          font-size: clamp(1.5rem, 6vw, 2.5rem);
          margin-bottom: var(--space-xs);
        }
        
        .mode-name {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(0.75rem, 3vw, 1rem);
          color: var(--color-text-primary);
          margin-bottom: 2px;
        }
        
        .mode-desc {
          font-size: clamp(0.65rem, 2.5vw, 0.75rem);
          color: var(--color-text-muted);
        }
        
        .score-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-sm);
        }
        
        .btn-score {
          background: var(--color-bg-card);
          border: 2px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md);
          padding: var(--space-sm) var(--space-md);
          color: var(--color-text-secondary);
          font-size: clamp(0.8rem, 3vw, 1rem);
          transition: all var(--transition-fast);
          -webkit-tap-highlight-color: transparent;
        }
        
        .btn-score:hover,
        .btn-score:active {
          background: var(--color-bg-surface);
          color: var(--color-text-primary);
        }
        
        .btn-score.is-active {
          border-color: var(--color-gold);
          color: var(--color-gold);
        }
        
        .btn-start {
          width: 100%;
          padding: var(--space-md) var(--space-lg);
          font-size: clamp(1rem, 4vw, 1.2rem);
          margin-top: var(--space-md);
          -webkit-tap-highlight-color: transparent;
        }

        @media (min-height: 700px) {
          .menu-container {
            align-items: center;
          }
        }
      </style>
    `;

    // Attach events
    const modeCards = this.container.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('is-active'));
        card.classList.add('is-active');
        this.selectedMode = card.dataset.mode;
      });
    });

    const scoreBtns = this.container.querySelectorAll('.btn-score');
    scoreBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        scoreBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.selectedScore = parseInt(btn.dataset.score);
      });
    });

    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.hide();
      onStart({
        mode: this.selectedMode,
        targetScore: this.selectedScore
      });
    });
  }

  _createModeOption(mode) {
    const isActive = this.selectedMode === mode ? 'is-active' : '';
    return `
      <div class="mode-card ${isActive}" data-mode="${mode}">
        <div class="mode-icon">${GameModeIcons[mode]}</div>
        <div class="mode-name">${GameModeLabels[mode]}</div>
        <div class="mode-desc">${GameModeDescriptions[mode]}</div>
      </div>
    `;
  }

  showNetworkOptions(onHost, onJoin) {
    this.container.innerHTML = `
      <div class="menu-container">
        <div class="menu-content" style="text-align: center;">
          <h2 class="menu-title" style="font-size: 2.5rem;">Modo Online P2P</h2>
          <p class="menu-subtitle" style="margin-bottom: 2rem;">Juega contra un amigo a distancia</p>
          
          <div style="display: flex; flex-direction: column; gap: 20px; align-items: center;">
            <button class="btn-action btn-action--primary" id="btn-host" style="width: 100%; max-width: 300px;">
              Crear Sala (Host)
            </button>
            
            <div style="margin: 20px 0; color: var(--color-text-muted);">— O —</div>
            
            <div style="display: flex; gap: 10px; width: 100%; max-width: 300px;">
              <input type="text" id="input-room-id" placeholder="Código de Sala" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: white; text-transform: uppercase;">
              <button class="btn-action btn-action--secondary" id="btn-join">
                Unirse
              </button>
            </div>
            
            <button class="btn-action btn-action--danger" id="btn-back" style="margin-top: 20px;">
              Volver
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
    // Simplemente recargamos la página para volver al menú rápido
    document.getElementById('btn-back').addEventListener('click', () => location.reload());
  }

  hide() {
    this.container.innerHTML = '';
  }
}
