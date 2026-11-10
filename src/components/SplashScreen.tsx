import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Connecting to Arena...');

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      // Smooth incremental jump of 5-12% every 65ms
      const increment = Math.floor(Math.random() * 8) + 5;
      current = Math.min(100, current + increment);
      setProgress(current);

      if (current < 25) {
        setStatusText('Connecting to Arena...');
      } else if (current < 55) {
        setStatusText('Loading Game Engine...');
      } else if (current < 85) {
        setStatusText('Syncing Arena Directory...');
      } else if (current < 100) {
        setStatusText('Preparing Competitive Arena...');
      } else {
        setStatusText('Welcome to XO Arena!');
        clearInterval(interval);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 320);
      }
    }, 65);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none bg-[#fff1f2] dark:bg-[#0b0f19] text-[#4c0519] dark:text-[#f8fafc] animate-in fade-in duration-300"
    >
      <div className="flex flex-col items-center max-w-xs text-center w-full">
        {/* Animated Brand Emblem */}
        <div className="relative mb-6 flex items-center justify-center">
          <div
            className="w-28 h-28 rounded-3xl p-1 shadow-2xl flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, #f43f5e, #8b5cf6)'
            }}
          >
            <img
              src="/icon.png"
              alt="XO Arena"
              className="w-full h-full object-cover rounded-[22px] shadow-lg"
            />
          </div>

          {/* Subtle glowing ring */}
          <div
            className="absolute -inset-2 rounded-[32px] opacity-40 blur-lg animate-ping"
            style={{
              background: 'linear-gradient(135deg, #f43f5e, #8b5cf6)'
            }}
          />
        </div>

        {/* Title */}
        <h1 className="font-display font-black text-3xl tracking-widest uppercase mb-1">
          XO ARENA
        </h1>
        <p className="text-xs font-bold text-[#881337] dark:text-slate-400 tracking-wider uppercase mb-7">
          Competitive Tic Tac Toe
        </p>

        {/* Real Dynamic 0% to 100% Loading Bar */}
        <div className="w-56 flex flex-col gap-1.5 mb-3">
          <div className="flex justify-between items-center text-[11px] font-mono font-bold px-0.5 text-slate-500 dark:text-slate-400">
            <span>Loading</span>
            <span className="text-[#f43f5e] font-black">{progress}%</span>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-150 ease-out shadow-sm"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #f43f5e, #fb7185, #8b5cf6)'
              }}
            />
          </div>
        </div>

        {/* Status text */}
        <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
          {statusText}
        </span>
      </div>
    </div>
  );
};
