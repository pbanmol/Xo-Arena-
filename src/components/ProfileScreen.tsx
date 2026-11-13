import React, { useState } from 'react';
import { UserProfile } from '../types/game';
import { ACHIEVEMENTS } from '../services/storage';
import { sound } from '../services/sound';

interface ProfileScreenProps {
  profile: UserProfile;
  unlockedAchievements: string[];
  onSaveProfile: (displayName: string, avatarUrl: string | null, avatarEmoji: string) => void;
  onOpenAuth: () => void;
  isLoggedIn: boolean;
  email?: string | null;
}

const EMOJI_AVATAR_LIST = [
  '🤖', '🥷', '👑', '⚡', '🐉', '🎯', '👾', '🦁',
  '🔥', '💀', '🐺', '🚀', '💎', '⚔️', '🏆', '🐯',
  '🦅', '🥋', '🎩', '🕶️', '🦊', '🐻', '🐼', '🦄'
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  unlockedAchievements,
  onSaveProfile,
  onOpenAuth,
  isLoggedIn,
  email
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [avatarEmoji, setAvatarEmoji] = useState<string>(profile.avatarEmoji || '🤖');

  const [uploadError, setUploadError] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 256;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setAvatarUrl(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          setAvatarUrl(dataUrl);
        }
      };
      img.onerror = () => {
        setUploadError('Could not read the selected image.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectEmoji = (emoji: string) => {
    sound.playClick();
    setAvatarEmoji(emoji);
    setAvatarUrl(null); // Clear custom photo when emoji is chosen
  };

  const handleInsertEmojiToName = (emoji: string) => {
    sound.playClick();
    setDisplayName((prev) => `${prev} ${emoji}`.trim());
  };

  const handleSave = () => {
    sound.playClick();
    onSaveProfile(displayName.trim() || 'Player', avatarUrl, avatarEmoji);
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Profile Edit Card */}
      <div
        className="rounded-2xl border p-4.5 shadow-sm flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <h3 className="font-display font-extrabold text-lg" style={{ color: 'var(--text-main)' }}>
              Player Profile
            </h3>
          </div>
          {profile.isGuest || !profile.numericUid ? (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500">
              Guest Mode (No UID)
            </span>
          ) : (
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--accent-primary)]">
              XO ARENA UID: {profile.numericUid}
            </span>
          )}
        </div>

        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <div
            className="w-18 h-18 rounded-full p-0.5 flex-shrink-0 flex items-center justify-center relative shadow-sm"
            style={{
              background: 'linear-gradient(135deg, var(--player-x), var(--player-o))'
            }}
          >
            <div
              className="w-full h-full rounded-full flex items-center justify-center font-display font-bold text-3xl overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--accent-primary)'
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">{avatarEmoji}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold w-fit transition-transform active:scale-95"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)'
              }}
            >
              <span>📷</span>
              <span>Upload Custom Photo</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <span className="text-[10px] text-slate-400">Or choose an avatar emoji below:</span>
            {uploadError && (
              <span className="text-[11px] font-semibold text-rose-500">{uploadError}</span>
            )}
          </div>
        </div>

        {/* Emoji Avatar Picker */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-400">Choose Avatar Emoji:</span>
          <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]">
            {EMOJI_AVATAR_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelectEmoji(emoji)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform hover:scale-110 active:scale-90 ${
                  !avatarUrl && avatarEmoji === emoji
                    ? 'border-2 border-[var(--accent-primary)] bg-[var(--bg-card)] shadow-sm'
                    : 'border border-transparent'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Display Name Input with Quick Emoji inserter */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-400">
            Player Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. PB ANMOL"
              maxLength={22}
              className="flex-1 px-3 py-2.5 rounded-xl border text-sm font-semibold outline-none"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          {/* Quick emoji add to name */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">Add emoji to name:</span>
            {['🔥', '👑', '⚡', '🦁', '💀', '⚔️', '✨', '🎯'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleInsertEmojiToName(emoji)}
                className="px-2 py-0.5 rounded-lg border text-xs hover:scale-110 transition-transform active:scale-95 bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]"
              >
                {emoji}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            className="w-full mt-2 py-3 rounded-xl text-white font-bold text-sm tracking-wide shadow-md transition-transform active:scale-95 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Save Profile Info
          </button>
        </div>

        {/* Account Status Box */}
        <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
              Account Status
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isLoggedIn ? (email ? `Verified (${email})` : 'Guest Session Active') : 'Guest Session Active'}
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onOpenAuth();
            }}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-transform active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--accent-primary)'
            }}
          >
            {isLoggedIn && email ? 'Account' : 'Link / Sign In'}
          </button>
        </div>
      </div>

      {/* Achievements Card */}
      <div
        className="rounded-2xl border p-4.5 shadow-sm flex flex-col gap-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎖️</span>
            <h3 className="font-display font-extrabold text-lg" style={{ color: 'var(--text-main)' }}>
              Achievements
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400 font-mono">
            {unlockedAchievements.length} / {ACHIEVEMENTS.length}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = unlockedAchievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isUnlocked ? 'opacity-100' : 'opacity-40'
                }`}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ach.icon}</span>
                  <div>
                    <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                      {ach.name}
                    </div>
                    <div className="text-[10px] text-slate-400">{ach.desc}</div>
                  </div>
                </div>
                <span className="text-sm">{isUnlocked ? '✅' : '🔒'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
