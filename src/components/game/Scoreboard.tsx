import React from 'react';

export interface ScoreHistoryEntry {
  team: string;
  points: number;
  reason: string;
}

interface ScoreboardProps {
  scores: { team1: number; team2: number };
  targetScore: number;
  teamNames: string[];
  history: ScoreHistoryEntry[];
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  scores,
  targetScore,
  teamNames,
  history
}) => {
  const t1Name = teamNames[0] || 'Equipo 1';
  const t2Name = teamNames[1] || 'Equipo 2';

  // Dibuja los palitos (tally marks)
  const renderTallyMarks = (points: number, maxPoints: number) => {
    // Si se juega a 24, hay "malas" (1-12) y "buenas" (13-24)
    const hasMalasBuenas = maxPoints === 24;
    const halfScore = maxPoints / 2;

    const malasPoints = hasMalasBuenas ? Math.min(points, halfScore) : points;
    const buenasPoints = hasMalasBuenas ? Math.max(0, points - halfScore) : 0;

    return (
      <div className="flex flex-col gap-3 w-full">
        {/* Sección de Malas */}
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-[#a08a6b] font-bold tracking-wider uppercase border-b border-[#8b6914]/10 pb-0.5">
            Malas {hasMalasBuenas && `(${malasPoints}/${halfScore})`}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 min-h-[38px]">
            {generateTallyGroups(malasPoints)}
          </div>
        </div>

        {/* Sección de Buenas */}
        {hasMalasBuenas && (
          <div className="flex flex-col gap-1">
            <div className="text-[10px] text-[#a08a6b] font-bold tracking-wider uppercase border-b border-[#8b6914]/10 pb-0.5">
              Buenas {`(${buenasPoints}/${halfScore})`}
            </div>
            <div className="flex flex-wrap gap-3 mt-1 min-h-[38px]">
              {buenasPoints > 0 ? (
                generateTallyGroups(buenasPoints)
              ) : (
                <span className="text-[11px] text-[#a08a6b]/30 italic font-serif">Sin puntos en Buenas</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const generateTallyGroups = (points: number) => {
    const fullGroups = Math.floor(points / 5);
    const remainder = points % 5;
    const groups = [];

    // Grupos completos de 5
    for (let i = 0; i < fullGroups; i++) {
      groups.push(renderTallyGroup(5, `full-${i}`));
    }

    // Grupo restante
    if (remainder > 0) {
      groups.push(renderTallyGroup(remainder, 'remainder'));
    }

    return groups;
  };

  const renderTallyGroup = (count: number, key: string) => {
    return (
      <div key={key} className="relative w-[38px] h-[38px]">
        {/* Palito 1 */}
        {count >= 1 && (
          <div 
            className="absolute w-[4px] h-[30px] rounded-[3px] bg-gradient-to-r from-[#5c3a21] via-[#8B6914] to-[#3d2412] shadow-[2px_2px_4px_rgba(0,0,0,0.8),_1px_1px_1px_rgba(0,0,0,0.9)] left-[3px] top-[2px] -rotate-[4deg]"
            style={{ zIndex: 1 }}
          >
            {/* Cabeza roja del fósforo */}
            <div className="absolute w-[7px] h-[8px] bg-radial from-[#b43a28] to-[#5a1d14] rounded-t-[50%] rounded-b-[40%] shadow-[1px_2px_3px_rgba(0,0,0,0.8)] -top-[3px] left-[50%] -translate-x-[50%]" />
          </div>
        )}

        {/* Palito 2 */}
        {count >= 2 && (
          <div 
            className="absolute w-[4px] h-[30px] rounded-[3px] bg-gradient-to-r from-[#5c3a21] via-[#8B6914] to-[#3d2412] shadow-[2px_2px_4px_rgba(0,0,0,0.8),_1px_1px_1px_rgba(0,0,0,0.9)] left-[11px] top-[4px] rotate-[2deg]"
            style={{ zIndex: 1 }}
          >
            <div className="absolute w-[7px] h-[8px] bg-radial from-[#b43a28] to-[#5a1d14] rounded-t-[50%] rounded-b-[40%] shadow-[1px_2px_3px_rgba(0,0,0,0.8)] -top-[3px] left-[50%] -translate-x-[50%]" />
          </div>
        )}

        {/* Palito 3 */}
        {count >= 3 && (
          <div 
            className="absolute w-[4px] h-[30px] rounded-[3px] bg-gradient-to-r from-[#5c3a21] via-[#8B6914] to-[#3d2412] shadow-[2px_2px_4px_rgba(0,0,0,0.8),_1px_1px_1px_rgba(0,0,0,0.9)] left-[20px] top-[2px] rotate-[7deg]"
            style={{ zIndex: 1 }}
          >
            <div className="absolute w-[7px] h-[8px] bg-radial from-[#b43a28] to-[#5a1d14] rounded-t-[50%] rounded-b-[40%] shadow-[1px_2px_3px_rgba(0,0,0,0.8)] -top-[3px] left-[50%] -translate-x-[50%]" />
          </div>
        )}

        {/* Palito 4 */}
        {count >= 4 && (
          <div 
            className="absolute w-[4px] h-[30px] rounded-[3px] bg-gradient-to-r from-[#5c3a21] via-[#8B6914] to-[#3d2412] shadow-[2px_2px_4px_rgba(0,0,0,0.8),_1px_1px_1px_rgba(0,0,0,0.9)] left-[28px] top-[0px] -rotate-[3deg]"
            style={{ zIndex: 1 }}
          >
            <div className="absolute w-[7px] h-[8px] bg-radial from-[#b43a28] to-[#5a1d14] rounded-t-[50%] rounded-b-[40%] shadow-[1px_2px_3px_rgba(0,0,0,0.8)] -top-[3px] left-[50%] -translate-x-[50%]" />
          </div>
        )}

        {/* Palito 5 (Diagonal cruzando) */}
        {count >= 5 && (
          <div 
            className="absolute w-[4px] h-[40px] rounded-[3px] bg-gradient-to-r from-[#3d2412] via-[#8B6914] to-[#5c3a21] shadow-[3px_3px_6px_rgba(0,0,0,0.9)] left-[16px] top-[-4px] rotate-[68deg]"
            style={{ zIndex: 2 }}
          >
            <div className="absolute w-[7px] h-[8px] bg-radial from-[#b43a28] to-[#5a1d14] rounded-t-[50%] rounded-b-[40%] shadow-[1px_2px_3px_rgba(0,0,0,0.8)] -top-[3px] left-[50%] -translate-x-[50%]" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-[280px] bg-gradient-to-b from-[#2d1b0f] to-[#1a0f08] border-l border-[#8b6914]/20 flex flex-col h-full shadow-2xl relative text-[#ece5d8]">
      {/* Decorative top border line */}
      <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#8b6914]/50 to-transparent" />

      {/* Header */}
      <div className="p-4 border-b border-[#8b6914]/10 flex justify-between items-center shrink-0">
        <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#d4af37]">
          PUNTUACIÓN
        </span>
        <span className="font-sans text-[10px] text-[#a08a6b] bg-[#fff]/5 px-2 py-0.5 rounded-full border border-[#8b6914]/15">
          A {targetScore} pts
        </span>
      </div>

      {/* Teams Scores & Tally */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-[#4a2f18]">
        {/* Equipo 1 */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-baseline border-b border-[#8b6914]/10 pb-1">
            <span className="font-serif text-[13px] font-bold tracking-wide text-[#ece5d8] truncate max-w-[170px]">
              {t1Name}
            </span>
            <span className="font-serif font-black text-2xl text-[#f3e5ab] text-shadow-[0_2px_10px_rgba(139,105,20,0.25)]">
              {scores.team1}
            </span>
          </div>
          <div className="mt-1">
            {renderTallyMarks(scores.team1, targetScore)}
          </div>
        </div>

        {/* Equipo 2 */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-baseline border-b border-[#8b6914]/10 pb-1">
            <span className="font-serif text-[13px] font-bold tracking-wide text-[#ece5d8] truncate max-w-[170px]">
              {t2Name}
            </span>
            <span className="font-serif font-black text-2xl text-[#f3e5ab] text-shadow-[0_2px_10px_rgba(139,105,20,0.25)]">
              {scores.team2}
            </span>
          </div>
          <div className="mt-1">
            {renderTallyMarks(scores.team2, targetScore)}
          </div>
        </div>
      </div>

      {/* History Panel */}
      <div className="h-[140px] bg-black/30 border-t border-[#8b6914]/10 p-3 flex flex-col shrink-0">
        <div className="text-[9px] font-bold tracking-widest text-[#a08a6b] uppercase mb-1.5 font-serif">
          Historial de Rondas
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 scrollbar-none">
          {history.length > 0 ? (
            history.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-[11px] text-[#a08a6b] font-sans leading-tight">
                <span className="truncate pr-2">
                  <span className="font-bold text-[#ece5d8] font-serif">{item.team}</span>: {item.reason}
                </span>
                <span className="text-[#d4af37] font-bold shrink-0">+{item.points}</span>
              </div>
            ))
          ) : (
            <span className="text-[11px] text-[#a08a6b]/30 italic font-serif mt-2 text-center">Partida iniciada</span>
          )}
        </div>
      </div>
    </div>
  );
};
