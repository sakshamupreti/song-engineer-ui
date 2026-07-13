/**
 * Tanpura engine — acoustic samples + continuous Sa drone.
 * Uses real recorded tanpura loops (public/tanpura/), pitch-shifted per key.
 * Continuous root Sa sits under the plucking texture, like a real instrument.
 */

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** Sample base: C3 ≈ 130.81 Hz (Sa of recorded loops) */
const SAMPLE_BASE_NOTE = 'C';
const SAMPLE_BASE_OCT = 3;
const SAMPLE_BASE_FREQ = 440 * Math.pow(2, ((SAMPLE_BASE_OCT + 1) * 12 + 0 - 69) / 12);

const SAMPLE_URLS = {
  main: '/tanpura/sa-pa-c.mp3', // full Sa-Pa texture with string plucks
  drone: '/tanpura/sa-drone-c.mp3', // warmer continuous body
};

export function noteFreq(name, octave = 3) {
  const idx = NOTE_NAMES.indexOf(name);
  if (idx < 0) return 220;
  const midi = (octave + 1) * 12 + idx;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const TANPURA_KEYS = NOTE_NAMES.map((name) => ({ name, label: name }));

export const TANPURA_STYLES = {
  classic: {
    id: 'classic',
    label: 'Sa · Pa · Sa · Sa',
    desc: 'Standard — fifth (Pa) colour',
    intervals: [0, 7, 12, 12],
    labels: ['Sa', 'Pa', 'Sa', 'Sa'],
  },
  ma: {
    id: 'ma',
    label: 'Sa · ma · Sa · Sa',
    desc: 'Fourth (ma) — softer colour',
    intervals: [0, 5, 12, 12],
    labels: ['Sa', 'ma', 'Sa', 'Sa'],
  },
  pure: {
    id: 'pure',
    label: 'Sa only',
    desc: 'Tonic drone — purest focus',
    intervals: [0, 12],
    labels: ['Sa', 'Sa'],
  },
  rich: {
    id: 'rich',
    label: 'Wide Sa · Pa',
    desc: 'Deeper bed, fuller room',
    intervals: [-12, 0, 7, 12],
    labels: ['Saˬ', 'Sa', 'Pa', 'Sa'],
  },
};

/**
 * Dual-buffer crossfade looper for seamless sample playback.
 */
class CrossfadeLooper {
  constructor(ctx, buffer, dest, { rate = 1, gain = 1, fadeSec = 1.6 } = {}) {
    this.ctx = ctx;
    this.buffer = buffer;
    this.dest = dest;
    this.rate = rate;
    this.gainVal = gain;
    this.fadeSec = fadeSec;
    this.sources = [];
    this.gains = [];
    this.timer = null;
    this.playing = false;
    this.output = ctx.createGain();
    this.output.gain.value = gain;
    this.output.connect(dest);
  }

  start() {
    if (this.playing || !this.buffer) return;
    this.playing = true;
    this._schedule(0);
  }

  _schedule(offsetIntoBuffer = 0) {
    if (!this.playing) return;
    const ctx = this.ctx;
    const buf = this.buffer;
    const dur = buf.duration / Math.max(0.25, this.rate);
    const fade = Math.min(this.fadeSec, dur * 0.35);
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = this.rate;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(1, now + fade);
    // Hold, then fade — next layer starts before end
    const holdEnd = now + dur - fade;
    g.gain.setValueAtTime(1, Math.max(now + fade, holdEnd));
    g.gain.linearRampToValueAtTime(0.0001, now + dur);

    src.connect(g);
    g.connect(this.output);
    src.start(now, offsetIntoBuffer % buf.duration);
    src.stop(now + dur + 0.05);

    this.sources.push(src);
    this.gains.push(g);

    // Next layer starts fade seconds before this one ends
    const nextIn = (dur - fade) * 1000;
    this.timer = setTimeout(() => this._schedule(0), Math.max(50, nextIn));

    // Cleanup old
    while (this.sources.length > 4) {
      try {
        this.sources.shift()?.stop?.();
      } catch (_) {}
      this.gains.shift();
    }
  }

  setRate(rate) {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
    // Live sources keep old rate; next loop uses new rate.
    // For snappy key changes we restart if playing.
  }

  setGain(v) {
    this.gainVal = v;
    if (this.output) {
      this.output.gain.setTargetAtTime(v, this.ctx.currentTime, 0.08);
    }
  }

  stop(fade = true) {
    this.playing = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const t = this.ctx.currentTime;
    if (fade && this.output) {
      this.output.gain.cancelScheduledValues(t);
      this.output.gain.setValueAtTime(this.output.gain.value, t);
      this.output.gain.linearRampToValueAtTime(0.0001, t + 0.5);
    }
    setTimeout(() => {
      for (const s of this.sources) {
        try {
          s.stop();
        } catch (_) {}
      }
      this.sources = [];
      this.gains = [];
      if (this.output) this.output.gain.value = this.gainVal;
    }, fade ? 550 : 0);
  }
}

export class TanpuraEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.comp = null;
    this.dry = null;
    this.wet = null;
    this.convolver = null;
    this.playing = false;

    this.buffers = { main: null, drone: null };
    this.loadPromise = null;
    this.sampleMode = false; // true when samples loaded

    this.mainLoop = null;
    this.droneLoop = null;
    this.saDroneNodes = []; // continuous soft Sa bed (always)

    // Settings
    this.rootName = 'C';
    this.octave = 3;
    this.styleId = 'classic';
    this.bpm = 42; // only affects synth-fallback pluck pace
    this.volume = 0.42;
    this.brightness = 0.35;
    this.jivari = 0.25;
    this.room = 0.4;

    this.synthTimer = null;
    this.stringIndex = 0;
  }

  async ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._buildGraph();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  _buildGraph() {
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;

    // Gentle bus — never harsh
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -22;
    this.comp.knee.value = 24;
    this.comp.ratio.value = 2.8;
    this.comp.attack.value = 0.02;
    this.comp.release.value = 0.35;

    // Soft lowpass on whole bus (ear-friendly)
    this.busFilter = ctx.createBiquadFilter();
    this.busFilter.type = 'lowpass';
    this.busFilter.frequency.value = 2800 + this.brightness * 2200;
    this.busFilter.Q.value = 0.5;

    // Gentle high-cut shelf
    this.airCut = ctx.createBiquadFilter();
    this.airCut.type = 'highshelf';
    this.airCut.frequency.value = 4500;
    this.airCut.gain.value = -8;

    this.dry = ctx.createGain();
    this.dry.gain.value = 1 - this.room * 0.5;
    this.wet = ctx.createGain();
    this.wet.gain.value = this.room * 0.55;

    this.convolver = ctx.createConvolver();
    this.convolver.buffer = this._makeImpulse(ctx, 2.8, 2.4);

    this.master.connect(this.busFilter);
    this.busFilter.connect(this.airCut);
    this.airCut.connect(this.comp);
    this.comp.connect(this.dry);
    this.comp.connect(this.convolver);
    this.convolver.connect(this.wet);
    this.dry.connect(ctx.destination);
    this.wet.connect(ctx.destination);
  }

  _makeImpulse(ctx, seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * 0.55;
      }
    }
    return buf;
  }

  async loadSamples() {
    if (this.buffers.main && this.buffers.drone) {
      this.sampleMode = true;
      return true;
    }
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      await this.ensureCtx();
      try {
        const [main, drone] = await Promise.all([
          this._fetchBuffer(SAMPLE_URLS.main),
          this._fetchBuffer(SAMPLE_URLS.drone),
        ]);
        this.buffers.main = main;
        this.buffers.drone = drone;
        this.sampleMode = !!(main || drone);
        return this.sampleMode;
      } catch (err) {
        console.warn('Tanpura samples failed to load, using soft synth', err);
        this.sampleMode = false;
        return false;
      }
    })();

    return this.loadPromise;
  }

  async _fetchBuffer(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed ${url}`);
    const arr = await res.arrayBuffer();
    return await this.ctx.decodeAudioData(arr.slice(0));
  }

  /** Pitch ratio relative to recorded C Sa */
  pitchRate() {
    const target = noteFreq(this.rootName, this.octave);
    // Clamp so samples don't chipmunk/growl too hard
    return Math.max(0.55, Math.min(1.85, target / SAMPLE_BASE_FREQ));
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.06);
    }
  }

  setRoom(v) {
    this.room = Math.max(0, Math.min(1, v));
    if (this.dry && this.wet && this.ctx) {
      const t = this.ctx.currentTime;
      this.dry.gain.setTargetAtTime(1 - this.room * 0.5, t, 0.1);
      this.wet.gain.setTargetAtTime(this.room * 0.55, t, 0.1);
    }
  }

  setRoot(name) {
    this.rootName = name;
    if (this.playing) this._retuneLive();
  }

  setOctave(oct) {
    this.octave = Math.max(1, Math.min(5, oct));
    if (this.playing) this._retuneLive();
  }

  setStyle(id) {
    if (TANPURA_STYLES[id]) this.styleId = id;
  }

  setPace(bpm) {
    this.bpm = Math.max(24, Math.min(90, bpm));
  }

  setBrightness(v) {
    this.brightness = Math.max(0.1, Math.min(1, v));
    if (this.busFilter && this.ctx) {
      this.busFilter.frequency.setTargetAtTime(
        2200 + this.brightness * 2800,
        this.ctx.currentTime,
        0.1
      );
    }
  }

  setJivari(v) {
    this.jivari = Math.max(0, Math.min(1, v));
  }

  saFreq() {
    return noteFreq(this.rootName, this.octave);
  }

  stringFreqs() {
    const style = TANPURA_STYLES[this.styleId] || TANPURA_STYLES.classic;
    const sa = this.saFreq();
    return style.intervals.map((semi, i) => ({
      freq: sa * Math.pow(2, semi / 12),
      label: style.labels[i],
      semi,
    }));
  }

  _retuneLive() {
    const rate = this.pitchRate();
    if (this.mainLoop) {
      this.mainLoop.stop(true);
      this.mainLoop = null;
      if (this.buffers.main) {
        this.mainLoop = new CrossfadeLooper(this.ctx, this.buffers.main, this.master, {
          rate,
          gain: 0.55,
          fadeSec: 1.8,
        });
        this.mainLoop.start();
      }
    }
    if (this.droneLoop) {
      this.droneLoop.stop(true);
      this.droneLoop = null;
      if (this.buffers.drone) {
        this.droneLoop = new CrossfadeLooper(this.ctx, this.buffers.drone, this.master, {
          rate,
          gain: 0.38,
          fadeSec: 2.2,
        });
        this.droneLoop.start();
      }
    }
    this._restartSaBed();
  }

  /**
   * Continuous soft Sa bed — always under the texture (like sympathetic resonance).
   * Warm sine partials only — never harsh.
   */
  _startSaBed() {
    this._stopSaBed();
    if (!this.ctx || !this.master) return;

    const ctx = this.ctx;
    const sa = this.saFreq();
    const t0 = ctx.currentTime;
    const bedGain = ctx.createGain();
    bedGain.gain.setValueAtTime(0.0001, t0);
    bedGain.gain.exponentialRampToValueAtTime(0.22, t0 + 1.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.4;

    bedGain.connect(filter);
    filter.connect(this.master);

    // Fundamental + soft octave + gentle fifth (Pa colour) + 3rd partial very quiet
    const partials = [
      { mult: 1, gain: 0.55, type: 'sine' },
      { mult: 2, gain: 0.22, type: 'sine' },
      { mult: 3, gain: 0.08, type: 'sine' },
      { mult: 1.498, gain: 0.1, type: 'sine' }, // ~Pa if style uses fifth; still warm as partial
    ];

    // For pure Sa style, skip the fifth partial
    const usePa = this.styleId !== 'pure' && this.styleId !== 'ma';
    const list = usePa ? partials : partials.filter((p) => p.mult !== 1.498);
    if (this.styleId === 'ma') {
      list.push({ mult: Math.pow(2, 5 / 12), gain: 0.09, type: 'sine' }); // ma
    }

    for (const p of list) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = p.type;
      osc.frequency.value = sa * p.mult;
      // Very slow chorus detune for life
      osc.detune.value = (Math.random() - 0.5) * 6;
      g.gain.value = p.gain;
      osc.connect(g);
      g.connect(bedGain);
      osc.start(t0);
      this.saDroneNodes.push({ osc, g, bedGain, filter });
    }

    // Ultra-slow amplitude breathing
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoG.gain.value = 0.025;
    lfo.connect(lfoG);
    lfoG.connect(bedGain.gain);
    lfo.start(t0);
    this.saDroneNodes.push({ osc: lfo, g: lfoG, bedGain, filter });
  }

  _stopSaBed() {
    const t = this.ctx?.currentTime || 0;
    for (const n of this.saDroneNodes) {
      try {
        if (n.bedGain) {
          n.bedGain.gain.cancelScheduledValues(t);
          n.bedGain.gain.setValueAtTime(Math.max(0.0001, n.bedGain.gain.value), t);
          n.bedGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        }
        n.osc?.stop?.(t + 0.65);
      } catch (_) {}
    }
    this.saDroneNodes = [];
  }

  _restartSaBed() {
    if (!this.playing) return;
    this._startSaBed();
  }

  async start() {
    await this.ensureCtx();
    if (this.playing) return;

    // Load acoustic samples (first start may take a moment)
    await this.loadSamples();

    this.playing = true;
    this.stringIndex = 0;

    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(0.0001, t);
    this.master.gain.exponentialRampToValueAtTime(Math.max(0.001, this.volume), t + 0.8);

    // Always: continuous Sa bed
    this._startSaBed();

    const rate = this.pitchRate();

    if (this.sampleMode && this.buffers.main) {
      // Acoustic looped texture (plucks + harmonics)
      this.mainLoop = new CrossfadeLooper(this.ctx, this.buffers.main, this.master, {
        rate,
        gain: this.styleId === 'pure' ? 0.28 : 0.52,
        fadeSec: 1.9,
      });
      this.mainLoop.start();
    }

    if (this.sampleMode && this.buffers.drone) {
      // Extra continuous body
      this.droneLoop = new CrossfadeLooper(this.ctx, this.buffers.drone, this.master, {
        rate,
        gain: 0.32,
        fadeSec: 2.4,
      });
      this.droneLoop.start();
    }

    // If samples missing, soft synth plucks as fallback only
    if (!this.sampleMode) {
      this._synthLoop();
    }
  }

  /** Soft fallback plucks — only if samples fail */
  _synthLoop() {
    if (!this.playing || this.sampleMode) return;
    const strings = this.stringFreqs();
    const s = strings[this.stringIndex % strings.length];
    this._softPluck(s.freq);
    this.stringIndex += 1;
    const base = (60 / this.bpm) * 1000;
    this.synthTimer = setTimeout(() => this._synthLoop(), base * (0.9 + Math.random() * 0.25));
  }

  _softPluck(freq) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const dur = 5.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(800, t0);
    lp.frequency.exponentialRampToValueAtTime(1600 + this.brightness * 800, t0 + 0.15);
    lp.frequency.exponentialRampToValueAtTime(900, t0 + 2);

    g.connect(lp);
    lp.connect(this.master);

    for (const [mult, amp] of [
      [1, 0.4],
      [2, 0.18],
      [3, 0.08],
      [4, 0.04],
    ]) {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      osc.detune.value = (Math.random() - 0.5) * 5;
      og.gain.value = amp;
      osc.connect(og);
      og.connect(g);
      osc.start(t0);
      osc.stop(t0 + dur);
    }
  }

  stop(fade = true) {
    this.playing = false;
    if (this.synthTimer) {
      clearTimeout(this.synthTimer);
      this.synthTimer = null;
    }
    this.mainLoop?.stop(fade);
    this.droneLoop?.stop(fade);
    this.mainLoop = null;
    this.droneLoop = null;
    this._stopSaBed();

    if (this.master && this.ctx && fade) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), t);
      this.master.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    }
  }

  async dispose() {
    this.stop(false);
    if (this.ctx) {
      try {
        await this.ctx.close();
      } catch (_) {}
      this.ctx = null;
    }
  }
}
