import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/lib/engine/Card';
import { Button } from '@/components/ui/button';

interface GameBoardProps {
  gameState: {
    state: string;
    roundNumber: number;
    vira: Card | null;
    scores: { team1: number; team2: number };
    targetScore: number;
    trucoLevel: string | null;
    envidoPlayed: boolean;
    florPlayed: boolean;
    currentTurn: string | null;
    bazaCount: number;
    bazaWins: { player: number; cpu: number };
    currentBaza: { player: Card | null; cpu: Card | null };
    players: {
      name: string;
      cardsRemaining: number;
      isHuman: boolean;
      index: number;
      team: 'team1' | 'team2';
    }[];
    mode: string;
  };
  localPlayerIndex: number;
  localHand: Card[];
  isMyTurn: boolean;
  canPlayCard: boolean;
  onPlayCard: (cardId: string) => void;
  onNextRound: () => void;
  onRestartGame: () => void;
  roundEndSummary: {
    winner: 'team1' | 'team2';
    roundNumber: number;
    roundPoints: number;
    scores: { team1: number; team2: number };
    byReject?: boolean;
    deferredReveal?: {
      envido: any;
      flor: any;
    } | null;
  } | null;
  gameOverSummary: {
    winner: 'team1' | 'team2';
    winnerName: string;
    finalScores: { team1: number; team2: number };
    totalRounds: number;
  } | null;
  teamNames: string[];
}

const getCardImagePath = (card: Card | null): string => {
  if (!card) return '/assets/cards/card_back.svg';
  const suitMap: Record<string, string> = {
    bastos: 'clubs',
    oros: 'coins',
    copas: 'cups',
    espadas: 'swords'
  };
  const suit = suitMap[card.palo];
  const numStr = card.numero.toString().padStart(2, '0');
  return `/assets/cards/card_${suit}_${numStr}.svg`;
};

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  localPlayerIndex,
  localHand,
  isMyTurn,
  canPlayCard,
  onPlayCard,
  onNextRound,
  onRestartGame,
  roundEndSummary,
  gameOverSummary,
  teamNames
}) => {
  const { vira, currentBaza, bazaWins } = gameState;

  // Encontrar la información del oponente
  const player = gameState.players.find(p => p.index === localPlayerIndex) || gameState.players[0];
  const opponent = gameState.players.find(p => p.index !== localPlayerIndex) || gameState.players[1];

  const myTeam = player.team;
  const oppTeam = opponent.team;

  // Determinar si es vs CPU o multijugador
  const isVsCpu = opponent.name === 'CPU';

  // Cartas jugadas en mesa
  // En 1v1 local o vs CPU:
  // p1Card (nuestro) es de team1 (player en TurnManager), p2Card (CPU) es de team2 (cpu en TurnManager)
  // En online P2P:
  // El Host es index 0, el Guest es index 1.
  const myPlayedCard = localPlayerIndex === 0 ? currentBaza.player : currentBaza.cpu;
  const opponentPlayedCard = localPlayerIndex === 0 ? currentBaza.cpu : currentBaza.player;

  return (
    <div className="flex-grow flex flex-col items-center justify-between p-4 relative overflow-hidden select-none">
      
      {/* 👤 Info del Oponente */}
      <div className="w-full flex justify-between items-center px-6 py-2 bg-black/20 rounded-full border border-white/5 backdrop-blur-sm max-w-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8c1e13] border-2 border-[#d4af37] flex items-center justify-center font-serif text-lg font-black text-white shadow-md">
            {opponent.name.charAt(0)}
          </div>
          <div>
            <span className="block font-bold text-sm text-[#ece5d8]">{opponent.name}</span>
            <span className="block text-[10px] text-[#a08a6b] font-bold tracking-wider uppercase">
              {isVsCpu ? '🤖 Computadora' : '👥 Oponente Online'}
            </span>
          </div>
        </div>

        {/* Bazas del Oponente */}
        <div className="flex gap-1.5 items-center">
          <span className="text-[10px] text-[#a08a6b] font-bold uppercase mr-1">Bazas:</span>
          {Array.from({ length: 3 }).map((_, idx) => {
            const won = (localPlayerIndex === 0 ? bazaWins.cpu : bazaWins.player) > idx; // Modos invertidos
            // En realidad turnManager.bazaWins tiene player y cpu. 
            // Player es team1 (usualmente Host/Local), CPU es team2.
            const isOpponentWin = opponent.team === 'team1' ? (bazaWins.player > idx) : (bazaWins.cpu > idx);
            return (
              <div 
                key={idx} 
                className={`w-3.5 h-3.5 rounded-full border ${
                  isOpponentWin 
                    ? 'bg-[#d93829] border-[#8c1e13] shadow-[0_0_8px_#d93829]' 
                    : 'bg-black/40 border-white/10'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* 🎴 Cartas del Oponente (Boca abajo) */}
      <div className="flex gap-2 justify-center -mt-2 shrink-0">
        {Array.from({ length: opponent.cardsRemaining }).map((_, idx) => (
          <motion.div
            key={`opp-card-${idx}`}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-[60px] h-[87px] md:w-[75px] md:h-[109px] rounded-lg shadow-lg bg-cover bg-center border border-black/20"
            style={{ backgroundImage: `url('/assets/cards/card_back.svg')` }}
          />
        ))}
      </div>

      {/* 🟢 Tapete Verde Central (Mesa de Juego) */}
      <div className="flex-1 w-full max-w-2xl my-2 relative flex items-center justify-center">
        {/* Felt Oval background */}
        <div className="absolute inset-0 bg-[#163f2b] rounded-[100px] border-[6px] border-[#2e1d0f] shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),_0_8px_16px_rgba(0,0,0,0.4)] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-2 border-2 border-dashed border-[#ffffff]/5 rounded-[90px]" />
          
          {/* Vira y Deck en el centro izquierdo */}
          <div className="absolute left-[8%] md:left-[12%] flex flex-col items-center gap-1.5">
            {vira && (
              <div className="relative">
                {/* Carta Vira */}
                <motion.div
                  initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
                  animate={{ rotate: 10, scale: 1, opacity: 1 }}
                  className="w-[55px] h-[80px] md:w-[70px] md:h-[102px] rounded-lg shadow-xl bg-contain bg-center bg-no-repeat bg-white border border-[#2e1d0f]/20"
                  style={{ backgroundImage: `url('${getCardImagePath(vira)}')` }}
                />
                {/* Texto decorativo VIRA */}
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest text-[#f3e5ab] bg-[#2e1d0f] px-2 py-0.5 rounded border border-[#8b6914] uppercase shadow">
                  Vira
                </span>
              </div>
            )}
          </div>

          {/* Cartas jugadas en el tapete (Centro) */}
          <div className="flex justify-center items-center gap-8 relative z-10 w-full pl-[25%] pr-[5%]">
            <AnimatePresence>
              {/* Carta jugada por el Oponente */}
              {opponentPlayedCard && (
                <motion.div
                  initial={{ y: -80, rotate: -15, scale: 0.8, opacity: 0 }}
                  animate={{ y: -10, rotate: -5, scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="w-[65px] h-[94px] md:w-[85px] md:h-[123px] rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.5)] bg-contain bg-center bg-no-repeat bg-white border border-black/10 shrink-0"
                  style={{ backgroundImage: `url('${getCardImagePath(opponentPlayedCard)}')` }}
                />
              )}

              {/* Carta jugada por Mí */}
              {myPlayedCard && (
                <motion.div
                  initial={{ y: 80, rotate: 15, scale: 0.8, opacity: 0 }}
                  animate={{ y: 10, rotate: 5, scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="w-[65px] h-[94px] md:w-[85px] md:h-[123px] rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.5)] bg-contain bg-center bg-no-repeat bg-white border border-black/10 shrink-0"
                  style={{ backgroundImage: `url('${getCardImagePath(myPlayedCard)}')` }}
                />
              )}
            </AnimatePresence>
            
            {/* Si no hay cartas jugadas aún */}
            {!myPlayedCard && !opponentPlayedCard && (
              <span className="text-[11px] text-[#f3e5ab]/20 font-serif italic tracking-wider">
                {isMyTurn ? 'Es tu turno de jugar' : `Esperando a ${opponent.name}...`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 🎴 Mis Cartas (Mano activa del jugador) */}
      <div className="flex gap-3 justify-center select-none shrink-0 z-20 min-h-[110px] md:min-h-[130px] items-end pb-1">
        <AnimatePresence>
          {localHand.map((card) => {
            const isClickable = isMyTurn && canPlayCard;
            return (
              <motion.div
                key={card.id}
                layoutId={card.id}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -60, opacity: 0 }}
                whileHover={isClickable ? { y: -15, scale: 1.05 } : {}}
                onClick={() => isClickable && onPlayCard(card.id)}
                className={`w-[65px] h-[94px] md:w-[85px] md:h-[123px] rounded-xl shadow-lg bg-contain bg-center bg-no-repeat bg-white border ${
                  isClickable 
                    ? 'cursor-pointer border-[#8b6914] hover:shadow-[0_8px_16px_#8b6914/40] active:scale-95' 
                    : 'border-black/10 opacity-80 pointer-events-none'
                } transition-all`}
                style={{ backgroundImage: `url('${getCardImagePath(card)}')` }}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* 👤 Mi Info */}
      <div className="w-full flex justify-between items-center px-6 py-2 bg-black/20 rounded-full border border-white/5 backdrop-blur-sm max-w-lg shrink-0 mt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2d6a4f] border-2 border-[#d4af37] flex items-center justify-center font-serif text-lg font-black text-white shadow-md">
            {player.name.charAt(0)}
          </div>
          <div>
            <span className="block font-bold text-sm text-[#ece5d8]">{player.name} (Tú)</span>
            <span className="block text-[10px] text-[#a08a6b] font-bold tracking-wider uppercase">
              🔵 Equipo {myTeam === 'team1' ? '1' : '2'}
            </span>
          </div>
        </div>

        {/* Mis Bazas */}
        <div className="flex gap-1.5 items-center">
          <span className="text-[10px] text-[#a08a6b] font-bold uppercase mr-1">Bazas:</span>
          {Array.from({ length: 3 }).map((_, idx) => {
            const isMyWin = player.team === 'team1' ? (bazaWins.player > idx) : (bazaWins.cpu > idx);
            return (
              <div 
                key={idx} 
                className={`w-3.5 h-3.5 rounded-full border ${
                  isMyWin 
                    ? 'bg-[#2d6a4f] border-[#143224] shadow-[0_0_8px_#2d6a4f]' 
                    : 'bg-black/40 border-white/10'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* 🏆 Modal de Fin de Ronda (Round Summary) */}
      {roundEndSummary && !gameOverSummary && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/75 z-50 p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-[#3d2412] to-[#24160d] border-4 border-[#2e1d0f] rounded-xl p-6 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute inset-2 border border-[#8b6914]/20 rounded-lg pointer-events-none border-dashed" />
            
            <span className="block text-[#a08a6b] text-xs font-bold tracking-widest uppercase">
              Ronda {roundEndSummary.roundNumber} Finalizada
            </span>
            <span className="block text-[#f3e5ab] text-2xl font-black font-serif tracking-wide drop-shadow-md mt-2">
              ¡Gana {roundEndSummary.winner === 'team1' ? teamNames[0] : teamNames[1]}!
            </span>
            <span className="block text-[#d4af37] text-4xl font-extrabold mt-3 font-serif">
              +{roundEndSummary.roundPoints} <span className="text-lg">pts</span>
            </span>

            {/* Revelado de Envido y Flor Diferidos */}
            {roundEndSummary.deferredReveal && (
              <div className="my-5 p-3 bg-black/30 rounded-lg border border-[#8b6914]/15 text-left flex flex-col gap-3">
                {/* Envido */}
                {roundEndSummary.deferredReveal.envido && (
                  <div className="text-xs">
                    <span className="font-bold text-[#f3e5ab] block border-b border-[#8b6914]/10 pb-0.5 mb-1.5 uppercase tracking-wider font-serif">
                      Resultado Envido:
                    </span>
                    <p className="text-[#ece5d8]">
                      Ganador: <span className="font-bold">{roundEndSummary.deferredReveal.envido.winnerTeam === 'team1' ? teamNames[0] : teamNames[1]}</span> (+{roundEndSummary.deferredReveal.envido.points} pts)
                    </p>
                    <p className="text-[#a08a6b] mt-0.5">
                      Puntos: {teamNames[0]} ({roundEndSummary.deferredReveal.envido.team1Points}) vs {teamNames[1]} ({roundEndSummary.deferredReveal.envido.team2Points})
                    </p>
                    {/* Mini Cartas del Ganador */}
                    <div className="flex gap-1.5 mt-2 justify-center">
                      {(roundEndSummary.deferredReveal.envido.winnerTeam === 'team1' 
                        ? roundEndSummary.deferredReveal.envido.team1Cards 
                        : roundEndSummary.deferredReveal.envido.team2Cards
                      )?.map((c: Card, idx: number) => (
                        <div 
                          key={idx} 
                          className="w-[36px] h-[52px] rounded bg-cover bg-center border border-black/30 shadow-md bg-white"
                          style={{ backgroundImage: `url('${getCardImagePath(c)}')` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Flor */}
                {roundEndSummary.deferredReveal.flor && (
                  <div className="text-xs mt-2">
                    <span className="font-bold text-[#f3e5ab] block border-b border-[#8b6914]/10 pb-0.5 mb-1.5 uppercase tracking-wider font-serif">
                      Resultado Flor:
                    </span>
                    <p className="text-[#ece5d8]">
                      Ganador: <span className="font-bold">{roundEndSummary.deferredReveal.flor.winnerTeam === 'team1' ? teamNames[0] : teamNames[1]}</span> (+{roundEndSummary.deferredReveal.flor.points} pts)
                    </p>
                    {/* Mini Cartas del Ganador */}
                    <div className="flex gap-1.5 mt-2 justify-center">
                      {(roundEndSummary.deferredReveal.flor.winnerTeam === 'team1' 
                        ? roundEndSummary.deferredReveal.flor.team1Cards 
                        : roundEndSummary.deferredReveal.flor.team2Cards
                      )?.map((c: Card, idx: number) => (
                        <div 
                          key={idx} 
                          className="w-[36px] h-[52px] rounded bg-cover bg-center border border-black/30 shadow-md bg-white"
                          style={{ backgroundImage: `url('${getCardImagePath(c)}')` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={onNextRound}
              className="w-full h-12 bg-[#2d6a4f] hover:bg-[#1b4332] text-white border-b-4 border-[#143224] rounded-lg font-bold text-lg mt-4 transition-all active:border-b-0 active:translate-y-[4px]"
            >
              Siguiente Ronda
            </Button>
          </div>
        </div>
      )}

      {/* 🏆 Modal de Fin de Partida (Game Over) */}
      {gameOverSummary && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/85 z-50 p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#3d2412] to-[#24160d] border-4 border-[#2e1d0f] rounded-xl p-6 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute inset-2 border border-[#8b6914]/20 rounded-lg pointer-events-none border-dashed" />
            
            <span className="block text-[#d4af37] text-xs font-bold tracking-widest uppercase font-serif animate-bounce">
              🏆 ¡FIN DE LA PARTIDA!
            </span>
            <span className="block text-[#f3e5ab] text-2xl font-black font-serif tracking-wide drop-shadow-md mt-4">
              Campeón:<br/>{gameOverSummary.winnerName}
            </span>
            
            <div className="my-6 text-3xl font-black font-serif text-[#ece5d8] tracking-widest bg-black/40 py-2 rounded border border-[#8b6914]/10 shadow-inner">
              {gameOverSummary.finalScores.team1} - {gameOverSummary.finalScores.team2}
            </div>

            <Button
              onClick={onRestartGame}
              className="w-full h-12 bg-[#d93829] hover:bg-[#b02b1f] text-white border-b-4 border-[#8c1e13] rounded-lg font-bold text-lg transition-all active:border-b-0 active:translate-y-[4px]"
            >
              Volver a Jugar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
