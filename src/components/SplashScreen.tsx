import React, { useState, useEffect, useRef } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Connecting to Arena...');
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let current = 0;
    let completeTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      // Strictly monotonic smooth progression from 0% to 100%
      const step = current < 60 ? 7 : current < 90 ? 5 : 4;
      current = Math.min(100, current + step);

      setProgress((prev) => Math.max(prev, current));

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
        if (!completedRef.current) {
          completedRef.current = true;
          completeTimer = setTimeout(() => {
            onCompleteRef.current?.();
          }, 280);
        }
      }
    }, 55);

    return () => {
      clearInterval(interval);
      if (completeTimer) clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 min-h-[100dvh] flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200"
      style={{
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-main)'
      }}
    >
      <div className="flex flex-col items-center max-w-xs text-center w-full">
        {/* Animated Brand Emblem */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Subtle glowing ring behind emblem */}
          <div
            className="absolute -inset-2 rounded-[32px] opacity-35 blur-lg animate-pulse pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
            }}
          />

          <div
            className="w-28 h-28 rounded-3xl p-1 shadow-2xl flex items-center justify-center relative z-10"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
            }}
          >
            <img
              src="/icon.png"
              alt="XO Arena"
              className="w-full h-full object-cover rounded-[22px] shadow-lg"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display font-black text-3xl tracking-widest uppercase mb-1">
          XO ARENA
        </h1>
        <p
          className="text-xs font-bold tracking-wider uppercase mb-7"
          style={{ color: 'var(--text-muted)' }}
        >
          Competitive Tic Tac Toe
        </p>

        {/* Monotonic 0% to 100% Loading Bar */}
        <div className="w-56 flex flex-col gap-1.5 mb-3">
          <div
            className="flex justify-between items-center text-[11px] font-mono font-bold px-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>Loading</span>
            <span className="font-black" style={{ color: 'var(--accent-primary)' }}>
              {progress}%
            </span>
          </div>

          <div
            className="w-full h-2.5 rounded-full overflow-hidden p-0.5 shadow-inner"
            style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-100 ease-out shadow-sm"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))'
              }}
            />
          </div>
        </div>

        {/* Status text */}
        <span
          className="text-[11px] font-mono font-semibold tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          {statusText}
        </span>
      </div>
    </div>
  );
};
