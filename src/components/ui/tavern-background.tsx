import React from 'react';

export function TavernBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#1a0e08] z-0 pointer-events-none select-none">
      {/* High-quality Tavern Background Image - Pure & Natural */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/bg-tavern-clean.png")',
        }}
      />
      
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
    </div>
  );
}
