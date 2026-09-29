"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CornerDownLeft } from "lucide-react";
import { TavernBackground } from "@/components/ui/tavern-background";

export default function RoomPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [mode, setMode] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("trukelele_player");
    const mode = localStorage.getItem("trukelele_mode");
    if (!name) {
      router.push("/");
    } else {
      setPlayerName(name);
      setMode(mode || "1v1");
    }
  }, [router]);

  const handleHost = () => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/game/${mode}?host=true&room=${roomCode}`);
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    router.push(`/game/${mode}?host=false&room=${joinCode.toUpperCase()}`);
  };

  return (
    <div className="h-screen w-full relative flex flex-col items-center justify-center bg-[#2c1e10] overflow-hidden">
      <TavernBackground />

      <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center h-full justify-center">
        
        {/* Top Header Wood Sign */}
        <div className="mb-8 bg-gradient-to-b from-[#4a3018] to-[#2c1e10] border-4 border-[#2e1d0f] shadow-[0_8px_0_#2e1d0f] rounded-xl py-3 px-12 relative flex items-center justify-center">
          <div className="absolute inset-2 border border-[#8b6914]/30 rounded-lg pointer-events-none" />
          <h2 className="text-[#f3e5ab] text-3xl font-black tracking-widest uppercase font-serif drop-shadow-md">
            &lt; ONLINE {mode} &gt;
          </h2>
          <p className="absolute -bottom-5 text-[#f3e5ab] text-xs font-bold tracking-widest bg-[#2e1d0f] px-4 py-0.5 rounded-full border-2 border-[#8b6914]">
            Juega contra amigos
          </p>
        </div>

        {/* Central Panels */}
        <div className="w-full flex flex-col md:flex-row gap-8 justify-center items-stretch mt-2">
          
          {/* Host Panel */}
          <div className="flex-1 max-w-sm">
            <h3 className="text-center text-[#f3e5ab] font-serif text-xl mb-2 drop-shadow-md">Crear Sala</h3>
            <button 
              onClick={handleHost}
              className="w-full h-72 bg-gradient-to-b from-[#3d2412] to-[#24160d] border-4 border-[#2e1d0f] rounded-xl p-5 flex flex-col justify-between items-center shadow-[0_8px_0_#2e1d0f] hover:translate-y-[2px] hover:shadow-[0_6px_0_#2e1d0f] active:translate-y-[8px] active:shadow-none transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-2 border border-[#8b6914]/20 rounded-lg pointer-events-none border-dashed" />
              
              {/* Espadilla Card Centered */}
              <div className="flex-1 flex items-center justify-center w-full my-auto">
                <div className="w-24 h-36 rounded-md shadow-2xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)] flex items-center justify-center transform group-hover:scale-105 group-hover:-rotate-2 transition-transform duration-300">
                  <img 
                    src="/card-espadilla.png" 
                    alt="Espadilla" 
                    className="w-full h-full object-contain filter drop-shadow-md"
                  />
                </div>
              </div>

              <div className="text-center z-10">
                <span className="block text-[#a08a6b] text-xs font-bold tracking-widest uppercase">Modo:</span>
                <span className="block text-[#f3e5ab] text-2xl font-black font-serif tracking-wider">CREAR SALA</span>
                <span className="block text-[#d4af37] text-sm font-serif italic">(Host)</span>
              </div>
            </button>
          </div>

          <div className="hidden md:flex items-center justify-center text-[#f3e5ab] font-serif text-2xl opacity-50 mt-8">
            o unirse
          </div>

          {/* Join Panel */}
          <div className="flex-1 max-w-sm">
            <h3 className="text-center text-[#f3e5ab] font-serif text-xl mb-2 drop-shadow-md text-transparent selection:bg-transparent">o unirse</h3>
            <div className="w-full h-72 bg-gradient-to-b from-[#3d2412] to-[#24160d] border-4 border-[#2e1d0f] rounded-xl p-5 flex flex-col shadow-[0_8px_0_#2e1d0f] relative overflow-hidden justify-between">
              <div className="absolute inset-2 border border-[#8b6914]/20 rounded-lg pointer-events-none border-dashed" />
              
              <div className="flex-1 flex flex-col items-center justify-center gap-2 my-auto">
                <div className="w-20 h-20 rounded-full border-4 border-[#2e1d0f] flex items-center justify-center bg-[#5c3a21]/60 shadow-inner p-3">
                  <img 
                    src="/icon-handshake.png" 
                    alt="Unirse" 
                    className="w-full h-full object-contain filter drop-shadow"
                  />
                </div>
                <div className="text-center">
                  <span className="block text-[#a08a6b] text-xs font-bold tracking-widest uppercase">Modo:</span>
                  <span className="block text-[#f3e5ab] text-xl font-black font-serif tracking-wider leading-tight">UNIRSE A PARTIDA</span>
                </div>
              </div>

              {/* Code Input with inline Enter symbol button */}
              <div className="relative z-20 w-full mt-2">
                <div className="relative flex items-center w-full">
                  <Input 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="CÓDIGO DE SALA"
                    maxLength={10}
                    className="bg-[#f8f2e8] border-2 border-[#2e1d0f] text-center text-[#2c1e10] font-black tracking-widest uppercase h-12 pr-12 shadow-inner focus-visible:ring-2 focus-visible:ring-[#d93829] placeholder:text-[#2c1e10]/40 placeholder:text-xs placeholder:tracking-normal"
                  />
                  <button
                    onClick={handleJoin}
                    disabled={!joinCode.trim()}
                    title="Entrar a la partida"
                    className="absolute right-1.5 h-9 w-9 bg-[#d93829] hover:bg-[#b02b1f] disabled:bg-gray-400 disabled:opacity-50 text-white rounded flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <CornerDownLeft size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Back Button */}
      <button 
        onClick={() => router.push('/')}
        className="absolute top-8 left-8 w-16 h-16 rounded-full bg-[#4a2f18] border-4 border-[#2e1d0f] shadow-[0_4px_0_#2e1d0f] flex flex-col items-center justify-center text-[#f3e5ab] active:translate-y-[4px] active:shadow-none transition-all z-20"
      >
        <ArrowLeft size={28} strokeWidth={3} />
      </button>

    </div>
  );
}
