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
                <h2>Sala Creada</h2>
                <p>Tu código de sala es: <b style="color: gold; font-size: 1.5em; letter-spacing: 2px;">${roomId}</b></p>
                <p>Esperando a que tu amigo se una...</p>
              </div>
            `;
          });

          network.onConnected = () => {
            document.getElementById(menuContainerId).style.display = 'none';
            const config = new GameConfig({ mode: GameMode.LOCAL_1V1, targetScore: menuConfig.targetScore });
            const engine = new GameEngine(config);
            
            const ui = new UIRenderer(engine); // Host usa su engine localmente para él
            ui.init();

            // Interceptar DESPUÉS de ui.init para que no sean sobrescritos
            const hostWrapper = new HostEngineWrapper(engine, network);
            
            hostWrapper.start(); // Inicia engine y sincroniza al Guest
          };
        },
        // onJoin
        (roomId) => {
          document.getElementById(menuContainerId).innerHTML = '<div style="color:white; text-align:center; padding: 50px;">Conectando a la sala...</div>';
          network.joinRoom(roomId);
          
          network.onConnected = () => {
            document.getElementById(menuContainerId).style.display = 'none';
            const proxy = new ClientEngineProxy(network);
            
            // El UIRenderer usará el Proxy, y la localViewIndex del Guest será 1
            const ui = new UIRenderer(proxy);
            ui.localViewIndex = 1; // Asumimos que el Guest es Player 2
            ui.init();
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
