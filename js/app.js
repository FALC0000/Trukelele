/**
 * app.js — Entry Point de Trukelele
 * Inicializa el juego.
 */

import { GameConfig, GameMode } from './engine/GameConfig.js';
import { GameEngine } from './engine/GameEngine.js';
import { UIRenderer } from './ui/UIRenderer.js';
import { MenuRenderer } from './ui/MenuRenderer.js';
import { NetworkManager } from './network/NetworkManager.js';
import { HostEngineWrapper } from './network/HostEngineWrapper.js';
import { ClientEngineProxy } from './network/ClientEngineProxy.js';
import { preloadAllCards } from './ui/CardPreloader.js';

document.addEventListener('DOMContentLoaded', () => {
  const menuContainerId = 'menu-container';
  const menuContainer = document.getElementById(menuContainerId);

  // Mostrar pantalla de carga mientras se precargan las imágenes de cartas
  menuContainer.innerHTML = `
    <div style="position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--color-bg-dark); z-index: 9999;">
      <h1 style="font-family: 'Outfit', sans-serif; color: var(--color-gold); font-size: 2.5rem; margin-bottom: 20px; letter-spacing: 4px;">TRUKELELE</h1>
      <p style="color: var(--color-text-secondary); margin-bottom: 16px; font-size: 0.9rem;">Cargando cartas...</p>
      <div style="width: 200px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
        <div id="preload-bar" style="width: 0%; height: 100%; background: var(--color-gold); border-radius: 3px; transition: width 0.15s ease;"></div>
      </div>
      <div id="preload-pct" style="color: var(--color-text-muted); font-size: 0.75rem; margin-top: 8px;">0%</div>
    </div>
  `;

  const bar = document.getElementById('preload-bar');
  const pct = document.getElementById('preload-pct');

  preloadAllCards((loaded, total) => {
    const percent = Math.round((loaded / total) * 100);
    if (bar) bar.style.width = percent + '%';
    if (pct) pct.textContent = percent + '%';
  }).then(() => {
    // Imágenes precargadas, mostrar el menú
    const menu = new MenuRenderer(menuContainerId);
    menu.show((menuConfig) => {
    if (menuConfig.mode === GameMode.ONLINE_1V1 || menuConfig.mode === GameMode.ONLINE_2V2) {
      // Flujo Online
      const network = new NetworkManager();
      const is2v2 = menuConfig.mode === GameMode.ONLINE_2V2;
      const expectedGuests = is2v2 ? 3 : 1;

      menu.showNetworkOptions(
        // onHost
        () => {
          document.getElementById(menuContainerId).innerHTML = '<div style="color:white; text-align:center; padding: 50px;">Conectando al servidor P2P...</div>';
          network.hostRoom((roomId) => {
            document.getElementById(menuContainerId).innerHTML = `
              <div style="color:white; text-align:center; padding: 50px;">
                <h2 style="color: var(--color-gold); margin-bottom: 20px;">¡Sala Creada!</h2>
                <p style="margin-bottom: 10px;">Comparte este código con tus amigos:</p>
                <div style="font-size: 3em; letter-spacing: 8px; color: gold; font-weight: 900; font-family: 'Outfit', sans-serif; margin: 20px 0; text-shadow: 0 0 20px rgba(246,199,68,0.5);">${roomId}</div>
                <p style="color: var(--color-text-muted); font-size: 0.9em;">Esperando jugadores...</p>
                <div id="players-connected" style="margin-top: 10px; font-weight: bold; font-size: 1.2em;">Conectados: 0/${expectedGuests}</div>
                <div style="margin-top: 20px; width: 40px; height: 40px; border: 3px solid var(--color-gold); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto;"></div>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
              </div>
            `;
          });

          network.onClientConnected = (conn, playerIndex) => {
            const connectedElem = document.getElementById('players-connected');
            if (connectedElem) {
              connectedElem.innerText = `Conectados: ${network.connections.length}/${expectedGuests}`;
            }

            if (network.connections.length === expectedGuests) {
              // Todos conectados, iniciar el juego
              const guestNames = network.connections.map(conn => (conn.metadata && conn.metadata.playerName) ? conn.metadata.playerName : 'Jugador');
              const config = new GameConfig({
                mode: menuConfig.mode,
                targetScore: menuConfig.targetScore,
                playerNames: [menuConfig.playerName, ...guestNames]
              });
              const engine = new GameEngine(config);
              
              const ui = new UIRenderer(engine);
              
              const hostWrapper = new HostEngineWrapper(engine, network);
              
              document.getElementById(menuContainerId).style.display = 'none';

              ui.init();
              hostWrapper._bindEvents();
              hostWrapper.start();
            }
          };

          network.onError = (err) => {
            console.error('Error de red (Host):', err);
          };
        },
        // onJoin
        (roomId) => {
          document.getElementById(menuContainerId).innerHTML = `
            <div style="color:white; text-align:center; padding: 50px;">
              <p style="margin-bottom: 20px; color: var(--color-text-secondary);">Conectando a la sala <b style="color: gold;">${roomId}</b>...</p>
              <p style="color: var(--color-text-muted); font-size: 0.9em;">Esperando al Host (el juego iniciará automáticamente)...</p>
              <div style="width: 40px; height: 40px; border: 3px solid var(--color-gold); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
              <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            </div>
          `;
          network.joinRoom(roomId, menuConfig.playerName);
          
          network.onConnected = (playerIndex) => {
            document.getElementById(menuContainerId).style.display = 'none';

            // El Guest usa el proxy en lugar del GameEngine real
            const proxy = new ClientEngineProxy(network);
            
            const ui = new UIRenderer(proxy);
            ui.localViewIndex = playerIndex; // Índice asignado por la red

            // Inicializar la UI (registra handlers en el proxy)
            ui.init();

            // El juego arrancará automáticamente cuando el Host envíe onRoundStart
          };
          
          network.onError = (err) => {
            alert("Error al conectar: " + err);
            location.reload();
          };
        },
        is2v2 // Pasar a la UI si es modo 2v2
      );
    } else {
      // Flujo Offline Normal (vs CPU)
      const config = new GameConfig({
        mode: menuConfig.mode,
        targetScore: menuConfig.targetScore,
        playerNames: [menuConfig.playerName]
      });

      const engine = new GameEngine(config);
      const ui = new UIRenderer(engine);
      ui.init();
      engine.startGame();
      
      document.getElementById(menuContainerId).style.display = 'none';
    }
    });
  }); // end preloadAllCards .then()
});
