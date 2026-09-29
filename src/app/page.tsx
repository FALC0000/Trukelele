"use client";

import { CardStack, CardStackItem } from "@/components/ui/card-stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { TavernBackground } from "@/components/ui/tavern-background";

const GAME_MODES: CardStackItem[] = [
  {
    id: "cpu",
    title: "VS CPU",
    imageSrc: "/mode-cpu.png",
  },
  {
    id: "1v1",
    title: "1v1",
    imageSrc: "/mode-1v1.png",
  },
  {
    id: "2v2",
    title: "2v2",
    imageSrc: "/mode-2v2.png",
  }
];

export default function LobbyPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [activeMode, setActiveMode] = useState(GAME_MODES[1]);

  const handleStart = () => {
    if (!playerName.trim()) return;
    
    localStorage.setItem("trukelele_player", playerName);
    localStorage.setItem("trukelele_mode", activeMode.id as string);
    
    if (activeMode.id === "cpu") {
      router.push("/game/cpu");
    } else {
      router.push("/room");
    }
  };

  return (
    <div className="h-screen w-full relative flex flex-col items-center justify-between overflow-hidden bg-[#2c1e10]">
      <TavernBackground />

      <div className="relative z-20 w-full h-full flex flex-col items-center justify-between pt-8 pb-6 px-4">
        {/* Header */}
        <div className="text-center shrink-0">
          <h1 className="text-5xl md:text-7xl font-black text-[#f3e5ab] tracking-widest" style={{ fontFamily: 'Cinzel, serif', WebkitTextStroke: '2px #2e1d0f' }}>
            TRUKELELE
          </h1>
        </div>

        {/* Carousel */}
        <div className="w-full flex-1 flex items-center justify-center -my-4">
          <CardStack
            items={GAME_MODES}
            initialIndex={1}
            cardWidth={260}
            cardHeight={320}
            overlap={0.4}
            spreadDeg={35}
            activeLiftPx={20}
            onChangeIndex={(_idx, item) => setActiveMode(item)}
          />
        </div>

        {/* Actions (Foreground Bar) */}
        <div className="shrink-0 w-full max-w-sm flex flex-col items-center gap-3 bg-[#f3e5ab] p-4 rounded-xl border-4 border-[#2e1d0f] shadow-[0_8px_0_#2e1d0f]">
          <div className="flex flex-col gap-1 w-full">
            <Input 
              className="bg-white border-2 border-[#8c5e34] text-[#2e1d0f] text-center text-lg font-bold placeholder:text-[#8c5e34]/50 h-12 w-full rounded-lg"
              placeholder="Tu Nombre..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
            />
          </div>
          <Button 
            onClick={handleStart}
            disabled={!playerName.trim()}
            className="w-full h-12 bg-[#d93829] hover:bg-[#b02b1f] text-white border-b-4 border-[#8c1e13] rounded-lg font-black text-xl tracking-wider transition-all active:border-b-0 active:translate-y-[4px] disabled:opacity-50 disabled:active:border-b-4 disabled:active:translate-y-0"
          >
            EMPEZAR
          </Button>
        </div>
      </div>
    </div>
  );
}
