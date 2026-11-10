import React from 'react';
import { UserProfile } from '../types/game';

interface LeaderboardScreenProps {
  players: UserProfile[];
  currentUid?: string;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  players,
  currentUid
}) => {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div
        className="rounded-2xl border p-4.5 shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h3 className="font-display font-extrabold text-lg" style={{ color: 'var(--text-main)' }}>
              Global Leaderboard
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Top Competitors
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {players.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              Loading rankings...
            </div>
          ) : (
            players.map((player, idx) => {
              const isMe = player.uid === currentUid;
              const medals = ['🥇', '🥈', '🥉'];
              const medal = medals[idx] || `${idx + 1}`;

              return (
                <div
                  key={player.uid || idx}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isMe ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]' : ''
                  }`}
                  style={{
                    backgroundColor: isMe ? 'var(--bg-surface-elevated)' : 'var(--bg-card)',
                    borderColor: isMe ? 'var(--accent-primary)' : 'var(--border-subtle)'
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-display font-black text-base w-6 text-center">
                      {medal}
                    </span>

                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0 shadow-sm border border-[var(--border-subtle)]">
                      {player.avatarUrl ? (
                        <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : player.avatarEmoji ? (
                        <span className="text-2xl">{player.avatarEmoji}</span>
                      ) : (
                        player.displayName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                        <span>{player.displayName}</span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[var(--accent-primary)] text-white">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-[var(--accent-primary)] truncate">
                        XO ARENA UID: {player.numericUid || 1}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {player.wins || 0} Wins • {player.matches || 0} Matches
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-extrabold font-display tracking-wider border border-[var(--border-subtle)]"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        color: 'var(--accent-primary)'
                      }}
                    >
                      LVL {player.level || 1}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
