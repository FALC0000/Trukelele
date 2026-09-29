"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { ArrowLeft, Trophy, Volume2, VolumeX, Menu } from "lucide-react";

import { TavernBackground } from "@/components/ui/tavern-background";
import { Scoreboard, ScoreHistoryEntry } from "@/components/game/Scoreboard";
import { ControlsOverlay } from "@/components/game/ControlsOverlay";
import { GameBoard } from "@/components/game/GameBoard";

import { Card } from "@/lib/engine/Card";
import { GameConfig, GameMode, GameModeType } from "@/lib/engine/GameConfig";
import { GameEngine } from "@/lib/engine/GameEngine";
import { NetworkManager } from "@/lib/network/NetworkManager";
import { HostEngineWrapper } from "@/lib/network/HostEngineWrapper";
import { ClientEngineProxy } from "@/lib/network/ClientEngineProxy";

function GameBoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const mode = (params.mode as string) || "vs_cpu";
  const isHost = searchParams.get("host") === "true";
  const roomCode = searchParams.get("room") || "";

  // Referencias a los motores
  const engineRef = useRef<any>(null);
  const networkRef = useRef<NetworkManager | null>(null);

  // Estados del juego
  const [localPlayerIndex, setLocalPlayerIndex] = useState<number>(0);
  const [playerName, setPlayerName] = useState<string>("Jugador");
  const [gameState, setGameState] = useState<any>(null);
  const [localHand, setLocalHand] = useState<Card[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [cantoOffer, setCantoOffer] = useState<any>(null);
  const [roundEndSummary, setRoundEndSummary] = useState<any>(null);
  const [gameOverSummary, setGameOverSummary] = useState<any>(null);
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [peerRoomId, setPeerRoomId] = useState<string>("");
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'waiting_players' | 'connected' | 'error'>('idle');

  // Controladores de UI
  const [isMuted, setIsMuted] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);

  // Guardar última revelación diferida para el resumen de ronda
  const lastDeferredReveal = useRef<{ envido: any; flor: any } | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("trukelele_player") || "Jugador";
    setPlayerName(savedName);

    // Inicializar el juego
    if (mode === "cpu") {
      setConnectionState("connecting");
      
      const config = new GameConfig({
        mode: GameMode.VS_CPU,
        targetScore: 24,
        playerNames: [savedName, "CPU"]
      });

      const engine = new GameEngine(config);
      engineRef.current = engine;
      setLocalPlayerIndex(0);

      // Vincular eventos del Engine a la UI
      bindEngineEvents(engine, 0);

      // Iniciar partida
      engine.startGame();
      setConnectionState("connected");

    } else if (mode === "1v1" || mode === "2v2") {
      setConnectionState("connecting");
      
      const network = new NetworkManager();
      networkRef.current = network;

      if (isHost) {
        // Modo Host
        setConnectionState("connecting");
        network.hostRoom((roomId) => {
          setPeerRoomId(roomId);
          setConnectionState("waiting_players");
        });

        network.onClientConnected = (conn, playerIndex) => {
          // Una vez conectado el oponente (esperamos 1 invitado en 1v1)
          const expectedGuests = mode === "2v2" ? 3 : 1;
          
          if (network.connections.length === expectedGuests) {
            const guestNames = network.connections.map(c => (c.metadata as any)?.playerName || 'Jugador');
            
            const config = new GameConfig({
              mode: mode === "2v2" ? GameMode.ONLINE_2V2 : GameMode.ONLINE_1V1,
              targetScore: 24,
              playerNames: [savedName, ...guestNames]
            });

            const engine = new GameEngine(config);
            engineRef.current = engine;
            setLocalPlayerIndex(0);

            // Enlazar eventos locales de UI para el Host
            bindEngineEvents(engine, 0);

            // Enlazar la red a través del Wrapper
            const hostWrapper = new HostEngineWrapper(engine, network);
            hostWrapper.bindEvents();
            hostWrapper.start();

            setConnectionState("connected");
          }
        };

        network.onError = (err: any) => {
          console.warn("Aviso de red (Host):", err?.type || err?.message || err);
          // Si se pierde la conexión al servidor de señalización de PeerJS, intentamos reconectar
          if (err?.type === 'server-error' || err?.type === 'socket-error' || err?.type === 'socket-closed' || err?.message?.includes('Lost connection')) {
            if (network.peer && !network.peer.destroyed) {
              try {
                network.peer.reconnect();
              } catch (_) {}
            }
            return;
          }
          setConnectionState("error");
        };

      } else {
        // Modo Guest (Invitado)
        setConnectionState("connecting");
        
        network.joinRoom(roomCode, savedName).then(() => {
          network.onConnected = (playerIdx) => {
            setLocalPlayerIndex(playerIdx);

            const proxy = new ClientEngineProxy(network);
            engineRef.current = proxy;

            // Vincular eventos del Proxy a la UI
            bindProxyEvents(proxy, playerIdx);

            setConnectionState("connected");
          };
        }).catch(err => {
          console.warn("Aviso al unirse a la sala:", err);
          setConnectionState("error");
        });

        network.onError = (err: any) => {
          console.warn("Aviso de red (Guest):", err?.type || err?.message || err);
          if (err?.type === 'server-error' || err?.type === 'socket-error' || err?.type === 'socket-closed' || err?.message?.includes('Lost connection')) {
            if (network.peer && !network.peer.destroyed) {
              try {
                network.peer.reconnect();
              } catch (_) {}
            }
            return;
          }
          setConnectionState("error");
        };
      }
    }

    // Cleanup al desmontar
    return () => {
      if (networkRef.current) {
        networkRef.current.disconnect();
      }
    };
  }, [mode, isHost, roomCode]);

  // VINCULAR EVENTOS ENGINE (Host & CPU)
  const bindEngineEvents = (engine: GameEngine, myIndex: number) => {
    engine.onStateChange = () => {
      setGameState(engine.getGameState());
      setAvailableActions(engine.getAvailableActions(myIndex));
    };

    engine.onRoundStart = (data) => {
      setLocalHand(engine.players[myIndex].getHand());
      setGameState(engine.getGameState());
      setAvailableActions(engine.getAvailableActions(myIndex));
      setRoundEndSummary(null);
      setCantoOffer(null);
      lastDeferredReveal.current = null;
    };

    engine.onCardPlayed = () => {
      setLocalHand(engine.players[myIndex].getHand());
      setGameState(engine.getGameState());
      setAvailableActions(engine.getAvailableActions(myIndex));
    };

    engine.onBazaResolved = () => {
      setGameState(engine.getGameState());
    };

    engine.onCantoOffered = (data) => {
      setGameState(engine.getGameState());
      setAvailableActions(engine.getAvailableActions(myIndex));
      
      // Mostrar alerta si no somos los que cantamos
      const callerTeam = engine.getPlayerTeam(data.callerIndex);
      const myTeam = engine.getPlayerTeam(myIndex);
      if (callerTeam !== myTeam) {
        setCantoOffer({
          callerName: data.callerName,
          type: data.type,
          level: data.level,
          respondingTeam: data.respondingTeam,
          myTeam: myTeam
        });
      }
    };

    engine.onCantoResolved = (data) => {
      setCantoOffer(null);
      setGameState(engine.getGameState());
      setAvailableActions(engine.getAvailableActions(myIndex));
    };

    engine.onDeferredReveal = (data) => {
      lastDeferredReveal.current = data;
    };

    engine.onRoundEnd = (data) => {
      setGameState(engine.getGameState());
      setRoundEndSummary({
        winner: data.winner,
        roundNumber: data.roundNumber,
        roundPoints: data.roundPoints,
        scores: data.scores,
        byReject: data.byReject,
        deferredReveal: lastDeferredReveal.current
      });
    };

    engine.onScoreUpdate = (data) => {
      setHistory(prev => [
        {
          team: data.lastPoints.team === 'team1' ? engine.config.teamNames[0] : engine.config.teamNames[1],
          points: data.lastPoints.points,
          reason: data.lastPoints.reason
        },
        ...prev
      ]);
    };

    engine.onGameOver = (data) => {
      setGameState(engine.getGameState());
      setGameOverSummary(data);
    };

    engine.onFoldHand = () => {
      setGameState(engine.getGameState());
    };
  };

  // VINCULAR EVENTOS PROXY (Guest)
  const bindProxyEvents = (proxy: ClientEngineProxy, myIndex: number) => {
    proxy.onSyncState = () => {
      setGameState(proxy.getGameState());
      setAvailableActions(proxy.getAvailableActions(myIndex));
      
      // Sincronizar mano local desde los mock players
      if (proxy.players[myIndex]) {
        setLocalHand(proxy.players[myIndex].getHand());
      }
    };

    proxy.onRoundStart = (data) => {
      if (proxy.players[myIndex]) {
        setLocalHand(proxy.players[myIndex].getHand());
      }
      setGameState(proxy.getGameState());
      setAvailableActions(proxy.getAvailableActions(myIndex));
      setRoundEndSummary(null);
      setCantoOffer(null);
      lastDeferredReveal.current = null;
    };

    proxy.onCardPlayed = () => {
      if (proxy.players[myIndex]) {
        setLocalHand(proxy.players[myIndex].getHand());
      }
      setGameState(proxy.getGameState());
      setAvailableActions(proxy.getAvailableActions(myIndex));
    };

    proxy.onCantoOffered = (data) => {
      const myTeam = proxy.getPlayerTeam(myIndex);
      const callerTeam = data.callerTeam;

      if (callerTeam !== myTeam) {
        setCantoOffer({
          callerName: data.callerName,
          type: data.type,
          level: data.level,
          respondingTeam: data.respondingTeam,
          myTeam: myTeam
        });
      }
    };

    proxy.onCantoResolved = () => {
      setCantoOffer(null);
    };

    proxy.onDeferredReveal = (data) => {
      lastDeferredReveal.current = data;
    };

    proxy.onRoundEnd = (data) => {
      setRoundEndSummary({
        winner: data.winner,
        roundNumber: data.roundNumber,
        roundPoints: data.roundPoints,
        scores: data.scores,
        byReject: data.byReject,
        deferredReveal: lastDeferredReveal.current
      });
    };

    proxy.onScoreUpdate = (data) => {
      setHistory(prev => [
        {
          team: data.lastPoints.team === 'team1' ? proxy.config.teamNames[0] : proxy.config.teamNames[1],
          points: data.lastPoints.points,
          reason: data.lastPoints.reason
        },
        ...prev
      ]);
    };

    proxy.onGameOver = (data) => {
      setGameOverSummary(data);
    };
  };

  const handleAction = (action: string) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (action === 'fold_hand') {
      engine.foldHand(localPlayerIndex);
    } else if (action === 'quiero' || action === 'no_quiero') {
      engine.respondToCanto(localPlayerIndex, action);
    } else if (action === 'contraflor') {
      engine.respondToCanto(localPlayerIndex, 'contraflor');
    } else if (['truco', 'retruco', 'vale9', 'vale_juego'].includes(action)) {
      if (cantoOffer) {
        engine.respondToCanto(localPlayerIndex, 'raise', action);
      } else {
        engine.callTruco(localPlayerIndex);
      }
    } else if (['envido', 'envido_5', 'falta_envido'].includes(action)) {
      if (cantoOffer) {
        engine.respondToCanto(localPlayerIndex, 'raise', action);
      } else {
        engine.callEnvido(localPlayerIndex, action as any);
      }
    } else if (action === 'flor') {
      engine.declareFlor(localPlayerIndex);
    }
  };

  const handlePlayCard = (cardId: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.playCard(localPlayerIndex, cardId);
  };

  const handleNextRound = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.nextRound();
  };

  const handleRestartGame = () => {
    router.push('/');
  };

  const currentTurn = gameState?.currentTurn;

  const teamNames = engineRef.current?.config?.teamNames || ['Equipo 1', 'Equipo 2'];

  return (
    <div className="h-screen w-full relative flex flex-col bg-[#2c1e10] overflow-hidden text-[#ece5d8] font-sans">
      <TavernBackground />

      {/* 🪵 Barra Superior Caoba */}
      <div className="h-14 w-full bg-gradient-to-r from-[#3d2412] to-[#24160d] border-b-2 border-[#2e1d0f] shadow-lg flex items-center justify-between px-4 z-40 shrink-0 select-none relative">
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-[#8b6914]/20" />
        
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-[#a08a6b] hover:text-[#f3e5ab] text-xs font-bold tracking-wider uppercase transition-colors"
        >
          <ArrowLeft size={16} /> Salir
        </button>

        <h2 className="text-xl md:text-2xl font-black text-[#f3e5ab] tracking-widest font-serif drop-shadow-md">
          TRUKELELE
        </h2>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 rounded-full bg-black/35 border border-white/10 flex items-center justify-center text-[#a08a6b] hover:text-[#f3e5ab] transition-colors"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          
          <button 
            onClick={() => setIsScoreboardOpen(!isScoreboardOpen)}
            className="md:hidden w-8 h-8 rounded-full bg-black/35 border border-white/10 flex items-center justify-center text-[#a08a6b] hover:text-[#f3e5ab] transition-colors"
          >
            <Menu size={16} />
          </button>
        </div>
      </div>

      {/* 🎮 Contenido del Juego */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        
        {/* Pantallas de Carga/Conexión */}
        {connectionState === 'connecting' && (
          <div className="absolute inset-0 bg-black/75 z-40 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
            <p className="font-serif font-bold text-lg text-[#f3e5ab]">Conectando a la partida...</p>
          </div>
        )}

        {connectionState === 'waiting_players' && (
          <div className="absolute inset-0 bg-black/80 z-40 flex flex-col items-center justify-center gap-5 text-center p-6">
            <span className="block text-[#a08a6b] text-xs font-bold tracking-widest uppercase">
              Partida Online (1v1)
            </span>
            <span className="block text-[#f3e5ab] text-3xl font-black font-serif tracking-widest">
              SALA CREADA
            </span>
            <p className="text-[#ece5d8] text-sm">
              Comparte el código con tu oponente para jugar:
            </p>
            <div className="bg-black/45 border-2 border-[#8b6914]/30 rounded-xl px-8 py-3 font-serif font-black text-4xl text-[#d4af37] tracking-widest shadow-inner select-all">
              {peerRoomId}
            </div>
            <p className="text-xs text-[#a08a6b] animate-pulse">
              Esperando a que el invitado se conecte...
            </p>
            <button 
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-2 bg-[#d93829] hover:bg-[#b02b1f] border-b-4 border-[#8c1e13] rounded-lg font-bold text-sm tracking-widest transition-all active:translate-y-[4px] active:border-b-0"
            >
              CANCELAR
            </button>
          </div>
        )}

        {connectionState === 'error' && (
          <div className="absolute inset-0 bg-black/80 z-40 flex flex-col items-center justify-center gap-4 text-center p-6">
            <Trophy size={48} className="text-[#d93829]" />
            <p className="font-serif font-bold text-lg text-[#f3e5ab]">Error en la conexión</p>
            <p className="text-xs text-[#a08a6b] max-w-xs">
              No pudimos conectar con la sala. Verifica que el código sea correcto y que tu oponente tenga conexión.
            </p>
            <button 
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-[#8c5e34] border-b-4 border-[#4d331c] rounded-lg font-bold text-sm transition-all active:translate-y-[4px]"
            >
              VOLVER AL LOBBY
            </button>
          </div>
        )}

        {/* 🗺️ Área del Tablero */}
        {gameState && (
          <div className="flex-1 flex flex-col relative overflow-hidden h-full">
            {/* Tablero central */}
            <GameBoard
              gameState={gameState}
              localPlayerIndex={localPlayerIndex}
              localHand={localHand}
              isMyTurn={currentTurn === (localPlayerIndex === 0 ? 'player' : 'cpu')}
              canPlayCard={availableActions.includes('play_card')}
              onPlayCard={handlePlayCard}
              onNextRound={handleNextRound}
              onRestartGame={handleRestartGame}
              roundEndSummary={roundEndSummary}
              gameOverSummary={gameOverSummary}
              teamNames={teamNames}
            />

            {/* Panel de Botones de Canto */}
            <ControlsOverlay
              availableActions={availableActions}
              playerName={playerName}
              isMyTurn={currentTurn === (localPlayerIndex === 0 ? 'player' : 'cpu')}
              onAction={handleAction}
              cantoOffer={cantoOffer}
            />
          </div>
        )}

        {/* 📊 Scoreboard Lateral */}
        {gameState && (
          <>
            {/* Desktop Scoreboard */}
            <div className="hidden md:block h-full shrink-0">
              <Scoreboard
                scores={gameState.scores}
                targetScore={gameState.targetScore}
                teamNames={teamNames}
                history={history}
              />
            </div>

            {/* Mobile Scoreboard (Drawer Overlay) */}
            {isScoreboardOpen && (
              <div 
                className="fixed inset-0 bg-black/60 z-50 md:hidden flex justify-end"
                onClick={() => setIsScoreboardOpen(false)}
              >
                <div 
                  className="h-full w-[280px]"
                  onClick={(e) => e.stopPropagation()} // evitar cierre al hacer click dentro
                >
                  <Scoreboard
                    scores={gameState.scores}
                    targetScore={gameState.targetScore}
                    teamNames={teamNames}
                    history={history}
                  />
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

export default function GameBoardPageWrapper() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[#2c1e10] flex items-center justify-center text-white">Cargando...</div>}>
      <GameBoardPage />
    </Suspense>
  );
}
