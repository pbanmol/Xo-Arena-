import React, { useState } from 'react';
import { sound } from '../services/sound';

interface LocalSetupModalProps {
  isOpen: boolean;
  defaultNameX: string;
  onStart: (nameX: string, nameO: string) => void;
  onCancel: () => void;
}

export const LocalSetupModal: React.FC<LocalSetupModalProps> = ({
  isOpen,
  defaultNameX,
  onStart,
  onCancel
}) => {
  const [nameX, setNameX] = useState(defaultNameX || 'Player 1');
  const [nameO, setNameO] = useState('Player 2');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    onStart(nameX.trim() || 'Player 1', nameO.trim() || 'Player 2');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border p-6 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="text-4xl mb-2">👥</div>

        <h3 className="font-display font-black text-xl tracking-wider" style={{ color: 'var(--text-main)' }}>
          Local 2-Player Match
        </h3>

        <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
          Pass & Play with a friend on this phone or screen
        </p>

        <div className="flex flex-col gap-3 w-full mb-5 text-left">
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">
              Player X Name
            </label>
            <input
              type="text"
              value={nameX}
              onChange={(e) => setNameX(e.target.value)}
              placeholder="Player 1"
              maxLength={15}
              className="w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">
              Player O Name
            </label>
            <input
              type="text"
              value={nameO}
              onChange={(e) => setNameO(e.target.value)}
              placeholder="Player 2"
              maxLength={15}
              className="w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)'
              }}
            />
          </div>
        </div>

        <div className="flex w-full gap-2">
          <button
            type="submit"
            className="flex-1 py-3 rounded-xl text-white font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Start Match
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onCancel();
            }}
            className="flex-1 py-3 rounded-xl border text-xs font-bold transition-transform active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
