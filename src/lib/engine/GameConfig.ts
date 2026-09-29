/**
 * GameConfig.ts — Configuración de Partida
 * Objeto inmutable que define el modo de juego y la puntuación objetivo.
 */

export const GameMode = {
  VS_CPU: 'vs_cpu',      // 1 humano vs 1 CPU
  ONLINE_1V1: 'online_1v1', // 1 humano local vs 1 remoto por red
  ONLINE_2V2: 'online_2v2', // 2 equipos de 2 jugadores por red
} as const;

export type GameModeType = typeof GameMode[keyof typeof GameMode];

export const GameModeLabels: Record<GameModeType, string> = {
  [GameMode.VS_CPU]: 'vs CPU',
  [GameMode.ONLINE_1V1]: '1v1 Online',
  [GameMode.ONLINE_2V2]: '2v2 Online',
};

export const GameModeDescriptions: Record<GameModeType, string> = {
  [GameMode.VS_CPU]: 'Juega contra la inteligencia artificial',
  [GameMode.ONLINE_1V1]: 'Juega contra un amigo por internet',
  [GameMode.ONLINE_2V2]: 'Dos equipos de dos jugadores por internet',
};

export const GameModeIcons: Record<GameModeType, string> = {
  [GameMode.VS_CPU]: '🤖',
  [GameMode.ONLINE_1V1]: '🌐',
  [GameMode.ONLINE_2V2]: '🌍',
};

export interface PlayerCompositionEntry {
  name: string;
  type: 'human' | 'cpu';
  index: number;
}

export interface TeamComposition {
  team1: PlayerCompositionEntry[];
  team2: PlayerCompositionEntry[];
}

export class GameConfig {
  public readonly mode: GameModeType;
  public readonly targetScore: number;
  public readonly playerNames: string[];
  public readonly teamNames: string[];
  public readonly teamComposition: TeamComposition;

  constructor({ mode = GameMode.VS_CPU, targetScore = 24, playerNames = [] }: { mode?: GameModeType; targetScore?: number; playerNames?: string[] } = {}) {
    this.mode = mode;
    this.targetScore = targetScore;

    // Asignar nombres por defecto según el modo
    switch (mode) {
      case GameMode.VS_CPU:
        this.playerNames = [
          playerNames[0] || 'Jugador',
          playerNames[1] || 'CPU'
        ];
        this.teamNames = [this.playerNames[0], this.playerNames[1]];
        this.teamComposition = {
          team1: [{ name: this.playerNames[0], type: 'human', index: 0 }],
          team2: [{ name: this.playerNames[1], type: 'cpu', index: 1 }],
        };
        break;

      case GameMode.ONLINE_1V1:
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

      case GameMode.ONLINE_2V2:
        this.playerNames = [
          playerNames[0] || 'Jugador 1',
          playerNames[1] || 'Jugador 2',
          playerNames[2] || 'Jugador 3',
          playerNames[3] || 'Jugador 4'
        ];
        this.teamNames = ['Equipo 1', 'Equipo 2'];
        // Equipos cruzados: 0 y 2 en team1, 1 y 3 en team2
        this.teamComposition = {
          team1: [
            { name: this.playerNames[0], type: 'human', index: 0 },
            { name: this.playerNames[2], type: 'human', index: 2 },
          ],
          team2: [
            { name: this.playerNames[1], type: 'human', index: 1 },
            { name: this.playerNames[3], type: 'human', index: 3 },
          ],
        };
        break;
      
      default:
        throw new Error(`Modo de juego no soportado: ${mode}`);
    }

    // Congelar el objeto para inmutabilidad
    Object.freeze(this.teamComposition);
    Object.freeze(this);
  }

  /**
   * Verifica si el modo requiere pantalla de transición entre turnos humanos.
   */
  public needsTurnTransition(): boolean {
    return false;
  }

  /**
   * Verifica si el modo es de equipos.
   */
  public isTeamMode(): boolean {
    return this.mode === GameMode.ONLINE_2V2;
  }

  /**
   * Obtiene todos los jugadores de un equipo.
   */
  public getTeamPlayers(team: 'team1' | 'team2'): PlayerCompositionEntry[] {
    return this.teamComposition[team];
  }

  /**
   * Obtiene la cantidad total de jugadores.
   */
  public getTotalPlayers(): number {
    return this.mode === GameMode.ONLINE_2V2 ? 4 : 2;
  }

  /**
   * Verifica si un jugador es humano.
   */
  public isHuman(playerIndex: number): boolean {
    const allPlayers = [
      ...this.teamComposition.team1,
      ...this.teamComposition.team2
    ];
    const player = allPlayers.find(p => p.index === playerIndex);
    return player ? player.type === 'human' : false;
  }

  /**
   * Obtiene el equipo al que pertenece un jugador.
   */
  public getPlayerTeam(playerIndex: number): 'team1' | 'team2' | null {
    for (const team of ['team1', 'team2'] as const) {
      if (this.teamComposition[team].some(p => p.index === playerIndex)) {
        return team;
      }
    }
    return null;
  }
}
