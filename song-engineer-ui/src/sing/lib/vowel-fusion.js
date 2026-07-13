/**
 * Unified vowel engine for Sing Studio
 * ─────────────────────────────────────
 * Combines:
 *   1. Acoustic formants (F1/F2) — spectral truth for sung vowels
 *   2. Camera mouth shape — jaw / spread / round
 *   3. Pitch (MIDI) — when to modify (aggiustamento)
 *
 * Outputs a stable vowel label + modification path with progress bars.
 */

import { VOWEL_MAP, VOWEL_BY_ID } from './audio-engine.js';

/** Family chains: ordered from speech-pure → high-note modified */
export const MOD_CHAINS = {
  ee: ['ee', 'ih', 'eh'],
  aa: ['aa', 'ah', 'uh', 'aw'],
  ah: ['ah', 'aw', 'oh'],
  oh: ['oh', 'uu', 'oo'],
  oo: ['oo', 'uu'],
};

/**
 * Pitch zones (MIDI) where each step of a chain becomes the target.
 * Below startMidi: stay on pure/speech form.
 * Between start and full: blend toward next mod (bar fills).
 * Above fullMidi: next mod is strongly recommended.
 *
 * Reference: C4=60, E4=64, G4=67, A4=69, C5=72, E5=76
 */
export const MOD_PITCH_ZONES = {
  ee: [
    { id: 'ee', start: 0, full: 62 },
    { id: 'ih', start: 62, full: 67 },
    { id: 'eh', start: 67, full: 72 },
  ],
  aa: [
    { id: 'aa', start: 0, full: 60 },
    { id: 'ah', start: 60, full: 65 },
    { id: 'uh', start: 65, full: 69 },
    { id: 'aw', start: 69, full: 74 },
  ],
  ah: [
    { id: 'ah', start: 0, full: 63 },
    { id: 'aw', start: 63, full: 68 },
    { id: 'oh', start: 68, full: 73 },
  ],
  oh: [
    { id: 'oh', start: 0, full: 64 },
    { id: 'uu', start: 64, full: 70 },
    { id: 'oo', start: 70, full: 76 },
  ],
  oo: [
    { id: 'oo', start: 0, full: 66 },
    { id: 'uu', start: 66, full: 74 }, // open slightly if tight
  ],
};

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function logDist(f1a, f2a, f1b, f2b) {
  if (!f1a || !f2a || !f1b || !f2b) return 99;
  const d1 = (Math.log(f1a) - Math.log(f1b)) / 0.28;
  const d2 = (Math.log(f2a) - Math.log(f2b)) / 0.32;
  return Math.sqrt(d1 * d1 * 1.25 + d2 * d2);
}

function acousticScores(f1, f2) {
  if (!f1 || !f2) return [];
  return VOWEL_MAP.map((v) => {
    const d = logDist(f1, f2, v.f1, v.f2);
    // Softmax-ish score: lower distance → higher score
    const score = Math.exp(-d * 1.6);
    return { id: v.id, score, d, v };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Map mouth geometry to soft scores over all vowels (including mods).
 */
export function visualScoresFromMouth(mouth = {}) {
  const open = clamp01(mouth.jawOpen ?? 0);
  const round = clamp01(Math.max(mouth.pucker ?? 0, (mouth.funnel ?? 0) * 0.85));
  const spread = clamp01(mouth.smile ?? 0);
  // Closed-ish
  const close = clamp01(1 - open);

  const raw = {
    ee: close * 0.3 + spread * 0.55 + (1 - round) * 0.25,
    ih: close * 0.25 + spread * 0.4 + (1 - round) * 0.2 + open * 0.15,
    eh: open * 0.35 + spread * 0.35 + (1 - round) * 0.2,
    aa: open * 0.55 + spread * 0.35 + (1 - round) * 0.2,
    ah: open * 0.6 + (1 - spread) * 0.25 + (1 - round) * 0.15,
    uh: open * 0.4 + (1 - spread) * 0.3 + (1 - round) * 0.2,
    aw: open * 0.45 + round * 0.35 + (1 - spread) * 0.25,
    oh: open * 0.35 + round * 0.5 + (1 - spread) * 0.25,
    uu: close * 0.25 + round * 0.45 + (1 - spread) * 0.2 + open * 0.15,
    oo: close * 0.35 + round * 0.6 + (1 - spread) * 0.25,
    schwa: open * 0.35 + (1 - spread) * 0.25 + (1 - round) * 0.2,
  };

  const entries = Object.entries(raw).map(([id, score]) => ({ id, score }));
  entries.sort((a, b) => b.score - a.score);
  const max = entries[0]?.score || 1;
  return entries.map((e) => ({
    ...e,
    score: e.score / max,
    confidence: clamp01(e.score / 1.05),
  }));
}

function familyOf(id) {
  return VOWEL_BY_ID[id]?.family || id;
}

/**
 * Pitch-aware prior: at high pitches, boost modified vowels in the chain.
 */
function pitchPriorBoost(id, midi) {
  if (midi == null) return 0;
  const fam = familyOf(id);
  const zones = MOD_PITCH_ZONES[fam];
  if (!zones) return 0;
  // Find which zone this id is in
  const idx = zones.findIndex((z) => z.id === id);
  if (idx < 0) return 0;
  const z = zones[idx];
  if (midi < z.start) return idx === 0 ? 0.08 : -0.05;
  if (midi >= z.full) return 0.15;
  // Ramping in
  const t = (midi - z.start) / Math.max(1, z.full - z.start);
  return 0.05 + t * 0.12;
}

/**
 * Resolve the recommended modification target for a family at this pitch.
 *
 * `idealId`  — vowel you should be shading toward at this MIDI
 * `nextId`   — same as ideal when singer is still on a lower/pure form (UI target)
 * `pitchProgress` — 0–1 fill of the bar as pitch climbs through the transition band
 */
export function getModTargetForPitch(family, midi) {
  const zones = MOD_PITCH_ZONES[family] || MOD_CHAINS[family]?.map((id, i) => ({
    id,
    start: 60 + i * 4,
    full: 64 + i * 4,
  }));
  if (!zones || !zones.length) return null;

  const chain = zones.map((z) => z.id);
  const pure = zones[0];

  if (midi == null) {
    return {
      family,
      currentId: pure.id,
      idealId: pure.id,
      nextId: zones[1]?.id || null,
      pitchProgress: 0,
      urgency: 0,
      zone: pure,
      chain,
    };
  }

  // Find the highest zone whose start <= midi (ideal landing)
  let idealIdx = 0;
  for (let i = 0; i < zones.length; i++) {
    if (midi >= zones[i].start) idealIdx = i;
  }
  const ideal = zones[idealIdx];
  const prev = idealIdx > 0 ? zones[idealIdx - 1] : null;

  // Progress through the band that lands on `ideal`
  // From prev.full (or ideal.start) → ideal.full
  let pitchProgress = 0;
  if (idealIdx === 0) {
    // Still in pure zone — bar only starts near the end of pure
    const next = zones[1];
    if (next) {
      // Ramp 0→1 from a bit before next.start to next.full
      const bandStart = pure.full;
      const bandEnd = next.full;
      pitchProgress = clamp01((midi - bandStart) / Math.max(1, bandEnd - bandStart));
    } else {
      pitchProgress = 0;
    }
  } else {
    const bandStart = prev ? prev.full : ideal.start;
    const bandEnd = ideal.full;
    pitchProgress = clamp01((midi - bandStart) / Math.max(1, bandEnd - bandStart));
  }

  // UI target: if pitch is past pure.full, point at ideal (or next step if already ideal)
  let nextId = null;
  if (idealIdx === 0 && zones[1] && midi >= pure.full) {
    nextId = zones[1].id;
  } else if (idealIdx === 0 && zones[1] && midi >= pure.full - 2) {
    // early warning a little before
    nextId = zones[1].id;
    pitchProgress = Math.max(pitchProgress, clamp01((midi - (pure.full - 2)) / Math.max(1, zones[1].full - (pure.full - 2))));
  } else if (idealIdx > 0) {
    nextId = ideal.id;
    // If already at ideal and there's a further step rising, show further target when near ideal.full
    const further = zones[idealIdx + 1];
    if (further && midi >= ideal.full - 1) {
      nextId = further.id;
      pitchProgress = clamp01((midi - (ideal.full - 1)) / Math.max(1, further.full - (ideal.full - 1)));
    }
  }

  const urgency = nextId ? clamp01(pitchProgress) : 0;

  return {
    family,
    currentId: ideal.id,
    idealId: ideal.id,
    nextId,
    pitchProgress: clamp01(pitchProgress),
    urgency,
    zone: ideal,
    chain,
  };
}

/**
 * Acoustic progress from current vowel formants toward a target vowel's F1/F2.
 * 0 = still at current center, 1 = at target center.
 */
export function acousticProgressToward(f1, f2, fromId, toId) {
  const from = VOWEL_BY_ID[fromId];
  const to = VOWEL_BY_ID[toId];
  if (!from || !to || !f1 || !f2) return 0;

  const dFrom = logDist(f1, f2, from.f1, from.f2);
  const dTo = logDist(f1, f2, to.f1, to.f2);
  const span = logDist(from.f1, from.f2, to.f1, to.f2) || 1;

  // Projection along path: closer to `to` relative to span
  // If closer to target than source, progress rises
  const raw = (dFrom - dTo + span) / (2 * span);
  return clamp01(raw);
}

/**
 * Mouth progress toward a target mod (using visual scores).
 */
export function visualProgressToward(visionScores, toId) {
  if (!visionScores?.length || !toId) return 0;
  const hit = visionScores.find((s) => s.id === toId);
  const best = visionScores[0];
  if (!hit) return 0;
  return clamp01(hit.score / Math.max(0.2, best.score));
}

/**
 * Full unified fusion + modification guidance.
 *
 * @param {object} opts
 * @param {object|null} opts.audioVowel - from AudioEngine
 * @param {object|null} opts.formants - { f1, f2, confidence }
 * @param {number|null} opts.pitchHz
 * @param {object|null} opts.vision - vision frame
 * @param {boolean} opts.isVoiced
 */
export function unifyVowelAnalysis({
  audioVowel = null,
  formants = null,
  pitchHz = null,
  vision = null,
  isVoiced = false,
} = {}) {
  const f1 = formants?.f1 || audioVowel?.measuredF1 || 0;
  const f2 = formants?.f2 || audioVowel?.measuredF2 || 0;
  const formantConf = formants?.confidence ?? audioVowel?.confidence ?? 0;
  const midi =
    pitchHz && pitchHz > 0 ? 69 + 12 * Math.log2(pitchHz / 440) : null;

  const acScores = acousticScores(f1, f2);
  // Prefer the same visual scorer the camera coach uses
  const visScores =
    vision?.facePresent && vision.mouth
      ? visualScoresFromMouth(vision.mouth)
      : vision?.visualVowel?.scores
        ? vision.visualVowel.scores.map((s) => ({
            id: s.id,
            score: s.score,
            confidence: s.score,
          }))
        : [];

  // Camera coach winner (what the user sees in Camera Coach)
  const camId =
    vision?.facePresent && vision?.visualVowel?.id
      ? vision.visualVowel.id
      : visScores[0]?.id || null;
  const camConf = vision?.visualVowel?.confidence ?? visScores[0]?.confidence ?? 0;

  // Normalize acoustic scores
  const acMax = acScores[0]?.score || 1;
  const acNorm = acScores.map((s) => ({
    id: s.id,
    score: s.score / acMax,
    d: s.d,
  }));

  // Combined score map
  const ids = new Set([
    ...acNorm.map((s) => s.id),
    ...visScores.map((s) => s.id),
    ...(camId ? [camId] : []),
  ]);
  const combined = [];

  const hasVision = !!(vision?.facePresent && (visScores.length > 0 || camId));
  // Camera is more reliable for vowel *identity* in practice — weight it higher when present.
  // Formants still refine confidence and drive the measured F1/F2 readout.
  let wVision = 0;
  let wAudio = 1;
  if (hasVision) {
    // Base: favor camera; only lean audio when formants are very strong AND camera is weak
    wVision = clamp01(0.55 + camConf * 0.35 - formantConf * 0.15);
    wAudio = 1 - wVision;
  }

  for (const id of ids) {
    const a = acNorm.find((s) => s.id === id)?.score || 0;
    const v = visScores.find((s) => s.id === id)?.score || 0;
    const prior = pitchPriorBoost(id, midi);
    // Extra boost when this is the camera's top pick
    const camBoost = camId === id ? 0.22 * camConf : 0;
    const score = a * wAudio + v * wVision + prior + camBoost;
    combined.push({ id, score, a, v, prior, camBoost });
  }
  combined.sort((a, b) => b.score - a.score);

  let bestId = combined[0]?.id || camId || audioVowel?.id || null;

  // When camera is live and reasonably confident, lock label to camera vowel
  // (this is what users trust — formant panel must match Camera Coach)
  if (hasVision && camId && camConf >= 0.35) {
    bestId = camId;
  } else if (audioVowel?.id && !audioVowel.stale && !hasVision) {
    // Audio-only hysteresis
    const audioRank = combined.findIndex((c) => c.id === audioVowel.id);
    const best = combined[0];
    if (
      audioRank >= 0 &&
      best &&
      combined[audioRank].score >= best.score * 0.88
    ) {
      bestId = audioVowel.id;
    }
  }

  // If not voiced: still show camera vowel when face is present (mouth shape without phonation)
  if (!isVoiced) {
    if (hasVision && camId) {
      const camVowel = buildVowelPayload(camId, f1, f2, midi, {
        stale: false,
        confidence: camConf * 0.85,
        source: 'vision',
        visionId: camId,
        visionConfidence: camConf,
        displayLead: 'camera',
      });
      return finalize(camVowel, f1, f2, midi, vision, visScores, {
        preferPrototype: true,
        prototypeBlend: 0.85,
      });
    }
    if (audioVowel) {
      const held = buildVowelPayload(audioVowel.id, f1, f2, midi, {
        stale: true,
        confidence: (audioVowel.confidence || 0.3) * 0.7,
        source: 'hold',
        visionId: vision?.visualVowel?.id,
      });
      return finalize(held, f1, f2, midi, vision, visScores);
    }
    return finalize(null, f1, f2, midi, vision, visScores);
  }

  if (!bestId) {
    return finalize(null, f1, f2, midi, vision, visScores);
  }

  const bestEntry = combined.find((c) => c.id === bestId) || combined[0];
  const agree =
    hasVision &&
    camId &&
    (camId === bestId || familyOf(camId) === familyOf(bestId));

  const conf = clamp01(
    hasVision
      ? camConf * 0.55 + (bestEntry?.score || 0.4) * 0.25 + formantConf * 0.1 + (agree ? 0.1 : 0)
      : (bestEntry?.score || 0.4) * 0.55 + formantConf * 0.35
  );

  const source = hasVision
    ? agree
      ? 'fused'
      : bestId === camId
        ? 'vision'
        : 'audio+vision'
    : 'audio';

  const vowel = buildVowelPayload(bestId, f1, f2, midi, {
    stale: false,
    confidence: conf,
    source,
    visionId: camId || visScores[0]?.id,
    visionConfidence: camConf,
    alt: combined.find((c) => c.id !== bestId)?.id || null,
    displayLead: hasVision && bestId === camId ? 'camera' : 'formants',
  });

  // Pull the map dot toward the camera/fused vowel prototype so space matches the label
  const preferPrototype = hasVision && bestId === camId;
  const prototypeBlend = preferPrototype
    ? clamp01(0.45 + camConf * 0.4) // 0.45–0.85 toward prototype
    : 0;

  return finalize(vowel, f1, f2, midi, vision, visScores, {
    preferPrototype,
    prototypeBlend,
  });
}

function buildVowelPayload(id, f1, f2, midi, extra = {}) {
  const v = VOWEL_BY_ID[id];
  if (!v) return null;

  const fam = v.family || id;
  const modInfo = getModTargetForPitch(fam, midi);

  // Target = pitch-ideal vowel if different from what we're labeling now
  let nextId = null;
  let pitchProgress = modInfo?.pitchProgress ?? 0;

  if (modInfo) {
    const ideal = modInfo.idealId || modInfo.currentId;
    const chain = modInfo.chain || [];
    const zones = MOD_PITCH_ZONES[fam] || [];
    const sungIdx = Math.max(0, chain.indexOf(id));
    const idealIdx = Math.max(0, chain.indexOf(ideal));

    // Step-by-step: never skip — next target is one step up the chain toward ideal
    const stepIdx = Math.min(sungIdx + 1, Math.max(sungIdx + 1, idealIdx));
    // If pitch only lightly in mod range, still offer first step
    const demandIdx = idealIdx > sungIdx ? Math.min(sungIdx + 1, idealIdx) : sungIdx;

    if (demandIdx > sungIdx && chain[demandIdx]) {
      nextId = chain[demandIdx];
      const fromZ = zones[sungIdx] || zones[0];
      const toZ = zones[demandIdx] || zones[zones.length - 1];
      if (fromZ && toZ && midi != null) {
        pitchProgress = clamp01(
          (midi - fromZ.full) / Math.max(1, toZ.full - fromZ.full)
        );
      } else {
        pitchProgress = modInfo.pitchProgress;
      }
    } else if (modInfo.nextId && modInfo.nextId !== id && midi != null) {
      // Already matching ideal — further climb
      nextId = modInfo.nextId;
      pitchProgress = modInfo.pitchProgress;
    } else {
      nextId = null;
      pitchProgress = 0;
    }
    void stepIdx;
  }

  // Fallback chain step from vowel definition
  if (!nextId && v.modifyToward && v.modifyToward !== id && midi != null && midi >= 62) {
    nextId = v.modifyToward;
    pitchProgress = Math.max(pitchProgress, clamp01((midi - 62) / 10));
  }

  const next = nextId ? VOWEL_BY_ID[nextId] : null;

  const high = midi != null && midi >= 64;
  const midHigh = midi != null && midi >= 60;

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
    family: fam,
    displayName,
    name: displayName,
    f1: v.f1,
    f2: v.f2,
    measuredF1: f1,
    measuredF2: f2,
    modifyToward: v.modifyToward,
    modifyHint: v.modifyHint,
    modSuggestion: next
      ? { id: next.id, label: next.label, ipa: next.ipa }
      : null,
    modNote: v.modifyHint || next?.modifyHint || null,
    highRange: high,
    midHigh,
    midi,
    pitchProgress,
    modUrgency: modInfo?.urgency ?? 0,
    modChain: modInfo?.chain || MOD_CHAINS[fam] || [id],
    modCurrentId: modInfo?.currentId || id,
    modNextId: next?.id || null,
    ...extra,
  };
}

function finalize(vowel, f1, f2, midi, vision, visScores, displayOpts = {}) {
  if (!vowel) {
    return {
      vowel: null,
      modification: null,
      formantDot: f1 && f2 ? { f1, f2 } : null,
    };
  }

  const fromId = vowel.id;
  const toId = vowel.modNextId || vowel.modSuggestion?.id;
  const pitchProg = vowel.pitchProgress ?? 0;

  // Display position on vowel map: blend measured formants toward prototype of the
  // *labeled* vowel so the red dot sits with the camera/fused identity.
  const proto = VOWEL_BY_ID[fromId];
  const blend = displayOpts.prototypeBlend || 0;
  let displayF1 = f1;
  let displayF2 = f2;
  if (proto && blend > 0 && f1 && f2) {
    displayF1 = f1 * (1 - blend) + proto.f1 * blend;
    displayF2 = f2 * (1 - blend) + proto.f2 * blend;
  } else if (proto && blend > 0.7 && (!f1 || !f2)) {
    displayF1 = proto.f1;
    displayF2 = proto.f2;
  }

  let acousticProg = 0;
  let visualProg = 0;
  if (toId) {
    acousticProg = acousticProgressToward(f1 || displayF1, f2 || displayF2, fromId, toId);
    visualProg = visualProgressToward(visScores, toId);
  }

  // Combined progress bar: pitch drives need; acoustic+visual show if you're actually modifying
  // When pitch is high, bar should rise; if singer already shaped toward mod, fill even more
  const shapeProg = clamp01(acousticProg * 0.65 + visualProg * 0.35);
  // Display bar: primarily pitch (need to modify) with shape as secondary confirmation
  // User asked: "bar that increases as the pitch increases towards the next suggested vowel"
  const pitchBar = pitchProg;
  // Shape bar: are formants/mouth moving toward the suggested mod?
  const shapeBar = toId ? shapeProg : 0;
  // Unified "mod readiness" — high when pitch demands mod AND/OR shape is already there
  const combinedBar = toId
    ? clamp01(pitchBar * 0.7 + shapeBar * 0.3 + (pitchBar > 0.5 ? shapeBar * 0.15 : 0))
    : 0;

  const fromV = VOWEL_BY_ID[fromId];
  const toV = toId ? VOWEL_BY_ID[toId] : null;

  const noteLabel =
    midi != null
      ? (() => {
          const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
          const r = Math.round(midi);
          return `${names[((r % 12) + 12) % 12]}${Math.floor(r / 12) - 1}`;
        })()
      : null;

  let status = 'stable';
  let coachLine = `${vowel.label} [${vowel.ipa}] as in “${vowel.example}”`;
  const lead = vowel.displayLead || vowel.source;

  if (toV && pitchBar > 0.15) {
    status = pitchBar > 0.75 ? 'modify-now' : 'modify-soon';
    coachLine =
      pitchBar > 0.75
        ? `Pitch ${noteLabel || ''} — migrate ${fromV?.label} → ${toV.label} [${toV.ipa}]. ${vowel.modifyHint || toV.modifyHint || ''}`
        : `Rising through range — begin shading ${fromV?.label} toward ${toV.label} [${toV.ipa}]`;
  } else if (vowel.isMod) {
    status = 'modified';
    coachLine = `On modification ${vowel.label} [${vowel.ipa}] — good for this pitch. ${vowel.modifyHint || ''}`;
  } else if (lead === 'camera' || vowel.source === 'vision') {
    coachLine = `${vowel.label} [${vowel.ipa}] · camera mouth (map follows)`;
  } else if (vowel.source === 'fused') {
    coachLine = `${vowel.label} [${vowel.ipa}] · camera + formants agree`;
  }

  // Chain chips for UI
  const chain = (vowel.modChain || []).map((id) => {
    const vv = VOWEL_BY_ID[id];
    return {
      id,
      label: vv?.label || id,
      ipa: vv?.ipa || '',
      active: id === vowel.id,
      target: id === toId,
    };
  });

  return {
    vowel: {
      ...vowel,
      coachLine,
      status,
      // Display formants used by the map (may be prototype-blended)
      displayF1,
      displayF2,
      measuredF1: f1,
      measuredF2: f2,
    },
    modification: toV
      ? {
          from: { id: fromId, label: fromV?.label, ipa: fromV?.ipa, f1: fromV?.f1, f2: fromV?.f2 },
          to: { id: toId, label: toV.label, ipa: toV.ipa, f1: toV.f1, f2: toV.f2 },
          pitchProgress: pitchBar,
          shapeProgress: shapeBar,
          combinedProgress: combinedBar,
          acousticProgress: acousticProg,
          visualProgress: visualProg,
          urgency: vowel.modUrgency,
          noteLabel,
          midi,
          hint: vowel.modifyHint || toV.modifyHint || '',
          chain,
          status,
        }
      : {
          from: { id: fromId, label: fromV?.label, ipa: fromV?.ipa, f1: fromV?.f1, f2: fromV?.f2 },
          to: null,
          pitchProgress: 0,
          shapeProgress: 0,
          combinedProgress: 0,
          acousticProgress: 0,
          visualProgress: 0,
          urgency: 0,
          noteLabel,
          midi,
          hint: 'In a comfortable range — pure vowel is fine.',
          chain,
          status: 'stable',
        },
    formantDot:
      displayF1 && displayF2
        ? { f1: displayF1, f2: displayF2, measuredF1: f1, measuredF2: f2 }
        : null,
  };
}

/**
 * Backward-compatible fuse used by vision module.
 */
export function fuseVowel(audioVowel, visionFrame) {
  const result = unifyVowelAnalysis({
    audioVowel,
    formants: audioVowel
      ? {
          f1: audioVowel.measuredF1,
          f2: audioVowel.measuredF2,
          confidence: audioVowel.confidence,
        }
      : null,
    pitchHz: audioVowel?.midi
      ? 440 * Math.pow(2, (audioVowel.midi - 69) / 12)
      : null,
    vision: visionFrame,
    isVoiced: !!(audioVowel && !audioVowel.stale),
  });
  return result.vowel;
}
