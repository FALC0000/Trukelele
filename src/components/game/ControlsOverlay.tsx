import React from 'react';
import { Button } from '@/components/ui/button';

interface ControlsOverlayProps {
  availableActions: string[];
  playerName: string;
  isMyTurn: boolean;
  onAction: (action: string) => void;
  cantoOffer: {
    callerName: string;
    type: 'truco' | 'envido' | 'flor';
    level?: string;
    respondingTeam: string;
    myTeam: string;
    opponentHasFlor?: boolean;
  } | null;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  availableActions,
  playerName,
  isMyTurn,
  onAction,
  cantoOffer
}) => {
  // Traducir los niveles de canto a texto legible en español
  const getCantoText = (type: 'truco' | 'envido' | 'flor', level?: string) => {
    if (type === 'truco') {
      const texts: Record<string, string> = {
        truco: '¡TRUCO!',
        retruco: '¡QUIERO RETRUCO!',
        vale9: '¡VALE 9!',
        vale_juego: '¡VALE JUEGO!'
      };
      return level ? (texts[level] || '¡TRUCO!') : '¡TRUCO!';
    } else if (type === 'envido') {
      const texts: Record<string, string> = {
        envido: '¡ENVIDO!',
        envido_5: '¡ENVIDO 5!',
        falta_envido: '¡FALTA ENVIDO!'
      };
      return level ? (texts[level] || '¡ENVIDO!') : '¡ENVIDO!';
    } else if (type === 'flor') {
      return '¡FLOR!';
    }
    return '';
  };

  // Filtrar acciones principales del turno (excluyendo respuestas que se muestran en el modal)
  const isResponseState = availableActions.includes('quiero') || availableActions.includes('no_quiero') || availableActions.includes('contraflor');
  
  const mainActions = availableActions.filter(
    action => !['quiero', 'no_quiero', 'contraflor', 'play_card'].includes(action)
  );

  // Si hay una oferta de canto activa y somos nosotros quienes debemos responder
  const showCantoModal = cantoOffer && isResponseState;

  return (
    <div className="w-full flex flex-col items-center justify-center p-3 relative z-30 pointer-events-none">
      {/* 🚨 Modal de Canto (Truco / Envido / Flor) */}
      {showCantoModal && cantoOffer && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/65 z-50 pointer-events-auto anim-fade-in px-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#3d2412] to-[#24160d] border-4 border-[#2e1d0f] rounded-xl p-6 shadow-[0_12px_24px_rgba(0,0,0,0.8)] text-center relative overflow-hidden">
            <div className="absolute inset-2 border border-[#8b6914]/20 rounded-lg pointer-events-none border-dashed" />
            
            <div className="mb-4">
              <span className="block text-[#a08a6b] text-xs font-bold tracking-widest uppercase">
                {cantoOffer.callerName} canta:
              </span>
              <span className="block text-[#f3e5ab] text-3xl font-black font-serif tracking-wide drop-shadow-md mt-2">
                {getCantoText(cantoOffer.type, cantoOffer.level)}
              </span>
            </div>

            {/* Acciones del Modal */}
            <div className="flex flex-col gap-3 mt-6">
              {/* Quiero / No Quiero */}
              <div className="flex gap-4">
                {availableActions.includes('no_quiero') && (
                  <Button
                    onClick={() => onAction('no_quiero')}
                    className="flex-1 h-12 bg-[#d93829] hover:bg-[#b02b1f] text-white border-b-4 border-[#8c1e13] rounded-lg font-bold text-lg transition-all active:border-b-0 active:translate-y-[4px]"
                  >
                    No Quiero
                  </Button>
                )}
                {availableActions.includes('quiero') && (
                  <Button
                    onClick={() => onAction('quiero')}
                    className="flex-1 h-12 bg-[#2d6a4f] hover:bg-[#1b4332] text-white border-b-4 border-[#143224] rounded-lg font-bold text-lg transition-all active:border-b-0 active:translate-y-[4px]"
                  >
                    Quiero
                  </Button>
                )}
              </div>

              {/* Responder con Flor si es Flor */}
              {cantoOffer.type === 'flor' && availableActions.includes('contraflor') && (
                <Button
                  onClick={() => onAction('contraflor')}
                  className="w-full h-12 bg-[#d4af37] hover:bg-[#b8952b] text-[#2c1e10] border-b-4 border-[#8c6d17] rounded-lg font-black text-lg transition-all active:border-b-0 active:translate-y-[4px]"
                >
                  Contraflor
                </Button>
              )}

              {/* Subir la apuesta de Truco en respuesta */}
              {cantoOffer.type === 'truco' && mainActions.some(a => ['truco', 'retruco', 'vale9', 'vale_juego'].includes(a)) && (
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-[10px] text-[#a08a6b] font-bold tracking-widest uppercase">Revirar:</span>
                  <div className="flex gap-2">
                    {mainActions.filter(a => ['truco', 'retruco', 'vale9', 'vale_juego'].includes(a)).map(action => (
                      <Button
                        key={action}
                        onClick={() => onAction(action)}
                        className="flex-1 h-10 bg-[#8c5e34] hover:bg-[#734d2a] text-[#f3e5ab] border-b-4 border-[#4d331c] rounded-md font-bold text-sm tracking-wider uppercase transition-all active:border-b-0 active:translate-y-[4px]"
                      >
                        {action === 'vale_juego' ? 'Vale Juego' : action === 'vale9' ? 'Vale 9' : action}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subir la apuesta de Envido en respuesta */}
              {cantoOffer.type === 'envido' && mainActions.some(a => ['envido', 'envido_5', 'falta_envido'].includes(a)) && (
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-[10px] text-[#a08a6b] font-bold tracking-widest uppercase">Revirar:</span>
                  <div className="flex gap-2">
                    {mainActions.filter(a => ['envido', 'envido_5', 'falta_envido'].includes(a)).map(action => (
                      <Button
                        key={action}
                        onClick={() => onAction(action)}
                        className="flex-1 h-10 bg-[#8c5e34] hover:bg-[#734d2a] text-[#f3e5ab] border-b-4 border-[#4d331c] rounded-md font-bold text-[11px] tracking-wider uppercase transition-all active:border-b-0 active:translate-y-[4px] truncate"
                      >
                        {action === 'envido_5' ? 'Envido 5' : action === 'falta_envido' ? 'Falta Envido' : action}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🕹️ Acciones de Turno Regular (Truco, Envido, Flor, Mazo) */}
      {!showCantoModal && mainActions.length > 0 && (
        <div className="w-full max-w-lg bg-[#4a2f18]/90 border-2 border-[#2e1d0f] rounded-xl p-3 shadow-md flex flex-wrap gap-2 justify-center items-center pointer-events-auto">
          {/* Fila del Truco */}
          {mainActions.some(a => ['truco', 'retruco', 'vale9', 'vale_juego'].includes(a)) && (
            <div className="flex gap-2 justify-center w-full md:w-auto">
              {mainActions.filter(a => ['truco', 'retruco', 'vale9', 'vale_juego'].includes(a)).map(action => (
                <Button
                  key={action}
                  onClick={() => onAction(action)}
                  className="h-10 bg-[#8c5e34] hover:bg-[#734d2a] text-[#f3e5ab] border-b-4 border-[#4d331c] rounded-md font-bold text-sm tracking-wider uppercase transition-all active:border-b-0 active:translate-y-[4px]"
                >
                  {action === 'vale_juego' ? 'Vale Juego' : action === 'vale9' ? 'Vale 9' : action}
                </Button>
              ))}
            </div>
          )}

          {/* Fila del Envido */}
          {mainActions.some(a => ['envido', 'envido_5', 'falta_envido'].includes(a)) && (
            <div className="flex gap-2 justify-center w-full md:w-auto">
              {mainActions.filter(a => ['envido', 'envido_5', 'falta_envido'].includes(a)).map(action => (
                <Button
                  key={action}
                  onClick={() => onAction(action)}
                  className="h-10 bg-[#2d6a4f] hover:bg-[#1b4332] text-white border-b-4 border-[#143224] rounded-md font-bold text-xs tracking-wider uppercase transition-all active:border-b-0 active:translate-y-[4px]"
                >
                  {action === 'envido_5' ? 'Envido 5' : action === 'falta_envido' ? 'Falta Envido' : action}
                </Button>
              ))}
            </div>
          )}

          {/* Fila Especial: Flor y Al Mazo */}
          <div className="flex gap-2 justify-center w-full md:w-auto">
            {mainActions.includes('flor') && (
              <Button
                onClick={() => onAction('flor')}
                className="h-10 bg-[#d4af37] hover:bg-[#b8952b] text-[#2c1e10] border-b-4 border-[#8c6d17] rounded-md font-black text-sm tracking-wider uppercase transition-all active:border-b-0 active:translate-y-[4px]"
              >
                🌸 Flor
              </Button>
            )}

            {mainActions.includes('fold_hand') && (
              <Button
                onClick={() => onAction('fold_hand')}
                className="h-10 bg-[#d93829] hover:bg-[#b02b1f] text-white border-b-4 border-[#8c1e13] rounded-md font-bold text-xs tracking-wider uppercase transition-all active:border-b-0 active:translate-y-[4px]"
              >
                🏳️ Al Mazo
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ⏳ Estado de espera */}
      {isMyTurn && !isResponseState && mainActions.length === 0 && (
        <div className="bg-[#2e1d0f]/80 text-[#f3e5ab] text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full border border-[#8b6914]/20 animate-pulse pointer-events-auto">
          Juega una carta de tu mano
        </div>
      )}
    </div>
  );
};
