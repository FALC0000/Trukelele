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

document.addEventListener('DOMContentLoaded', () => {
  const menuContainerId = 'menu-container';
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
              const config = new GameConfig({ mode: menuConfig.mode, targetScore: menuConfig.targetScore });
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
          network.joinRoom(roomId);
          
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
      });

      const engine = new GameEngine(config);
      const ui = new UIRenderer(engine);
      ui.init();
      engine.startGame();
      
      document.getElementById(menuContainerId).style.display = 'none';
    }
  });
});
