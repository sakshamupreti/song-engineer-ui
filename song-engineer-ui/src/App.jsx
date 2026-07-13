import { useState, useEffect } from 'react';
import WriteStudio from './write/WriteStudio';
import SingStudio from './sing/SingStudio';
import { AuthProvider, useAuth } from './lib/AuthContext';
import AuthModal from './components/AuthModal';
import './App.css';
import './components/AuthModal.css';

const BrandMark = () => (
  <svg className="se-brand-mark" viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <ellipse cx="50" cy="50" rx="48" ry="18" transform="rotate(-60 50 50)" stroke="currentColor" strokeWidth="2" strokeOpacity="0.22" />
    <ellipse cx="50" cy="50" rx="48" ry="18" transform="rotate(60 50 50)" stroke="currentColor" strokeWidth="2" strokeOpacity="0.22" />
    <ellipse cx="50" cy="50" rx="48" ry="18" stroke="currentColor" strokeWidth="2" strokeOpacity="0.28" />
    <path
      className="se-brand-wave"
      d="M20,60 L35,30 L50,70 L65,40 L80,55"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function Landing({ onOpen }) {
  return (
    <div className="se-landing">
      <section className="se-hero">
        <div className="se-hero-eyebrow">All-in-one creative studio</div>
        <h1>
          Write the song.
          <br />
          <em>Sing it true.</em>
        </h1>
        <p>
          SongEngineer unites a professional lyric &amp; harmony workbench with a fully local vocal coach —
          so you can craft melodies, refine lyrics, and train your voice in one place.
        </p>
      </section>

      <div className="se-path-grid">
        <button type="button" className="se-path-card write" onClick={() => onOpen('write')}>
          <div className="se-path-icon">✎</div>
          <div className="tag">Songwriting</div>
          <h2>Write Studio</h2>
          <p>
            A syllable-aware lyrics IDE with harmony palette, progressions, rhyme &amp; imagery search,
            a craft-first metaphor &amp; simile engine, figures of speech, and a private song library —
            built for finishing better songs.
          </p>
          <ul className="se-feature-list">
            <li>Lyrics IDE</li>
            <li>Harmony</li>
            <li>Rhymes &amp; imagery</li>
            <li>Metaphors &amp; similes</li>
            <li>Craft prompts</li>
          </ul>
          <span className="se-path-cta">Open Write Studio →</span>
        </button>

        <button type="button" className="se-path-card sing" onClick={() => onOpen('sing')}>
          <div className="se-path-icon">♪</div>
          <div className="tag">Vocal training</div>
          <h2>Sing Studio</h2>
          <p>
            Real-time pitch, formants, support &amp; resonance coaching, structured exercises, tuner, range finder,
            and technique guides — all on-device, no cloud AI.
          </p>
          <ul className="se-feature-list">
            <li>Live coach</li>
            <li>Exercises</li>
            <li>Studio tools</li>
            <li>Progress</li>
            <li>Technique</li>
          </ul>
          <span className="se-path-cta">Open Sing Studio →</span>
        </button>
      </div>

      <div className="se-highlights">
        <div className="se-highlight">
          <strong>One creative flow</strong>
          <span>Draft chords and lyrics, then warm up and practice the vocal line without switching apps.</span>
        </div>
        <div className="se-highlight">
          <strong>Your data, your choice</strong>
          <span>
            Guests keep songs &amp; progress on this device. Sign in to save them to your account across devices.
          </span>
        </div>
        <div className="se-highlight">
          <strong>Built for musicians</strong>
          <span>Metronome, drone, chord playback, pitch targeting, and breath work sit alongside writing tools.</span>
        </div>
      </div>

      <p className="se-footer-note">SongEngineer · Write · Sing · Craft</p>
    </div>
  );
}

function AccountControl() {
  const {
    user,
    isLoggedIn,
    setAuthOpen,
    signOut,
    syncStatus,
    runSync,
    authWarning,
    lastSyncAt,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);

  if (!isLoggedIn) {
    return (
      <button type="button" className="se-account-btn" onClick={() => setAuthOpen(true)}>
        Sign in
      </button>
    );
  }

  const label = user.name || user.email?.split('@')[0] || 'Account';
  const statusLine =
    user.source === 'local' || syncStatus === 'local-only'
      ? 'this device only'
      : syncStatus === 'ok'
        ? 'cloud synced'
        : syncStatus === 'offline'
          ? 'offline cache'
          : syncStatus === 'syncing'
            ? 'syncing…'
            : '';

  return (
    <div className="se-account-wrap">
      <button
        type="button"
        className={`se-account-btn signed-in ${user.source === 'local' || syncStatus === 'local-only' ? 'warn' : ''}`}
        onClick={() => setMenuOpen((v) => !v)}
        title={user.email}
      >
        {label}
      </button>
      {menuOpen && (
        <div className="se-account-menu">
          <p>
            {user.email}
            {statusLine ? ` · ${statusLine}` : ''}
            {lastSyncAt && syncStatus === 'ok'
              ? ` · ${new Date(lastSyncAt).toLocaleTimeString()}`
              : ''}
          </p>
          {(authWarning || user.source === 'local' || syncStatus === 'local-only') && (
            <p className="se-account-warn">
              {authWarning ||
                'Device-only account — phone and laptop will not share songs until you sign in to the cloud.'}
            </p>
          )}
          {user.source !== 'local' && (
            <button
              type="button"
              disabled={syncingNow || syncStatus === 'syncing'}
              onClick={async () => {
                setSyncingNow(true);
                const res = await runSync();
                setSyncingNow(false);
                if (!res?.ok && res?.message) {
                  // status already shown in menu warning
                }
              }}
            >
              {syncingNow || syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}
            </button>
          )}
          {(syncStatus === 'offline' || user.source === 'local') && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                signOut();
                setAuthOpen(true);
              }}
            >
              Re-sign in to fix sync
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function AppShell() {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('songEngineer_mode') || 'home';
    } catch {
      return 'home';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('songEngineer_mode', mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const modeLabel =
    mode === 'write' ? 'Write Studio' : mode === 'sing' ? 'Sing Studio' : 'Home';

  return (
    <div className="se-app">
      <div className="se-ambient" aria-hidden="true">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
      </div>

      <header className="se-shell">
        <button type="button" className="se-brand" onClick={() => setMode('home')} title="Home">
          <BrandMark />
          <div className="se-brand-text">
            <strong>
              Song<span>Engineer</span>
            </strong>
            <small>Write · Sing · Craft</small>
          </div>
        </button>

        <nav className="se-modes" aria-label="Studio mode">
          <button
            type="button"
            className={`se-mode-btn ${mode === 'write' ? 'active-write' : ''}`}
            onClick={() => setMode('write')}
          >
            <span className="mode-icon">✎</span>
            Write
          </button>
          <button
            type="button"
            className={`se-mode-btn ${mode === 'sing' ? 'active-sing' : ''}`}
            onClick={() => setMode('sing')}
          >
            <span className="mode-icon">♪</span>
            Sing
          </button>
        </nav>

        <div className="se-shell-right se-shell-actions">
          <span className="se-pill">{modeLabel}</span>
          <AccountControl />
        </div>
      </header>

      <main className="se-stage">
        {mode === 'home' && <Landing onOpen={setMode} />}
        {mode === 'write' && <WriteStudio />}
        {mode === 'sing' && <SingStudio />}
      </main>

      <AuthModal />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
