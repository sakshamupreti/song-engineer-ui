/**
 * Rule-based vocal coaching — no AI models.
 * Tips derived from pitch stability, formants, support, resonance, dynamics.
 */

export class VocalCoach {
  constructor() {
    this.lastTips = [];
    this.tipCooldown = new Map();
    this.goodStreak = 0;
  }

  /**
   * @param {object} frame - analysis frame from AudioEngine
   * @param {{ targetMidi?: number|null, vision?: object|null, modification?: object|null }} opts
   */
  analyze(frame, opts = {}) {
    const tips = [];
    const now = frame.t || performance.now();
    const vision = opts.vision || null;
    const modification = opts.modification || frame.modification || null;

    if (!frame.isVoiced) {
      this.goodStreak = 0;
      const silenceTips = [
        {
          id: "silence",
          priority: 0,
          kind: "muted",
          text: "Sing a sustained open vowel (try “ah” or “oo”) at a comfortable volume so analysis can lock on.",
        },
      ];
      // Still coach posture when camera is on and silent
      if (vision?.cues?.length) {
        for (const c of vision.cues) {
          if (c.id === 'posture-good') continue;
          silenceTips.push({
            id: c.id,
            priority: c.severity === 'high' ? 3 : 2,
            kind: c.kind || 'priority',
            text: c.text,
          });
        }
      }
      return {
        tips: silenceTips.slice(0, 5),
        scores: this._scores(frame),
      };
    }

    const { note, formants, support, intonation, resonance, rms, vibrato, vowel, centroid } = frame;

    // ── Intonation ──
    if (note && Math.abs(note.cents) > 18) {
      const dir = note.cents > 0 ? "sharp" : "flat";
      const advice =
        dir === "sharp"
          ? "You’re a bit sharp — ease breath pressure slightly and aim the pitch “from above” into the center."
          : "You’re a bit flat — energize the tone with slightly more appoggio (gentle abdominal resistance) without pushing the throat.";
      tips.push({
        id: "intonation",
        priority: 3,
        kind: "priority",
        text: `${Math.abs(note.cents)}¢ ${dir} of ${note.label}. ${advice}`,
      });
    } else if (note && Math.abs(note.cents) <= 8) {
      this.goodStreak++;
    }

    // Target lock
    if (opts.targetMidi != null && note) {
      const targetFreq = 440 * Math.pow(2, (opts.targetMidi - 69) / 12);
      const cents = 1200 * Math.log2(frame.pitch / targetFreq);
      if (Math.abs(cents) > 15) {
        tips.push({
          id: "target",
          priority: 4,
          kind: "priority",
          text: `Slide toward the locked target. You’re ${Math.abs(Math.round(cents))}¢ ${cents > 0 ? "above" : "below"} — match with your ear, then stabilize.`,
        });
      } else {
        tips.push({
          id: "target-good",
          priority: 1,
          kind: "good",
          text: "On target — hold the center of the pitch with steady breath.",
        });
      }
    }

    // ── Support / breath ──
    if (support < 45 && rms > 0.015) {
      tips.push({
        id: "support-low",
        priority: 3,
        kind: "priority",
        text: "Support is unstable. Soften the onset, keep ribs gently buoyant, and aim for a smooth air stream (think “cool fog on a mirror”). Avoid clamping the abs.",
      });
    } else if (support >= 75) {
      tips.push({
        id: "support-good",
        priority: 1,
        kind: "good",
        text: "Solid support — amplitude and pitch are steady. Keep that consistent air column.",
      });
    }

    // Very loud / soft
    if (rms > 0.18) {
      tips.push({
        id: "loud",
        priority: 2,
        kind: "priority",
        text: "Quite loud — check that volume comes from resonance and support, not throat squeeze. Try the same pitch 20% softer with more “ring.”",
      });
    } else if (rms < 0.02 && frame.isVoiced) {
      tips.push({
        id: "soft",
        priority: 1,
        kind: "muted",
        text: "Very soft signal. Move a bit closer or increase tone energy so formants read more clearly.",
      });
    }

    // ── Formants / vowels ──
    if (formants.f1 && formants.f2) {
      // High open vowels on high pitches → modify
      if (formants.f1 > 850 && note && note.midi >= 65) {
        tips.push({
          id: "vowel-mod-high",
          priority: 3,
          kind: "priority",
          text: "High pitch + open vowel (high F1). Modify: Ah/AA → Aw (ɔ) or Uh (ʌ) — taller space, less spread jaw. Don’t lock a speech “ah” on top notes.",
        });
      }

      // Ee family on mid-high
      if (vowel && (vowel.id === "ee" || vowel.family === "ee") && note && note.midi >= 62) {
        if (vowel.id === "ee") {
          tips.push({
            id: "ee-modify",
            priority: 2,
            kind: "priority",
            text: "Pure Ee (i) above the middle: modify toward Ih (ɪ) then Eh (ɛ). Keep tongue forward, open vertical space behind molars — avoid a spread grin.",
          });
        }
      }

      // AA should migrate on ascent
      if (vowel && vowel.id === "aa" && note && note.midi >= 60) {
        tips.push({
          id: "aa-modify",
          priority: 2,
          kind: "priority",
          text: "AA (æ) is wide and bright — through the bridge migrate AA → Ah → Uh/Aw so the larynx doesn’t climb with the jaw.",
        });
      }

      // Oh / Oo high
      if (vowel && (vowel.id === "oh" || vowel.id === "oo") && note && note.midi >= 65) {
        tips.push({
          id: "back-vowel-mod",
          priority: 2,
          kind: "priority",
          text:
            vowel.id === "oh"
              ? "Oh on high notes: allow a ʊ / Oo color (round lips, open throat). Don’t force a pure mid-voice Oh shape."
              : "Oo is already narrow — if it pinches, open slightly toward ʊ while keeping lip round.",
        });
      }

      // Already modifying — encourage
      if (vowel && vowel.isMod) {
        tips.push({
          id: "mod-good",
          priority: 1,
          kind: "good",
          text: `Hearing ${vowel.label} (${vowel.ipa}) — a useful modification of ${vowel.family?.toUpperCase() || "the base vowel"}. Stay free; don’t snap back to a speech pure vowel under pressure.`,
        });
      }

      // Dark / swallowed (low F2)
      if (formants.f2 > 0 && formants.f2 < 850 && formants.f1 < 480) {
        tips.push({
          id: "swallowed",
          priority: 2,
          kind: "priority",
          text: "Tone may be dark/swallowed (low F2). Brighten slightly: lift the soft palate, smile with the eyes (not a wide grin), and aim sound toward the mask.",
        });
      }

      // Good singer’s formant region proxy via centroid
      if (centroid > 1800 && centroid < 3200 && resonance >= 70) {
        tips.push({
          id: "resonance-good",
          priority: 1,
          kind: "good",
          text: "Healthy spectral balance — resonance is “forward” without harshness. That’s the ring you want.",
        });
      } else if (centroid > 0 && centroid < 900 && rms > 0.03) {
        tips.push({
          id: "dull",
          priority: 2,
          kind: "priority",
          text: "Tone reads dull/covered. Add gentle twang (narrow the epilaryngeal tube sensation) or hum-to-vowel to find mask resonance, then open to the vowel.",
        });
      }

      if (vowel && !vowel.stale) {
        const confPct = vowel.confidence != null ? ` · conf ${Math.round(vowel.confidence * 100)}%` : '';
        const src =
          vowel.source === 'fused'
            ? ' · formants+camera'
            : vowel.source === 'audio+vision'
              ? ' · fused'
              : vowel.visionId && vowel.visionId !== vowel.id
                ? ` · camera ~${vowel.visionId}`
                : '';
        tips.push({
          id: "vowel-id",
          priority: 0,
          kind: "muted",
          text: `Vowel: ${vowel.label} [${vowel.ipa}] (${vowel.example}). F1≈${Math.round(formants.f1)} · F2≈${Math.round(formants.f2)}${confPct}${src}.`,
        });
      }

      // Pitch-driven modification coaching (unified bar)
      if (modification?.to && note) {
        const pp = modification.pitchProgress || 0;
        const sp = modification.shapeProgress || 0;
        const fromL = modification.from?.label || vowel?.label;
        const toL = modification.to.label;
        const toIpa = modification.to.ipa;

        if (pp > 0.75) {
          tips.push({
            id: "mod-now",
            priority: 4,
            kind: "priority",
            text: `Pitch ${modification.noteLabel || note.label}: modify now — shade ${fromL} → ${toL} [${toIpa}]. ${modification.hint || 'Taller space, less speech purity.'}`,
          });
        } else if (pp > 0.35) {
          tips.push({
            id: "mod-soon",
            priority: 3,
            kind: "priority",
            text: `Entering modification range (${modification.noteLabel || note.label}). Begin migrating ${fromL} toward ${toL} [${toIpa}] before the top note.`,
          });
        }

        if (pp > 0.45 && sp < 0.3) {
          tips.push({
            id: "mod-shape-lag",
            priority: 3,
            kind: "priority",
            text: `Pitch asks for ${toL}, but formants/mouth still sit on ${fromL}. Adjust jaw/lips toward the teal target on the vowel map — don’t just “think” the mod.`,
          });
        } else if (pp > 0.4 && sp > 0.55) {
          tips.push({
            id: "mod-shape-good",
            priority: 1,
            kind: "good",
            text: `Good: your shape is tracking toward ${toL} as pitch rises. Keep the breath steady so the mod stays free, not pressed.`,
          });
        }
      }

      // Low formant confidence
      if ((frame.formantConfidence ?? formants.confidence ?? 1) < 0.4 && rms > 0.02) {
        tips.push({
          id: "formant-weak",
          priority: 1,
          kind: "muted",
          text: "Formant lock is weak — hold a steadier vowel a bit louder (or enable the camera) so the vowel map can stabilize.",
        });
      }
    }

    // ── Vision posture / mouth (camera) ──
    if (vision?.cues?.length) {
      for (const c of vision.cues) {
        const priority =
          c.severity === 'high' ? 4 : c.severity === 'med' ? 3 : c.kind === 'good' ? 1 : 1;
        tips.push({
          id: `vis-${c.id}`,
          priority,
          kind: c.kind || 'priority',
          text: c.text,
        });
      }
    }

    // Cross-check: high pitch + spread mouth from camera
    if (
      vision?.mouth &&
      note &&
      note.midi >= 62 &&
      vision.mouth.smile > 0.5 &&
      vision.mouth.jawOpen < 0.3
    ) {
      tips.push({
        id: 'vis-high-spread',
        priority: 3,
        kind: 'priority',
        text:
          'High pitch + spread mouth shape detected. Verticalize the vowel (taller, less grin) — this is the #1 camera cue for easier passaggio.',
      });
    }

    // ── Vibrato ──
    if (vibrato && vibrato.extent > 45 && vibrato.rate > 3) {
      tips.push({
        id: "wobble",
        priority: 2,
        kind: "priority",
        text: "Wide pitch oscillation — could be wobble or excess pressure. Stabilize with quieter dynamics and a straight-tone exercise, then reintroduce free vibrato.",
      });
    } else if (vibrato && vibrato.extent > 8 && vibrato.extent < 35 && vibrato.rate >= 4.5 && vibrato.rate <= 7) {
      tips.push({
        id: "vibrato-good",
        priority: 1,
        kind: "good",
        text: `Natural vibrato-like motion (~${vibrato.rate.toFixed(1)} Hz). Stay free in the throat and keep support even.`,
      });
    }

    // ── Resonance overall ──
    if (resonance < 45 && rms > 0.02) {
      tips.push({
        id: "res-low",
        priority: 2,
        kind: "priority",
        text: "Resonance score is low. Try NG hums → open to “ah,” or lip trills on a 5-note scale to balance airflow and vocal fold closure.",
      });
    }

    // Encouragement
    if (this.goodStreak > 40 && intonation >= 80 && support >= 70) {
      tips.push({
        id: "streak",
        priority: 1,
        kind: "good",
        text: "Excellent sustained control. Challenge yourself: same pitch, messa di voce (soft → loud → soft) without pitch drift.",
      });
    }

    // Deduplicate by id, sort by priority, limit
    const byId = new Map();
    for (const t of tips) {
      const prev = byId.get(t.id);
      if (!prev || t.priority > prev.priority) byId.set(t.id, t);
    }
    let list = [...byId.values()].sort((a, b) => b.priority - a.priority);

    // Rate-limit noisy tips
    list = list.filter((t) => {
      if (t.kind === "good" || t.kind === "muted") return true;
      const last = this.tipCooldown.get(t.id) || 0;
      if (now - last < 2500 && this.lastTips.some((x) => x.id === t.id)) return true;
      this.tipCooldown.set(t.id, now);
      return true;
    });

    this.lastTips = list.slice(0, 5);
    return { tips: this.lastTips, scores: this._scores(frame) };
  }

  _scores(frame) {
    return {
      intonation: frame.intonation || 0,
      support: frame.support || 0,
      resonance: frame.resonance || 0,
      volume: Math.min(100, Math.round((frame.rms || 0) * 400)),
    };
  }
}

export const TECHNIQUE_GUIDE = [
  {
    icon: "🌬️",
    title: "Breath & Appoggio",
    body: "Great singing rides a steady, managed airstream — not big gasping breaths or rigid abs.",
    points: [
      "Inhale silently: expand lower ribs and back; shoulders stay soft.",
      "At onset, feel gentle resistance (appoggio) — as if leaning the air on the body wall.",
      "Exhale on a hiss for 12–20 seconds at even volume; that’s support training.",
      "Never push from the throat to “make more sound.” Add resonance first.",
    ],
  },
  {
    icon: "🎯",
    title: "Intonation",
    body: "Pitch accuracy is ear + coordination. Use the tuner, then internalize the center of each note.",
    points: [
      "Match a reference tone before scales; don’t slide into pitch as a habit.",
      "If flat: more energetic closure and support (not throat tension).",
      "If sharp: reduce excess pressure; lengthen the vowel slightly.",
      "Practice with a drone (single pedal tone) under your melody.",
    ],
  },
  {
    icon: "🔊",
    title: "Resonance & Placement",
    body: "Volume and beauty mostly come from resonators (pharynx, mouth, mask), not force.",
    points: [
      "NG hums and lip trills find efficient fold vibration with low impact.",
      "Sense vibration in the front of the face (“mask”) without nasalising every vowel.",
      "Soft palate lifted (gentle yawn space) keeps tone from sounding muffled.",
      "Singer’s formant ring (~3 kHz) appears when the epilaryngeal tube narrows slightly — twang can help.",
    ],
  },
  {
    icon: "🗣️",
    title: "Vowel Modification",
    body: "As pitch rises, pure speech vowels fight the instrument. Strategic modification (aggiustamento) frees the voice.",
    points: [
      "Primary five: Ee (i), AA (æ), Ah (ɑ), Oh (o), Oo (u).",
      "Ee path: i → ɪ (Ih) → ɛ (Eh). Keep tongue forward, add vertical space.",
      "AA / Ah path: æ → ɑ → ʌ/ɔ (Uh/Aw) → o. Less spread jaw, taller mouth.",
      "Oh / Oo path: o → ʊ → u. Round lips; don’t clamp the throat.",
      "Modify gradually a few notes before the break — not only at the passaggio.",
      "Watch F1/F2 in Live Coach; the badge shows mods when you use them.",
      "Optional camera mode tracks mouth spread vs vertical space and posture (shoulders, chin, torso).",
    ],
  },
  {
    icon: "🧍",
    title: "Posture & Freedom",
    body: "The instrument is the whole body. Raised shoulders and a jutting chin are the most common silent saboteurs.",
    points: [
      "Feet under hips, soft knees, ribs stacked over pelvis — not a military freeze.",
      "Shoulders melt down on every exhale; never shrug to “reach” a high note.",
      "Head floats (crown tall); chin is slightly tucked, never poked at the mic.",
      "Inhale into the back and sides of the ribs; avoid lifting the chest into a tense arch.",
      "Use the camera coach: level shoulders, soft neck, balanced torso while you sing.",
    ],
  },
  {
    icon: "🪜",
    title: "Range Building",
    body: "Range expands with coordination and recovery — never with pain or chronic strain.",
    points: [
      "Sirens (glides) on lip trill or “oo” connect registers without breaks.",
      "Stop at the first sign of pain, tickle, or pressed tone that won’t release.",
      "Strengthen the middle first; extremes follow a reliable middle.",
      "Use Range Finder weekly and log the comfortable (not emergency) extremes.",
    ],
  },
  {
    icon: "⚡",
    title: "Agility & Dynamics",
    body: "Fast notes and soft-loud control are trained slowly, then sped up with a metronome.",
    points: [
      "Scales and arpeggios: start largo, only increase BPM when intonation stays clean.",
      "Staccato on a single pitch trains clean onsets (not glottal slam).",
      "Messa di voce: swell and diminish one note without pitch or timbre collapse.",
      "Record takes and review — the ear in the room is different from the ear in your head.",
    ],
  },
];



