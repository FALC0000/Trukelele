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
    if (menuConfig.mode === GameMode.ONLINE_PVP) {
      // Flujo Online
      const network = new NetworkManager();

      menu.showNetworkOptions(
        // onHost
        () => {
          document.getElementById(menuContainerId).innerHTML = '<div style="color:white; text-align:center; padding: 50px;">Conectando al servidor P2P...</div>';
          network.hostRoom((roomId) => {
            document.getElementById(menuContainerId).innerHTML = `
              <div style="color:white; text-align:center; padding: 50px;">
                <h2 style="color: var(--color-gold); margin-bottom: 20px;">¡Sala Creada!</h2>
                <p style="margin-bottom: 10px;">Comparte este código con tu amigo:</p>
                <div style="font-size: 3em; letter-spacing: 8px; color: gold; font-weight: 900; font-family: 'Outfit', sans-serif; margin: 20px 0; text-shadow: 0 0 20px rgba(246,199,68,0.5);">${roomId}</div>
                <p style="color: var(--color-text-muted); font-size: 0.9em;">Esperando a que tu amigo se una...</p>
                <div style="margin-top: 20px; width: 40px; height: 40px; border: 3px solid var(--color-gold); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto;"></div>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
              </div>
            `;
          });

          network.onConnected = () => {
            // Crear config de juego LOCAL_1V1 (2 humanos, sin CPU)
            // El Host es player 0 (team1), el Guest es player 1 (team2)
            const config = new GameConfig({ mode: GameMode.LOCAL_1V1, targetScore: menuConfig.targetScore });
            const engine = new GameEngine(config);
            
            // Crear UIRenderer para el Host (localViewIndex = 0 por defecto)
            const ui = new UIRenderer(engine);
            
            // IMPORTANTE: Primero crear el HostEngineWrapper ANTES de ui.init()
            // para que los eventos del engine sean interceptados DESPUÉS de 
            // que ui.init() los registre. El HostEngineWrapper captura los handlers
            // existentes y los ejecuta + envía por red.
            const hostWrapper = new HostEngineWrapper(engine, network);
            
            // Ahora init() registra sus handlers; el wrapper los capturará en el próximo _bindEvents
            // NOTA: el orden correcto es ui.init() PRIMERO, luego hostWrapper._rebindEvents()
            // Pero dado que HostEngineWrapper captura originalHandler en el momento de _bindEvents,
            // necesitamos que ui.init() asigne los handlers ANTES de que el wrapper los sobrescriba.
            // Solución: llamar ui.init() aquí (asigna handlers), luego hostWrapper.start()
            // sobrescribe los handlers del engine envolviendo los de ui.
            
            // Ocultar menú
            document.getElementById(menuContainerId).style.display = 'none';

            // ui.init() asigna engine.onRoundStart, etc.
            ui.init();

            // hostWrapper._bindEvents() sobrescribe engine.onRoundStart con una función
            // que llama al originalHandler (el de ui) y también envía por red.
            // PERO: el HostEngineWrapper ya fue creado arriba antes de ui.init(),
            // así que en ese momento los handlers eran null.
            // SOLUCIÓN: llamamos _bindEvents() nuevamente después de ui.init()
            hostWrapper._bindEvents();
            
            // Iniciar juego - dispara onRoundStart que ya está interceptado
            hostWrapper.start();
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
              <div style="width: 40px; height: 40px; border: 3px solid var(--color-gold); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
              <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            </div>
          `;
          network.joinRoom(roomId);
          
          network.onConnected = () => {
            document.getElementById(menuContainerId).style.display = 'none';

            // El Guest usa el proxy en lugar del GameEngine real
            const proxy = new ClientEngineProxy(network);
            
            // El UIRenderer usa el Proxy; el Guest es Player 1 (team2)
            const ui = new UIRenderer(proxy);
            ui.localViewIndex = 1; // El Guest siempre es Player 2

            // Inicializar la UI (registra handlers en el proxy)
            ui.init();

            // El juego arrancará automáticamente cuando el Host envíe onRoundStart
          };
          
          network.onError = (err) => {
            alert("Error al conectar: " + err);
            location.reload();
          };
        }
      );
    } else {
      // Flujo Offline Normal
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
