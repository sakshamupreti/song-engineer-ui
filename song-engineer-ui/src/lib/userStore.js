/**
 * User data store
 * - Guest → device localStorage only
 * - Signed-in (cloud) → local cache + bidirectional sync to API
 * - Signed-in (local fallback) → device only (cannot cross devices)
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
const LOCAL_USERS_KEY = 'songEngineer_local_users_v1';

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

export function isCloudSession(session = getSession()) {
  return !!(session?.token && !String(session.token).startsWith('local.'));
}

export function getLibrary(userId = getSession()?.userId) {
  return readJson(keysFor(userId).library, []);
}

export function setLibrary(library, userId = getSession()?.userId) {
  const stamped = (library || []).map((s) => ({
    ...s,
    updatedAt: s.updatedAt || Date.now(),
  }));
  writeJson(keysFor(userId).library, stamped);
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
    updatedAt: 0,
  });
}

export function setProgress(progress, userId = getSession()?.userId) {
  writeJson(keysFor(userId).progress, {
    ...(progress || {}),
    updatedAt: Date.now(),
  });
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
}

/** Copy guest data into a user account once (on first login if account empty) */
export function migrateGuestIntoUser(userId) {
  if (!userId) return;
  const userLib = getLibrary(userId);
  const guestLib = getLibrary(null);
  if ((!userLib || userLib.length === 0) && guestLib?.length) {
    // Write without double-scheduling: stamp + writeJson + one sync later
    writeJson(
      keysFor(userId).library,
      guestLib.map((s) => ({ ...s, updatedAt: s.updatedAt || Date.now() }))
    );
  }
  const userProg = getProgress(userId);
  const guestProg = getProgress(null);
  const userEmpty =
    !userProg.sessions && !userProg.minutes && !userProg.exercises && !(userProg.activity || []).length;
  if (userEmpty && (guestProg.sessions || guestProg.minutes || guestProg.exercises)) {
    writeJson(keysFor(userId).progress, { ...guestProg, updatedAt: Date.now() });
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
    const detail = data.detail;
    const msg =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || d).join(', ')
          : data.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

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

async function withColdStartRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    // Render free tier cold starts often fail the first request
    if (err.status && err.status < 500 && err.status !== 0) throw err;
    await sleep(2500);
    return fn();
  }
}

/** If this device had an offline account for the same email, fold its data into cloud user */
function absorbLocalAccountIntoCloud(email, cloudUserId) {
  const users = loadLocalUsers();
  const rec = users[email];
  if (!rec?.id) return;
  const offlineLib = getLibrary(rec.id);
  const offlineProg = getProgress(rec.id);
  const cloudLib = getLibrary(cloudUserId);
  const cloudProg = getProgress(cloudUserId);
  writeJson(keysFor(cloudUserId).library, mergeLibraries(cloudLib, offlineLib));
  writeJson(keysFor(cloudUserId).progress, mergeProgress(cloudProg, offlineProg));
  const offlineDraft = getDraft(rec.id);
  const cloudDraft = getDraft(cloudUserId);
  if (!cloudDraft.lyrics && offlineDraft.lyrics) setDraft(offlineDraft, cloudUserId);
}

/** Register — cloud required for multi-device (with cold-start retry) */
export async function registerAccount(email, password, name = '') {
  const clean = email.trim().toLowerCase();
  try {
    const data = await withColdStartRetry(() =>
      api('/api/auth/register', {
        method: 'POST',
        body: { email: clean, password, name: name.trim() },
      })
    );
    absorbLocalAccountIntoCloud(clean, data.user.id);
    return { ...data, source: 'cloud' };
  } catch (err) {
    if (err.status === 409) throw err;
    // Explicit offline fallback only after retries failed
    const users = loadLocalUsers();
    if (users[clean]) {
      throw new Error(
        'Cloud is unreachable and this email already has a device-only account here. Try again when online to sync across devices.'
      );
    }
    const { hash, salt } = await pbkdf2Hash(password);
    const id = `local_${Date.now().toString(36)}`;
    users[clean] = { id, email: clean, name: name.trim(), hash, salt };
    saveLocalUsers(users);
    return {
      token: makeLocalToken(id),
      user: { id, email: clean, name: name.trim() },
      source: 'local',
      warning:
        'Cloud unavailable — this account is on this device only. Sign in again later when online to enable phone ↔ laptop sync.',
    };
  }
}

/** Login — cloud first (retry), then device-local */
export async function loginAccount(email, password) {
  const clean = email.trim().toLowerCase();
  try {
    const data = await withColdStartRetry(() =>
      api('/api/auth/login', {
        method: 'POST',
        body: { email: clean, password },
      })
    );
    absorbLocalAccountIntoCloud(clean, data.user.id);
    return { ...data, source: 'cloud' };
  } catch (cloudErr) {
    if (cloudErr.status === 401) {
      // Wrong password on cloud — still try local (different offline account)
      const users = loadLocalUsers();
      const rec = users[clean];
      if (rec) {
        const { hash } = await pbkdf2Hash(password, rec.salt);
        if (hash === rec.hash) {
          return {
            token: makeLocalToken(rec.id),
            user: { id: rec.id, email: rec.email, name: rec.name || '' },
            source: 'local',
            warning: 'Signed in on this device only (cloud password differed or account is offline-only).',
          };
        }
      }
      throw new Error('Invalid email or password');
    }
    // Network / 5xx — try local
    const users = loadLocalUsers();
    const rec = users[clean];
    if (!rec) {
      throw new Error(
        cloudErr.message ||
          'Could not reach the cloud. Check your connection and try again.'
      );
    }
    const { hash } = await pbkdf2Hash(password, rec.salt);
    if (hash !== rec.hash) throw new Error('Invalid email or password');
    return {
      token: makeLocalToken(rec.id),
      user: { id: rec.id, email: rec.email, name: rec.name || '' },
      source: 'local',
      warning: 'Cloud unreachable — using this device’s offline account. Data will not sync to other devices until you sign in online.',
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

/** Last-write-wins merge per song id */
export function mergeLibraries(a = [], b = []) {
  const map = new Map();
  for (const song of [...(a || []), ...(b || [])]) {
    if (!song || song.id == null) continue;
    const id = String(song.id);
    const prev = map.get(id);
    if (!prev) {
      map.set(id, { ...song, updatedAt: song.updatedAt || 0 });
      continue;
    }
    const pt = Number(prev.updatedAt) || 0;
    const nt = Number(song.updatedAt) || 0;
    let winner;
    if (nt > pt) winner = song;
    else if (pt > nt) winner = prev;
    else {
      // Same timestamp: prefer longer lyrics (more complete edit)
      const pl = (prev.content || '').length;
      const nl = (song.content || '').length;
      winner = nl >= pl ? song : prev;
    }
    // Keep audio from either side if winner lacks it
    const audio =
      winner.audioData ||
      (winner === song ? prev.audioData : song.audioData) ||
      null;
    map.set(id, {
      ...winner,
      updatedAt: Math.max(pt, nt, Number(winner.updatedAt) || 0),
      audioData: audio,
    });
  }
  return [...map.values()].sort(
    (x, y) => (Number(y.updatedAt) || 0) - (Number(x.updatedAt) || 0)
  );
}

export function mergeProgress(a = {}, b = {}) {
  const at = Number(a.updatedAt) || 0;
  const bt = Number(b.updatedAt) || 0;
  // Prefer newer whole progress blob, but take max of counters
  const newer = bt >= at ? { ...a, ...b } : { ...b, ...a };
  return {
    ...newer,
    sessions: Math.max(Number(a.sessions) || 0, Number(b.sessions) || 0, Number(newer.sessions) || 0),
    minutes: Math.max(Number(a.minutes) || 0, Number(b.minutes) || 0, Number(newer.minutes) || 0),
    exercises: Math.max(Number(a.exercises) || 0, Number(b.exercises) || 0, Number(newer.exercises) || 0),
    bestHold: Math.max(Number(a.bestHold) || 0, Number(b.bestHold) || 0, Number(newer.bestHold) || 0),
    rangeLow:
      a.rangeLow != null && b.rangeLow != null
        ? Math.min(a.rangeLow, b.rangeLow)
        : a.rangeLow ?? b.rangeLow ?? null,
    rangeHigh:
      a.rangeHigh != null && b.rangeHigh != null
        ? Math.max(a.rangeHigh, b.rangeHigh)
        : a.rangeHigh ?? b.rangeHigh ?? null,
    activity: mergeActivity(a.activity, b.activity),
    updatedAt: Math.max(at, bt, Date.now()),
  };
}

function mergeActivity(a, b) {
  const list = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, 50);
}

function stripHeavyAudio(library) {
  return (library || []).map((s) => ({
    ...s,
    // Keep modest voice memos; drop huge ones from cloud payload
    audioData: s.audioData && s.audioData.length > 200_000 ? null : s.audioData,
  }));
}

let syncTimer = null;
let syncInFlight = null;

function scheduleCloudSync(userId) {
  const session = getSession();
  if (!session?.token || !userId || session.userId !== userId) return;
  if (!isCloudSession(session)) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncBidirectional().catch(() => {});
  }, 600);
}

/**
 * Pull remote → merge with local (LWW) → push merged result.
 * This prevents a laptop with stale data from overwriting a phone edit.
 */
export async function syncBidirectional() {
  const session = getSession();
  if (!session?.token) return { ok: false, reason: 'guest' };
  if (!isCloudSession(session)) return { ok: true, reason: 'local-only' };

  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const remote = await fetchCloudBundle(session.token);
      const localLib = getLibrary(session.userId);
      const localProg = getProgress(session.userId);
      const mergedLib = mergeLibraries(localLib, remote.library || []);
      const mergedProg = mergeProgress(localProg, remote.progress || {});

      writeJson(keysFor(session.userId).library, mergedLib);
      writeJson(keysFor(session.userId).progress, mergedProg);

      await pushCloudBundle(session.token, {
        library: stripHeavyAudio(mergedLib),
        progress: mergedProg,
      });

      window.dispatchEvent(new CustomEvent('se-user-data-changed', { detail: { source: 'sync' } }));
      return { ok: true, library: mergedLib, progress: mergedProg };
    } catch (err) {
      return { ok: false, error: err };
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/** @deprecated use syncBidirectional — kept for older imports */
export async function syncToCloud() {
  return syncBidirectional();
}

export async function pullFromCloud() {
  return syncBidirectional();
}

/** Immediate save of local library after edit, then bidirectional sync */
export async function saveLibraryAndSync(library, userId = getSession()?.userId) {
  const now = Date.now();
  const stamped = (library || []).map((s) => ({
    ...s,
    updatedAt: s.updatedAt && s.updatedAt > now - 1000 ? s.updatedAt : now,
  }));
  writeJson(keysFor(userId).library, stamped);
  // Force stamp the songs that were just written (caller should set updatedAt: Date.now() on edited song)
  const res = await syncBidirectional();
  return res;
}

export { API_BASE };
