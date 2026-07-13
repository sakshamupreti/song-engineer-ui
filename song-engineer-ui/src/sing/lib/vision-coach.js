/**
 * Vision coach — local camera analysis (MediaPipe Tasks Vision).
 * Mouth / jaw cues for vowel fusion + posture / shoulder cues for coaching.
 * Fully on-device; no video leaves the browser.
 */

import { FaceLandmarker, PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/** Map mouth geometry → soft vowel vote (visual only) */
function visualVowelFromMouth({ jawOpen, pucker, smile, funnel }) {
  // Normalized 0–1 cues
  const open = jawOpen;
  const round = Math.max(pucker, funnel * 0.85);
  const spread = smile;

  // Heuristic regions in (open, round, spread) space
  const candidates = [
    { id: 'ee', score: (1 - open) * 0.35 + spread * 0.55 + (1 - round) * 0.25 },
    { id: 'aa', score: open * 0.55 + spread * 0.35 + (1 - round) * 0.2 },
    { id: 'ah', score: open * 0.6 + (1 - spread) * 0.25 + (1 - round) * 0.15 },
    { id: 'oh', score: open * 0.35 + round * 0.5 + (1 - spread) * 0.25 },
    { id: 'oo', score: (1 - open) * 0.35 + round * 0.6 + (1 - spread) * 0.25 },
    { id: 'uh', score: open * 0.4 + (1 - spread) * 0.3 + (1 - round) * 0.2 },
    { id: 'aw', score: open * 0.45 + round * 0.35 + (1 - spread) * 0.25 },
  ];
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const conf = Math.max(0.2, Math.min(0.95, best.score / 1.1));
  return { id: best.id, confidence: conf, scores: candidates };
}

function blendAvg(arr, key) {
  if (!arr || !arr.length) return 0;
  let s = 0;
  for (const c of arr) s += c[key] || 0;
  return s / arr.length;
}

export class VisionCoach {
  constructor() {
    this.video = null;
    this.stream = null;
    this.face = null;
    this.pose = null;
    this.running = false;
    this.raf = null;
    this.listeners = new Set();
    this.last = null;
    this.lastVideoTime = -1;
    this.ready = false;
    this.error = null;
    // Smoothed posture metrics
    this.smooth = {
      jawOpen: 0,
      pucker: 0,
      smile: 0,
      funnel: 0,
      shoulderTilt: 0,
      shoulderRaise: 0,
      headTilt: 0,
      chinForward: 0,
      torsoLean: 0,
    };
  }

  onFrame(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit(frame) {
    this.last = frame;
    for (const fn of this.listeners) fn(frame);
  }

  async start(videoEl) {
    if (this.running) return;
    this.error = null;
    this.video = videoEl;

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });
    this.video.srcObject = this.stream;
    this.video.playsInline = true;
    this.video.muted = true;
    await this.video.play();

    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      this.face = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_MODEL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
      });
      this.pose = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: POSE_MODEL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      this.ready = true;
    } catch (err) {
      // Retry CPU delegate if GPU fails
      console.warn('Vision GPU init failed, trying CPU', err);
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        this.face = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
        this.pose = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        this.ready = true;
      } catch (err2) {
        this.error = err2?.message || 'Vision models failed to load';
        this.stop();
        throw err2;
      }
    }

    this.running = true;
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
    if (this.video) {
      this.video.srcObject = null;
    }
    try {
      this.face?.close?.();
    } catch (_) {}
    try {
      this.pose?.close?.();
    } catch (_) {}
    this.face = null;
    this.pose = null;
    this.ready = false;
    this.last = null;
  }

  _loop() {
    if (!this.running || !this.video) return;
    const now = performance.now();
    if (
      this.video.readyState >= 2 &&
      this.video.currentTime !== this.lastVideoTime &&
      this.ready
    ) {
      this.lastVideoTime = this.video.currentTime;
      this._analyze(now);
    }
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _blendshapeMap(categories) {
    const m = {};
    if (!categories) return m;
    for (const c of categories) m[c.categoryName] = c.score;
    return m;
  }

  _ema(prev, next, a = 0.22) {
    if (!isFinite(next)) return prev;
    return prev + a * (next - prev);
  }

  _analyze(now) {
    const faceRes = this.face.detectForVideo(this.video, now);
    const poseRes = this.pose.detectForVideo(this.video, now);

    const bsList = faceRes.faceBlendshapes?.[0]?.categories;
    const bs = this._blendshapeMap(bsList);

    const jawOpen = bs.jawOpen ?? 0;
    const pucker = bs.mouthPucker ?? 0;
    const funnel = bs.mouthFunnel ?? 0;
    const smile =
      ((bs.mouthSmileLeft ?? 0) + (bs.mouthSmileRight ?? 0)) / 2;
    const mouthClose = bs.mouthClose ?? 0;

    this.smooth.jawOpen = this._ema(this.smooth.jawOpen, jawOpen);
    this.smooth.pucker = this._ema(this.smooth.pucker, pucker);
    this.smooth.funnel = this._ema(this.smooth.funnel, funnel);
    this.smooth.smile = this._ema(this.smooth.smile, smile);

    // Landmark geometry backup (lip aperture)
    let lipAperture = 0;
    let faceLandmarks = null;
    if (faceRes.faceLandmarks?.[0]) {
      faceLandmarks = faceRes.faceLandmarks[0];
      // Upper/lower inner lip approx indices in FaceLandmarker topology
      const upper = faceLandmarks[13];
      const lower = faceLandmarks[14];
      const left = faceLandmarks[78] || faceLandmarks[61];
      const right = faceLandmarks[308] || faceLandmarks[291];
      if (upper && lower) {
        lipAperture = Math.abs(lower.y - upper.y);
      }
      if (left && right) {
        const width = Math.hypot(right.x - left.x, right.y - left.y);
        if (width > 1e-4) lipAperture = lipAperture / width; // normalize
      }
    }

    const visualVowel = visualVowelFromMouth({
      jawOpen: Math.max(this.smooth.jawOpen, Math.min(1, lipAperture * 3.2)),
      pucker: this.smooth.pucker,
      smile: this.smooth.smile,
      funnel: this.smooth.funnel,
    });

    // Pose: shoulders, head, torso
    let shoulderTilt = 0;
    let shoulderRaise = 0;
    let headTilt = 0;
    let chinForward = 0;
    let torsoLean = 0;
    let poseOk = false;
    let poseLandmarks = null;

    if (poseRes.landmarks?.[0]) {
      poseOk = true;
      poseLandmarks = poseRes.landmarks[0];
      const ls = poseLandmarks[11]; // left shoulder
      const rs = poseLandmarks[12]; // right shoulder
      const le = poseLandmarks[7]; // left ear
      const re = poseLandmarks[8]; // right ear
      const nose = poseLandmarks[0];
      const lh = poseLandmarks[23]; // left hip
      const rh = poseLandmarks[24]; // right hip

      if (ls && rs && ls.visibility > 0.4 && rs.visibility > 0.4) {
        // Positive = right shoulder higher (mirror-aware: user-facing cam)
        shoulderTilt = (ls.y - rs.y) * 2.5;
        const midShoulderY = (ls.y + rs.y) / 2;
        const midEarY =
          le && re ? (le.y + re.y) / 2 : nose ? nose.y : midShoulderY;
        // Smaller gap = raised shoulders toward ears
        const neckGap = midShoulderY - midEarY;
        shoulderRaise = Math.max(0, Math.min(1, 1 - neckGap / 0.12));
      }

      if (le && re) {
        headTilt = (le.y - re.y) * 3;
      }

      if (nose && ls && rs) {
        const midX = (ls.x + rs.x) / 2;
        const midY = (ls.y + rs.y) / 2;
        // Chin / head forward of shoulder plane (z if available, else y drop)
        if (nose.z != null && ls.z != null) {
          chinForward = Math.max(0, Math.min(1, (ls.z + rs.z) / 2 - nose.z));
        } else {
          chinForward = Math.max(0, Math.min(1, (nose.y - midY + 0.08) * 4));
        }
        void midX;
      }

      if (lh && rh && ls && rs) {
        const midShoulder = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
        const midHip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
        torsoLean = (midShoulder.x - midHip.x) * 3;
      }
    }

    this.smooth.shoulderTilt = this._ema(this.smooth.shoulderTilt, shoulderTilt, 0.15);
    this.smooth.shoulderRaise = this._ema(this.smooth.shoulderRaise, shoulderRaise, 0.12);
    this.smooth.headTilt = this._ema(this.smooth.headTilt, headTilt, 0.15);
    this.smooth.chinForward = this._ema(this.smooth.chinForward, chinForward, 0.12);
    this.smooth.torsoLean = this._ema(this.smooth.torsoLean, torsoLean, 0.12);

    const cues = this._buildCues();

    this._emit({
      t: now,
      facePresent: !!(faceRes.faceLandmarks && faceRes.faceLandmarks.length),
      posePresent: poseOk,
      mouth: {
        jawOpen: this.smooth.jawOpen,
        pucker: this.smooth.pucker,
        smile: this.smooth.smile,
        funnel: this.smooth.funnel,
        mouthClose,
        lipAperture,
      },
      visualVowel,
      posture: {
        shoulderTilt: this.smooth.shoulderTilt,
        shoulderRaise: this.smooth.shoulderRaise,
        headTilt: this.smooth.headTilt,
        chinForward: this.smooth.chinForward,
        torsoLean: this.smooth.torsoLean,
      },
      cues,
      faceLandmarks,
      poseLandmarks,
    });
  }

  _buildCues() {
    const p = this.smooth;
    const cues = [];

    if (p.shoulderRaise > 0.55) {
      cues.push({
        id: 'shoulders-up',
        severity: p.shoulderRaise > 0.75 ? 'high' : 'med',
        kind: 'priority',
        text:
          'Shoulders creeping toward the ears — drop them softly on the exhale. Think “heavy coat hangers,” not a shrug. Tension in the neck steals high-note freedom.',
      });
    }

    if (Math.abs(p.shoulderTilt) > 0.12) {
      cues.push({
        id: 'shoulders-tilt',
        severity: 'med',
        kind: 'priority',
        text:
          'Shoulders look uneven. Level them over the hips so the ribcage can expand symmetrically — uneven posture often creates uneven breath support.',
      });
    }

    if (p.chinForward > 0.45) {
      cues.push({
        id: 'chin-forward',
        severity: p.chinForward > 0.65 ? 'high' : 'med',
        kind: 'priority',
        text:
          'Chin is jutting forward. Lengthen the back of the neck (gentle nod, crown tall). A stuck-out chin raises the larynx and thins the tone.',
      });
    }

    if (Math.abs(p.headTilt) > 0.14) {
      cues.push({
        id: 'head-tilt',
        severity: 'low',
        kind: 'muted',
        text:
          'Head is tilting. Balance the ears over the shoulders — a level head keeps resonance paths clearer.',
      });
    }

    if (Math.abs(p.torsoLean) > 0.18) {
      cues.push({
        id: 'torso-lean',
        severity: 'med',
        kind: 'priority',
        text:
          'Torso is leaning off-center. Stack ribs over hips. A collapsed side limits appoggio on that half of the body.',
      });
    }

    // Mouth coaching for singing shape
    if (p.smile > 0.55 && p.jawOpen < 0.25) {
      cues.push({
        id: 'spread-ee',
        severity: 'med',
        kind: 'priority',
        text:
          'Mouth is very spread (wide grin). On mid/high notes, trade horizontal spread for vertical space — “tall Ee,” not a smile. Spread jaws often raise the larynx.',
      });
    }

    if (p.jawOpen > 0.72) {
      cues.push({
        id: 'jaw-max',
        severity: 'low',
        kind: 'muted',
        text:
          'Jaw is very dropped. Only open as far as the pitch needs — excess drop can destabilize the tongue and soft palate.',
      });
    }

    if (p.pucker > 0.6 && p.jawOpen < 0.15) {
      cues.push({
        id: 'tight-oo',
        severity: 'low',
        kind: 'muted',
        text:
          'Lips are tightly puckered. Keep Oo/Oh round but unclenched — free the inner space so the tone doesn’t pinch.',
      });
    }

    // Good posture streak
    if (
      p.shoulderRaise < 0.35 &&
      Math.abs(p.shoulderTilt) < 0.08 &&
      p.chinForward < 0.35 &&
      Math.abs(p.torsoLean) < 0.12
    ) {
      cues.push({
        id: 'posture-good',
        severity: 'good',
        kind: 'good',
        text:
          'Posture looks balanced — shoulders soft, head stacked. Keep ribs buoyant as you inhale; don’t lock the abs.',
      });
    }

    return cues;
  }
}

// Re-export unified fusion (formants + camera + pitch mods)
export { fuseVowel, unifyVowelAnalysis } from './vowel-fusion';
