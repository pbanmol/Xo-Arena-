import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../services/sound';

interface ResultModalProps {
  isOpen: boolean;
  outcome: 'win' | 'loss' | 'draw' | null;
  winnerName?: string;
  earnedXP: number;
  onPlayAgain: () => void;
  onClose: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  outcome,
  winnerName,
  earnedXP,
  onPlayAgain,
  onClose
}) => {
  useEffect(() => {
    if (isOpen && outcome === 'win') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    }
  }, [isOpen, outcome]);

  if (!isOpen || !outcome) return null;

  const isWin = outcome === 'win';
  const isLoss = outcome === 'loss';
  const isDraw = outcome === 'draw';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-3xl border p-6 flex flex-col items-center text-center shadow-2xl relative animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="text-5xl mb-2 animate-bounce">
          {isWin ? '🏆' : isLoss ? '💀' : '🤝'}
        </div>

        <h2 className="font-display font-black text-2xl tracking-wider" style={{ color: 'var(--text-main)' }}>
          {isWin ? 'VICTORY!' : isLoss ? 'DEFEAT' : 'STALEMATE DRAW'}
        </h2>

        <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
          {isWin
            ? `${winnerName || 'You'} claimed total victory!`
            : isLoss
            ? 'The opposing force emerged victorious.'
            : 'Deadlock between evenly matched competitors.'}
          <span className="block mt-1 font-bold text-[var(--accent-primary)]">
            +{earnedXP} XP Earned
          </span>
        </p>

        <div className="flex w-full gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onPlayAgain();
            }}
            className="flex-1 py-3 rounded-xl text-white font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Play Again
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="flex-1 py-3 rounded-xl border text-xs font-bold transition-transform active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
