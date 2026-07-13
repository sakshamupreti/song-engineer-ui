import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine, LocalRecorder, VOWEL_MAP } from './lib/audio-engine';
import { VocalCoach, TECHNIQUE_GUIDE } from './lib/coach';
import { EXERCISES, CATEGORY_LABELS, buildPattern } from './lib/exercises';
import { unifyVowelAnalysis } from './lib/vowel-fusion';
import { TanpuraEngine, TANPURA_KEYS, TANPURA_STYLES, noteFreq } from './lib/tanpura';
import { getProgress, setProgress as persistProgress } from '../lib/userStore';
import { useAuth } from '../lib/AuthContext';
import './SingStudio.css';

// Lazy vision helpers (MediaPipe is large — load only when camera is used)
let visionModulePromise = null;
function loadVisionModule() {
  if (!visionModulePromise) {
    visionModulePromise = import('./lib/vision-coach.js');
  }
  return visionModulePromise;
}

const defaultProgress = () => ({
  sessions: 0,
  minutes: 0,
  exercises: 0,
  bestHold: 0,
  rangeLow: null,
  rangeHigh: null,
  activity: [],
});

function loadProgress() {
  return { ...defaultProgress(), ...getProgress() };
}

function saveProgress(p) {
  persistProgress(p);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SingStudio() {
  const engineRef = useRef(null);
  const coachRef = useRef(null);
  const recorderRef = useRef(null);
  const metroRef = useRef(null);
  const smoothRef = useRef({
    note: '—',
    cents: 0,
    needle: 0,
    freq: 0,
    scores: { intonation: 0, support: 0, resonance: 0, volume: 0 },
    formantDot: { x: null, y: null },
    targetDot: { x: null, y: null },
  });

  const pitchCanvasRef = useRef(null);
  const formantCanvasRef = useRef(null);
  const spectrumCanvasRef = useRef(null);
  const visionVideoRef = useRef(null);
  const visionOverlayRef = useRef(null);
  const visionCoachRef = useRef(null);
  const visionFrameRef = useRef(null);
  const tanpuraRef = useRef(null);

  const [view, setView] = useState('live');
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [visionStatus, setVisionStatus] = useState('Camera off');
  const [toast, setToast] = useState(null);
  const [display, setDisplay] = useState({
    note: '—',
    freq: '0 Hz',
    cents: '±0 ¢',
    centsColor: 'var(--sg-muted)',
    f1: '—',
    f2: '—',
    centroid: '—',
    vowel: '—',
    vowelIsMod: false,
    vowelConf: null,
    vowelLine: 'Sing Ee · AA · Ah · Oh · Oo — formants + camera unify as you rise in pitch',
    tips: [
      {
        id: 'intro',
        kind: 'muted',
        text: 'Enable the microphone for pitch & formants. Optionally enable the camera so mouth shape fuses with the vowel map — all on-device.',
      },
    ],
    scores: { intonation: 0, support: 0, resonance: 0, volume: 0 },
    tunerNote: '—',
    tunerCents: '0 ¢',
    needlePct: 50,
    postureLine: '',
    mod: null,
  });

  const [targetLock, setTargetLock] = useState(false);
  const [targetMidi, setTargetMidi] = useState(69);
  const [vizMode, setVizMode] = useState('spectrum');
  const [exerciseFilter, setExerciseFilter] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseReps, setExerciseReps] = useState(0);

  const [bpm, setBpm] = useState(80);
  const [metroOn, setMetroOn] = useState(false);
  const [metroSubdiv, setMetroSubdiv] = useState(1);
  const [metroBeat, setMetroBeat] = useState(0);

  const [rangeScanning, setRangeScanning] = useState(false);
  const [rangeLow, setRangeLow] = useState(null);
  const [rangeHigh, setRangeHigh] = useState(null);

  const [drillNote, setDrillNote] = useState(69);
  const [drillActive, setDrillActive] = useState(false);
  const [drillScore, setDrillScore] = useState(0);
  const drillRef = useRef({ endsAt: 0, hits: 0, total: 0 });

  const [breathRunning, setBreathRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState('Ready');
  const [breathCount, setBreathCount] = useState('—');
  const [breathIn, setBreathIn] = useState(4);
  const [breathHold, setBreathHold] = useState(4);
  const [breathOut, setBreathOut] = useState(8);
  const breathTimerRef = useRef(null);

  const [recState, setRecState] = useState({ recording: false, url: null, label: 'Idle', time: '0:00' });
  const recTimerRef = useRef(null);

  const { user, isLoggedIn } = useAuth();
  const [progress, setProgress] = useState(loadProgress);
  const sessionStartedRef = useRef(null);
  const lastTipKeyRef = useRef('');
  const lastTipsAtRef = useRef(0);

  useEffect(() => {
    setProgress(loadProgress());
  }, [user?.id]);

  useEffect(() => {
    const onData = () => setProgress(loadProgress());
    window.addEventListener('se-user-data-changed', onData);
    return () => window.removeEventListener('se-user-data-changed', onData);
  }, []);

  // Tanpura / drone practice
  const [tanpuraOn, setTanpuraOn] = useState(false);
  const [tanpuraLoading, setTanpuraLoading] = useState(false);
  const [tanpuraKey, setTanpuraKey] = useState('C');
  const [tanpuraOct, setTanpuraOct] = useState(3);
  const [tanpuraStyle, setTanpuraStyle] = useState('classic');
  const [tanpuraPace, setTanpuraPace] = useState(42);
  const [tanpuraVol, setTanpuraVol] = useState(0.42);
  const [tanpuraBright, setTanpuraBright] = useState(0.32);
  const [tanpuraJivari, setTanpuraJivari] = useState(0.22);
  const [tanpuraRoom, setTanpuraRoom] = useState(0.4);

  const notes = useMemo(() => {
    const eng = new AudioEngine();
    return eng.allNotes(48, 84);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const persistProgress = useCallback((updater) => {
    setProgress((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveProgress(next);
      return next;
    });
  }, []);

  const logActivity = useCallback(
    (text) => {
      persistProgress((p) => ({
        ...p,
        activity: [{ text, t: Date.now() }, ...(p.activity || [])].slice(0, 40),
      }));
    },
    [persistProgress]
  );

  // Init engines once
  useEffect(() => {
    engineRef.current = new AudioEngine();
    coachRef.current = new VocalCoach();
    recorderRef.current = new LocalRecorder();
    tanpuraRef.current = new TanpuraEngine();
    metroRef.current = engineRef.current.createMetronome();
    metroRef.current.onBeat = (beat) => setMetroBeat(beat);

    return () => {
      if (sessionStartedRef.current) {
        const mins = (Date.now() - sessionStartedRef.current) / 60000;
        const p = loadProgress();
        p.minutes += mins;
        p.activity = [{ text: `Session ended · ${mins.toFixed(1)} min`, t: Date.now() }, ...(p.activity || [])].slice(0, 40);
        saveProgress(p);
      }
      engineRef.current?.stop();
      metroRef.current?.stop();
      visionCoachRef.current?.stop();
      tanpuraRef.current?.dispose();
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    };
  }, []);

  // Keep tanpura engine in sync with UI
  useEffect(() => {
    const t = tanpuraRef.current;
    if (!t) return;
    t.setRoot(tanpuraKey);
    t.setOctave(tanpuraOct);
    t.setStyle(tanpuraStyle);
    t.setPace(tanpuraPace);
    t.setVolume(tanpuraVol);
    t.setBrightness(tanpuraBright);
    t.setJivari(tanpuraJivari);
    t.setRoom(tanpuraRoom);
  }, [tanpuraKey, tanpuraOct, tanpuraStyle, tanpuraPace, tanpuraVol, tanpuraBright, tanpuraJivari, tanpuraRoom]);

  // Analysis subscription
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const unsub = engine.onAnalysis((frame) => {
      const s = smoothRef.current;

      if (frame.note && frame.isVoiced) {
        s.note = frame.note.label;
        s.freq = frame.pitch;
        const targetCents = frame.note.centsSmooth != null ? frame.note.centsSmooth : frame.note.cents;
        s.needle = lerp(s.needle, targetCents, 0.2);
        s.cents = Math.round(s.needle);
      } else {
        s.needle = lerp(s.needle, 0, 0.12);
        s.cents = Math.round(s.needle);
      }

      // Unify formants + camera + pitch-aware modification
      const vision = visionFrameRef.current;
      const unified = unifyVowelAnalysis({
        audioVowel: frame.vowel,
        formants: frame.formants,
        pitchHz: frame.pitch,
        vision,
        isVoiced: !!frame.isVoiced,
      });
      const fusedVowel = unified.vowel;
      const mod = unified.modification;
      // Drive map with fused display formants (camera-aligned when camera leads)
      const mapFormants = unified.formantDot
        ? {
            f1: unified.formantDot.f1,
            f2: unified.formantDot.f2,
            confidence: fusedVowel?.confidence ?? frame.formants?.confidence,
            measuredF1: unified.formantDot.measuredF1 ?? frame.formants?.f1,
            measuredF2: unified.formantDot.measuredF2 ?? frame.formants?.f2,
          }
        : frame.formants;
      const analysisFrame = {
        ...frame,
        vowel: fusedVowel || frame.vowel,
        modification: mod,
        formants: mapFormants || frame.formants,
      };

      const coach = coachRef.current.analyze(analysisFrame, {
        targetMidi: targetLock ? targetMidi : null,
        vision,
        modification: mod,
      });

      for (const k of ['intonation', 'support', 'resonance', 'volume']) {
        s.scores[k] = lerp(s.scores[k], coach.scores[k] || 0, 0.15);
      }

      let tips = coach.tips;
      const tipKey = tips.map((t) => t.id + t.kind).join('|');
      const now = performance.now();
      if (tipKey !== lastTipKeyRef.current && now - lastTipsAtRef.current > 450) {
        lastTipKeyRef.current = tipKey;
        lastTipsAtRef.current = now;
      } else {
        tips = null;
      }

      const c = s.cents;
      const centsColor =
        Math.abs(c) <= 10 ? 'var(--sg-success)' : Math.abs(c) <= 25 ? 'var(--sg-gold)' : 'var(--sg-rose)';

      let vowelLine = display.vowelLine;
      let vowel = display.vowel;
      let vowelIsMod = display.vowelIsMod;
      let vowelConf = display.vowelConf;
      // Always keep formant badge in sync with fused/camera vowel when present
      if (fusedVowel && (!fusedVowel.stale || fusedVowel.source === 'vision')) {
        const v = fusedVowel;
        vowel = `${v.label} [${v.ipa}]`;
        vowelIsMod = !!v.isMod;
        vowelConf = v.confidence != null ? Math.round(v.confidence * 100) : null;
        vowelLine = v.coachLine || vowelLine;
      } else if (vision?.visualVowel?.id && vision.facePresent) {
        // Hard fallback: camera coach label if fusion didn't return
        const id = vision.visualVowel.id;
        vowel = id.length <= 3 ? id.toUpperCase() : id;
        vowelLine = `Camera: ${id}`;
      }

      // Compact fixed posture status (always a string to avoid layout jump)
      let postureLine = '—';
      if (vision?.facePresent) {
        const parts = [];
        parts.push(vision.posture?.shoulderRaise > 0.5 ? 'shoulders high' : 'shoulders soft');
        parts.push(vision.posture?.chinForward > 0.45 ? 'chin forward' : 'head stacked');
        if (vision.visualVowel?.id) parts.push(vision.visualVowel.id);
        postureLine = parts.join(' · ');
      } else if (cameraOn) {
        postureLine = 'Looking for face…';
      }

      // Smooth mod bar for UI
      if (!s.modPitch) s.modPitch = 0;
      if (!s.modShape) s.modShape = 0;
      if (!s.modCombined) s.modCombined = 0;
      if (mod) {
        s.modPitch = lerp(s.modPitch, (mod.pitchProgress || 0) * 100, 0.12);
        s.modShape = lerp(s.modShape, (mod.shapeProgress || 0) * 100, 0.12);
        s.modCombined = lerp(s.modCombined, (mod.combinedProgress || 0) * 100, 0.12);
      } else {
        s.modPitch = lerp(s.modPitch, 0, 0.1);
        s.modShape = lerp(s.modShape, 0, 0.1);
        s.modCombined = lerp(s.modCombined, 0, 0.1);
      }

      const modUi = mod
        ? {
            ...mod,
            pitchPct: Math.round(s.modPitch),
            shapePct: Math.round(s.modShape),
            combinedPct: Math.round(s.modCombined),
          }
        : null;

      setDisplay((prev) => ({
        ...prev,
        note: s.note,
        freq: s.freq > 0 ? `${s.freq.toFixed(1)} Hz` : prev.freq,
        cents: `${c >= 0 ? '+' : ''}${c} ¢`,
        centsColor,
        f1: mapFormants?.f1
          ? `${Math.round(mapFormants.f1)} Hz`
          : frame.formants?.f1
            ? `${Math.round(frame.formants.f1)} Hz`
            : prev.f1,
        f2: mapFormants?.f2
          ? `${Math.round(mapFormants.f2)} Hz`
          : frame.formants?.f2
            ? `${Math.round(frame.formants.f2)} Hz`
            : prev.f2,
        centroid: frame.centroid ? `${Math.round(frame.centroid)} Hz` : prev.centroid,
        vowel,
        vowelIsMod,
        vowelConf,
        vowelLine,
        postureLine,
        mod: modUi,
        tips: tips || prev.tips,
        scores: {
          intonation: Math.round(s.scores.intonation),
          support: Math.round(s.scores.support),
          resonance: Math.round(s.scores.resonance),
          volume: Math.round(s.scores.volume),
        },
        tunerNote: frame.note && frame.isVoiced ? frame.note.label : prev.tunerNote,
        tunerCents: `${c >= 0 ? '+' : ''}${c} ¢`,
        needlePct: 50 + Math.max(-50, Math.min(50, s.needle)),
      }));

      if (engine.rangeScanning) {
        setRangeLow(engine.rangeLow);
        setRangeHigh(engine.rangeHigh);
      }

      // Pitch hold drill
      if (drillRef.current.endsAt > 0) {
        const d = drillRef.current;
        if (performance.now() < d.endsAt) {
          d.total += 1;
          if (frame.note && frame.isVoiced) {
            const targetFreq = 440 * Math.pow(2, (drillNote - 69) / 12);
            const cents = 1200 * Math.log2(frame.pitch / targetFreq);
            if (Math.abs(cents) < 25 && (frame.support || 0) > 40) d.hits += 1;
          }
          setDrillScore(d.total ? Math.round((d.hits / d.total) * 100) : 0);
        } else if (drillRef.current.endsAt > 0) {
          const score = d.total ? Math.round((d.hits / d.total) * 100) : 0;
          drillRef.current.endsAt = 0;
          setDrillActive(false);
          setDrillScore(score);
          persistProgress((p) => ({
            ...p,
            bestHold: Math.max(p.bestHold || 0, score),
          }));
          logActivity(`Pitch hold score: ${score}%`);
          showToast(`Hold score: ${score}%`);
        }
      }

      drawPitch(frame, s.needle);
      drawFormants(analysisFrame, s, mod, fusedVowel);
      drawSpectrum(frame);
    });

    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLock, targetMidi, drillNote, vizMode]);



  const drawPitch = (frame, needleCents) => {
    const canvas = pitchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.82, h * 0.55, Math.PI, 0);
    ctx.stroke();

    const zones = [
      { from: -50, to: -25, color: 'rgba(196,120,122,0.35)' },
      { from: -25, to: -10, color: 'rgba(224,176,122,0.35)' },
      { from: -10, to: 10, color: 'rgba(109,179,168,0.45)' },
      { from: 10, to: 25, color: 'rgba(224,176,122,0.35)' },
      { from: 25, to: 50, color: 'rgba(196,120,122,0.35)' },
    ];
    for (const z of zones) {
      const a0 = Math.PI + ((z.from + 50) / 100) * Math.PI;
      const a1 = Math.PI + ((z.to + 50) / 100) * Math.PI;
      ctx.strokeStyle = z.color;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.82, h * 0.55, a0, a1);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(168,162,154,0.7)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('−50¢', w * 0.12, h * 0.9);
    ctx.fillText('in tune', w / 2, h * 0.42);
    ctx.fillText('+50¢', w * 0.88, h * 0.9);

    const cents = Math.max(-50, Math.min(50, needleCents));
    const ang = Math.PI + ((cents + 50) / 100) * Math.PI;
    const radius = h * 0.55;
    const nx = w / 2 + Math.cos(ang) * radius;
    const ny = h * 0.82 + Math.sin(ang) * radius;
    const active = frame.isVoiced && frame.note;

    const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, 36);
    glow.addColorStop(0, active ? 'rgba(109,179,168,0.4)' : 'rgba(232,196,154,0.12)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(nx, ny, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = active ? 'rgba(240,235,227,0.9)' : 'rgba(240,235,227,0.28)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.82);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    ctx.fillStyle = active ? '#6db3a8' : 'rgba(224,176,122,0.5)';
    ctx.beginPath();
    ctx.arc(nx, ny, 7, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawFormants = (frame, s, mod = null, fusedVowel = null) => {
    const canvas = formantCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, w, h);

    // Axes: F2 horizontal (high→low left→right classic), F1 vertical (low top → high bottom)
    const f2Min = 600;
    const f2Max = 2800;
    const f1Min = 200;
    const f1Max = 1000;

    const toX = (f2) => ((f2Max - f2) / (f2Max - f2Min)) * (w - 40) + 20;
    const toY = (f1) => ((f1 - f1Min) / (f1Max - f1Min)) * (h - 40) + 20;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const x = 20 + ((w - 40) * i) / 4;
      const y = 20 + ((h - 40) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, h - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    }

    // Vowel anchors (primaries + key mods)
    const anchors = VOWEL_MAP.filter((v) => v.primary || ['ih', 'eh', 'aw', 'uh', 'uu'].includes(v.id));
    const targetId = mod?.to?.id;
    const activeId = fusedVowel?.id || frame.vowel?.id;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (const a of anchors) {
      const x = toX(a.f2);
      const y = toY(a.f1);
      const isTarget = targetId && a.id === targetId;
      const isActive = activeId === a.id;
      ctx.strokeStyle = isActive
        ? 'rgba(255,107,107,0.9)'
        : isTarget
          ? 'rgba(109,179,168,0.75)'
          : a.primary
            ? 'rgba(224,176,122,0.22)'
            : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = isTarget || isActive ? 2.5 : 1;
      ctx.beginPath();
      ctx.arc(x, y, isActive ? 18 : a.primary || isTarget ? 16 : 11, 0, Math.PI * 2);
      ctx.stroke();
      if (isActive) {
        ctx.fillStyle = 'rgba(255,75,75,0.12)';
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = isActive
        ? 'rgba(255,180,160,0.98)'
        : isTarget
          ? 'rgba(109,179,168,0.95)'
          : a.primary
            ? 'rgba(242,239,233,0.7)'
            : 'rgba(168,162,154,0.45)';
      ctx.fillText(a.label, x, y + 4);
    }

    // Path line from current formant center toward mod target
    if (mod?.from?.f1 && mod?.to?.f1) {
      const x0 = toX(mod.from.f2);
      const y0 = toY(mod.from.f1);
      const x1 = toX(mod.to.f2);
      const y1 = toY(mod.to.f1);
      ctx.strokeStyle = 'rgba(109,179,168,0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target ghost
      if (s.targetDot) {
        s.targetDot.x = lerp(s.targetDot.x ?? x1, x1, 0.2);
        s.targetDot.y = lerp(s.targetDot.y ?? y1, y1, 0.2);
      }
      const tdx = s.targetDot?.x ?? x1;
      const tdy = s.targetDot?.y ?? y1;
      ctx.strokeStyle = 'rgba(109,179,168,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tdx, tdy, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = 'rgba(107,101,96,0.9)';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('← F2 (front)', w / 2, h - 6);
    ctx.save();
    ctx.translate(10, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('F1 (open) →', 0, 0);
    ctx.restore();

    // Map position: use blended formants (follow camera vowel) when available
    const f1 = frame.formants?.f1;
    const f2 = frame.formants?.f2;
    const showDot = f1 && f2 && (frame.isVoiced || fusedVowel?.source === 'vision' || fusedVowel?.displayLead === 'camera');
    if (showDot) {
      const tx = toX(f2);
      const ty = toY(f1);
      const conf = frame.formants.confidence ?? frame.formantConfidence ?? fusedVowel?.confidence ?? 0.5;
      // Snappier when camera leads so the map tracks mouth changes
      const alpha = fusedVowel?.displayLead === 'camera' || fusedVowel?.source === 'vision'
        ? 0.22
        : 0.08 + conf * 0.12;
      if (s.formantDot.x == null) {
        s.formantDot.x = tx;
        s.formantDot.y = ty;
      } else {
        s.formantDot.x = lerp(s.formantDot.x, tx, alpha);
        s.formantDot.y = lerp(s.formantDot.y, ty, alpha);
      }
      const gx = s.formantDot.x;
      const gy = s.formantDot.y;
      const radius = 16 + conf * 10;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
      g.addColorStop(0, `rgba(255,75,75,${0.35 + conf * 0.35})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx, gy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = conf > 0.5 ? '#ff6b6b' : 'rgba(255,140,120,0.75)';
      ctx.beginPath();
      ctx.arc(gx, gy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawVisionOverlay = (vf) => {
    const canvas = visionOverlayRef.current;
    const video = visionVideoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Mirror-friendly: draw cues only (video element is CSS-mirrored)
    if (vf.poseLandmarks) {
      const ls = vf.poseLandmarks[11];
      const rs = vf.poseLandmarks[12];
      if (ls && rs) {
        ctx.strokeStyle =
          Math.abs(vf.posture.shoulderTilt) > 0.12 || vf.posture.shoulderRaise > 0.55
            ? 'rgba(255,100,100,0.85)'
            : 'rgba(109,179,168,0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ls.x * w, ls.y * h);
        ctx.lineTo(rs.x * w, rs.y * h);
        ctx.stroke();
        for (const p of [ls, rs]) {
          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Mouth openness bar
    if (vf.facePresent && vf.mouth) {
      const open = vf.mouth.jawOpen;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(10, h - 28, 90, 16);
      ctx.fillStyle = 'rgba(224,176,122,0.9)';
      ctx.fillRect(12, h - 26, 86 * Math.min(1, open), 12);
      ctx.fillStyle = 'rgba(242,239,233,0.85)';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Jaw', 12, h - 32);
      if (vf.visualVowel?.id) {
        ctx.fillText(`~${vf.visualVowel.id}`, 55, h - 32);
      }
    }
  };

  const toggleCamera = async () => {
    const video = visionVideoRef.current;
    if (!video) return;

    if (cameraOn) {
      visionCoachRef.current?.stop();
      visionFrameRef.current = null;
      setCameraOn(false);
      setVisionStatus('Camera off');
      showToast('Camera off');
      return;
    }

    setCameraLoading(true);
    setVisionStatus('Loading models…');
    try {
      const mod = await loadVisionModule();
      if (!visionCoachRef.current) {
        visionCoachRef.current = new mod.VisionCoach();
      }

      const unsub = visionCoachRef.current.onFrame((vf) => {
        visionFrameRef.current = vf;
        drawVisionOverlay(vf);
        if (vf.facePresent) {
          setVisionStatus(vf.posePresent ? 'Face + posture' : 'Face locked');
        } else {
          setVisionStatus('Looking for face…');
        }
      });
      visionCoachRef.current._unsubUi = unsub;

      await visionCoachRef.current.start(video);
      setCameraOn(true);
      setVisionStatus('Tracking…');
      logActivity('Camera coach enabled');
      showToast('Camera on — mouth & posture coaching local');
    } catch (err) {
      console.error(err);
      setCameraOn(false);
      setVisionStatus('Camera unavailable');
      showToast('Camera permission denied or models failed to load');
    } finally {
      setCameraLoading(false);
    }
  };

  const drawSpectrum = (frame) => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, w, h);

    if (vizMode === 'waveform' && frame.waveform) {
      const data = frame.waveform;
      const step = Math.max(1, Math.floor(data.length / w));
      ctx.strokeStyle = 'rgba(109,179,168,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const v = data[x * step] || 0;
        const y = h / 2 + v * (h * 0.45);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      return;
    }

    if (frame.spectrum) {
      const data = frame.spectrum;
      const bars = Math.min(w, data.length);
      const barW = w / bars;
      for (let i = 0; i < bars; i++) {
        const v = data[i] / 255;
        const bh = v * (h - 8);
        const hue = 10 + v * 40;
        ctx.fillStyle = `hsla(${hue}, 80%, ${45 + v * 25}%, ${0.35 + v * 0.55})`;
        ctx.fillRect(i * barW, h - bh, Math.max(1, barW - 0.5), bh);
      }
    }
  };

  const toggleMic = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    if (micOn) {
      if (sessionStartedRef.current) {
        const mins = (Date.now() - sessionStartedRef.current) / 60000;
        persistProgress((p) => ({ ...p, minutes: p.minutes + mins }));
        logActivity(`Session ended · ${mins.toFixed(1)} min`);
        sessionStartedRef.current = null;
      }
      engine.stop();
      setMicOn(false);
      showToast('Microphone off');
      return;
    }

    try {
      await engine.start();
      setMicOn(true);
      sessionStartedRef.current = Date.now();
      persistProgress((p) => ({ ...p, sessions: (p.sessions || 0) + 1 }));
      logActivity('Started practice session');
      showToast('Mic live — analysis is fully on-device');
    } catch (err) {
      console.error(err);
      showToast('Microphone permission denied or unavailable');
    }
  };

  const playRefTone = () => {
    engineRef.current?.playTone(440, 1.4);
  };

  const toggleMetro = () => {
    const m = metroRef.current;
    if (!m) return;
    if (metroOn) {
      m.stop();
      setMetroOn(false);
    } else {
      m.setBpm(bpm);
      m.setSubdiv(metroSubdiv);
      m.start();
      setMetroOn(true);
    }
  };

  useEffect(() => {
    if (metroRef.current) {
      metroRef.current.setBpm(bpm);
      metroRef.current.setSubdiv(metroSubdiv);
    }
  }, [bpm, metroSubdiv]);

  const toggleRange = () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (rangeScanning) {
      engine.rangeScanning = false;
      setRangeScanning(false);
      if (engine.rangeLow && engine.rangeHigh) {
        persistProgress((p) => ({
          ...p,
          rangeLow: engine.rangeLow,
          rangeHigh: engine.rangeHigh,
        }));
        logActivity('Range scan saved');
        showToast('Range saved');
      }
    } else {
      if (!micOn) {
        showToast('Enable the mic first');
        return;
      }
      engine.rangeLow = null;
      engine.rangeHigh = null;
      engine.rangeScanning = true;
      setRangeLow(null);
      setRangeHigh(null);
      setRangeScanning(true);
      showToast('Scanning range — siren gently');
    }
  };

  const resetRange = () => {
    const engine = engineRef.current;
    if (engine) {
      engine.rangeLow = null;
      engine.rangeHigh = null;
      engine.rangeScanning = false;
    }
    setRangeLow(null);
    setRangeHigh(null);
    setRangeScanning(false);
  };

  const startDrill = () => {
    if (!micOn) {
      showToast('Enable the mic first');
      return;
    }
    drillRef.current = { endsAt: performance.now() + 10000, hits: 0, total: 0 };
    setDrillActive(true);
    setDrillScore(0);
    engineRef.current?.playTone(engineRef.current.midiToFreq(drillNote), 0.8);
    showToast('Hold the target for 10 seconds');
  };

  const toggleBreath = () => {
    if (breathRunning) {
      clearInterval(breathTimerRef.current);
      breathTimerRef.current = null;
      setBreathRunning(false);
      setBreathPhase('Ready');
      setBreathCount('—');
      return;
    }

    const phases = [
      { name: 'Inhale', dur: breathIn },
      { name: 'Hold', dur: breathHold },
      { name: 'Exhale', dur: breathOut },
    ];
    let pi = 0;
    let left = phases[0].dur;
    setBreathRunning(true);
    setBreathPhase(phases[0].name);
    setBreathCount(String(left));

    breathTimerRef.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        pi = (pi + 1) % phases.length;
        left = phases[pi].dur;
        if (phases[pi].dur === 0) {
          pi = (pi + 1) % phases.length;
          left = phases[pi].dur;
        }
        setBreathPhase(phases[pi].name);
      }
      setBreathCount(String(left));
    }, 1000);
  };

  const toggleRec = async () => {
    const engine = engineRef.current;
    const rec = recorderRef.current;
    if (!engine || !rec) return;

    if (recState.recording) {
      clearInterval(recTimerRef.current);
      const url = await rec.stop();
      setRecState({ recording: false, url, label: 'Ready', time: '0:00' });
      showToast('Recording saved locally');
      return;
    }

    if (!engine.stream) {
      showToast('Enable the mic first');
      return;
    }

    await rec.start(engine.stream);
    const start = Date.now();
    recTimerRef.current = setInterval(() => {
      setRecState((s) => ({ ...s, time: formatTime((Date.now() - start) / 1000) }));
    }, 250);
    setRecState({ recording: true, url: null, label: 'Recording', time: '0:00' });
  };

  const playExercise = (ex) => {
    const engine = engineRef.current;
    if (!engine || !ex) return;
    const midis = buildPattern(ex.pattern, ex.rootMidi || 60);
    const freqs = midis.map((m) => engine.midiToFreq(m));
    engine.playSequence(freqs, 0.32, 0.04);
  };

  const completeExercise = (ex) => {
    setExerciseReps((r) => r + 1);
    persistProgress((p) => ({ ...p, exercises: (p.exercises || 0) + 1 }));
    logActivity(`Completed: ${ex.title}`);
    showToast('Exercise logged');
  };

  const filteredExercises = EXERCISES.filter(
    (e) => exerciseFilter === 'all' || e.category === exerciseFilter
  );

  const noteLabel = (freq) => {
    if (!freq) return '—';
    return engineRef.current?.freqToNote(freq)?.label || '—';
  };

  const rangeLabel = () => {
    const lo = rangeLow || progress.rangeLow;
    const hi = rangeHigh || progress.rangeHigh;
    if (!lo || !hi) return '—';
    return `${noteLabel(lo)} → ${noteLabel(hi)}`;
  };

  const toggleTanpura = async () => {
    const t = tanpuraRef.current;
    if (!t) return;
    if (tanpuraOn) {
      t.stop();
      setTanpuraOn(false);
      showToast('Tanpura stopped');
      return;
    }
    setTanpuraLoading(true);
    try {
      t.setRoot(tanpuraKey);
      t.setOctave(tanpuraOct);
      t.setStyle(tanpuraStyle);
      t.setPace(tanpuraPace);
      t.setVolume(tanpuraVol);
      t.setBrightness(tanpuraBright);
      t.setJivari(tanpuraJivari);
      t.setRoom(tanpuraRoom);
      await t.start();
      setTanpuraOn(true);
      logActivity(`Tanpura · Sa = ${tanpuraKey}`);
      showToast(t.sampleMode ? `Acoustic tanpura · ${tanpuraKey}` : `Tanpura · ${tanpuraKey}`);
    } catch (err) {
      console.error(err);
      showToast('Could not start audio — check permissions');
    } finally {
      setTanpuraLoading(false);
    }
  };

  const tanpuraStrings = useMemo(() => {
    const sa = noteFreq(tanpuraKey, tanpuraOct);
    const style = TANPURA_STYLES[tanpuraStyle] || TANPURA_STYLES.classic;
    return style.intervals.map((semi, i) => ({
      label: style.labels[i],
      freq: sa * Math.pow(2, semi / 12),
    }));
  }, [tanpuraKey, tanpuraOct, tanpuraStyle]);

  const navItems = [
    { id: 'live', label: 'Live Coach', short: 'Live', icon: '◎' },
    { id: 'tanpura', label: 'Tanpura', short: 'Drone', icon: 'ॐ' },
    { id: 'exercises', label: 'Exercises', short: 'Drill', icon: '♮' },
    { id: 'tools', label: 'Studio Tools', short: 'Tools', icon: '⌘' },
    { id: 'progress', label: 'Progress', short: 'Stats', icon: '◇' },
    { id: 'guide', label: 'Technique', short: 'Guide', icon: '✦' },
  ];

  return (
    <div className="sing-studio">
      <aside className="sg-sidebar">
        <div className="sg-sidebar-head">
          <span className="mode-chip sing-chip">Sing</span>
          <div>
            <h2>Vocal Coach</h2>
            <p>Local · Offline · No AI</p>
          </div>
        </div>

        <nav className="sg-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sg-nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => setView(item.id)}
              title={item.label}
            >
              <span className="sg-nav-icon">{item.icon}</span>
              <span className="sg-nav-label">{item.label}</span>
              <span className="sg-nav-short">{item.short}</span>
            </button>
          ))}
        </nav>

        <div className="sg-sidebar-foot">
          <div className={`sg-mic-status ${micOn ? 'live' : ''}`}>
            <span className="dot" />
            <span>{micOn ? 'Listening' : 'Mic off'}</span>
          </div>
          <div className={`sg-mic-status ${cameraOn ? 'live cam' : ''}`}>
            <span className="dot" />
            <span>{cameraLoading ? 'Loading…' : visionStatus}</span>
          </div>
          <button type="button" className={`sg-btn sg-btn-primary ${micOn ? 'danger' : ''}`} onClick={toggleMic}>
            {micOn ? 'Stop Microphone' : 'Enable Microphone'}
          </button>
          <button
            type="button"
            className={`sg-btn sg-btn-ghost ${cameraOn ? 'sg-btn-cam-on' : ''}`}
            onClick={toggleCamera}
            disabled={cameraLoading}
          >
            {cameraLoading ? 'Loading camera…' : cameraOn ? 'Stop Camera' : 'Enable Camera Coach'}
          </button>
        </div>
      </aside>

      <div className="sg-main">
        <div className="sg-mobile-micbar" aria-label="Microphone and camera">
          <div className="sg-mobile-micbar-status">
            <span className={`sg-mic-status ${micOn ? 'live' : ''}`}>
              <span className="dot" />
              <span>{micOn ? 'Live' : 'Mic off'}</span>
            </span>
            <span className={`sg-mic-status ${cameraOn ? 'live cam' : ''}`}>
              <span className="dot" />
              <span>{cameraLoading ? '…' : cameraOn ? 'Cam' : 'Cam off'}</span>
            </span>
          </div>
          <div className="sg-mobile-micbar-actions">
            <button
              type="button"
              className={`sg-btn sg-btn-primary sg-btn-compact ${micOn ? 'danger' : ''}`}
              onClick={toggleMic}
            >
              {micOn ? 'Stop mic' : 'Mic'}
            </button>
            <button
              type="button"
              className={`sg-btn sg-btn-ghost sg-btn-compact ${cameraOn ? 'sg-btn-cam-on' : ''}`}
              onClick={toggleCamera}
              disabled={cameraLoading}
            >
              {cameraLoading ? '…' : cameraOn ? 'Stop cam' : 'Camera'}
            </button>
          </div>
        </div>
        {view === 'live' && (
          <section className="sg-view sg-view-live">
            <header className="sg-view-header sg-view-header-compact">
              <div>
                <p className="sg-eyebrow">Real-time analysis</p>
                <h3>Live Vocal Coach</h3>
              </div>
              <div className="sg-header-actions">
                <label className="sg-toggle">
                  <input
                    type="checkbox"
                    checked={targetLock}
                    onChange={(e) => setTargetLock(e.target.checked)}
                  />
                  <span>Lock target</span>
                </label>
                <select
                  className="sg-select"
                  value={targetMidi}
                  disabled={!targetLock}
                  onChange={(e) => setTargetMidi(Number(e.target.value))}
                >
                  {notes.map((n) => (
                    <option key={n.midi} value={n.midi}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
            </header>

            <div className="sg-live-layout">
              <div className="sg-live-primary">
                <div className="sg-card sg-hero">
                  {/* Note + cents above the gauge so the dial stays visible on phones */}
                  <div className="sg-pitch-head">
                    <div className="sg-note-big">{display.note}</div>
                    <div className="sg-freq-row">
                      <span>{display.freq}</span>
                      <span className="sep">·</span>
                      <span style={{ color: display.centsColor }}>{display.cents}</span>
                    </div>
                    <div className={`sg-target-row ${targetLock ? 'visible' : 'hidden'}`}>
                      {targetLock
                        ? <>Target <strong>{notes.find((n) => n.midi === targetMidi)?.label || '—'}</strong></>
                        : '\u00A0'}
                    </div>
                    <div className="sg-live-tuner-bar" aria-label="Intonation tuner">
                      <div className="sg-tuner-track sg-tuner-track-live">
                        <div className="sg-tuner-center" />
                        <div
                          className="sg-tuner-needle"
                          style={{ left: `${display.needlePct ?? 50}%` }}
                        />
                      </div>
                      <div className="sg-live-tuner-labels">
                        <span>−50¢</span>
                        <span className="sg-live-tuner-mid">in tune</span>
                        <span>+50¢</span>
                      </div>
                    </div>
                  </div>
                  <div className="sg-pitch-stage">
                    <canvas ref={pitchCanvasRef} width={800} height={260} />
                  </div>
                  <div className="sg-meters">
                    {[
                      ['Intonation', display.scores.intonation],
                      ['Support', display.scores.support],
                      ['Resonance', display.scores.resonance],
                      ['Volume', display.scores.volume],
                    ].map(([label, val]) => (
                      <div className="sg-meter" key={label}>
                        <div className="sg-meter-label">
                          <span>{label}</span>
                          <span>{val || '—'}</span>
                        </div>
                        <div className="sg-bar">
                          <i style={{ width: `${val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sg-card sg-spectrum-card">
                  <div className="sg-card-head">
                    <h4>Spectrum &amp; Waveform</h4>
                    <div className="sg-chips">
                      <button
                        type="button"
                        className={`sg-chip ${vizMode === 'spectrum' ? 'active' : ''}`}
                        onClick={() => setVizMode('spectrum')}
                      >
                        Spectrum
                      </button>
                      <button
                        type="button"
                        className={`sg-chip ${vizMode === 'waveform' ? 'active' : ''}`}
                        onClick={() => setVizMode('waveform')}
                      >
                        Waveform
                      </button>
                    </div>
                  </div>
                  <canvas ref={spectrumCanvasRef} width={1100} height={120} />
                </div>
              </div>

              <div className="sg-live-side">
                <div className="sg-card sg-vowel-card">
                  <div className="sg-card-head">
                    <h4>Formants &amp; Vowel Space</h4>
                    <span className={`sg-badge ${display.vowelIsMod ? 'mod' : ''}`}>
                      {display.vowel}
                      {display.vowelConf != null ? ` · ${display.vowelConf}%` : ''}
                    </span>
                  </div>
                  <p className="sg-hint sg-hint-fixed">{display.vowelLine || '\u00A0'}</p>

                  {/* Always reserve mod panel height — prevents page jump */}
                  <div className={`sg-mod-panel status-${display.mod?.status || 'stable'} ${display.mod?.to ? 'has-target' : ''}`}>
                    {display.mod?.to ? (
                      <>
                        <div className="sg-mod-head">
                          <span className="sg-mod-path">
                            <strong>{display.mod.from?.label}</strong>
                            <span className="sg-mod-arrow">→</span>
                            <strong className="sg-mod-target">{display.mod.to.label}</strong>
                            <span className="sg-mod-ipa">[{display.mod.to.ipa}]</span>
                          </span>
                          <span className="sg-mod-note">{display.mod.noteLabel || '—'}</span>
                        </div>
                        <div className="sg-mod-chain">
                          {(display.mod.chain || []).map((c) => (
                            <span
                              key={c.id}
                              className={`sg-mod-chip ${c.active ? 'active' : ''} ${c.target ? 'target' : ''}`}
                            >
                              {c.label}
                            </span>
                          ))}
                        </div>
                        <div className="sg-mod-bars">
                          <div className="sg-mod-bar-row">
                            <div className="sg-mod-bar-label">
                              <span>Pitch → mod</span>
                              <span>{display.mod.pitchPct ?? 0}%</span>
                            </div>
                            <div className="sg-bar tall sg-mod-bar">
                              <i className="pitch" style={{ width: `${display.mod.pitchPct ?? 0}%` }} />
                            </div>
                          </div>
                          <div className="sg-mod-bar-row">
                            <div className="sg-mod-bar-label">
                              <span>Shape toward target</span>
                              <span>{display.mod.shapePct ?? 0}%</span>
                            </div>
                            <div className="sg-bar tall sg-mod-bar">
                              <i className="shape" style={{ width: `${display.mod.shapePct ?? 0}%` }} />
                            </div>
                          </div>
                        </div>
                        <p className="sg-mod-hint">{display.mod.hint || '\u00A0'}</p>
                      </>
                    ) : (
                      <>
                        <div className="sg-mod-head">
                          <span className="sg-mod-path">
                            {display.mod?.from
                              ? <>Pure <strong>{display.mod.from.label}</strong> is fine here</>
                              : 'Hold a vowel to see modification path'}
                          </span>
                          <span className="sg-mod-note">{display.mod?.noteLabel || '—'}</span>
                        </div>
                        <p className="sg-mod-hint">
                          {display.mod?.hint || 'As pitch rises, this panel tracks the next vowel mod.'}
                        </p>
                      </>
                    )}
                  </div>

                  <canvas ref={formantCanvasRef} width={360} height={200} className="sg-formant-canvas" />
                  <div className="sg-formant-stats">
                    <div>
                      <span>F1</span>
                      <strong>{display.f1}</strong>
                    </div>
                    <div>
                      <span>F2</span>
                      <strong>{display.f2}</strong>
                    </div>
                    <div>
                      <span>Centroid</span>
                      <strong>{display.centroid}</strong>
                    </div>
                  </div>
                </div>

                <div className={`sg-card sg-vision-card ${cameraOn ? 'active' : ''}`}>
                  <div className="sg-card-head">
                    <h4>Camera Coach</h4>
                    <span className={`sg-badge ${cameraOn ? '' : 'mod'}`}>
                      {cameraLoading ? '…' : cameraOn ? 'Live' : 'Off'}
                    </span>
                  </div>
                  <div className="sg-vision-stage">
                    <video
                      ref={visionVideoRef}
                      className="sg-vision-video"
                      playsInline
                      muted
                      aria-label="Camera preview"
                    />
                    <canvas
                      ref={visionOverlayRef}
                      className="sg-vision-overlay"
                      width={320}
                      height={240}
                    />
                    {!cameraOn && !cameraLoading && (
                      <div className="sg-vision-empty">
                        <span>Camera off</span>
                        <button type="button" className="sg-btn sg-btn-ghost" onClick={toggleCamera}>
                          Enable
                        </button>
                      </div>
                    )}
                    {cameraLoading && <div className="sg-vision-empty">Loading vision models…</div>}
                  </div>
                  <p className="sg-posture-line">{display.postureLine || '—'}</p>
                </div>

                <div className="sg-card sg-tips-card">
                  <div className="sg-card-head">
                    <h4>Coaching Tips</h4>
                    <span className={`sg-pulse ${micOn || cameraOn ? 'on' : ''}`} />
                  </div>
                  <ul className="sg-tips">
                    {display.tips.map((t) => (
                      <li key={t.id + t.text.slice(0, 12)} className={t.kind || ''}>
                        {t.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {view === 'tanpura' && (
          <section className="sg-view sg-tanpura-view">
            <div className="sg-tanpura-ambient" aria-hidden="true">
              <div className="sg-tanpura-glow" />
              <div className={`sg-tanpura-rings ${tanpuraOn ? 'live' : ''}`}>
                <i /><i /><i />
              </div>
            </div>

            <header className="sg-view-header sg-tanpura-header">
              <div>
                <p className="sg-eyebrow">Free practice</p>
                <h3>Tanpura</h3>
              </div>
              <p className="sg-tanpura-tagline">
                A quiet drone to hold pitch — no meters, no tips, just Sa.
              </p>
            </header>

            <div className="sg-tanpura-stage">
              <div className="sg-tanpura-sa">
                <span className="sg-tanpura-sa-label">Sa</span>
                <div className="sg-tanpura-sa-note">{tanpuraKey}</div>
                <span className="sg-tanpura-sa-meta">
                  {noteFreq(tanpuraKey, tanpuraOct).toFixed(1)} Hz · octave {tanpuraOct}
                </span>
              </div>

              <div className="sg-tanpura-strings">
                {tanpuraStrings.map((s, i) => (
                  <div key={`${s.label}-${i}`} className={`sg-tanpura-string ${tanpuraOn ? 'on' : ''}`} style={{ animationDelay: `${i * 0.35}s` }}>
                    <span className="sg-ts-label">{s.label}</span>
                    <div className="sg-ts-wire" />
                    <span className="sg-ts-freq">{s.freq.toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className={`sg-tanpura-play ${tanpuraOn ? 'stop' : ''}`}
                onClick={toggleTanpura}
                disabled={tanpuraLoading}
              >
                <span className="sg-tanpura-play-icon">{tanpuraOn ? '■' : '▶'}</span>
                <span>
                  {tanpuraLoading ? 'Loading samples…' : tanpuraOn ? 'Stop drone' : 'Start tanpura'}
                </span>
              </button>
              <p className="sg-tanpura-sample-note">
                Real recorded tanpura loops · continuous Sa underneath · pitch-shifts to your key
              </p>
            </div>

            <div className="sg-tanpura-controls">
              <div className="sg-card sg-tanpura-card">
                <h4>Key</h4>
                <p className="sg-hint">Choose any root as Sa — the whole instrument retunes.</p>
                <div className="sg-tanpura-keys">
                  {TANPURA_KEYS.map((k) => (
                    <button
                      key={k.name}
                      type="button"
                      className={`sg-tanpura-key ${tanpuraKey === k.name ? 'active' : ''}`}
                      onClick={() => setTanpuraKey(k.name)}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                <div className="sg-tanpura-oct">
                  <span>Octave</span>
                  <div className="sg-tanpura-oct-btns">
                    <button type="button" className="sg-btn sg-btn-ghost" onClick={() => setTanpuraOct((o) => Math.max(1, o - 1))}>−</button>
                    <strong>{tanpuraOct}{tanpuraOct === 3 ? ' · sample' : ''}</strong>
                    <button type="button" className="sg-btn sg-btn-ghost" onClick={() => setTanpuraOct((o) => Math.min(5, o + 1))}>+</button>
                  </div>
                  <p className="sg-hint" style={{ marginTop: 8 }}>
                    Samples are recorded at C3. Other octaves pitch-shift exactly to your Sa
                    {tanpuraOct === 3 ? ' (best acoustic match).' : ' (more synth bed when far from 3).'}
                  </p>
                </div>
              </div>

              <div className="sg-card sg-tanpura-card">
                <h4>String layout</h4>
                <p className="sg-hint">How the four (or three) strings relate to Sa.</p>
                <div className="sg-tanpura-styles">
                  {Object.values(TANPURA_STYLES).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      className={`sg-tanpura-style ${tanpuraStyle === st.id ? 'active' : ''}`}
                      onClick={() => setTanpuraStyle(st.id)}
                    >
                      <strong>{st.label}</strong>
                      <span>{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sg-card sg-tanpura-card">
                <h4>Sound</h4>
                <p className="sg-hint">Shape the drone until it sits under your voice.</p>
                <div className="sg-tanpura-sliders">
                  <label>
                    <span>Pace <em>{tanpuraPace}</em></span>
                    <input type="range" min={28} max={72} value={tanpuraPace} onChange={(e) => setTanpuraPace(Number(e.target.value))} />
                  </label>
                  <label>
                    <span>Volume <em>{Math.round(tanpuraVol * 100)}</em></span>
                    <input type="range" min={0} max={100} value={Math.round(tanpuraVol * 100)} onChange={(e) => setTanpuraVol(Number(e.target.value) / 100)} />
                  </label>
                  <label>
                    <span>Brightness <em>{Math.round(tanpuraBright * 100)}</em></span>
                    <input type="range" min={10} max={100} value={Math.round(tanpuraBright * 100)} onChange={(e) => setTanpuraBright(Number(e.target.value) / 100)} />
                  </label>
                  <label>
                    <span>Jivari <em>{Math.round(tanpuraJivari * 100)}</em></span>
                    <input type="range" min={0} max={100} value={Math.round(tanpuraJivari * 100)} onChange={(e) => setTanpuraJivari(Number(e.target.value) / 100)} />
                  </label>
                  <label>
                    <span>Room <em>{Math.round(tanpuraRoom * 100)}</em></span>
                    <input type="range" min={0} max={100} value={Math.round(tanpuraRoom * 100)} onChange={(e) => setTanpuraRoom(Number(e.target.value) / 100)} />
                  </label>
                </div>
              </div>
            </div>

            <p className="sg-tanpura-foot">
              Sit tall · soft shoulders · match Sa before you sing · all sound is generated on your device
            </p>
          </section>
        )}

        {view === 'exercises' && (
          <section className="sg-view">
            <header className="sg-view-header">
              <div>
                <p className="sg-eyebrow">Structured practice</p>
                <h3>Exercises</h3>
              </div>
              <select
                className="sg-select"
                value={exerciseFilter}
                onChange={(e) => setExerciseFilter(e.target.value)}
              >
                <option value="all">All categories</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </header>

            <div className="sg-exercise-layout">
              <div className="sg-exercise-list">
                {filteredExercises.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    className={`sg-ex-item ${selectedExercise?.id === ex.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedExercise(ex);
                      setExerciseReps(0);
                    }}
                  >
                    <span className="sg-ex-cat">{CATEGORY_LABELS[ex.category] || ex.category}</span>
                    <strong>{ex.title}</strong>
                    <span className="sg-ex-meta">
                      {ex.level} · {ex.duration}
                    </span>
                  </button>
                ))}
              </div>

              <div className="sg-card sg-exercise-detail">
                {!selectedExercise ? (
                  <div className="sg-empty">
                    <div className="sg-empty-icon">♮</div>
                    <h4>Choose an exercise</h4>
                    <p>Pick one from the list for coaching notes, reference tones, and rep tracking.</p>
                  </div>
                ) : (
                  <>
                    <span className="sg-ex-cat">{CATEGORY_LABELS[selectedExercise.category]}</span>
                    <h4>{selectedExercise.title}</h4>
                    <p className="sg-ex-desc">{selectedExercise.description}</p>
                    <ol className="sg-steps">
                      {selectedExercise.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                    <p className="sg-cue">
                      <strong>Cue:</strong> {selectedExercise.cue}
                    </p>
                    <div className="sg-btn-row">
                      <button type="button" className="sg-btn sg-btn-primary" onClick={() => playExercise(selectedExercise)}>
                        Play reference
                      </button>
                      <button type="button" className="sg-btn sg-btn-ghost" onClick={() => completeExercise(selectedExercise)}>
                        Log completion
                      </button>
                      <span className="sg-reps">Reps this pick: {exerciseReps}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {view === 'tools' && (
          <section className="sg-view">
            <header className="sg-view-header">
              <div>
                <p className="sg-eyebrow">Practice utilities</p>
                <h3>Studio Tools</h3>
              </div>
            </header>

            <div className="sg-tools-grid">
              <div className="sg-card">
                <h4>Chromatic Tuner</h4>
                <p className="sg-tool-desc">Precision pitch with cents readout.</p>
                <div className="sg-tuner">
                  <div className="sg-tuner-note">{display.tunerNote}</div>
                  <div className="sg-tuner-cents" style={{ color: display.centsColor }}>
                    {display.tunerCents}
                  </div>
                  <div className="sg-tuner-track">
                    <div className="sg-tuner-center" />
                    <div className="sg-tuner-needle" style={{ left: `${display.needlePct}%` }} />
                  </div>
                </div>
                <button type="button" className="sg-btn sg-btn-ghost" onClick={playRefTone}>
                  Play reference A4 (440)
                </button>
              </div>

              <div className="sg-card">
                <h4>Metronome</h4>
                <p className="sg-tool-desc">Pulse for agility runs and timed phrases.</p>
                <div className="sg-bpm">
                  <strong>{bpm}</strong>
                  <small>BPM</small>
                </div>
                <input
                  type="range"
                  min={40}
                  max={200}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                />
                <div className="sg-beats">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={`beat ${metroOn && metroBeat % 4 === i ? 'active' : ''}`} />
                  ))}
                </div>
                <div className="sg-btn-row">
                  <button type="button" className="sg-btn sg-btn-primary" onClick={toggleMetro}>
                    {metroOn ? 'Stop' : 'Start'}
                  </button>
                  <select
                    className="sg-select"
                    value={metroSubdiv}
                    onChange={(e) => setMetroSubdiv(Number(e.target.value))}
                  >
                    <option value={1}>Quarter</option>
                    <option value={2}>Eighth</option>
                    <option value={3}>Triplet</option>
                    <option value={4}>Sixteenth</option>
                  </select>
                </div>
              </div>

              <div className="sg-card">
                <h4>Range Finder</h4>
                <p className="sg-tool-desc">Siren gently; extremes log locally.</p>
                <div className="sg-range">
                  <div>
                    <span>Low</span>
                    <strong>{noteLabel(rangeLow || progress.rangeLow)}</strong>
                  </div>
                  <div className="sg-range-bar" />
                  <div>
                    <span>High</span>
                    <strong>{noteLabel(rangeHigh || progress.rangeHigh)}</strong>
                  </div>
                </div>
                <div className="sg-btn-row">
                  <button type="button" className="sg-btn sg-btn-primary" onClick={toggleRange}>
                    {rangeScanning ? 'Stop & save' : 'Start scan'}
                  </button>
                  <button type="button" className="sg-btn sg-btn-ghost" onClick={resetRange}>
                    Reset
                  </button>
                </div>
              </div>

              <div className="sg-card">
                <h4>Pitch Target Drill</h4>
                <p className="sg-tool-desc">Hold a target for 10s. Score = intonation + support.</p>
                <select
                  className="sg-select"
                  value={drillNote}
                  onChange={(e) => setDrillNote(Number(e.target.value))}
                >
                  {notes.map((n) => (
                    <option key={n.midi} value={n.midi}>
                      {n.label}
                    </option>
                  ))}
                </select>
                <div className="sg-drill-score">
                  <span>Hold score</span>
                  <strong>{drillScore}%</strong>
                </div>
                <div className="sg-bar tall">
                  <i style={{ width: `${drillScore}%` }} />
                </div>
                <button type="button" className="sg-btn sg-btn-primary" onClick={startDrill} disabled={drillActive}>
                  {drillActive ? 'Holding…' : 'Start 10s hold'}
                </button>
              </div>

              <div className="sg-card">
                <h4>Breath Timer</h4>
                <p className="sg-tool-desc">Appoggio-style inhale · hold · controlled exhale.</p>
                <div className="sg-breath-ring">
                  <span>{breathPhase}</span>
                  <strong>{breathCount}</strong>
                </div>
                <div className="sg-breath-settings">
                  <label>
                    In
                    <input type="number" min={2} max={12} value={breathIn} onChange={(e) => setBreathIn(Number(e.target.value))} />
                  </label>
                  <label>
                    Hold
                    <input type="number" min={0} max={12} value={breathHold} onChange={(e) => setBreathHold(Number(e.target.value))} />
                  </label>
                  <label>
                    Out
                    <input type="number" min={4} max={20} value={breathOut} onChange={(e) => setBreathOut(Number(e.target.value))} />
                  </label>
                </div>
                <button type="button" className="sg-btn sg-btn-primary" onClick={toggleBreath}>
                  {breathRunning ? 'Stop cycle' : 'Start cycle'}
                </button>
              </div>

              <div className="sg-card">
                <h4>Record &amp; Review</h4>
                <p className="sg-tool-desc">Capture a take in-browser. Nothing is uploaded.</p>
                <div className={`sg-rec ${recState.recording ? 'on' : ''}`}>
                  <span className="rec-dot" />
                  <span>{recState.label}</span>
                  <span>{recState.time}</span>
                </div>
                <div className="sg-btn-row">
                  <button type="button" className="sg-btn sg-btn-primary" onClick={toggleRec}>
                    {recState.recording ? 'Stop' : 'Record'}
                  </button>
                  {recState.url && (
                    <a className="sg-btn sg-btn-ghost" href={recState.url} download="songengineer-take.webm">
                      Download
                    </a>
                  )}
                </div>
                {recState.url && <audio className="sg-audio" src={recState.url} controls />}
              </div>
            </div>
          </section>
        )}

        {view === 'progress' && (
          <section className="sg-view">
            <header className="sg-view-header">
              <div>
                <p className="sg-eyebrow">{isLoggedIn ? 'Account history' : 'Device history'}</p>
                <h3>Your Progress</h3>
                <p className="sg-hint" style={{ marginTop: 6 }}>
                  {isLoggedIn
                    ? 'Synced with your account when online.'
                    : 'Saved on this device. Sign in to keep progress with your account.'}
                </p>
              </div>
              <div className="sg-btn-row">
                <button
                  type="button"
                  className="sg-btn sg-btn-ghost"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'songengineer-vocal-progress.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  className="sg-btn sg-btn-ghost"
                  onClick={() => {
                    if (window.confirm('Clear all vocal progress?')) {
                      const empty = defaultProgress();
                      saveProgress(empty);
                      setProgress(empty);
                    }
                  }}
                >
                  Clear
                </button>
              </div>
            </header>

            <div className="sg-progress-grid">
              <div className="sg-card sg-stat">
                <span>Practice sessions</span>
                <strong>{progress.sessions || 0}</strong>
              </div>
              <div className="sg-card sg-stat">
                <span>Minutes practiced</span>
                <strong>{Math.round(progress.minutes || 0)}</strong>
              </div>
              <div className="sg-card sg-stat">
                <span>Exercises completed</span>
                <strong>{progress.exercises || 0}</strong>
              </div>
              <div className="sg-card sg-stat">
                <span>Best hold score</span>
                <strong>{progress.bestHold || 0}%</strong>
              </div>
              <div className="sg-card sg-stat wide">
                <span>Recorded range</span>
                <strong>{rangeLabel()}</strong>
              </div>
            </div>

            <div className="sg-card">
              <h4>Recent activity</h4>
              <ul className="sg-activity">
                {(progress.activity || []).length === 0 ? (
                  <li className="muted">No sessions yet. Enable the mic and practice to start logging.</li>
                ) : (
                  progress.activity.map((a, i) => (
                    <li key={i}>
                      <span>{a.text}</span>
                      <span className="time">
                        {new Date(a.t).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>
        )}

        {view === 'guide' && (
          <section className="sg-view">
            <header className="sg-view-header">
              <div>
                <p className="sg-eyebrow">Technique library</p>
                <h3>How to Improve</h3>
              </div>
            </header>
            <div className="sg-guide-grid">
              {TECHNIQUE_GUIDE.map((g) => (
                <div className="sg-card sg-guide-card" key={g.title}>
                  <div className="sg-guide-icon">{g.icon}</div>
                  <h4>{g.title}</h4>
                  <p>{g.body}</p>
                  <ul>
                    {g.points.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {toast && <div className="sg-toast">{toast}</div>}
    </div>
  );
}
