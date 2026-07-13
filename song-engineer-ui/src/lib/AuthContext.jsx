import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getSession,
  setSession,
  registerAccount,
  loginAccount,
  migrateGuestIntoUser,
  pullFromCloud,
  syncToCloud,
} from './userStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const s = getSession();
    return s ? { id: s.userId, email: s.email, name: s.name, token: s.token } : null;
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | ok | offline

  const refreshFromSession = useCallback(() => {
    const s = getSession();
    setUser(s ? { id: s.userId, email: s.email, name: s.name, token: s.token } : null);
  }, []);

  useEffect(() => {
    if (!user?.token) return;
    let cancelled = false;
    (async () => {
      setSyncStatus('syncing');
      const res = await pullFromCloud();
      if (cancelled) return;
      setSyncStatus(res.ok ? 'ok' : 'offline');
      // notify listeners that library/progress may have changed
      window.dispatchEvent(new CustomEvent('se-user-data-changed'));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.token]);

  const applySession = useCallback((data) => {
    const session = {
      userId: data.user.id,
      email: data.user.email,
      name: data.user.name || '',
      token: data.token,
      source: data.source || (String(data.token).startsWith('local.') ? 'local' : 'cloud'),
    };
    setSession(session);
    migrateGuestIntoUser(session.userId);
    setUser({
      id: session.userId,
      email: session.email,
      name: session.name,
      token: session.token,
      source: session.source,
    });
    window.dispatchEvent(new CustomEvent('se-user-data-changed'));
  }, []);

  const signUp = useCallback(
    async ({ email, password, name }) => {
      setAuthBusy(true);
      setAuthError('');
      try {
        const data = await registerAccount(email, password, name);
        applySession(data);
        setSyncStatus('syncing');
        await syncToCloud().catch(() => {});
        setSyncStatus('ok');
        setAuthOpen(false);
        return { ok: true };
      } catch (err) {
        setAuthError(err.message || 'Could not create account');
        return { ok: false, error: err.message };
      } finally {
        setAuthBusy(false);
      }
    },
    [applySession]
  );

  const signIn = useCallback(
    async ({ email, password }) => {
      setAuthBusy(true);
      setAuthError('');
      try {
        const data = await loginAccount(email, password);
        applySession(data);
        setSyncStatus('syncing');
        const pull = await pullFromCloud();
        setSyncStatus(pull.ok ? 'ok' : 'offline');
        setAuthOpen(false);
        return { ok: true };
      } catch (err) {
        setAuthError(err.message || 'Could not sign in');
        return { ok: false, error: err.message };
      } finally {
        setAuthBusy(false);
      }
    },
    [applySession]
  );

  const signOut = useCallback(() => {
    setSession(null);
    setUser(null);
    setSyncStatus('idle');
    window.dispatchEvent(new CustomEvent('se-user-data-changed'));
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      authOpen,
      setAuthOpen,
      authBusy,
      authError,
      setAuthError,
      syncStatus,
      signIn,
      signUp,
      signOut,
      refreshFromSession,
    }),
    [user, authOpen, authBusy, authError, syncStatus, signIn, signUp, signOut, refreshFromSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
