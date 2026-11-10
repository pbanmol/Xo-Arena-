import React from 'react';
import { UserProfile } from '../types/game';
import { calculateLevelInfo } from '../services/storage';
import { sound } from '../services/sound';

interface HomeScreenProps {
  profile: UserProfile;
  onLaunchComputer: () => void;
  onLaunchLocal: () => void;
  onLaunchOnline: () => void;
  onOpenProfile: () => void;
  onOpenAuth?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  onLaunchComputer,
  onLaunchLocal,
  onLaunchOnline,
  onOpenProfile,
  onOpenAuth
}) => {
  const levelInfo = calculateLevelInfo(profile.xp);
  const winRate = profile.matches > 0 ? Math.round((profile.wins / profile.matches) * 100) : 0;
  const isGuest = Boolean(profile.isGuest || !profile.numericUid);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Player Hero Card */}
      <div
        onClick={onOpenProfile}
        className="cursor-pointer rounded-2xl border p-4.5 transition-all hover:border-[var(--accent-primary)] shadow-sm relative overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-16 h-16 rounded-full p-0.5 flex-shrink-0 flex items-center justify-center relative shadow-sm"
            style={{
              background: 'linear-gradient(135deg, var(--player-x), var(--player-o))'
            }}
          >
            <div
              className="w-full h-full rounded-full flex items-center justify-center font-display font-bold text-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--accent-primary)'
              }}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : profile.avatarEmoji ? (
                <span className="text-3xl">{profile.avatarEmoji}</span>
              ) : (
                profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'P'
              )}
            </div>
            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${isGuest ? 'bg-amber-400' : 'bg-emerald-500'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2
                className="font-bold text-lg leading-tight truncate"
                style={{ color: 'var(--text-main)' }}
              >
                {profile.displayName || 'Player'}
              </h2>
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold text-white font-display tracking-wider"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                LVL {levelInfo.level}
              </span>
            </div>

            {/* Sequential XO Arena UID or Guest Badge */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {isGuest ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-500">
                  Guest Mode • No UID (Offline Only)
                </span>
              ) : (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--accent-primary)]">
                  XO ARENA UID: {profile.numericUid}
                </span>
              )}
            </div>

            {/* Free Fire style progressive XP bar */}
            <div className="mt-2.5">
              <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                <span>XP {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForNext}</span>
                <span>{levelInfo.progress}%</span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${levelInfo.progress}%`,
                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4-Stat Box */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div
            className="p-2 rounded-xl text-center border"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div className="font-display font-bold text-lg leading-none" style={{ color: 'var(--accent-primary)' }}>
              {profile.matches}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
              Matches
            </div>
          </div>

          <div
            className="p-2 rounded-xl text-center border"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div className="font-display font-bold text-lg leading-none text-emerald-500">
              {profile.wins}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
              Wins
            </div>
          </div>

          <div
            className="p-2 rounded-xl text-center border"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div className="font-display font-bold text-lg leading-none text-sky-500">
              {winRate}%
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
              Win Rate
            </div>
          </div>

          <div
            className="p-2 rounded-xl text-center border"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div className="font-display font-bold text-lg leading-none text-amber-500 flex items-center justify-center gap-0.5">
              <span>{Math.max(profile.bestStreak || 0, profile.streak || 0)}</span>
              <span className="text-xs">🔥</span>
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
              Max Streak
            </div>
          </div>
        </div>
      </div>

      {/* Game Mode Launch Cards */}
      <div className="flex flex-col gap-3">
        {/* Play with Computer */}
        <button
          onClick={() => {
            sound.playClick();
            onLaunchComputer();
          }}
          className="rounded-2xl border p-4 flex items-center justify-between text-left transition-all hover:scale-[1.01] active:scale-[0.98] shadow-sm cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              🤖
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--text-main)' }}>
                Play with Computer
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Practice vs Easy, Tactical, or Minimax AI (Unlocked)
              </p>
            </div>
          </div>
          <span className="text-lg opacity-60">➔</span>
        </button>

        {/* Play with Friend */}
        <button
          onClick={() => {
            sound.playClick();
            onLaunchLocal();
          }}
          className="rounded-2xl border p-4 flex items-center justify-between text-left transition-all hover:scale-[1.01] active:scale-[0.98] shadow-sm cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              👥
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--text-main)' }}>
                Play with Friend
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Pass & Play on this phone or screen (Unlocked)
              </p>
            </div>
          </div>
          <span className="text-lg opacity-60">➔</span>
        </button>

        {/* Online Multiplayer */}
        <button
          onClick={() => {
            sound.playClick();
            if (isGuest && onOpenAuth) {
              onOpenAuth();
            } else {
              onLaunchOnline();
            }
          }}
          className="rounded-2xl border p-4 flex items-center justify-between text-left transition-all hover:scale-[1.01] active:scale-[0.98] shadow-md cursor-pointer relative overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: isGuest ? 'var(--border-subtle)' : 'var(--border-accent)',
            boxShadow: isGuest ? 'none' : 'var(--accent-glow)'
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl text-white font-bold"
              style={{
                background: isGuest
                  ? 'linear-gradient(135deg, #64748b, #475569)'
                  : 'linear-gradient(135deg, var(--player-x), var(--player-o))'
              }}
            >
              {isGuest ? '🔒' : '⚡'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--text-main)' }}>
                  Online Multiplayer
                </h3>
                {isGuest ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-[10px] font-bold text-white uppercase tracking-wider">
                    Sign In Required
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                    Live
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {isGuest
                  ? 'Sign in or register to get an official UID & battle online'
                  : 'Private Room Codes, Quick Match & Active Players'}
              </p>
            </div>
          </div>
          <span className="text-lg font-bold" style={{ color: isGuest ? 'var(--text-muted)' : 'var(--accent-primary)' }}>➔</span>
        </button>
      </div>

      {/* Developer credit */}
      <div className="text-center text-[11px] font-bold tracking-widest uppercase py-3" style={{ color: 'var(--text-muted)' }}>
        XO ARENA • MADE BY PB ANMOL
      </div>
    </div>
  );
};
