import React, { useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto ${
        isEntryGate ? 'bg-[var(--bg-base)]' : 'bg-black/60 backdrop-blur-sm'
      } animate-in fade-in duration-150`}
    >
      <div
        className="w-full max-w-sm rounded-3xl border p-6 flex flex-col items-center text-center shadow-2xl relative animate-in zoom-in-95 duration-200 my-auto"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        {!isEntryGate && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}

        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-[var(--border-subtle)] mb-2.5">
          <img src="/icon.png" alt="XO Arena" className="w-full h-full object-cover" />
        </div>

        <h3 className="font-display font-black text-2xl tracking-wider" style={{ color: 'var(--text-main)' }}>
          XO ARENA
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          {isEntryGate
            ? 'Choose how you want to enter the arena'
            : tab === 'signin'
              ? 'Sign in to save progress & stats'
              : 'Create an account to join the arena'}
        </p>

        {/* Tab switch */}
        <div
          className="w-full flex p-1 rounded-xl border mb-4"
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
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-slate-400'
            }`}
          >
            🛡️ Register
          </button>
        </div>

        {errorMsg && (
          <div className="w-full mb-3 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs text-left">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 w-full text-left">
          {tab === 'register' && (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. PB ANMOL"
                  maxLength={20}
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Choose Avatar Emoji
                </label>
                <div className="grid grid-cols-6 gap-1.5 p-2 rounded-xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]">
                  {REG_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`h-8 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-110 active:scale-90 ${
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
            <label className="text-[11px] font-bold text-slate-400 block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl text-white font-bold text-xs shadow-md transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            {loading ? 'Processing...' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-2 w-full my-3">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-[11px] text-slate-400 font-semibold uppercase">or</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        <button
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
