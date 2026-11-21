import React, { useState, useEffect } from 'react';
import { sound } from '../services/sound';

interface AuthModalProps {
  isOpen: boolean;
  isEntryGate?: boolean;
  onClose: () => void;
  onSignIn: (email: string, pass: string) => Promise<void>;
  onRegister: (email: string, pass: string, fullName: string, avatarEmoji: string) => Promise<void>;
  onContinueGuest: () => void;
}

const REG_EMOJIS = ['🤖', '🥷', '👑', '⚡', '🐉', '🎯', '🦁', '🔥', '💀', '🐺', '🚀', '💎'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  isEntryGate = false,
  onClose,
  onSignIn,
  onRegister,
  onContinueGuest
}) => {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [fullName, setFullName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🤖');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Lock background page scroll while modal is open so keyboard focus never jumps the screen
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    sound.playClick();

    try {
      if (tab === 'signin') {
        if (!email.trim() || !password.trim()) {
          setErrorMsg('Please enter email and password.');
          setLoading(false);
          return;
        }
        await onSignIn(email.trim(), password.trim());
        onClose();
      } else {
        if (!fullName.trim()) {
          setErrorMsg('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (!email.trim() || password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await onRegister(email.trim(), password, fullName.trim(), selectedEmoji);
        onClose();
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
        setErrorMsg('Invalid email or password. Please verify or register.');
      } else if (code.includes('email-already-in-use')) {
        setErrorMsg('This email is already registered. Please Sign In.');
      } else if (code.includes('invalid-email')) {
        setErrorMsg('Please enter a valid email address.');
      } else if (err?.message) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Authentication error. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto overscroll-contain ${
        isEntryGate ? 'bg-[var(--bg-base)]' : 'bg-black/60 backdrop-blur-sm'
      }`}
      style={{
        paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        paddingLeft: '1rem',
        paddingRight: '1rem'
      }}
    >
      {/* Stable top-anchored card: never bounces up/down when mobile keyboard opens or closes */}
      <div
        className="w-full max-w-sm mx-auto mt-2 sm:mt-8 rounded-3xl border p-5 flex flex-col items-center text-center shadow-2xl relative"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        {!isEntryGate && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}

        <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md border border-[var(--border-subtle)] mb-2">
          <img src="/icon.png" alt="XO Arena" className="w-full h-full object-cover" />
        </div>

        <h3 className="font-display font-black text-xl tracking-wider leading-tight" style={{ color: 'var(--text-main)' }}>
          XO ARENA
        </h3>
        <p className="text-xs mb-3.5 mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {isEntryGate
            ? 'Choose how you want to enter the arena'
            : tab === 'signin'
              ? 'Sign in to save progress & play online'
              : 'Create an account to join the arena'}
        </p>

        {/* Tab switch */}
        <div
          className="w-full flex p-1 rounded-xl border mb-3.5"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('signin');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'signin'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-slate-400'
            }`}
          >
            👤 Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-slate-400'
            }`}
          >
            🛡️ Register
          </button>
        </div>

        {errorMsg && (
          <div className="w-full mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs text-left font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form - 16px (text-base) inputs prevent iPhone Safari auto-zoom */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 w-full text-left" noValidate>
          {tab === 'register' && (
            <>
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. PBX"
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-base outline-none font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Choose Avatar Emoji
                </label>
                <div className="grid grid-cols-6 gap-1.5 p-2 rounded-xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]">
                  {REG_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`h-8 rounded-lg flex items-center justify-center text-lg transition-transform active:scale-90 ${
                        selectedEmoji === emoji
                          ? 'border-2 border-[var(--accent-primary)] bg-[var(--bg-card)] shadow-sm'
                          : 'border border-transparent'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>
              Email Address
            </label>
            <input
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value.replace(/\s+/g, ''))}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border text-base outline-none"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>
              Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border text-base outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 px-1.5 py-1 text-sm opacity-70 hover:opacity-100 cursor-pointer"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1.5 py-3 rounded-xl text-white font-bold text-sm shadow-md transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            {loading ? 'Processing...' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-2 w-full my-3">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
          <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
            or
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onContinueGuest();
            onClose();
          }}
          className="w-full py-2.5 rounded-xl border text-xs font-semibold transition-transform active:scale-95 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)'
          }}
        >
          ⚡ Play Directly as Guest (No ID)
        </button>
      </div>
    </div>
  );
};
