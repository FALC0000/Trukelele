/**
 * GameConfig.js — Configuración de Partida
 * Objeto inmutable que define el modo de juego y la puntuación objetivo.
 */

export const GameMode = {
  VS_CPU: 'vs_cpu',      // 1 humano vs 1 CPU
  LOCAL_1V1: '1v1',      // 2 humanos en la misma pantalla
  TEAMS_2V2: '2v2',      // 2 equipos de 2 jugadores
  ONLINE_PVP: 'online_pvp', // 1 humano local vs 1 remoto por red
};

export const GameModeLabels = {
  [GameMode.VS_CPU]: 'vs CPU',
  [GameMode.LOCAL_1V1]: '1 vs 1 Local',
  [GameMode.TEAMS_2V2]: '2 vs 2 Equipos',
  [GameMode.ONLINE_PVP]: 'Online P2P',
};

export const GameModeDescriptions = {
  [GameMode.VS_CPU]: 'Juega contra la inteligencia artificial',
  [GameMode.LOCAL_1V1]: 'Dos jugadores en la misma pantalla',
  [GameMode.TEAMS_2V2]: 'Dos equipos de dos jugadores',
  [GameMode.ONLINE_PVP]: 'Juega contra un amigo por internet',
};

export const GameModeIcons = {
  [GameMode.VS_CPU]: '🤖',
  [GameMode.LOCAL_1V1]: '👥',
  [GameMode.TEAMS_2V2]: '👥👥',
  [GameMode.ONLINE_PVP]: '🌐',
};

export class GameConfig {
  /**
   * @param {Object} options
   * @param {string} options.mode - Modo de juego (GameMode)
   * @param {number} options.targetScore - Puntuación objetivo (12 o 24)
   * @param {string[]} [options.playerNames] - Nombres de los jugadores
   */
  constructor({ mode = GameMode.VS_CPU, targetScore = 24, playerNames = [] } = {}) {
    this.mode = mode;
    this.targetScore = targetScore;

    // Asignar nombres por defecto según el modo
    switch (mode) {
      case GameMode.VS_CPU:
        this.playerNames = [
          playerNames[0] || 'Jugador',
          playerNames[1] || 'CPU'
        ];
        this.teamNames = ['Jugador', 'CPU'];
        this.teamComposition = {
          team1: [{ name: this.playerNames[0], type: 'human', index: 0 }],
          team2: [{ name: this.playerNames[1], type: 'cpu', index: 1 }],
        };
        break;

      case GameMode.LOCAL_1V1:
        this.playerNames = [
          playerNames[0] || 'Jugador 1',
          playerNames[1] || 'Jugador 2'
        ];
        this.teamNames = [this.playerNames[0], this.playerNames[1]];
        this.teamComposition = {
          team1: [{ name: this.playerNames[0], type: 'human', index: 0 }],
          team2: [{ name: this.playerNames[1], type: 'human', index: 1 }],
        };
        break;

      case GameMode.TEAMS_2V2:
        this.playerNames = [
          playerNames[0] || 'Jugador 1',
          playerNames[1] || 'Compañero (CPU)',
          playerNames[2] || 'Rival 1 (CPU)',
          playerNames[3] || 'Rival 2 (CPU)'
        ];
        this.teamNames = ['Tu Equipo', 'Equipo Rival'];
        this.teamComposition = {
          team1: [
            { name: this.playerNames[0], type: 'human', index: 0 },
            { name: this.playerNames[1], type: 'cpu', index: 1 },
          ],
          team2: [
            { name: this.playerNames[2], type: 'cpu', index: 2 },
            { name: this.playerNames[3], type: 'cpu', index: 3 },
          ],
        };
        break;
    }

    // Congelar el objeto para inmutabilidad
    Object.freeze(this.teamComposition);
    Object.freeze(this);
  }

  /**
   * Verifica si el modo requiere pantalla de transición entre turnos humanos.
   * @returns {boolean}
   */
  needsTurnTransition() {
    return this.mode === GameMode.LOCAL_1V1;
  }

  /**
   * Verifica si el modo es de equipos.
   * @returns {boolean}
   */
  isTeamMode() {
    return this.mode === GameMode.TEAMS_2V2;
  }

  /**
   * Obtiene todos los jugadores de un equipo.
   * @param {'team1'|'team2'} team
   * @returns {Array}
   */
  getTeamPlayers(team) {
    return this.teamComposition[team];
  }

  /**
   * Obtiene la cantidad total de jugadores.
   * @returns {number}
   */
  getTotalPlayers() {
    return this.mode === GameMode.TEAMS_2V2 ? 4 : 2;
  }

  /**
   * Verifica si un jugador es humano.
   * @param {number} playerIndex
   * @returns {boolean}
   */
  isHuman(playerIndex) {
    const allPlayers = [
      ...this.teamComposition.team1,
      ...this.teamComposition.team2
    ];
    const player = allPlayers.find(p => p.index === playerIndex);
    return player ? player.type === 'human' : false;
  }

  /**
   * Obtiene el equipo al que pertenece un jugador.
   * @param {number} playerIndex
   * @returns {'team1'|'team2'}
   */
  getPlayerTeam(playerIndex) {
    for (const team of ['team1', 'team2']) {
      if (this.teamComposition[team].some(p => p.index === playerIndex)) {
        return team;
      }
    }
    return null;
  }
}
