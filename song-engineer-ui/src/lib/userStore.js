/**
 * User data store — guest = device localStorage; signed-in = account-scoped
 * local cache + cloud sync when API is reachable.
 */

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'https://song-engineer-ui-2.onrender.com';

const GUEST = {
  library: 'songEngineer_library',
  progress: 'songEngineer_vocal_progress_v1',
  draftTitle: 'song_engineer_title',
  draftLyrics: 'song_engineer_lyrics',
  draftId: 'song_engineer_id',
  draftAudio: 'song_engineer_audio',
};

const SESSION_KEY = 'songEngineer_session_v1';

function userPrefix(userId) {
  return `songEngineer_u_${userId}_`;
}

function keysFor(userId) {
  if (!userId) return GUEST;
  const p = userPrefix(userId);
  return {
    library: `${p}library`,
    progress: `${p}progress`,
    draftTitle: `${p}title`,
    draftLyrics: `${p}lyrics`,
    draftId: `${p}id`,
    draftAudio: `${p}audio`,
  };
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('localStorage write failed', err);
  }
}

export function getSession() {
  return readJson(SESSION_KEY, null);
}

export function setSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  writeJson(SESSION_KEY, session);
}

export function getLibrary(userId = getSession()?.userId) {
  return readJson(keysFor(userId).library, []);
}

export function setLibrary(library, userId = getSession()?.userId) {
  writeJson(keysFor(userId).library, library || []);
  scheduleCloudSync(userId);
}

export function getProgress(userId = getSession()?.userId) {
  return readJson(keysFor(userId).progress, {
    sessions: 0,
    minutes: 0,
    exercises: 0,
    bestHold: 0,
    rangeLow: null,
    rangeHigh: null,
    activity: [],
  });
}

export function setProgress(progress, userId = getSession()?.userId) {
  writeJson(keysFor(userId).progress, progress || {});
  scheduleCloudSync(userId);
}

export function getDraft(userId = getSession()?.userId) {
  const k = keysFor(userId);
  return {
    title: localStorage.getItem(k.draftTitle) || '',
    lyrics: localStorage.getItem(k.draftLyrics) || '',
    id: localStorage.getItem(k.draftId) || '',
    audio: localStorage.getItem(k.draftAudio) || null,
  };
}

export function setDraft(draft, userId = getSession()?.userId) {
  const k = keysFor(userId);
  if (draft.title != null) localStorage.setItem(k.draftTitle, draft.title);
  if (draft.lyrics != null) localStorage.setItem(k.draftLyrics, draft.lyrics);
  if (draft.id) localStorage.setItem(k.draftId, String(draft.id));
  else localStorage.removeItem(k.draftId);
  if (draft.audio) localStorage.setItem(k.draftAudio, draft.audio);
  else localStorage.removeItem(k.draftAudio);
  // Drafts stay local-only (can be large with audio)
}

/** Copy guest data into a user account once (on first login if account empty) */
export function migrateGuestIntoUser(userId) {
  if (!userId) return;
  const userLib = getLibrary(userId);
  const guestLib = getLibrary(null);
  if ((!userLib || userLib.length === 0) && guestLib?.length) {
    setLibrary(guestLib, userId);
  }
  const userProg = getProgress(userId);
  const guestProg = getProgress(null);
  const userEmpty =
    !userProg.sessions && !userProg.minutes && !userProg.exercises && !(userProg.activity || []).length;
  if (userEmpty && (guestProg.sessions || guestProg.minutes || guestProg.exercises)) {
    setProgress(guestProg, userId);
  }
  const userDraft = getDraft(userId);
  const guestDraft = getDraft(null);
  if (!userDraft.lyrics && guestDraft.lyrics) {
    setDraft(guestDraft, userId);
  }
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const LOCAL_USERS_KEY = 'songEngineer_local_users_v1';

function loadLocalUsers() {
  return readJson(LOCAL_USERS_KEY, {});
}

function saveLocalUsers(map) {
  writeJson(LOCAL_USERS_KEY, map);
}

async function pbkdf2Hash(password, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64
    ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));
  const saltOut = btoa(String.fromCharCode(...salt));
  return { hash, salt: saltOut };
}

function makeLocalToken(userId) {
  return `local.${userId}.${Date.now().toString(36)}`;
}

/** Register — prefer cloud API, fall back to device-local account */
export async function registerAccount(email, password, name = '') {
  const clean = email.trim().toLowerCase();
  try {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: { email: clean, password, name: name.trim() },
    });
    return { ...data, source: 'cloud' };
  } catch (err) {
    // Real API conflict should surface (don't create a second local account)
    if (err.status === 409) throw err;
    // Device-local account so auth always works even if API is cold
    const users = loadLocalUsers();
    if (users[clean]) {
      throw new Error('An account with this email already exists on this device');
    }
    const { hash, salt } = await pbkdf2Hash(password);
    const id = `local_${Date.now().toString(36)}`;
    users[clean] = { id, email: clean, name: name.trim(), hash, salt };
    saveLocalUsers(users);
    return {
      token: makeLocalToken(id),
      user: { id, email: clean, name: name.trim() },
      source: 'local',
    };
  }
}

/** Login — try cloud, then device-local accounts */
export async function loginAccount(email, password) {
  const clean = email.trim().toLowerCase();
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { email: clean, password },
    });
    return { ...data, source: 'cloud' };
  } catch (cloudErr) {
    const users = loadLocalUsers();
    const rec = users[clean];
    if (!rec) {
      throw new Error(
        cloudErr.status === 401 || cloudErr.message?.includes('Invalid')
          ? 'Invalid email or password'
          : cloudErr.message || 'Sign-in failed — check connection or create an account'
      );
    }
    const { hash } = await pbkdf2Hash(password, rec.salt);
    if (hash !== rec.hash) throw new Error('Invalid email or password');
    return {
      token: makeLocalToken(rec.id),
      user: { id: rec.id, email: rec.email, name: rec.name || '' },
      source: 'local',
    };
  }
}
export async function fetchCloudBundle(token) {
  return api('/api/me/data', { token });
}

export async function pushCloudBundle(token, bundle) {
  return api('/api/me/data', {
    method: 'PUT',
    token,
    body: bundle,
  });
}

let syncTimer = null;
function scheduleCloudSync(userId) {
  const session = getSession();
  if (!session?.token || !userId || session.userId !== userId) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncToCloud().catch(() => {});
  }, 800);
}

export async function syncToCloud() {
  const session = getSession();
  if (!session?.token) return { ok: false, reason: 'guest' };
  // Local-only accounts stay on-device (still isolated per user)
  if (String(session.token).startsWith('local.')) {
    return { ok: true, reason: 'local-only' };
  }
  // Omit huge audio blobs from cloud library entries (keep lyrics)
  const library = getLibrary(session.userId).map((s) => ({
    ...s,
    audioData: s.audioData && s.audioData.length > 200_000 ? null : s.audioData,
  }));
  const progress = getProgress(session.userId);
  await pushCloudBundle(session.token, { library, progress });
  return { ok: true };
}

export async function pullFromCloud() {
  const session = getSession();
  if (!session?.token) return { ok: false };
  if (String(session.token).startsWith('local.')) {
    return { ok: true, reason: 'local-only' };
  }
  try {
    const data = await fetchCloudBundle(session.token);
    if (Array.isArray(data.library)) {
      // Keep local audio if cloud stripped it
      const local = getLibrary(session.userId);
      const localById = new Map(local.map((s) => [String(s.id), s]));
      const merged = data.library.map((s) => {
        const prev = localById.get(String(s.id));
        if (prev?.audioData && !s.audioData) return { ...s, audioData: prev.audioData };
        return s;
      });
      for (const s of local) {
        if (!merged.some((m) => String(m.id) === String(s.id))) merged.push(s);
      }
      writeJson(keysFor(session.userId).library, merged);
    }
    if (data.progress && typeof data.progress === 'object') {
      writeJson(keysFor(session.userId).progress, data.progress);
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err };
  }
}
export { API_BASE };
