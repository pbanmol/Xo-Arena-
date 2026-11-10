import React from 'react';
import { UserProfile } from '../types/game';

interface LeaderboardScreenProps {
  players: UserProfile[];
  currentUid?: string;
  isGuest?: boolean;
  onOpenAuth?: () => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  players,
  currentUid,
  isGuest,
  onOpenAuth
}) => {
  if (isGuest) {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in duration-200">
        <div
          className="rounded-3xl border p-6 flex flex-col items-center text-center shadow-lg relative overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-md"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff'
            }}
          >
            🏆🔒
          </div>

          <h3 className="font-display font-black text-2xl tracking-wider mb-2" style={{ color: 'var(--text-main)' }}>
            LEADERBOARD LOCKED
          </h3>

          <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
            गेस्ट प्लेयर्स 100% केवल ऑफलाइन खेलते हैं। ग्लोबल लीडरबोर्ड पर केवल वेरिफाइड ऑनलाइन प्लेयर्स की रैंक शो होती है। टॉप 10 में आने और अपनी परमानेंट <strong className="text-[var(--accent-primary)] font-mono">XO ARENA UID</strong> पाने के लिए ईमेल से साइन इन या रजिस्टर करें!
          </p>

          <button
            onClick={onOpenAuth}
            className="w-full max-w-xs py-3.5 px-6 rounded-xl text-white font-bold text-sm tracking-wide shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: 'var(--accent-primary)',
              boxShadow: 'var(--accent-glow)'
            }}
          >
            🔑 Sign In / Register to Join Leaderboard
          </button>

          <div className="mt-6 pt-5 border-t w-full flex flex-col items-center gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Offline Play Unlocked
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              You can play <strong>Play with Computer</strong> and <strong>Play with Friend</strong> offline anytime without signing in!
            </span>
          </div>
        </div>
      </div>
    );
  }

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
            Top 10 Competitors
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
