import React from 'react';

interface SplashScreenProps {
  progress?: number;
  statusText?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  statusText = 'Loading Arena...'
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300"
      style={{
        backgroundColor: 'var(--bg-main, #0b0f19)',
        color: 'var(--text-main, #ffffff)'
      }}
    >
      <div className="flex flex-col items-center max-w-xs text-center">
        {/* Animated Brand Emblem */}
        <div className="relative mb-6 flex items-center justify-center">
          <div
            className="w-24 h-24 rounded-3xl p-1 shadow-2xl animate-pulse flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #ec4899)'
            }}
          >
            <div
              className="w-full h-full rounded-[22px] flex items-center justify-center font-display font-black text-4xl shadow-inner"
              style={{
                backgroundColor: 'var(--bg-card, #111827)'
              }}
            >
              <span className="text-[#3b82f6]">X</span>
              <span className="text-slate-400 text-2xl mx-0.5">/</span>
              <span className="text-[#ec4899]">O</span>
            </div>
          </div>

          {/* Subtle glowing ring */}
          <div
            className="absolute -inset-2 rounded-[32px] opacity-40 blur-lg animate-ping"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #ec4899)'
            }}
          />
        </div>

        {/* Title */}
        <h1 className="font-display font-black text-3xl tracking-widest uppercase mb-1">
          XO ARENA
        </h1>
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-8">
          Multiplayer & AI Battles
        </p>

        {/* Loading Spinner / Progress Bar */}
        <div className="w-48 h-1.5 rounded-full overflow-hidden bg-slate-800 relative mb-3">
          <div
            className="h-full rounded-full transition-all duration-300 animate-[pulse_1s_ease-in-out_infinite]"
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)'
            }}
          />
        </div>

        <span className="text-[11px] font-mono text-slate-400 tracking-wide">
          {statusText}
        </span>
      </div>
    </div>
  );
};
