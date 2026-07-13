/**
 * Exercise library for Vox Studio
 * Each exercise: coaching copy + optional pitch pattern (MIDI relative or absolute)
 */

export const EXERCISES = [
  // ── Warm-up ──
  {
    id: "lip-trill-5",
    category: "warmup",
    title: "Lip Trill — 5-Note Scale",
    duration: "3–5 min",
    level: "Beginner",
    description:
      "The gold-standard warm-up. Lip trills balance subglottal pressure and keep the folds from pressing. If lips won’t flutter, try a freer air stream or switch to a tongue trill.",
    steps: [
      "Relax face; place fingertips lightly on cheeks if needed to support the trill.",
      "Sustain a comfortable mid pitch on a lip bubble.",
      "Ascend a five-note major scale, then descend.",
      "Move up by half steps through a comfortable range; never force the top.",
    ],
    cue: "Air first, sound second. The trill should feel easy and buzzy — if it stops, you likely clamped or under-blew.",
    pattern: "scale5",
    rootMidi: 60,
  },
  {
    id: "hum-ng",
    category: "warmup",
    title: "NG Hum → Open Vowel",
    duration: "3 min",
    level: "Beginner",
    description:
      "Finds mask resonance and efficient closure, then transfers that sensation into an open vowel.",
    steps: [
      "Sing “ng” (as in sing) on a mid pitch — feel buzz in the nose/face.",
      "Without stopping air, open to “ah” or “ay,” keeping the buzz sensation.",
      "Glide a small siren on NG, then open at the top.",
      "Repeat on 4–5 starting pitches.",
    ],
    cue: "Don’t pinch the nose shut; the soft palate does the work. Keep the throat open like the start of a yawn.",
    pattern: "drone",
    rootMidi: 62,
  },
  {
    id: "siren-oo",
    category: "warmup",
    title: "Gentle Siren on “oo”",
    duration: "2–4 min",
    level: "Beginner",
    description:
      "Connects chest and head registers smoothly. Essential daily glue for range and passaggio.",
    steps: [
      "Start in a low comfortable pitch on “oo” (as in boot).",
      "Glide slowly to a high comfortable pitch and back — no breaks, no flips you can’t control.",
      "Keep volume medium-soft; strain means you’ve gone too far or too loud.",
      "Do 6–8 sirens, alternating “oo” and “ee.”",
    ],
    cue: "Imagine a smooth elevator, not stairs. If you crack, slow down and reduce volume.",
    pattern: "siren",
    rootMidi: 55,
  },

  // ── Range ──
  {
    id: "arpeggio-9",
    category: "range",
    title: "Arpeggio Stretch (1–3–5–8–5–3–1)",
    duration: "5–8 min",
    level: "Intermediate",
    description:
      "Opens the voice through an octave with chord tones. Great for mapping passaggio shifts.",
    steps: [
      "Choose a vowel: “ah” or “o.” Keep jaw easy.",
      "Sing major arpeggio up to the octave and back.",
      "As you climb, allow slight vowel modification (more vertical space).",
      "Transpose up by half steps until quality suffers — then stop and descend.",
    ],
    cue: "The top note should feel like the middle notes — same ease. If it doesn’t, modify the vowel and lighten.",
    pattern: "arpeggio8",
    rootMidi: 55,
  },
  {
    id: "octave-jumps",
    category: "range",
    title: "Soft Octave Pulses",
    duration: "4 min",
    level: "Intermediate",
    description:
      "Trains the upper mechanism without belting. Soft, floaty high notes build coordination that loud singing later depends on.",
    steps: [
      "Sing low note on “hoo” (breathy ok at first).",
      "Leap to the octave above, pianissimo, then return.",
      "Keep larynx from yanking up; think “down and back” space.",
      "Only increase volume after the pitch is easy.",
    ],
    cue: "High and soft is a skill. Crescendo only after the note speaks cleanly.",
    pattern: "octave",
    rootMidi: 57,
  },
  {
    id: "range-scan-guided",
    category: "range",
    title: "Guided Range Map",
    duration: "3 min",
    level: "All levels",
    description:
      "Pair with Studio Tools → Range Finder. Siren slowly while the app logs lowest and highest stable pitches.",
    steps: [
      "Enable mic and start Range Finder.",
      "Lip trill or “oo” siren from mid → low → mid → high → mid.",
      "Stay only where tone is free; no “heroic” strain notes.",
      "Save the result in Progress (auto-logged when you stop scan).",
    ],
    cue: "Log comfortable range, not emergency screams. Progress is consistency, not one loud high note.",
    pattern: "siren",
    rootMidi: 60,
  },

  // ── Agility ──
  {
    id: "scale-9-agile",
    category: "agility",
    title: "Nine-Note Scale Runs",
    duration: "5–10 min",
    level: "Intermediate",
    description:
      "Builds clean scalar agility. Use the metronome: only raise BPM when every note is pitched and even.",
    steps: [
      "Set metronome to 60–72 BPM.",
      "Sing 1–2–3–4–5–6–7–8–9–8–7–6–5–4–3–2–1 on “ya” or “ee.”",
      "Keep each note equal length; don’t rush the turnaround.",
      "Increase 4 BPM only when intonation is solid for 2 keys.",
    ],
    cue: "Evenness > speed. A clean slow run beats a sloppy fast one every time.",
    pattern: "scale9",
    rootMidi: 60,
  },
  {
    id: "staccato-pulse",
    category: "agility",
    title: "Staccato Onsets (Single Pitch)",
    duration: "3 min",
    level: "Beginner+",
    description:
      "Trains crisp, healthy onsets without hard glottal attack. Foundation for coloratura and rhythmic precision.",
    steps: [
      "Pick a mid pitch. Use “ha” with a silent h.",
      "Metronome at 80: sing short detached notes on each beat.",
      "Keep the larynx calm; energy comes from quick abdominal pulses, not throat punches.",
      "Move to 5-note staccato patterns when single-pitch is easy.",
    ],
    cue: "Think of bouncing a soft ball, not hammering nails. Onset should be clear but never harsh.",
    pattern: "staccato",
    rootMidi: 62,
  },
  {
    id: "thirds-pattern",
    category: "agility",
    title: "Broken Thirds",
    duration: "5 min",
    level: "Intermediate",
    description:
      "Classic agility pattern for ear + coordination: 1–3–2–4–3–5… through the scale.",
    steps: [
      "Start slowly on “ah.”",
      "Pattern: do-mi, re-fa, mi-sol, etc., ascending then reverse.",
      "Keep legato connection between pairs; only the harmony changes.",
      "Use Live Coach to watch intonation on each landing.",
    ],
    cue: "Hear the interval before you sing it. Mental pitch is half the agility battle.",
    pattern: "thirds",
    rootMidi: 60,
  },

  // ── Dynamics ──
  {
    id: "messa-di-voce",
    category: "dynamics",
    title: "Messa di Voce",
    duration: "4–6 min",
    level: "Advanced",
    description:
      "The master dynamics exercise: swell from soft to loud and back on one pitch without pitch drift or tone break.",
    steps: [
      "Choose a comfortable mid pitch on “ah” or “o.”",
      "Start pp: soft but spun (not whispered air only).",
      "Crescendo smoothly to f over ~4 seconds.",
      "Diminuendo back to pp over ~4 seconds. Pitch and vowel stay constant.",
    ],
    cue: "Watch Support and Intonation meters. Volume should change; pitch center and vowel should not.",
    pattern: "drone",
    rootMidi: 64,
  },
  {
    id: "terraced-dynamics",
    category: "dynamics",
    title: "Terraced Soft–Loud Echo",
    duration: "3 min",
    level: "Beginner+",
    description:
      "Sing a short phrase piano, then forte, then piano again. Teaches dynamic contrast without pressing.",
    steps: [
      "Phrase: 5-note scale up and down.",
      "First pass: soft. Second: loud (resonant, not shouted). Third: soft.",
      "Keep the same vowel color; only intensity changes.",
      "Record a take and check that loud ≠ shouty.",
    ],
    cue: "Loud means more resonance and support, not a tighter neck.",
    pattern: "scale5",
    rootMidi: 60,
  },
  {
    id: "sforzando-control",
    category: "dynamics",
    title: "Accent & Release",
    duration: "3 min",
    level: "Intermediate",
    description:
      "Quick accent into immediate soft sustain. Builds control for expressive pop/classical accents.",
    steps: [
      "On one pitch: accented attack → immediately drop to soft sustained tone.",
      "No throat grab after the accent; re-balance air instantly.",
      "Repeat 8 times, then change pitch by a third.",
    ],
    cue: "The skill is the release after the accent, not the accent itself.",
    pattern: "drone",
    rootMidi: 62,
  },

  // ── Resonance ──
  {
    id: "twang-ee",
    category: "resonance",
    title: "Twang “nya” into Vowel",
    duration: "4 min",
    level: "Intermediate",
    description:
      "Narrows the epilaryngeal tube for brighter ring (useful for belt and classical squillo). Use sparingly and without nasal noise.",
    steps: [
      "Say “nya nya nya” with a bratty, bright cartoon energy (not tight).",
      "Transfer that bright edge onto a sung “ah.”",
      "Reduce the twang until tone is clear and ringing, not pinched.",
      "Check Live Coach: centroid should brighten without pitch going sharp from squeeze.",
    ],
    cue: "Twang is a color, not a default. If the neck hardens, stop and return to lip trills.",
    pattern: "scale5",
    rootMidi: 60,
  },
  {
    id: "yawn-sigh",
    category: "resonance",
    title: "Yawn-Sigh Release",
    duration: "2–3 min",
    level: "Beginner",
    description:
      "Opens the pharynx and drops excess laryngeal height. Perfect reset when you feel constricted.",
    steps: [
      "Inhale with a silent gentle yawn sensation.",
      "Sigh downward on “ah” from mid-high to low.",
      "Keep the open throat feeling as pitch falls.",
      "Follow with a normal phrase and notice freer tone.",
    ],
    cue: "This is release work — keep it almost lazy. Effort here should drop, not rise.",
    pattern: "siren",
    rootMidi: 67,
  },
  {
    id: "forward-hum-scale",
    category: "resonance",
    title: "Forward Hum Scales",
    duration: "4 min",
    level: "Beginner",
    description:
      "Keeps energy in the mask while moving through pitches. Foundation for clear, projecting tone at lower effort.",
    steps: [
      "Lips gently closed; hum a 5-note scale.",
      "Feel the strongest buzz on the front teeth / nose bridge.",
      "If buzz dies on high notes, lighten and keep air steady.",
      "Open to “mah” every other rep, same placement.",
    ],
    cue: "Buzz is feedback that folds and resonators are cooperating. Chase sensation, not volume.",
    pattern: "scale5",
    rootMidi: 58,
  },

  // ── Vowels / Formants ──
  {
    id: "vowel-ladder",
    category: "vowels",
    title: "Vowel Ladder (ee–eh–ah–oh–oo)",
    duration: "5 min",
    level: "All levels",
    description:
      "Trains consistent tone across vowel shapes. Watch the Formant plot: F1/F2 should move intentionally as you change vowels.",
    steps: [
      "Hold one pitch. Cycle slowly: ee → eh → ah → oh → oo → reverse.",
      "Keep volume and pitch steady; only the mouth shape changes.",
      "Watch Live Coach vowel badge and F1/F2 readouts.",
      "Repeat on three pitches: low, mid, high (modify on high).",
    ],
    cue: "Jaw and tongue do the work; pitch stays put. If pitch wobbles, slow the vowel changes.",
    pattern: "drone",
    rootMidi: 62,
  },
  {
    id: "passaggio-mod",
    category: "vowels",
    title: "Passaggio Vowel Morph",
    duration: "6 min",
    level: "Intermediate",
    description:
      "Practice modifying open vowels through the passaggio so the top stays free.",
    steps: [
      "Sing a 5-note scale on pure “ah” in the middle voice.",
      "As you approach your break zone, morph “ah” toward “uh/ɔ.”",
      "Keep the sound spinning; don’t flip to falsetto unless stylistic.",
      "Use Formant view: F1 often lowers slightly as you modify.",
    ],
    cue: "Modification is strategy, not “cheating.” Pros modify constantly on high notes.",
    pattern: "scale5",
    rootMidi: 60,
  },
  {
    id: "formant-tuning",
    category: "vowels",
    title: "Formant Tuning on Sustains",
    duration: "4 min",
    level: "Advanced",
    description:
      "Micro-adjust lip rounding and jaw to align harmonics with formants for maximum ring on a sustained note.",
    steps: [
      "Hold a steady mid-high pitch on “o.”",
      "Tiny adjustments: round lips more/less, drop jaw 1–2 mm.",
      "Listen for a sudden “bloom” or easier volume — that’s alignment.",
      "Note the F1/F2 values when it blooms; that’s your personal sweet spot.",
    ],
    cue: "Move millimeters, not miles. The biggest acoustic wins are subtle.",
    pattern: "drone",
    rootMidi: 65,
  },

  // ── Support ──
  {
    id: "hiss-sustain",
    category: "support",
    title: "Timed Hiss Sustain",
    duration: "3 min",
    level: "Beginner",
    description:
      "Builds appoggio awareness without phonation. Pair with Breath Timer in Studio Tools.",
    steps: [
      "Inhale 4 counts (silent, low, wide).",
      "Hiss “sss” for 12–20 seconds at constant volume.",
      "Ribs resist collapse; don’t lock the abs rock-hard.",
      "Then repeat on a sung “ah” for half the hiss duration.",
    ],
    cue: "Even hiss = even support. If the hiss pulses, your air management is pulsing.",
    pattern: null,
    rootMidi: 60,
  },
  {
    id: "farinelli",
    category: "support",
    title: "Farinelli Breathing Cycle",
    duration: "5 min",
    level: "Intermediate",
    description:
      "Historic breath exercise: controlled inhale, suspension, controlled exhale — then add tone.",
    steps: [
      "Inhale 4 · hold 4 · exhale 4 (use Breath Timer).",
      "Next cycle: 4 · 4 · 6, then 4 · 4 · 8, building exhale length.",
      "After 4 silent cycles, exhale on a soft lip trill instead of air only.",
      "Never hold by slamming the throat shut; suspend with open feeling.",
    ],
    cue: "Suspension is buoyant, not choked. Throat stays like the beginning of a yawn.",
    pattern: null,
    rootMidi: 60,
  },
  {
    id: "sforzando-support",
    category: "support",
    title: "Crescendo on One Breath",
    duration: "4 min",
    level: "Intermediate",
    description:
      "Tests whether support can feed a long phrase. Live Coach support meter should stay high.",
    steps: [
      "Inhale fully but calmly.",
      "Sing a mid pitch starting soft; crescendo for as long as tone stays free.",
      "Stop before the voice presses or pitch sags.",
      "Rest, then try to beat your time by 1–2 seconds with better efficiency (not force).",
    ],
    cue: "Efficiency wins: better resonance means less air waste and longer phrases.",
    pattern: "drone",
    rootMidi: 60,
  },
];

export const CATEGORY_LABELS = {
  warmup: "Warm-up",
  range: "Range",
  agility: "Agility",
  dynamics: "Dynamics",
  resonance: "Resonance",
  vowels: "Vowel / Formant",
  support: "Breath & Support",
};

/** Build absolute MIDI sequence from pattern + root */
export function buildPattern(pattern, rootMidi) {
  if (!pattern) return [];
  const r = rootMidi;
  switch (pattern) {
    case "scale5":
      return [0, 2, 4, 5, 7, 5, 4, 2, 0].map((i) => r + i);
    case "scale9":
      return [0, 2, 4, 5, 7, 9, 11, 12, 14, 12, 11, 9, 7, 5, 4, 2, 0].map((i) => r + i);
    case "arpeggio8":
      return [0, 4, 7, 12, 7, 4, 0].map((i) => r + i);
    case "octave":
      return [0, 12, 0, 12, 0].map((i) => r + i);
    case "thirds": {
      const seq = [];
      for (let i = 0; i <= 4; i++) {
        seq.push(r + i, r + i + 4);
      }
      for (let i = 4; i >= 0; i--) {
        seq.push(r + i + 4, r + i);
      }
      return seq;
    }
    case "staccato":
      return Array(8).fill(r);
    case "drone":
      return [r, r, r, r];
    case "siren":
      // Approximate with stepped gliss for reference tones
      return [0, 3, 7, 12, 16, 12, 7, 3, 0].map((i) => r + i);
    default:
      return [r];
  }
}



