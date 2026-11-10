import React, { useState, useMemo } from 'react';
import { OnlinePlayer, UserProfile } from '../types/game';
import { sound } from '../services/sound';
import { searchUserByNumericUidOrName } from '../services/firebase';

interface OnlineLobbyProps {
  profile: UserProfile;
  onlinePlayers: OnlinePlayer[];
  isMatchmaking: boolean;
  matchmakingTime: number;
  onStartMatchmaking: () => void;
  onCancelMatchmaking: () => void;
  onCreatePrivateRoom: () => void;
  onJoinPrivateRoom: (code: string) => void;
  onSendChallenge: (targetUid: string, targetName: string) => void;
  createdRoomCode: string | null;
  onCancelRoom: () => void;
  onRefreshPlayers: () => void;
  myUid?: string;
  isGuest?: boolean;
  onOpenAuth?: () => void;
}

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  profile,
  onlinePlayers,
  isMatchmaking,
  matchmakingTime,
  onStartMatchmaking,
  onCancelMatchmaking,
  onCreatePrivateRoom,
  onJoinPrivateRoom,
  onSendChallenge,
  createdRoomCode,
  onCancelRoom,
  onRefreshPlayers,
  myUid,
  isGuest,
  onOpenAuth
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMyUid, setCopiedMyUid] = useState(false);
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [dbSearchError, setDbSearchError] = useState('');

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
            🔒
          </div>

          <h3 className="font-display font-black text-2xl tracking-wider mb-2" style={{ color: 'var(--text-main)' }}>
            ONLINE BATTLES LOCKED
          </h3>

          <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
            Guest accounts cannot play online matches. Sign in or register with email to receive your permanent official <strong className="text-[var(--accent-primary)] font-mono">XO ARENA UID</strong>, challenge friends with private room codes, and climb the Global Leaderboard!
          </p>

          <button
            onClick={() => {
              sound.playClick();
              if (onOpenAuth) onOpenAuth();
            }}
            className="w-full max-w-xs py-3.5 px-6 rounded-xl text-white font-bold text-sm tracking-wide shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: 'var(--accent-primary)',
              boxShadow: 'var(--accent-glow)'
            }}
          >
            🔑 Sign In / Register to Unlock
          </button>

          <div className="mt-6 pt-5 border-t w-full flex flex-col items-center gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Offline Modes Ready to Play
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              You can play <strong>Play with Computer</strong> and <strong>Play with Friend</strong> locally on the Home screen anytime without an account!
            </span>
          </div>
        </div>
      </div>
    );
  }

  const handleCopyCode = () => {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyMyUid = () => {
    const textToCopy = String(profile.numericUid || 1);
    navigator.clipboard.writeText(textToCopy);
    setCopiedMyUid(true);
    setTimeout(() => setCopiedMyUid(false), 2000);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    onJoinPrivateRoom(joinCodeInput.trim());
  };

  // Filter online players by Name or sequential XO Arena Numeric UID
  const filteredPlayers = useMemo(() => {
    const others = onlinePlayers.filter((p) => p.uid !== myUid);
    if (!searchQuery.trim()) return others;
    const q = searchQuery.toLowerCase().trim();
    return others.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        String(p.numericUid || '').includes(q)
    );
  }, [onlinePlayers, myUid, searchQuery]);

  const handleGlobalDbSearch = async () => {
    if (!searchQuery.trim()) return;
    setDbSearchError('');
    setIsSearchingDb(true);
    setSearchedUser(null);
    try {
      const found = await searchUserByNumericUidOrName(searchQuery.trim());
      if (found) {
        setSearchedUser(found);
      } else {
        setDbSearchError(`No player found with UID or Name "${searchQuery.trim()}" in Arena.`);
      }
    } catch {
      setDbSearchError('Player search failed. Please verify the UID.');
    } finally {
      setIsSearchingDb(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Real-time Matchmaking Card */}
      <div
        className="rounded-2xl border p-5 flex flex-col items-center text-center shadow-md relative overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-accent)',
          boxShadow: 'var(--accent-glow)'
        }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 text-white font-bold"
          style={{ background: 'linear-gradient(135deg, var(--player-x), var(--player-o))' }}
        >
          ⚡
        </div>
        <h3 className="font-display font-extrabold text-xl" style={{ color: 'var(--text-main)' }}>
          Real-Time Quick Match
        </h3>
        <p className="text-xs max-w-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
          Instant 2-player matchmaking. Any two players clicking Quick Match get paired right away!
        </p>

        {isMatchmaking ? (
          <div className="flex flex-col items-center gap-3 py-2 w-full">
            <div className="relative flex items-center justify-center w-14 h-14">
              <span className="absolute w-12 h-12 rounded-full border-2 border-indigo-500 radar-ping" />
              <span className="text-2xl animate-spin">⏳</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-[var(--accent-primary)]">
                Matching with opponent...
              </span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                {matchmakingTime}s searching
              </span>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                onCancelMatchmaking();
              }}
              className="mt-1 px-4 py-2 rounded-xl border text-xs font-bold transition-all hover:bg-rose-500/10 active:scale-95 cursor-pointer"
              style={{
                borderColor: 'var(--danger)',
                color: 'var(--danger)'
              }}
            >
              Cancel Matchmaking
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              sound.playClick();
              onStartMatchmaking();
            }}
            className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm tracking-wide shadow-md transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: 'var(--accent-primary)',
              boxShadow: 'var(--accent-glow)'
            }}
          >
            ⚡ Quick Matchmaking
          </button>
        )}
      </div>

      {/* User's ID Card - Placed directly below Quick Match & styled to match user screenshot */}
      <div
        className="rounded-2xl border p-3.5 flex items-center justify-between shadow-md"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Profile Avatar / Photo */}
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">{profile.avatarEmoji || '🤖'}</span>
            )}
          </div>

          {/* Details: Name, "Your UID", and high-contrast red "XO ARENA UID: {uid}" */}
          <div className="min-w-0 flex flex-col">
            <span className="text-xs font-extrabold truncate" style={{ color: 'var(--text-main)' }}>
              {profile.displayName || 'Player'}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Your UID
            </span>
            <span className="text-sm font-mono font-black text-rose-500 dark:text-rose-400 tracking-wide mt-0.5">
              XO ARENA UID: {profile.numericUid || 1}
            </span>
          </div>
        </div>

        {/* Copy Button matching user's screenshot pill style */}
        <button
          onClick={handleCopyMyUid}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-white text-xs font-bold transition-transform active:scale-95 shadow-sm flex-shrink-0 cursor-pointer"
        >
          <span>📋</span>
          <span>{copiedMyUid ? 'Copied!' : 'Copy UID'}</span>
        </button>
      </div>

      {/* Private Room Codes (Strictly 2 Players Max) */}
      <div
        className="rounded-2xl border p-4.5 flex flex-col gap-3 shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗝️</span>
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
              Private Room with Friend
            </h4>
          </div>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            2 Players Max
          </span>
        </div>

        {createdRoomCode ? (
          <div
            className="rounded-xl border p-3 flex flex-col items-center gap-2 text-center"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <span className="text-xs text-slate-400">Share this Room Code with your friend:</span>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-2xl tracking-widest text-[var(--accent-primary)] font-mono">
                {createdRoomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-transform active:scale-90 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)'
                }}
              >
                {copiedCode ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-amber-500 font-semibold animate-pulse">
              <span>●</span> Waiting for friend to join (1/2)...
            </div>
            <button
              onClick={() => {
                sound.playClick();
                onCancelRoom();
              }}
              className="text-xs text-rose-500 font-semibold mt-1 hover:underline cursor-pointer"
            >
              Cancel Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                sound.playClick();
                onCreatePrivateRoom();
              }}
              className="py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)'
              }}
            >
              <span>➕</span>
              <span>Create Private Room</span>
            </button>

            <form onSubmit={handleJoinRoom} className="flex gap-1.5">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit Code"
                maxLength={8}
                className="flex-1 px-3 py-2 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)'
                }}
              />
              <button
                type="submit"
                disabled={!joinCodeInput.trim()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                Join
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Active Online Players & Search by UID / Name */}
      <div
        className="rounded-2xl border p-4.5 flex flex-col gap-3 shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🟢</span>
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
              Online Players & Direct Challenge
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              ({onlinePlayers.filter((p) => p.uid !== myUid).length})
            </span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onRefreshPlayers();
            }}
            title="Refresh Online Players"
            className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs transition-transform active:rotate-180 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)'
            }}
          >
            🔄
          </button>
        </div>

        {/* Search bar */}
        <div className="relative flex items-center">
          <span className="absolute left-3 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchedUser(null);
              setDbSearchError('');
            }}
            placeholder="Search by Player Name or UID (e.g. 1, 20)..."
            className="w-full pl-8 pr-8 py-2.5 rounded-xl border text-xs outline-none"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchedUser(null);
                setDbSearchError('');
              }}
              className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Global Player Directory Search Result */}
        {searchedUser && (
          <div className="flex flex-col gap-1.5 animate-in fade-in">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Player Directory Result
            </span>
            <div
              className="p-3 rounded-xl border flex items-center justify-between"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderColor: 'var(--border-accent)'
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden border border-[var(--border-subtle)]">
                  {searchedUser.avatarUrl ? (
                    <img src={searchedUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{searchedUser.avatarEmoji || '🤖'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                    <span>{searchedUser.displayName}</span>
                    {searchedUser.uid === myUid && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[var(--accent-primary)] text-white">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--accent-primary)] font-bold truncate">
                    XO ARENA UID: {searchedUser.numericUid || 1}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    LVL {searchedUser.level || 1} • {searchedUser.wins || 0} Wins
                  </div>
                </div>
              </div>

              {searchedUser.uid === myUid ? (
                <button
                  disabled
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 bg-slate-800/80 text-slate-400 cursor-not-allowed opacity-75"
                >
                  Your Profile
                </button>
              ) : (
                <button
                  onClick={() => {
                    sound.playClick();
                    onSendChallenge(searchedUser.uid, searchedUser.displayName);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-transform active:scale-90 cursor-pointer"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  ⚔️ Challenge
                </button>
              )}
            </div>
          </div>
        )}

        {dbSearchError && (
          <div className="text-xs text-rose-500 font-semibold p-2 rounded-lg bg-rose-500/10">
            {dbSearchError}
          </div>
        )}

        {/* Online Players List */}
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {filteredPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-slate-400 gap-2">
              <span>No active online players match this search.</span>
              {searchQuery.trim().length >= 1 && !searchedUser && (
                <button
                  onClick={handleGlobalDbSearch}
                  disabled={isSearchingDb}
                  className="px-3 py-1.5 rounded-xl border text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-accent)' }}
                >
                  {isSearchingDb ? 'Searching Arena Directory...' : `🔍 Find Player "${searchQuery.trim()}" in Arena`}
                </button>
              )}
            </div>
          ) : (
            filteredPlayers.map((player) => (
              <div
                key={player.uid}
                className="flex items-center justify-between p-2.5 rounded-xl border transition-all hover:border-[var(--accent-primary)]"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm flex-shrink-0 animate-pulse" />
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                    {player.avatarUrl ? (
                      <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">{player.avatarEmoji || '🤖'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                      <span>{player.displayName}</span>
                      <span className="text-[10px] text-indigo-500 font-display font-bold">
                        LVL {player.level || 1}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-[var(--accent-primary)] truncate">
                      XO ARENA UID: {player.numericUid || 1}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    sound.playClick();
                    onSendChallenge(player.uid, player.displayName);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-transform active:scale-90 cursor-pointer flex-shrink-0"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  Challenge
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
