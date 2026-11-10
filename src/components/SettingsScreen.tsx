import React from 'react';
import { AppTheme } from '../types/game';
import { sound } from '../services/sound';

interface SettingsScreenProps {
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  isDark: boolean;
  onToggleDark: (dark: boolean) => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: (enabled: boolean) => void;
  onResetData: () => void;
  onSignOut: () => void;
  isLoggedIn: boolean;
  isGuest?: boolean;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentTheme,
  onThemeChange,
  isDark,
  onToggleDark,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
  onResetData,
  onSignOut,
  isLoggedIn,
  isGuest
}) => {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div
        className="rounded-2xl border p-4.5 shadow-sm flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">⚙️</span>
          <h3 className="font-display font-extrabold text-lg" style={{ color: 'var(--text-main)' }}>
            Preferences
          </h3>
        </div>

        {/* Theme select */}
        <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
              App Theme
            </div>
            <div className="text-[11px] text-slate-400">Choose visual arena skin</div>
          </div>
          <select
            value={currentTheme}
            onChange={(e) => {
              sound.playClick();
              onThemeChange(e.target.value as AppTheme);
            }}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)'
            }}
          >
            <option value="light">Light Modern</option>
            <option value="neon">Neon Purple</option>
            <option value="black">Black Luxury</option>
            <option value="ocean">Ocean Blue</option>
            <option value="emerald">Emerald Green</option>
            <option value="crimson">Crimson Red</option>
          </select>
        </div>

        {/* Dark Mode */}
        <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
              Dark Background
            </div>
            <div className="text-[11px] text-slate-400">High contrast dark surface</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isDark}
              onChange={(e) => {
                sound.playClick();
                onToggleDark(e.target.checked);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]" />
          </label>
        </div>

        {/* Sound FX */}
        <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
              Sound Effects
            </div>
            <div className="text-[11px] text-slate-400">Web Audio synthesizer tones</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => {
                sound.playClick();
                onToggleSound(e.target.checked);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]" />
          </label>
        </div>

        {/* Haptics */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
              Haptic Feedback
            </div>
            <div className="text-[11px] text-slate-400">Vibration on cell moves</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={hapticsEnabled}
              onChange={(e) => {
                sound.playClick();
                onToggleHaptics(e.target.checked);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]" />
          </label>
        </div>
      </div>

      {/* Account Data & Actions */}
      <div
        className="rounded-2xl border p-4.5 shadow-sm flex flex-col gap-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <h3 className="font-display font-extrabold text-lg" style={{ color: 'var(--text-main)' }}>
            Account & Security
          </h3>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onResetData();
          }}
          className="w-full py-2.5 px-3 rounded-xl border text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-transform active:scale-95 cursor-pointer"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          Reset Local Account Data & Stats
        </button>

        {(isLoggedIn || isGuest) && (
          <button
            onClick={() => {
              sound.playClick();
              onSignOut();
            }}
            className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-transform active:scale-95 cursor-pointer ${
              isGuest ? 'text-amber-500 hover:bg-amber-500/10' : ''
            }`}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: isGuest ? '#f59e0b' : 'var(--text-main)'
            }}
          >
            {isGuest ? '🚪 Exit & Delete Guest Session' : 'Sign Out / Switch Account'}
          </button>
        )}
      </div>

      <div className="text-center text-[11px] font-bold tracking-widest uppercase py-3" style={{ color: 'var(--text-muted)' }}>
        XO ARENA • MADE BY PB ANMOL
      </div>
    </div>
  );
};
