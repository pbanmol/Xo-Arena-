import React from 'react';
import { AppTheme } from '../types/game';
import { sound } from '../services/sound';

interface HeaderProps {
  currentTheme: AppTheme;
  isDark: boolean;
  onThemeCycle: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenAuth: () => void;
  isLoggedIn: boolean;
  userDisplayName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onThemeCycle,
  soundEnabled,
  onToggleSound,
  onOpenAuth,
  isLoggedIn,
  userDisplayName
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md px-4 py-3 flex items-center justify-between"
      style={{
        backgroundColor: 'var(--header-bg)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md overflow-hidden border border-[var(--border-subtle)]"
          style={{
            boxShadow: 'var(--accent-glow)'
          }}
        >
          <img src="/icon.png" alt="XO Arena" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="font-display font-extrabold text-xl tracking-wider leading-none"
            style={{ color: 'var(--text-main)' }}
          >
            XO ARENA
          </h1>
          <p className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Competitive Gaming
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Sound toggle */}
        <button
          onClick={() => {
            sound.playClick();
            onToggleSound();
          }}
          title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          className="w-9 h-9 rounded-xl border flex items-center justify-center text-sm transition-transform active:scale-90"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)'
          }}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        {/* Theme quick cycle */}
        <button
          onClick={() => {
            sound.playClick();
            onThemeCycle();
          }}
          title="Cycle Theme"
          className="w-9 h-9 rounded-xl border flex items-center justify-center text-sm transition-transform active:scale-90"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)'
          }}
        >
          🎨
        </button>

        {/* Account status / Login */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenAuth();
          }}
          title={isLoggedIn ? 'Account details' : 'Sign In'}
          className="h-9 px-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-transform active:scale-95"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)'
          }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline max-w-[80px] truncate">
            {isLoggedIn ? (userDisplayName || 'Account') : 'Sign In'}
          </span>
          <span className="text-xs">👤</span>
        </button>
      </div>
    </header>
  );
};
