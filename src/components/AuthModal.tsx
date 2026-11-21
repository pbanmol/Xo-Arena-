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
  // Capture full viewport height when keyboard is closed so the card stays dead-center
  // and NEVER shifts up or down when the mobile soft keyboard opens.
  const [stableMinHeight, setStableMinHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 720
  );

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const updateHeightIfNoInputFocused = () => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        setStableMinHeight(window.innerHeight);
      }
    };

    updateHeightIfNoInputFocused();
    window.addEventListener('orientationchange', updateHeightIfNoInputFocused);
    window.addEventListener('resize', updateHeightIfNoInputFocused);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('orientationchange', updateHeightIfNoInputFocused);
      window.removeEventListener('resize', updateHeightIfNoInputFocused);
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
      data-auth-modal="true"
      className={`fixed inset-0 z-50 overflow-y-auto overscroll-contain ${
        isEntryGate ? 'bg-[var(--bg-base)]' : 'bg-black/65 backdrop-blur-md'
      }`}
      onFocusCapture={(e) => {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 180);
        }
      }}
    >
      {/* Centered layout anchored to stableMinHeight so it sits perfectly in the middle
          of the screen and never jumps when opening the keyboard */}
      <div
        className="w-full flex flex-col items-center justify-center px-5"
        style={{
          minHeight: `min(100%, ${stableMinHeight}px)`,
          paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom))'
        }}
      >
        <div
          className="w-full max-w-[372px] rounded-[28px] border p-6 flex flex-col items-center text-center shadow-2xl relative"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          {!isEntryGate && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}

          {/* Brand Emblem */}
          <div className="relative mb-3">
            <div
              className="absolute -inset-1.5 rounded-[22px] opacity-25 blur-md pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
              }}
            />
            <div
              className="relative w-16 h-16 rounded-2xl p-[2px] shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
              }}
            >
              <img
                src="/icon.png"
                alt="XO Arena"
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
          </div>

          <h2
            className="font-display font-black text-2xl tracking-wider leading-tight"
            style={{ color: 'var(--text-main)' }}
          >
            XO ARENA
          </h2>
          <p className="text-[13px] mt-1 mb-5 leading-snug" style={{ color: 'var(--text-muted)' }}>
            {tab === 'signin'
              ? 'Sign in to play online & save your rank'
              : 'Create your player profile to compete'}
          </p>

          {/* Clean Segmented Switcher */}
          <div
            className="w-full grid grid-cols-2 gap-1 p-1 rounded-2xl border mb-5"
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
              className={`min-h-[42px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                tab === 'signin' ? 'text-white shadow-sm' : ''
              }`}
              style={
                tab === 'signin'
                  ? { backgroundColor: 'var(--accent-primary)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" x2="3" y1="12" y2="12" />
              </svg>
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setTab('register');
                setErrorMsg('');
              }}
              className={`min-h-[42px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                tab === 'register' ? 'text-white shadow-sm' : ''
              }`}
              style={
                tab === 'register'
                  ? { backgroundColor: 'var(--accent-primary)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" x2="19" y1="8" y2="14" />
                <line x1="22" x2="16" y1="11" y2="11" />
              </svg>
              <span>Register</span>
            </button>
          </div>

          {errorMsg && (
            <div className="w-full mb-4 px-3.5 py-2.5 rounded-xl bg-rose-500/12 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs text-left font-semibold leading-snug">
              {errorMsg}
            </div>
          )}

          {/* Form — 16px (text-base) inputs prevent iPhone Safari auto-zoom */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 w-full text-left" noValidate>
            {tab === 'register' && (
              <>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-main)' }}>
                    Player Name
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 pointer-events-none opacity-60" style={{ color: 'var(--text-muted)' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      name="name"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your name"
                      maxLength={20}
                      className="w-full h-12 pl-10 pr-3.5 rounded-xl border text-base outline-none font-medium transition-colors focus:border-[var(--accent-primary)]"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-main)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-main)' }}>
                    Choose Avatar
                  </label>
                  <div
                    className="grid grid-cols-6 gap-1.5 p-2 rounded-xl border"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)'
                    }}
                  >
                    {REG_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setSelectedEmoji(emoji);
                        }}
                        className={`h-9 rounded-lg flex items-center justify-center text-lg transition-transform active:scale-90 cursor-pointer ${
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
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-main)' }}>
                Email Address
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 pointer-events-none opacity-60" style={{ color: 'var(--text-muted)' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
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
                  className="w-full h-12 pl-10 pr-3.5 rounded-xl border text-base outline-none transition-colors focus:border-[var(--accent-primary)]"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-main)' }}>
                Password
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 pointer-events-none opacity-60" style={{ color: 'var(--text-muted)' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full h-12 pl-10 pr-12 rounded-xl border text-base outline-none transition-colors focus:border-[var(--accent-primary)]"
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
                  className="absolute right-1.5 w-10 h-10 flex items-center justify-center rounded-lg opacity-70 hover:opacity-100 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                      <path d="m2 2 20 20" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-1 rounded-xl text-white font-bold text-sm tracking-wide shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
              }}
            >
              {loading ? 'Please wait...' : tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="flex items-center gap-3 w-full my-4">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
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
            className="w-full h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
              <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
            </svg>
            <span>Play as Guest (Offline Mode)</span>
          </button>
        </div>

        {/* Clean Grounding Footer */}
        <p
          className="mt-5 text-[11px] font-semibold tracking-wider text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          XO ARENA v1.0.0 · MADE BY PBX
        </p>
      </div>
    </div>
  );
};
