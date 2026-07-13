import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getSession,
  setSession,
  registerAccount,
  loginAccount,
  migrateGuestIntoUser,
  syncBidirectional,
  isCloudSession,
} from './userStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const s = getSession();
    return s
      ? {
          id: s.userId,
          email: s.email,
          name: s.name,
          token: s.token,
          source: s.source || (String(s.token || '').startsWith('local.') ? 'local' : 'cloud'),
        }
      : null;
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authWarning, setAuthWarning] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | ok | offline | local-only
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const refreshFromSession = useCallback(() => {
    const s = getSession();
    setUser(
      s
        ? {
            id: s.userId,
            email: s.email,
            name: s.name,
            token: s.token,
            source: s.source || (String(s.token || '').startsWith('local.') ? 'local' : 'cloud'),
          }
        : null
    );
  }, []);

  const runSync = useCallback(async () => {
    const s = getSession();
    if (!s?.token) {
      setSyncStatus('idle');
      return { ok: false };
    }
    if (!isCloudSession(s)) {
      setSyncStatus('local-only');
      return { ok: true, reason: 'local-only' };
    }
    setSyncStatus('syncing');
    const res = await syncBidirectional();
    if (res.ok) {
      setSyncStatus('ok');
      setLastSyncAt(Date.now());
      setAuthWarning('');
    } else if (res.needsReauth) {
      setSyncStatus('offline');
      setAuthWarning(
        res.message ||
          'Your cloud session expired. Sign out and sign in again so phone and laptop can sync.'
      );
      setAuthOpen(true);
    } else {
      setSyncStatus('offline');
      setAuthWarning(res.message || 'Could not reach cloud sync. Check your connection and try Sync now.');
    }
    return res;
  }, []);

  // Sync on login / session present
  useEffect(() => {
    if (!user?.token) return;
    let cancelled = false;
    (async () => {
      const res = await runSync();
      if (cancelled) return;
      if (res?.ok) {
        window.dispatchEvent(new CustomEvent('se-user-data-changed', { detail: { source: 'sync' } }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.token, runSync]);

  // Re-sync when laptop/phone tab becomes visible (catches edits from other devices)
  useEffect(() => {
    if (!user?.token || !isCloudSession(getSession())) return undefined;

    const onFocus = () => {
      runSync();
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') runSync();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    // Periodic background sync while app is open
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') runSync();
    }, 45_000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(interval);
    };
  }, [user?.token, runSync]);

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
    if (data.warning) setAuthWarning(data.warning);
    else setAuthWarning(session.source === 'local' ? 'This account is device-only until you sign in with cloud.' : '');
    window.dispatchEvent(new CustomEvent('se-user-data-changed', { detail: { source: 'auth' } }));
  }, []);

  const signUp = useCallback(
    async ({ email, password, name }) => {
      setAuthBusy(true);
      setAuthError('');
      setAuthWarning('');
      try {
        const data = await registerAccount(email, password, name);
        applySession(data);
        if (data.source === 'cloud') {
          setSyncStatus('syncing');
          await runSync();
        } else {
          setSyncStatus('local-only');
        }
        setAuthOpen(false);
        return { ok: true, source: data.source, warning: data.warning };
      } catch (err) {
        setAuthError(err.message || 'Could not create account');
        return { ok: false, error: err.message };
      } finally {
        setAuthBusy(false);
      }
    },
    [applySession, runSync]
  );

  const signIn = useCallback(
    async ({ email, password }) => {
      setAuthBusy(true);
      setAuthError('');
      setAuthWarning('');
      try {
        const data = await loginAccount(email, password);
        applySession(data);
        if (data.source === 'cloud') {
          setSyncStatus('syncing');
          await runSync();
        } else {
          setSyncStatus('local-only');
        }
        setAuthOpen(false);
        return { ok: true, source: data.source, warning: data.warning };
      } catch (err) {
        setAuthError(err.message || 'Could not sign in');
        return { ok: false, error: err.message };
      } finally {
        setAuthBusy(false);
      }
    },
    [applySession, runSync]
  );

  const signOut = useCallback(() => {
    setSession(null);
    setUser(null);
    setSyncStatus('idle');
    setAuthWarning('');
    setLastSyncAt(null);
    window.dispatchEvent(new CustomEvent('se-user-data-changed', { detail: { source: 'signout' } }));
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
      authWarning,
      syncStatus,
      lastSyncAt,
      signIn,
      signUp,
      signOut,
      refreshFromSession,
      runSync,
    }),
    [
      user,
      authOpen,
      authBusy,
      authError,
      authWarning,
      syncStatus,
      lastSyncAt,
      signIn,
      signUp,
      signOut,
      refreshFromSession,
      runSync,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
