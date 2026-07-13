/**
 * Vox Studio — Local audio analysis engine
 * Pitch (YIN), formants (spectral peaks), support, resonance.
 * Fully offline — Web Audio API only. No ML / no cloud.
 */

export const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

/**
 * Primary singing vowels + classical/pop modifications (aggiustamento).
 * F1/F2 centers: adult average speech (Peterson-style) adapted for sung Italianate vowels.
 * Modification chains (passaggio / high range):
 *   Ee [i] → Ih [ɪ] → Eh [ɛ]
 *   AA [æ] → Ah [ɑ] → Uh [ʌ] / Aw [ɔ]
 *   Ah [ɑ] → Aw [ɔ] → Oh [o]
 *   Oh [o] → ʊ → Oo [u] (more vertical / less spread)
 *   Oo [u] → ʊ (slightly more open)
 * Refs: SingWise vowel formants; classical aggiustamento; IPA formant charts.
 */
export const VOWEL_MAP = [
  // ── Primary five ──
  {
    id: "ee",
    label: "Ee",
    ipa: "i",
    example: "see / me",
    f1: 280,
    f2: 2250,
    primary: true,
    family: "ee",
    modifyToward: "ih",
    modifyHint: "On high notes, open slightly toward Ih (ɪ) — keep tongue forward, more vertical space.",
  },
  {
    id: "aa",
    label: "AA",
    ipa: "æ",
    example: "cat / ash",
    f1: 860,
    f2: 1720,
    primary: true,
    family: "aa",
    modifyToward: "ah",
    modifyHint: "Through passaggio, migrate AA → Ah (ɑ) → Uh/Aw — less spread jaw, more tall space.",
  },
  {
    id: "ah",
    label: "Ah",
    ipa: "ɑ",
    example: "father / hot",
    f1: 750,
    f2: 1180,
    primary: true,
    family: "ah",
    modifyToward: "aw",
    modifyHint: "On ascent, modify Ah toward Aw (ɔ) then Oh — round slightly, don’t yell pure open ah.",
  },
  {
    id: "oh",
    label: "Oh",
    ipa: "o",
    example: "go / boat",
    f1: 460,
    f2: 900,
    primary: true,
    family: "oh",
    modifyToward: "uu",
    modifyHint: "High Oh often moves toward ʊ / Oo color — round lips, keep pharynx open.",
  },
  {
    id: "oo",
    label: "Oo",
    ipa: "u",
    example: "boot / too",
    f1: 320,
    f2: 920,
    primary: true,
    family: "oo",
    modifyToward: "uu",
    modifyHint: "Pure Oo can stay; if tight, open slightly toward ʊ (book) while keeping lip round.",
  },
  // ── Modifications / intermediate ──
  {
    id: "ih",
    label: "Ih",
    ipa: "ɪ",
    example: "sit (Ee mod)",
    f1: 400,
    f2: 1920,
    primary: false,
    family: "ee",
    isMod: true,
    modOf: "ee",
    modifyToward: "eh",
    modifyHint: "Ih is the first modification of Ee — good for upper middle voice.",
  },
  {
    id: "eh",
    label: "Eh",
    ipa: "ɛ",
    example: "bed (Ee/AA bridge)",
    f1: 610,
    f2: 1900,
    primary: false,
    family: "ee",
    isMod: true,
    modOf: "ee",
    modifyToward: "ah",
    modifyHint: "Eh bridges bright front vowels toward open Ah on higher pitches.",
  },
  {
    id: "aw",
    label: "Aw",
    ipa: "ɔ",
    example: "thought (Ah mod)",
    f1: 590,
    f2: 880,
    primary: false,
    family: "ah",
    isMod: true,
    modOf: "ah",
    modifyToward: "oh",
    modifyHint: "Aw is the classic high-note modification of open Ah.",
  },
  {
    id: "uh",
    label: "Uh",
    ipa: "ʌ",
    example: "cup (neutral)",
    f1: 640,
    f2: 1220,
    primary: false,
    family: "ah",
    isMod: true,
    modOf: "ah",
    modifyToward: "aw",
    modifyHint: "Neutral Uh is a safe high-range target from AA/Ah — tall, not spread.",
  },
  {
    id: "uu",
    label: "ʊ",
    ipa: "ʊ",
    example: "book (Oh/Oo mod)",
    f1: 450,
    f2: 1030,
    primary: false,
    family: "oo",
    isMod: true,
    modOf: "oo",
    modifyToward: "oo",
    modifyHint: "ʊ is the open modification between Oh and Oo — useful through the bridge.",
  },
  {
    id: "schwa",
    label: "ə",
    ipa: "ə",
    example: "about (neutral)",
    f1: 500,
    f2: 1500,
    primary: false,
    family: "ah",
    isMod: true,
    modOf: "ah",
    modifyToward: "uh",
    modifyHint: "Schwa/neutral space — often the acoustic goal of heavy modification on top notes.",
  },
];

export const VOWEL_BY_ID = Object.fromEntries(VOWEL_MAP.map((v) => [v.id, v]));

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.gain = null;
    this.running = false;
    this.raf = null;

    this.sampleRate = 44100;
    this.fftSize = 4096;
    this.timeData = null;
    this.freqData = null;
    this.freqFloat = null;

    // Smoothed analysis state
    this.pitchHistory = [];
    this.rmsHistory = [];
    this.maxHistory = 48;

    // Display stability (EMA + hold + median history)
    this.smoothPitch = 0;
    this.smoothF1 = 0;
    this.smoothF2 = 0;
    this.smoothRms = 0;
    this.smoothCents = 0;
    this.voicedHold = 0;
    this.lastMidi = null;
    this.midiCandidate = null;
    this.midiCandidateCount = 0;
    this.vowelId = null;
    this.vowelHold = 0;
    this.vowelCandidate = null;
    this.vowelCandidateCount = 0;
    this.f1History = [];
    this.f2History = [];
    this.formantConfidence = 0;
    this.vowelVotes = new Map(); // rolling votes for consistency

    this.listeners = new Set();

    // Range scanner
    this.rangeScanning = false;
    this.rangeLow = null;
    this.rangeHigh = null;

    // Reference tone
    this.refOsc = null;
    this.refGain = null;
  }

  onAnalysis(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit(frame) {
    for (const fn of this.listeners) fn(frame);
  }

  async start() {
    if (this.running) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.sampleRate = this.ctx.sampleRate;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.75;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;

    // Mute monitoring to avoid feedback
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;

    this.source.connect(this.analyser);
    this.analyser.connect(this.gain);
    this.gain.connect(this.ctx.destination);

    const bufLen = this.analyser.fftSize;
    this.timeData = new Float32Array(bufLen);
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.freqFloat = new Float32Array(this.analyser.frequencyBinCount);

    this.running = true;
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.refOsc) {
      try { this.refOsc.stop(); } catch (_) {}
      this.refOsc = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.source = null;
    this.analyser = null;

    // Reset smoothers so the next session starts clean
    this.smoothPitch = 0;
    this.smoothF1 = 0;
    this.smoothF2 = 0;
    this.smoothRms = 0;
    this.smoothCents = 0;
    this.voicedHold = 0;
    this.lastMidi = null;
    this.midiCandidate = null;
    this.midiCandidateCount = 0;
    this.vowelId = null;
    this.vowelCandidate = null;
    this.vowelCandidateCount = 0;
    this.pitchHistory = [];
    this.rmsHistory = [];
    this.f1History = [];
    this.f2History = [];
    this.formantConfidence = 0;
    this.vowelVotes = new Map();
  }

  _ema(prev, next, alpha) {
    if (!next || !isFinite(next)) return prev;
    if (!prev || !isFinite(prev)) return next;
    return prev + alpha * (next - prev);
  }

  _median(arr) {
    if (!arr || !arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  /**
   * LPC formant estimate — more consistent than raw FFT peaks on sustained vowels.
   * Pre-emphasis → Hamming window → autocorrelation LPC → envelope peak picking.
   */
  _estimateFormantsLPC(timeData, sampleRate, f0) {
    const N = Math.min(timeData.length, 1024);
    if (N < 256) return { f1: 0, f2: 0, confidence: 0, peaks: [] };

    // Copy trailing window (most recent samples)
    const start = timeData.length - N;
    const x = new Float32Array(N);
    // Pre-emphasis + Hamming
    let energy = 0;
    for (let i = 0; i < N; i++) {
      const raw = timeData[start + i];
      const prev = i > 0 ? timeData[start + i - 1] : raw;
      const pre = raw - 0.97 * prev;
      const ham = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
      x[i] = pre * ham;
      energy += x[i] * x[i];
    }
    if (energy < 1e-8) return { f1: 0, f2: 0, confidence: 0, peaks: [] };

    // LPC order: ~sampleRate/1000 + 2, clamp 10–16 for speech formants
    const order = Math.max(10, Math.min(16, Math.round(sampleRate / 1000) + 2));
    const a = this._lpcLevinson(x, order);
    if (!a) return { f1: 0, f2: 0, confidence: 0, peaks: [] };

    // Evaluate 1/|A(ω)| on a dense grid up to 3500 Hz
    const maxHz = 3500;
    const steps = 280;
    const env = [];
    for (let s = 0; s <= steps; s++) {
      const freq = (s / steps) * maxHz;
      const w = (2 * Math.PI * freq) / sampleRate;
      let re = 0;
      let im = 0;
      // A(z) = 1 + sum a_k z^-k
      re += 1;
      for (let k = 1; k <= order; k++) {
        re += a[k] * Math.cos(w * k);
        im -= a[k] * Math.sin(w * k);
      }
      const mag = 1 / Math.max(1e-8, Math.hypot(re, im));
      env.push({ freq, mag });
    }

    // Peak pick on LPC envelope
    const peaks = [];
    for (let i = 2; i < env.length - 2; i++) {
      if (
        env[i].mag > env[i - 1].mag &&
        env[i].mag >= env[i + 1].mag &&
        env[i].mag > env[i - 2].mag &&
        env[i].freq >= 180 &&
        env[i].freq <= 3200
      ) {
        // Parabolic refine in magnitude space
        const y0 = env[i - 1].mag;
        const y1 = env[i].mag;
        const y2 = env[i + 1].mag;
        const denom = y0 - 2 * y1 + y2;
        const delta = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0;
        const df = (maxHz / steps) * Math.max(-1, Math.min(1, delta));
        peaks.push({ freq: env[i].freq + df, amp: y1 });
      }
    }
    peaks.sort((a, b) => a.freq - b.freq);

    // Suppress residual F0 harmonics if very sharp and near k*F0
    const f0Safe = f0 > 80 ? f0 : 0;
    const filtered = peaks.filter((p) => {
      if (!f0Safe) return true;
      const harm = p.freq / f0Safe;
      const nearest = Math.round(harm);
      if (nearest >= 1 && nearest <= 4 && Math.abs(harm - nearest) < 0.06) {
        // Keep if it's also a broad formant-like peak (high amp among neighbors)
        return p.amp > 0.15;
      }
      return true;
    });

    let f1 = 0;
    let f2 = 0;
    const f1Band = filtered.filter((p) => p.freq >= 200 && p.freq <= 1000);
    if (f1Band.length) {
      f1Band.sort((a, b) => b.amp - a.amp);
      f1 = f1Band[0].freq;
    }
    const f2Band = filtered.filter(
      (p) => p.freq >= Math.max(650, f1 + 200) && p.freq <= 2800
    );
    if (f2Band.length) {
      f2Band.sort((a, b) => b.amp - a.amp);
      f2 = f2Band[0].freq;
    }
    if (!f1 && filtered[0]) f1 = filtered[0].freq;
    if (!f2) {
      const n = filtered.find((p) => p.freq > f1 + 200);
      if (n) f2 = n.freq;
    }

    // Confidence: both formants found + reasonable F2>F1 spacing + energy
    let confidence = 0;
    if (f1 && f2 && f2 > f1 + 180) {
      confidence = 0.55;
      if (f2 - f1 > 250 && f2 - f1 < 2200) confidence += 0.2;
      if (energy > 1e-5) confidence += 0.1;
      if (f1Band.length && f2Band.length) confidence += 0.1;
    }

    return {
      f1: f1 || 0,
      f2: f2 || 0,
      confidence: Math.min(1, confidence),
      peaks: filtered.slice(0, 6),
    };
  }

  /** Levinson-Durbin LPC coefficients; returns a[0..order] with a[0]=1 */
  _lpcLevinson(x, order) {
    const n = x.length;
    const r = new Float32Array(order + 1);
    for (let k = 0; k <= order; k++) {
      let s = 0;
      for (let i = 0; i < n - k; i++) s += x[i] * x[i + k];
      r[k] = s;
    }
    if (r[0] < 1e-12) return null;

    const a = new Float32Array(order + 1);
    const aPrev = new Float32Array(order + 1);
    a[0] = 1;
    let e = r[0];

    for (let i = 1; i <= order; i++) {
      let acc = 0;
      for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
      const k = (r[i] - acc) / e;
      if (!isFinite(k) || Math.abs(k) >= 1) {
        // Unstable reflection — return best so far
        break;
      }
      aPrev.set(a);
      a[i] = k;
      for (let j = 1; j < i; j++) {
        a[j] = aPrev[j] - k * aPrev[i - j];
      }
      e *= 1 - k * k;
      if (e <= 1e-14) break;
    }
    // Convert to polynomial A(z) = 1 - sum a_k z^-k  (standard sign)
    // Our recursion produced prediction coeffs; negate for filter form used above
    const out = new Float32Array(order + 1);
    out[0] = 1;
    for (let i = 1; i <= order; i++) out[i] = -a[i];
    return out;
  }

  _loop() {
    if (!this.running || !this.analyser) return;

    this.analyser.getFloatTimeDomainData(this.timeData);
    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getFloatFrequencyData(this.freqFloat);

    const rmsRaw = this._rms(this.timeData);
    this.smoothRms = this._ema(this.smoothRms, rmsRaw, 0.25);
    const rms = this.smoothRms;

    const pitchRaw = this._detectPitchYIN(this.timeData, this.sampleRate);
    const clarity = pitchRaw ? pitchRaw.probability : 0;
    const rawVoiced = !!(
      pitchRaw &&
      pitchRaw.frequency > 70 &&
      pitchRaw.frequency < 1200 &&
      rmsRaw > 0.012 &&
      clarity > 0.72
    );

    // Voiced hold: require a few frames on, decay slowly off (kills flicker)
    if (rawVoiced) this.voicedHold = Math.min(12, this.voicedHold + 1);
    else this.voicedHold = Math.max(0, this.voicedHold - 2);
    const isVoiced = this.voicedHold >= 3;

    let pitchHz = null;
    if (rawVoiced) {
      // Ignore octave jumps / wild spikes vs smoothed pitch
      if (
        this.smoothPitch > 0 &&
        (pitchRaw.frequency > this.smoothPitch * 1.9 ||
          pitchRaw.frequency < this.smoothPitch * 0.55)
      ) {
        // likely octave error — keep previous
        pitchHz = this.smoothPitch;
      } else {
        this.smoothPitch = this._ema(this.smoothPitch, pitchRaw.frequency, 0.22);
        pitchHz = this.smoothPitch;
      }
      this.pitchHistory.push(pitchHz);
      if (this.pitchHistory.length > this.maxHistory) this.pitchHistory.shift();

      if (this.rangeScanning) {
        if (this.rangeLow === null || pitchHz < this.rangeLow) this.rangeLow = pitchHz;
        if (this.rangeHigh === null || pitchHz > this.rangeHigh) this.rangeHigh = pitchHz;
      }
    } else if (this.voicedHold === 0) {
      // fully silent — gently decay toward zero without snapping UI
      this.smoothPitch = this.smoothPitch * 0.92;
      if (this.smoothPitch < 80) this.smoothPitch = 0;
    } else if (this.smoothPitch > 0) {
      pitchHz = this.smoothPitch;
    }

    const f0ForFormants = pitchHz || this.smoothPitch || 0;
    // Prefer LPC formants (stable on sustained vowels); spectral envelope as backup
    const formantsLpc = isVoiced
      ? this._estimateFormantsLPC(this.timeData, this.sampleRate, f0ForFormants)
      : { f1: 0, f2: 0, confidence: 0, peaks: [] };
    const formantsSpec = this._estimateFormants(
      this.freqFloat,
      this.sampleRate,
      f0ForFormants
    );

    let formantsRaw = formantsLpc;
    if (!formantsLpc.f1 || !formantsLpc.f2 || formantsLpc.confidence < 0.35) {
      // Blend or fall back to spectral when LPC is weak (onsets, low SNR)
      if (formantsSpec.f1 && formantsSpec.f2) {
        if (formantsLpc.f1 && formantsLpc.f2) {
          const w = formantsLpc.confidence;
          formantsRaw = {
            f1: formantsLpc.f1 * w + formantsSpec.f1 * (1 - w),
            f2: formantsLpc.f2 * w + formantsSpec.f2 * (1 - w),
            confidence: Math.max(formantsLpc.confidence, 0.4),
            peaks: formantsSpec.peaks,
          };
        } else {
          formantsRaw = { ...formantsSpec, confidence: 0.45 };
        }
      }
    }

    if (isVoiced && formantsRaw.f1 && formantsRaw.f2) {
      // Outlier reject: ignore jumps larger than physiological step (~180 Hz F1 / 350 Hz F2)
      const okF1 =
        !this.smoothF1 ||
        Math.abs(formantsRaw.f1 - this.smoothF1) < 220 ||
        formantsRaw.confidence > 0.7;
      const okF2 =
        !this.smoothF2 ||
        Math.abs(formantsRaw.f2 - this.smoothF2) < 400 ||
        formantsRaw.confidence > 0.7;

      if (okF1) {
        this.f1History.push(formantsRaw.f1);
        if (this.f1History.length > 9) this.f1History.shift();
      }
      if (okF2) {
        this.f2History.push(formantsRaw.f2);
        if (this.f2History.length > 9) this.f2History.shift();
      }

      const medF1 = this._median(this.f1History) || formantsRaw.f1;
      const medF2 = this._median(this.f2History) || formantsRaw.f2;
      // Slow EMA on median — prioritizes consistency over snappiness
      const alpha = formantsRaw.confidence > 0.6 ? 0.18 : 0.1;
      this.smoothF1 = this._ema(this.smoothF1, medF1, alpha);
      this.smoothF2 = this._ema(this.smoothF2, medF2, alpha);
      this.formantConfidence = this._ema(
        this.formantConfidence || 0,
        formantsRaw.confidence || 0.5,
        0.2
      );
    } else if (!isVoiced) {
      this.formantConfidence = Math.max(0, (this.formantConfidence || 0) * 0.9);
    }

    const formants = {
      f1: this.smoothF1 || formantsRaw.f1 || 0,
      f2: this.smoothF2 || formantsRaw.f2 || 0,
      peaks: formantsRaw.peaks || formantsSpec.peaks || [],
      confidence: this.formantConfidence || 0,
    };

    const centroid = this._spectralCentroid(this.freqData, this.sampleRate);

    this.rmsHistory.push(rms);
    if (this.rmsHistory.length > this.maxHistory) this.rmsHistory.shift();

    const support = this._supportScore(this.rmsHistory, this.pitchHistory);
    const intonation = this._intonationScore(this.pitchHistory);
    const resonance = this._resonanceScore(formants, centroid, rms);
    const vibrato = this._vibratoEstimate(this.pitchHistory);

    const note = pitchHz ? this.freqToNote(pitchHz) : null;
    // Midi label hysteresis — don't flip note name on boundary noise
    if (note) {
      if (this.lastMidi === null) {
        this.lastMidi = note.midi;
        this.midiCandidate = null;
        this.midiCandidateCount = 0;
      } else if (note.midi === this.lastMidi) {
        this.midiCandidate = null;
        this.midiCandidateCount = 0;
      } else {
        // Require 5 consecutive frames on the same new midi before renaming
        if (this.midiCandidate === note.midi) {
          this.midiCandidateCount += 1;
        } else {
          this.midiCandidate = note.midi;
          this.midiCandidateCount = 1;
        }
        if (this.midiCandidateCount >= 5) {
          this.lastMidi = note.midi;
          this.midiCandidate = null;
          this.midiCandidateCount = 0;
        } else {
          // Hold previous note name; cents still track true pitch vs held note
          note.midi = this.lastMidi;
          note.name = NOTE_NAMES[((this.lastMidi % 12) + 12) % 12];
          note.octave = Math.floor(this.lastMidi / 12) - 1;
          note.label = `${note.name}${note.octave}`;
          const exactMidi = 69 + 12 * Math.log2(pitchHz / 440);
          note.cents = (exactMidi - this.lastMidi) * 100;
        }
      }
      // Smooth cents for display (needle calmness)
      this.smoothCents = this._ema(this.smoothCents, note.cents, 0.16);
      // Soft dead-zone near center so needle rests when essentially in tune
      const sc = Math.abs(this.smoothCents) < 3 ? this.smoothCents * 0.35 : this.smoothCents;
      note.cents = Math.round(sc);
      note.centsSmooth = sc;
    } else {
      this.smoothCents = this._ema(this.smoothCents, 0, 0.12);
    }

    const vowel = this._classifyVowel(
      formants.f1,
      formants.f2,
      pitchHz,
      isVoiced && formants.confidence > 0.28
    );

    const frame = {
      t: performance.now(),
      rms,
      volumeDb: rms > 0 ? 20 * Math.log10(rms) : -100,
      pitch: pitchHz,
      pitchConfidence: clarity,
      note,
      formants,
      formantConfidence: formants.confidence,
      centroid,
      vowel,
      support,
      intonation,
      resonance,
      vibrato,
      spectrum: this.freqData,
      waveform: this.timeData,
      sampleRate: this.sampleRate,
      rangeLow: this.rangeLow,
      rangeHigh: this.rangeHigh,
      isVoiced,
    };

    this._emit(frame);
    this.raf = requestAnimationFrame(() => this._loop());
  }

  // ── Pitch: YIN algorithm ──────────────────────────────────
  _detectPitchYIN(buf, sampleRate) {
    const threshold = 0.12;
    const bufSize = buf.length;
    const half = Math.floor(bufSize / 2);
    const yin = new Float32Array(half);

    // Difference function
    for (let tau = 1; tau < half; tau++) {
      let sum = 0;
      for (let i = 0; i < half; i++) {
        const d = buf[i] - buf[i + tau];
        sum += d * d;
      }
      yin[tau] = sum;
    }

    // Cumulative mean normalized difference
    yin[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < half; tau++) {
      runningSum += yin[tau];
      yin[tau] = runningSum === 0 ? 1 : (yin[tau] * tau) / runningSum;
    }

    // Absolute threshold
    let tauEstimate = -1;
    for (let tau = 2; tau < half; tau++) {
      if (yin[tau] < threshold) {
        while (tau + 1 < half && yin[tau + 1] < yin[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) {
      // Fallback: global min
      let minVal = 1;
      for (let tau = 2; tau < half; tau++) {
        if (yin[tau] < minVal) {
          minVal = yin[tau];
          tauEstimate = tau;
        }
      }
      if (minVal > 0.35) return null;
    }

    // Parabolic interpolation
    const x0 = tauEstimate > 0 ? tauEstimate - 1 : tauEstimate;
    const x2 = tauEstimate + 1 < half ? tauEstimate + 1 : tauEstimate;
    let betterTau = tauEstimate;
    if (x0 !== tauEstimate && x2 !== tauEstimate) {
      const s0 = yin[x0];
      const s1 = yin[tauEstimate];
      const s2 = yin[x2];
      const denom = 2 * s1 - s2 - s0;
      if (denom !== 0) betterTau = tauEstimate + (s2 - s0) / (2 * denom);
    }

    const frequency = sampleRate / betterTau;
    if (frequency < 55 || frequency > 1400) return null;

    const probability = 1 - yin[tauEstimate];
    return { frequency, probability };
  }

  _rms(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  /**
   * Formant estimate via harmonic-smeared spectral envelope.
   * Wide smoothing (~0.8–1.2× F0) collapses partials so peaks ≈ formants,
   * not individual harmonics.
   */
  _estimateFormants(freqFloat, sampleRate, f0) {
    const binCount = freqFloat.length;
    const nyquist = sampleRate / 2;
    const hzPerBin = nyquist / binCount;

    // Log-magnitude envelope
    const logMag = new Float32Array(binCount);
    for (let i = 0; i < binCount; i++) {
      // freqFloat is already dB; floor noise
      logMag[i] = Math.max(freqFloat[i], -100);
    }

    // Smooth width in bins: smear across ~1 F0 so harmonics merge into envelope
    const f0Safe = f0 > 80 ? f0 : 180;
    let win = Math.round((f0Safe * 0.9) / hzPerBin);
    win = Math.max(8, Math.min(48, win));

    const env = new Float32Array(binCount);
    for (let i = 0; i < binCount; i++) {
      let s = 0;
      let n = 0;
      for (let j = -win; j <= win; j++) {
        const k = i + j;
        if (k >= 0 && k < binCount) {
          // triangular weight
          const w = 1 - Math.abs(j) / (win + 1);
          s += logMag[k] * w;
          n += w;
        }
      }
      env[i] = s / n;
    }

    // Second pass light smooth
    const smooth = new Float32Array(binCount);
    const w2 = 3;
    for (let i = 0; i < binCount; i++) {
      let s = 0;
      let n = 0;
      for (let j = -w2; j <= w2; j++) {
        const k = i + j;
        if (k >= 0 && k < binCount) {
          s += env[k];
          n++;
        }
      }
      smooth[i] = s / n;
    }

    // Peak pick on envelope (not raw spectrum)
    const peaks = [];
    const minBin = Math.max(2, Math.floor(180 / hzPerBin));
    const maxBin = Math.min(binCount - 3, Math.floor(3200 / hzPerBin));
    // Minimum prominence above local floor
    const noiseFloor = -70;

    for (let i = minBin + 2; i < maxBin - 2; i++) {
      if (
        smooth[i] > smooth[i - 1] &&
        smooth[i] >= smooth[i + 1] &&
        smooth[i] > smooth[i - 2] &&
        smooth[i] >= smooth[i + 2] &&
        smooth[i] > noiseFloor
      ) {
        const a = smooth[i - 1];
        const b = smooth[i];
        const c = smooth[i + 1];
        const denom = a - 2 * b + c;
        const delta = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
        const freq = (i + delta) * hzPerBin;
        // Skip residual energy right on F0 / 2F0 when possible
        if (f0 > 80) {
          const harm = freq / f0;
          const nearest = Math.round(harm);
          if (nearest >= 1 && nearest <= 3 && Math.abs(harm - nearest) < 0.08) {
            // weak harmonic spike — only skip if not also a strong broad peak
            const localMean =
              (smooth[i - 3] + smooth[i - 2] + smooth[i + 2] + smooth[i + 3]) / 4;
            if (b - localMean < 3) continue;
          }
        }
        peaks.push({ freq, amp: b });
      }
    }

    // Prefer spacing: F1 then F2 with physiological ranges
    peaks.sort((a, b) => a.freq - b.freq);

    let f1 = 0;
    let f2 = 0;

    // F1 band: 200–950 Hz (open vowels high F1; closed low)
    const f1Cands = peaks.filter((p) => p.freq >= 200 && p.freq <= 1000);
    if (f1Cands.length) {
      // strongest in band
      f1Cands.sort((a, b) => b.amp - a.amp);
      f1 = f1Cands[0].freq;
    }

    // F2 band: above F1, typically 700–2800
    const f2Cands = peaks.filter(
      (p) => p.freq >= Math.max(700, f1 + 250) && p.freq <= 2800
    );
    if (f2Cands.length) {
      f2Cands.sort((a, b) => b.amp - a.amp);
      f2 = f2Cands[0].freq;
    }

    // Fallback: sequential peaks
    if (!f1 && peaks[0]) f1 = peaks[0].freq;
    if (!f2) {
      const next = peaks.find((p) => p.freq > f1 + 250);
      if (next) f2 = next.freq;
    }

    return {
      f1: f1 || 0,
      f2: f2 || 0,
      peaks: peaks.slice(0, 6),
    };
  }

  _spectralCentroid(freqData, sampleRate) {
    const binCount = freqData.length;
    const nyquist = sampleRate / 2;
    let num = 0;
    let den = 0;
    for (let i = 0; i < binCount; i++) {
      const mag = freqData[i];
      const freq = (i / binCount) * nyquist;
      num += freq * mag;
      den += mag;
    }
    return den > 0 ? num / den : 0;
  }

  _supportScore(rmsHist, pitchHist) {
    if (rmsHist.length < 8) return 0;
    const recent = rmsHist.slice(-24);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (mean < 0.008) return 0;

    let varSum = 0;
    for (const v of recent) varSum += (v - mean) ** 2;
    const cv = Math.sqrt(varSum / recent.length) / mean; // coefficient of variation

    // Pitch stability contributes
    let pitchStable = 0.5;
    if (pitchHist.length >= 8) {
      const p = pitchHist.slice(-24);
      const pMean = p.reduce((a, b) => a + b, 0) / p.length;
      let pVar = 0;
      for (const v of p) pVar += (v - pMean) ** 2;
      const pCv = Math.sqrt(pVar / p.length) / pMean;
      pitchStable = Math.max(0, 1 - pCv * 25);
    }

    // Lower amplitude CV = better support; typical good singer ~0.05–0.2
    const ampScore = Math.max(0, Math.min(1, 1 - (cv - 0.04) / 0.45));
    return Math.round((ampScore * 0.6 + pitchStable * 0.4) * 100);
  }

  _intonationScore(pitchHist) {
    if (pitchHist.length < 6) return 0;
    const recent = pitchHist.slice(-20);
    // Distance from nearest equal-tempered note in cents (stability + accuracy)
    let centsErr = 0;
    for (const f of recent) {
      const midi = 69 + 12 * Math.log2(f / 440);
      const nearest = Math.round(midi);
      centsErr += Math.abs((midi - nearest) * 100);
    }
    const avgCents = centsErr / recent.length;
    // 0¢ → 100, 30¢ → ~0
    return Math.round(Math.max(0, Math.min(100, 100 - avgCents * 3.2)));
  }

  _resonanceScore(formants, centroid, rms) {
    if (rms < 0.008) return 0;
    // Healthy singing often has energy in singer's formant region (~2.5–3.5 kHz)
    // and a clear F1/F2. Use centroid + formant presence as proxy.
    let score = 40;
    if (formants.f1 > 200 && formants.f1 < 1000) score += 20;
    if (formants.f2 > 700 && formants.f2 < 3000) score += 20;
    // Bright but not harsh centroid for voice
    if (centroid > 800 && centroid < 3500) score += 15;
    if (centroid > 1500 && centroid < 2800) score += 5;
    return Math.round(Math.min(100, score));
  }

  _vibratoEstimate(pitchHist) {
    if (pitchHist.length < 20) return { rate: 0, extent: 0 };
    const recent = pitchHist.slice(-36);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    // Rough extent in cents
    let maxDev = 0;
    for (const f of recent) {
      const cents = Math.abs(1200 * Math.log2(f / mean));
      if (cents > maxDev) maxDev = cents;
    }
    // Zero-crossing rate of detrend for rate estimate (~frames at 60fps)
    let zc = 0;
    let prev = recent[0] - mean;
    for (let i = 1; i < recent.length; i++) {
      const d = recent[i] - mean;
      if ((prev >= 0 && d < 0) || (prev < 0 && d >= 0)) zc++;
      prev = d;
    }
    // Approximate Hz assuming ~60 analysis frames/sec
    const rate = (zc / 2) * (60 / recent.length);
    return { rate, extent: maxDev };
  }

  /**
   * Vowel classification in log-formant space with voting + hysteresis.
   * More consistent: needs a clear majority before switching labels.
   */
  _classifyVowel(f1, f2, pitchHz, isVoiced) {
    if (!isVoiced || !f1 || !f2 || f1 < 150 || f2 < 400) {
      return this.vowelId
        ? this._vowelPayload(VOWEL_BY_ID[this.vowelId], f1, f2, pitchHz, true)
        : null;
    }

    // Soft elliptical distance in log-Hz (F1 = height/openness, F2 = front/back)
    const scores = VOWEL_MAP.map((v) => {
      const d1 = (Math.log(f1) - Math.log(v.f1)) / 0.28;
      const d2 = (Math.log(f2) - Math.log(v.f2)) / 0.32;
      // Prefer primary vowels slightly so we don't thrash into rare mods at boundaries
      const prior = v.primary ? 0 : 0.08;
      const d = Math.sqrt(d1 * d1 * 1.25 + d2 * d2) + prior;
      return { v, d };
    }).sort((a, b) => a.d - b.d);

    const best = scores[0].v;
    const bestD = scores[0].d;
    const runnerUp = scores[1];

    // Rolling vote window (~12 frames) — majority wins
    const VOTE_WINDOW = 12;
    const votes = this.vowelVotes;
    const key = best.id;
    votes.set(key, (votes.get(key) || 0) + 1);
    // Decay all votes
    for (const [id, c] of votes) {
      const next = id === key ? c : c * 0.85;
      if (next < 0.35) votes.delete(id);
      else votes.set(id, next);
    }
    // Cap total mass
    let total = 0;
    for (const c of votes.values()) total += c;
    if (total > VOTE_WINDOW) {
      const scale = VOTE_WINDOW / total;
      for (const [id, c] of votes) votes.set(id, c * scale);
    }

    let voteWinner = best.id;
    let voteBest = 0;
    for (const [id, c] of votes) {
      if (c > voteBest) {
        voteBest = c;
        voteWinner = id;
      }
    }

    const SWITCH_FRAMES = 10;
    const MARGIN = 0.18;

    if (!this.vowelId) {
      this.vowelId = voteWinner;
      this.vowelHold = SWITCH_FRAMES;
      this.vowelCandidate = null;
      this.vowelCandidateCount = 0;
    } else if (voteWinner === this.vowelId) {
      this.vowelHold = Math.min(30, this.vowelHold + 1);
      this.vowelCandidate = null;
      this.vowelCandidateCount = 0;
    } else {
      const current = VOWEL_BY_ID[this.vowelId];
      const dCurrent = Math.sqrt(
        ((Math.log(f1) - Math.log(current.f1)) / 0.28) ** 2 * 1.25 +
          ((Math.log(f2) - Math.log(current.f2)) / 0.32) ** 2
      );
      const clearlyBetter = bestD + MARGIN < dCurrent && voteBest >= 3.5;

      if (clearlyBetter) {
        if (this.vowelCandidate === voteWinner) this.vowelCandidateCount += 1;
        else {
          this.vowelCandidate = voteWinner;
          this.vowelCandidateCount = 1;
        }
        if (this.vowelCandidateCount >= SWITCH_FRAMES) {
          this.vowelId = voteWinner;
          this.vowelHold = SWITCH_FRAMES;
          this.vowelCandidate = null;
          this.vowelCandidateCount = 0;
        }
      } else {
        this.vowelCandidate = null;
        this.vowelCandidateCount = 0;
      }
    }

    const chosen = VOWEL_BY_ID[this.vowelId] || best;
    const payload = this._vowelPayload(chosen, f1, f2, pitchHz, false);
    // Confidence from both distance and vote majority
    const distConf = Math.max(0, Math.min(1, 1 - bestD / 1.4));
    const voteConf = Math.min(1, voteBest / 6);
    payload.confidence = distConf * 0.55 + voteConf * 0.45;
    payload.alt = runnerUp ? runnerUp.v.label : null;
    payload.distance = bestD;
    payload.name = payload.displayName;
    payload.source = 'audio';
    return payload;
  }

  _vowelPayload(v, f1, f2, pitchHz, stale) {
    if (!v) return null;
    const midi = pitchHz ? 69 + 12 * Math.log2(pitchHz / 440) : null;
    const high = midi != null && midi >= 64; // ~E4 and up — modification territory
    const midHigh = midi != null && midi >= 60;

    let modSuggestion = null;
    let modNote = null;

    if (high || midHigh) {
      const targetId = v.modifyToward;
      const target = targetId ? VOWEL_BY_ID[targetId] : null;
      if (target && target.id !== v.id) {
        modSuggestion = target;
        modNote = v.modifyHint || target.modifyHint;
      }
    }

    // If already on a modification, surface that clearly
    const displayName = v.isMod
      ? `${v.label} (${v.ipa}) · mod of ${VOWEL_BY_ID[v.modOf]?.label || v.modOf}`
      : `${v.label} (${v.ipa})`;

    return {
      id: v.id,
      label: v.label,
      ipa: v.ipa,
      example: v.example,
      primary: !!v.primary,
      isMod: !!v.isMod,
      family: v.family,
      displayName,
      name: displayName,
      f1: v.f1,
      f2: v.f2,
      measuredF1: f1,
      measuredF2: f2,
      modifyToward: v.modifyToward,
      modifyHint: v.modifyHint,
      modSuggestion: modSuggestion
        ? { id: modSuggestion.id, label: modSuggestion.label, ipa: modSuggestion.ipa }
        : null,
      modNote,
      highRange: high,
      stale,
    };
  }

  /** Chart labels for the formant plot (primary + key mods) */
  getVowelChartPoints() {
    return VOWEL_MAP.filter((v) => v.primary || ["ih", "aw", "uh", "uu"].includes(v.id));
  }

  freqToNote(freq) {
    if (!freq || freq <= 0) return null;
    const midi = 69 + 12 * Math.log2(freq / 440);
    const rounded = Math.round(midi);
    const cents = Math.round((midi - rounded) * 100);
    const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
    const octave = Math.floor(rounded / 12) - 1;
    return {
      name,
      octave,
      label: `${name}${octave}`,
      midi: rounded,
      cents,
      frequency: freq,
    };
  }

  noteToFreq(noteLabel) {
    // e.g. "A4", "C♯3"
    const m = noteLabel.match(/^([A-G])([♯#b]?)(-?\d+)$/);
    if (!m) return null;
    let name = m[1] + (m[2] === "#" ? "♯" : m[2] === "b" ? "♭" : m[2]);
    if (name.includes("♭")) {
      // Convert flat to sharp equivalent for lookup
      const flats = { "D♭": "C♯", "E♭": "D♯", "G♭": "F♯", "A♭": "G♯", "B♭": "A♯" };
      name = flats[name] || name;
    }
    const octave = parseInt(m[3], 10);
    const idx = NOTE_NAMES.indexOf(name);
    if (idx < 0) return null;
    const midi = (octave + 1) * 12 + idx;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  allNotes(fromMidi = 36, toMidi = 84) {
    const notes = [];
    for (let m = fromMidi; m <= toMidi; m++) {
      const name = NOTE_NAMES[((m % 12) + 12) % 12];
      const octave = Math.floor(m / 12) - 1;
      notes.push({
        midi: m,
        label: `${name}${octave}`,
        freq: this.midiToFreq(m),
      });
    }
    return notes;
  }

  // ── Reference tone ────────────────────────────────────────
  playTone(freq, duration = 1.2, type = "sine", gain = 0.12) {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = 0;
    osc.connect(g);
    g.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    g.gain.linearRampToValueAtTime(gain, now + 0.04);
    g.gain.linearRampToValueAtTime(gain * 0.85, now + duration * 0.7);
    g.gain.linearRampToValueAtTime(0, now + duration);
    osc.start(now);
    osc.stop(now + duration + 0.05);
    return osc;
  }

  playSequence(freqs, noteDur = 0.35, gap = 0.05, type = "sine") {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();

    let t = this.ctx.currentTime + 0.05;
    freqs.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.02);
      g.gain.linearRampToValueAtTime(0, t + noteDur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + noteDur + 0.02);
      t += noteDur + gap;
    });
    return t - this.ctx.currentTime;
  }

  // ── Metronome ─────────────────────────────────────────────
  createMetronome() {
    return new Metronome(this);
  }
}

export class Metronome {
  constructor(engine) {
    this.engine = engine;
    this.bpm = 80;
    this.subdiv = 1;
    this.playing = false;
    this.timer = null;
    this.beat = 0;
    this.onBeat = null;
  }

  setBpm(bpm) {
    this.bpm = Math.max(40, Math.min(200, bpm));
    if (this.playing) {
      this.stop();
      this.start();
    }
  }

  setSubdiv(n) {
    this.subdiv = n;
  }

  start() {
    if (this.playing) return;
    this.playing = true;
    this.beat = 0;
    this._tick();
  }

  stop() {
    this.playing = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.beat = 0;
  }

  _tick() {
    if (!this.playing) return;
    const interval = (60 / this.bpm / this.subdiv) * 1000;
    const isAccent = this.beat % (4 * this.subdiv) === 0;
    this._click(isAccent);
    if (this.onBeat) this.onBeat(this.beat, isAccent);
    this.beat++;
    this.timer = setTimeout(() => this._tick(), interval);
  }

  _click(accent) {
    const eng = this.engine;
    if (!eng.ctx) {
      eng.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (eng.ctx.state === "suspended") eng.ctx.resume();
    const osc = eng.ctx.createOscillator();
    const g = eng.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = accent ? 1200 : 800;
    g.gain.value = accent ? 0.08 : 0.045;
    osc.connect(g);
    g.connect(eng.ctx.destination);
    const now = eng.ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

// MediaRecorder helper for local takes
export class LocalRecorder {
  constructor() {
    this.recorder = null;
    this.chunks = [];
    this.blob = null;
    this.url = null;
    this.recording = false;
    this.startedAt = 0;
  }

  async start(stream) {
    this.chunks = [];
    this.blob = null;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;

    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

    this.recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.onstop = () => {
      this.blob = new Blob(this.chunks, { type: this.recorder.mimeType || "audio/webm" });
      this.url = URL.createObjectURL(this.blob);
    };
    this.recorder.start(200);
    this.recording = true;
    this.startedAt = Date.now();
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === "inactive") {
        this.recording = false;
        resolve(null);
        return;
      }
      this.recorder.onstop = () => {
        this.blob = new Blob(this.chunks, { type: this.recorder.mimeType || "audio/webm" });
        this.url = URL.createObjectURL(this.blob);
        this.recording = false;
        resolve(this.url);
      };
      this.recorder.stop();
    });
  }
}


