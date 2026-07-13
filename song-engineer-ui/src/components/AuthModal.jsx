import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import './AuthModal.css';

export default function AuthModal() {
  const { authOpen, setAuthOpen, signIn, signUp, authBusy, authError, setAuthError, authWarning } =
    useAuth();
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localNote, setLocalNote] = useState('');

  if (!authOpen) return null;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalNote('');
    const res =
      mode === 'signup'
        ? await signUp({ email, password, name })
        : await signIn({ email, password });
    if (res?.ok && res.warning) setLocalNote(res.warning);
    if (res?.ok && res.source === 'local') {
      setLocalNote(
        res.warning ||
          'Signed in on this device only. For phone ↔ laptop sync, try again when the cloud is online.'
      );
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setAuthError('');
  };

  return (
    <div className="se-auth-overlay" role="dialog" aria-modal="true" aria-labelledby="se-auth-title">
      <button
        type="button"
        className="se-auth-backdrop"
        aria-label="Close"
        onClick={() => setAuthOpen(false)}
      />
      <div className="se-auth-card">
        <button type="button" className="se-auth-close" onClick={() => setAuthOpen(false)}>
          ✕
        </button>
        <p className="se-auth-eyebrow">Account</p>
        <h2 id="se-auth-title">{mode === 'signup' ? 'Create account' : 'Sign in'}</h2>
        <p className="se-auth-lead">
          {mode === 'signup'
            ? 'Songs and singing progress sync to your account across devices. Guests stay on this device only.'
            : 'Welcome back. Your library and vocal progress will load from your account.'}
        </p>

        <div className="se-auth-tabs">
          <button
            type="button"
            className={mode === 'signin' ? 'active' : ''}
            onClick={() => switchMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => switchMode('signup')}
          >
            Create account
          </button>
        </div>

        <form className="se-auth-form" onSubmit={onSubmit}>
          {mode === 'signup' && (
            <label>
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
                autoComplete="name"
              />
            </label>
          )}
          <label>
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>

          {authError && <p className="se-auth-error">{authError}</p>}
          {(localNote || authWarning) && (
            <p className="se-auth-error" style={{ color: '#e0b07a', borderColor: 'rgba(224,176,122,0.35)', background: 'rgba(224,176,122,0.1)' }}>
              {localNote || authWarning}
            </p>
          )}

          <button type="submit" className="se-auth-submit" disabled={authBusy}>
            {authBusy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="se-auth-note">
          Sign in so songs and singing progress sync across phone and laptop. Without an account,
          data stays on this device only.
        </p>
      </div>
    </div>
  );
}
