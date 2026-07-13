/**
 * Harmonic palette engine — Write Studio
 * Robust key-aware palette, functional next-chord suggestions,
 * Simple / Color / Jazz complexity layers. Fully local.
 */

const CHROMATIC = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const ALIAS = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
  Cb: "B",
  Fb: "E",
};
const ENHARM_SHARP = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };

export const COMPLEXITY_LEVELS = [
  { id: "simple", label: "Simple", desc: "Triads — songwriting clear" },
  { id: "color", label: "Color", desc: "7ths, sus, add9 — modern pop/R&B" },
  { id: "jazz", label: "Jazz", desc: "Extensions, secondaries, subs" },
];

export function normalizeRoot(note) {
  if (!note) return "C";
  const m = String(note).match(/^([A-G][b#]?)/);
  if (!m) return "C";
  return ALIAS[m[1]] || m[1];
}

export function parseChordRoot(chordName) {
  const m = String(chordName || "").match(/^([A-G][b#]?)/);
  return m ? ALIAS[m[1]] || m[1] : null;
}

export function parseChord(chordName) {
  const raw = String(chordName || "").trim();
  const m = raw.match(/^([A-G][b#]?)(.*)$/);
  if (!m) return { root: "C", quality: "", raw: chordName, kind: "unknown" };
  const root = ALIAS[m[1]] || m[1];
  let q = m[2] || "";
  q = q
    .replace(/maj7|Δ7|M7/gi, "maj7")
    .replace(/min7|mi7|−7/gi, "m7")
    .replace(/ø7|m7b5/gi, "m7b5")
    .replace(/dim7|°7/gi, "dim7")
    .replace(/^maj$/i, "")
    .replace(/^M$/, "");

  let kind = "major";
  if (/^m(?!aj)/.test(q) || q.startsWith("min")) kind = "minor";
  else if (/dim|°/.test(q)) kind = "dim";
  else if (/aug|\+/.test(q)) kind = "aug";
  else if (/sus/.test(q)) kind = "sus";
  else if (/^7|^9|^11|^13|dom/.test(q)) kind = "dom";
  else if (/maj7|add|6|9/.test(q)) kind = "major";

  if (q.includes("m7b5") || q.includes("ø")) kind = "halfdim";
  if (q === "m7" || q.startsWith("m7") || q === "min7") kind = "min7";
  if (q === "maj7" || q.startsWith("maj7")) kind = "maj7";
  if (q === "7" || q === "9" || q === "11" || q === "13" || /^7/.test(q)) kind = "dom";

  return { root, quality: q, raw, kind };
}

function noteByInterval(root, semitones) {
  const r = normalizeRoot(root);
  const idx = CHROMATIC.indexOf(r);
  if (idx < 0) return root;
  return CHROMATIC[(idx + semitones + 120) % 12];
}

function preferSharp(root, useSharps) {
  if (!useSharps) return root;
  return ENHARM_SHARP[root] || root;
}

export function chordsMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const pa = parseChord(a);
  const pb = parseChord(b);
  if (pa.root !== pb.root) return false;
  if (pa.quality === pb.quality) return true;

  const fam = (k, q) => {
    if (k === "dom" || q === "7" || q === "9" || q === "13") return "dom";
    if (k === "maj7" || q === "maj7" || q === "6" || q === "add9" || q === "") return "maj";
    if (k === "min7" || k === "minor" || q === "m" || q === "m7" || q === "m9" || q === "m6") return "min";
    if (k === "halfdim" || q.includes("m7b5")) return "halfdim";
    if (k === "dim") return "dim";
    if (k === "sus") return "sus";
    return k;
  };
  return fam(pa.kind, pa.quality) === fam(pb.kind, pb.quality);
}

function scaleDegrees(key) {
  const isMinor = /m$/.test(key);
  const rootRaw = key.replace(/m$/, "").replace(/maj$/, "");
  const root = normalizeRoot(rootRaw);
  const sharpKeys = ["G", "D", "A", "E", "B", "F#", "C#", "Em", "Bm", "F#m", "C#m", "G#m", "D#m"];
  const useSharps = sharpKeys.some((k) => k === key || k === root);
  const pick = (semi) => {
    const n = noteByInterval(root, semi);
    return preferSharp(n, useSharps && ["Db", "Eb", "Gb", "Ab", "Bb"].includes(n));
  };
  const intervals = isMinor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  return { root, isMinor, useSharps, deg: intervals.map((i) => pick(i)), pick };
}

function chord(name, roman, group, functionId, role, tags = []) {
  return { name, roman, group, function: functionId, role, tags };
}

function move(name, label, why, strength, roman = "") {
  return { name, label, why, strength, roman };
}

function resolveComplexity(jazzOrComplexity) {
  if (jazzOrComplexity === true || jazzOrComplexity === "jazz") return "jazz";
  if (jazzOrComplexity === "color") return "color";
  if (typeof jazzOrComplexity === "string" && ["simple", "color", "jazz"].includes(jazzOrComplexity)) {
    return jazzOrComplexity;
  }
  return "simple";
}

/**
 * Generate palette + suggestions
 */
export function generateHarmony(key, lastChord, jazzOrComplexity = false) {
  const complexity = resolveComplexity(jazzOrComplexity);
  const { root, isMinor, deg, pick } = scaleDegrees(key);
  const defaultTonic = isMinor ? `${deg[0]}m` : deg[0];
  const last = lastChord || defaultTonic;
  const palette = [];
  const byName = new Map();

  const add = (c) => {
    if (!c?.name || byName.has(c.name)) return;
    byName.set(c.name, c);
    palette.push(c);
  };

  const Vmaj = pick(7);

  if (!isMinor) {
    add(chord(deg[0], "I", "Home", "T", "Tonic — rest / resolution", ["home"]));
    add(chord(`${deg[1]}m`, "ii", "Away", "S", "Pre-dominant — sets up V", ["away"]));
    add(chord(`${deg[2]}m`, "iii", "Color", "T", "Soft tonic color / mediant", ["color"]));
    add(chord(deg[3], "IV", "Away", "S", "Subdominant — open / lift", ["away"]));
    add(chord(deg[4], "V", "Tension", "D", "Dominant — wants home", ["tension"]));
    add(chord(`${deg[5]}m`, "vi", "Color", "T", "Relative minor — emotional shift", ["color"]));
    add(chord(`${deg[6]}dim`, "vii°", "Tension", "D", "Leading-tone — pulls to I", ["tension"]));
    add(chord(`${deg[3]}m`, "iv", "Borrow", "S", "Minor IV — Beatles melancholy", ["borrow", "color"]));
    add(chord(pick(10), "bVII", "Borrow", "S", "Mixolydian flat-7 — rock open", ["borrow", "modal"]));

    if (complexity === "color" || complexity === "jazz") {
      add(chord(`${deg[0]}maj7`, "Imaj7", "Home", "T", "Tonic 7th — dreamy rest", ["color", "home"]));
      add(chord(`${deg[1]}m7`, "ii7", "Away", "S", "Pre-dominant 7th", ["color"]));
      add(chord(`${deg[3]}maj7`, "IVmaj7", "Away", "S", "Lush subdominant", ["color"]));
      add(chord(`${deg[4]}7`, "V7", "Tension", "D", "Dominant 7th — stronger pull", ["tension", "color"]));
      add(chord(`${deg[5]}m7`, "vi7", "Color", "T", "Relative minor 7th", ["color"]));
      add(chord(`${deg[0]}sus4`, "Isus4", "Home", "T", "Suspended — delay the third", ["color", "sus"]));
      add(chord(`${deg[4]}sus4`, "Vsus4", "Tension", "D", "Sus dominant — gospel resolve", ["color", "sus"]));
      add(chord(`${deg[0]}add9`, "Iadd9", "Home", "T", "Add9 shimmer on tonic", ["color"]));
      add(chord(`${deg[3]}add9`, "IVadd9", "Away", "S", "Add9 on IV — open pop", ["color"]));
      add(chord(`${deg[2]}7`, "III7", "Spice", "D", "V/vi — Creep / secondary", ["secondary"]));
      add(chord(`${deg[1]}7`, "II7", "Spice", "D", "V/V — gospel lift to V", ["secondary"]));
      add(chord(`${deg[0]}7`, "I7", "Spice", "D", "V/IV — blues push to IV", ["secondary"]));
    }

    if (complexity === "jazz") {
      add(chord(`${deg[2]}m7`, "iii7", "Color", "T", "Mediant 7th", ["jazz"]));
      add(chord(`${deg[6]}m7b5`, "viiø7", "Tension", "D", "Half-diminished leading tone", ["jazz"]));
      add(chord(`${deg[0]}6`, "I6", "Home", "T", "Major 6 — classic swing tonic", ["jazz"]));
      add(chord(`${deg[5]}7`, "V7/ii", "Spice", "D", "Secondary dominant → ii", ["jazz", "secondary"]));
      add(chord(`${deg[6]}7`, "V7/iii", "Spice", "D", "Secondary dominant → iii", ["jazz", "secondary"]));
      add(chord(`${pick(1)}7`, "subV7/I", "Spice", "D", "Tritone sub of V — chromatic into I", ["jazz", "tritone"]));
      add(chord(`${pick(3)}7`, "subV7/ii", "Spice", "D", "Tritone sub of V/ii", ["jazz", "tritone"]));
      add(chord(`${pick(6)}7`, "subV7/IV", "Spice", "D", "Tritone sub of V/IV", ["jazz", "tritone"]));
      add(chord(`${pick(3)}maj7`, "bIIImaj7", "Borrow", "S", "Chromatic mediant", ["jazz", "modal"]));
      add(chord(`${pick(8)}maj7`, "bVImaj7", "Borrow", "S", "Flat-six major 7 — cinematic", ["jazz", "modal"]));
      add(chord(`${pick(10)}7`, "bVII7", "Borrow", "D", "Backdoor dominant", ["jazz", "modal"]));
      add(chord(`${deg[3]}7`, "IV7", "Borrow", "S", "Lydian/blues IV7", ["jazz", "modal"]));
      add(chord(`${deg[4]}9`, "V9", "Tension", "D", "Dominant 9 — R&B/jazz color", ["jazz"]));
      add(chord(`${deg[1]}m9`, "ii9", "Away", "S", "Minor 9 — neo-soul ii", ["jazz"]));
      add(chord(`${deg[0]}maj9`, "Imaj9", "Home", "T", "Tonic maj9 — lush land", ["jazz"]));
      add(chord(`${pick(1)}dim7`, "#Idim7", "Spice", "P", "Ascending diminished → ii", ["jazz", "passing"]));
      add(chord(`${pick(3)}dim7`, "bIIIdim7", "Spice", "P", "Descending diminished → I", ["jazz", "passing"]));
    }
  } else {
    add(chord(`${deg[0]}m`, "i", "Home", "T", "Tonic minor — home", ["home"]));
    add(chord(`${deg[1]}dim`, "ii°", "Away", "S", "Diminished pre-dominant", ["away"]));
    add(chord(deg[2], "III", "Color", "T", "Relative major", ["color"]));
    add(chord(`${deg[3]}m`, "iv", "Away", "S", "Minor subdominant", ["away"]));
    add(chord(`${deg[4]}m`, "v", "Tension", "D", "Natural minor dominant (soft)", ["tension"]));
    add(chord(deg[5], "VI", "Color", "S", "Flat-six major — bright lift", ["color"]));
    add(chord(deg[6], "VII", "Color", "S", "Flat-seven — modal", ["color", "modal"]));
    add(chord(Vmaj, "V", "Tension", "D", "Major V — strong cadence to i", ["tension", "harmonic"]));

    if (complexity === "color" || complexity === "jazz") {
      add(chord(`${deg[0]}m7`, "im7", "Home", "T", "Tonic minor 7", ["color", "home"]));
      add(chord(`${deg[3]}m7`, "ivm7", "Away", "S", "iv7 — deep minor color", ["color"]));
      add(chord(`${Vmaj}7`, "V7", "Tension", "D", "Dominant 7 — perfect minor cadence", ["tension", "color"]));
      add(chord(`${deg[5]}maj7`, "bVImaj7", "Color", "S", "VI maj7 — cinematic", ["color"]));
      add(chord(`${deg[6]}7`, "bVII7", "Color", "S", "VII7 — rock/modal", ["color", "modal"]));
      add(chord(`${deg[0]}m(add9)`, "im(add9)", "Home", "T", "Minor add9 — modern", ["color"]));
      add(chord(`${deg[0]}7`, "I7", "Spice", "D", "V/iv — blues push", ["secondary"]));
      add(chord(`${deg[2]}7`, "III7", "Spice", "D", "V/VI — secondary", ["secondary"]));
    }

    if (complexity === "jazz") {
      add(chord(`${deg[1]}m7b5`, "iiø7", "Away", "S", "Half-dim ii — minor ii–V", ["jazz"]));
      add(chord(`${deg[2]}maj7`, "bIIImaj7", "Color", "T", "Relative major 7", ["jazz"]));
      add(chord(`${pick(1)}7`, "subV7/i", "Spice", "D", "Tritone sub → i", ["jazz", "tritone"]));
      add(chord(`${pick(1)}maj7`, "bIImaj7", "Borrow", "S", "Neapolitan color (maj7)", ["jazz", "modal"]));
      add(chord(`${deg[0]}m9`, "im9", "Home", "T", "Minor 9 tonic", ["jazz"]));
      add(chord(`${deg[3]}m9`, "ivm9", "Away", "S", "Minor 9 subdominant", ["jazz"]));
      add(chord(`${Vmaj}9`, "V9", "Tension", "D", "V9 into minor", ["jazz"]));
      add(chord(`${deg[0]}m6`, "im6", "Home", "T", "Minor 6 — Dorian spice", ["jazz"]));
      add(chord(`${deg[5]}7`, "VI7", "Spice", "D", "VI7 as dominant color", ["jazz", "secondary"]));
    }
  }

  const nextMoves = buildSuggestions(last, {
    root,
    isMinor,
    deg,
    pick,
    Vmaj,
    complexity,
    palette,
  });

  const suggestions = {};
  for (const m of nextMoves) {
    suggestions[m.name] = { label: m.label, why: m.why, strength: m.strength };
  }

  const currentEntry =
    palette.find((p) => p.name === last) || palette.find((p) => chordsMatch(p.name, last));
  const currentFunction =
    currentEntry?.function || guessFunction(last, { isMinor, deg, Vmaj, root });

  return {
    full_palette: palette,
    suggestions,
    nextMoves,
    lastChord: last,
    keyRoot: root,
    isMinor,
    complexity,
    currentFunction,
    currentRoman: currentEntry?.roman || "",
    currentRole: currentEntry?.role || "",
    groups: groupPalette(palette),
  };
}

function guessFunction(chordName, { isMinor, deg, Vmaj, root }) {
  const p = parseChord(chordName);
  if (!p.root) return "?";
  if (p.root === normalizeRoot(root)) return "T";
  if (p.root === normalizeRoot(Vmaj) || p.root === deg[4]) return "D";
  if (p.kind === "dom") return "D";
  return "S";
}

function groupPalette(palette) {
  const order = ["Home", "Away", "Tension", "Color", "Borrow", "Spice"];
  const map = {};
  for (const c of palette) {
    const g = c.group || "Color";
    if (!map[g]) map[g] = [];
    map[g].push(c);
  }
  return order.filter((g) => map[g]?.length).map((g) => ({ name: g, chords: map[g] }));
}

function buildSuggestions(last, ctx) {
  const { isMinor, deg, pick, Vmaj, complexity, palette } = ctx;
  const moves = [];
  const L = last;
  const push = (name, label, why, strength) => {
    if (!name) return;
    const hit =
      palette.find((p) => p.name === name) || palette.find((p) => chordsMatch(p.name, name));
    const finalName = hit?.name || name;
    // Never suggest staying on the same chord
    if (chordsMatch(finalName, L) || finalName === L) return;
    if (moves.some((m) => m.name === finalName)) return;
    moves.push(move(finalName, label, why, strength, hit?.roman || ""));
  };
  const jazz = complexity === "jazz";
  const color = complexity === "color" || jazz;

  const I = isMinor
    ? color
      ? `${deg[0]}m7`
      : `${deg[0]}m`
    : color
      ? `${deg[0]}maj7`
      : deg[0];
  const ii = isMinor
    ? jazz
      ? `${deg[1]}m7b5`
      : `${deg[1]}dim`
    : color
      ? `${deg[1]}m7`
      : `${deg[1]}m`;
  const iii = isMinor ? deg[2] : color ? `${deg[2]}m7` : `${deg[2]}m`;
  const IV = isMinor
    ? color
      ? `${deg[3]}m7`
      : `${deg[3]}m`
    : color
      ? `${deg[3]}maj7`
      : deg[3];
  const V = isMinor
    ? color
      ? `${Vmaj}7`
      : Vmaj
    : color
      ? `${deg[4]}7`
      : deg[4];
  const vi = isMinor ? deg[5] : color ? `${deg[5]}m7` : `${deg[5]}m`;
  const bVII = isMinor ? deg[6] : pick(10);
  const ivb = isMinor ? IV : `${deg[3]}m`;

  const isTonic =
    chordsMatch(L, deg[0]) ||
    chordsMatch(L, `${deg[0]}m`) ||
    chordsMatch(L, `${deg[0]}maj7`) ||
    chordsMatch(L, `${deg[0]}m7`) ||
    chordsMatch(L, `${deg[0]}6`) ||
    chordsMatch(L, `${deg[0]}maj9`) ||
    chordsMatch(L, `${deg[0]}m9`) ||
    chordsMatch(L, `${deg[0]}add9`) ||
    chordsMatch(L, `${deg[0]}sus4`) ||
    chordsMatch(L, `${deg[0]}m(add9)`) ||
    chordsMatch(L, `${deg[0]}m6`);

  const isDom =
    chordsMatch(L, deg[4]) ||
    chordsMatch(L, Vmaj) ||
    chordsMatch(L, `${deg[4]}7`) ||
    chordsMatch(L, `${Vmaj}7`) ||
    chordsMatch(L, `${deg[4]}sus4`) ||
    chordsMatch(L, `${deg[4]}9`) ||
    chordsMatch(L, `${Vmaj}9`);

  const isSub =
    chordsMatch(L, deg[3]) ||
    chordsMatch(L, `${deg[3]}maj7`) ||
    chordsMatch(L, `${deg[3]}m`) ||
    chordsMatch(L, `${deg[3]}m7`) ||
    chordsMatch(L, `${deg[3]}add9`) ||
    chordsMatch(L, `${deg[3]}7`) ||
    chordsMatch(L, `${deg[3]}m9`);

  if (isTonic) {
    if (isMinor) {
      push(IV, "Deepen (iv)", "Subdominant — more minor color without leaving home yet", "strong");
      push(V, "Cadence (V)", "Major V pulls strongly back to i — classic minor drama", "tension");
      push(vi, "Lift (VI)", "Bright major VI — relative major side", "color");
      push(iii, "Relative major (III)", "Full relative major color", "color");
      if (jazz) push(ii, "iiø launch", "Start a minor ii–V", "strong");
    } else {
      push(V, "Build tension (V)", "Dominant — the strongest pull away from rest", "strong");
      push(IV, "Open up (IV)", "Subdominant — lifts without leaving the key center", "strong");
      push(vi, "Emote (vi)", "Relative minor — instant emotional shift", "color");
      push(ii, "Step to ii", "Gentle pre-dominant — sets up a later V", "color");
      if (jazz) push(`${deg[5]}7`, "V7/ii", "Secondary dominant into ii — jazz launch", "tension");
    }
  } else if (isDom) {
    push(I, "Resolve home", isMinor ? "Perfect cadence V → i" : "Perfect cadence V → I — the classic landing", "resolve");
    push(vi, "Deceptive", isMinor ? "V → VI surprise" : "V → vi — avoid home, keep the story going", "color");
    push(IV, "Hang (IV)", "Refuse resolution — float on the plagal side", "color");
    if (jazz && !isMinor) push(`${deg[5]}m7`, "Deceptive vi7", "Jazz deceptive resolution", "color");
  } else if (isSub) {
    const isMinorIV = /m/.test(parseChord(L).quality) && !isMinor;
    if (isMinorIV) {
      push(I, "Melancholy home", "iv → I — Beatles / sad resolve", "resolve");
      push(V, "Dark to V", "Minor IV into dominant — tense chorus setup", "tension");
    } else if (isMinor) {
      push(V, "To V", "iv → V cadential approach", "tension");
      push(I, "Plagal home", "iv → i amen cadence", "resolve");
      push(vi, "To VI", "iv → VI common minor loop", "strong");
    } else {
      push(V, "Cadence setup (V)", "IV → V builds into a strong landing", "tension");
      push(I, "Plagal home", "Amen cadence IV → I — soft resolve", "resolve");
      push(vi, "To vi", "IV → vi — pop ballad motion", "strong");
      push(ivb, "Minor IV", "Borrow minor iv over major for ache", "color");
      if (jazz) push(`${pick(10)}7`, "Backdoor", "IV into bVII7 setup", "color");
    }
  } else if (
    chordsMatch(L, `${deg[5]}m`) ||
    chordsMatch(L, `${deg[5]}m7`) ||
    (isMinor && (chordsMatch(L, deg[5]) || chordsMatch(L, `${deg[5]}maj7`)))
  ) {
    if (isMinor) {
      push(bVII, "VI → VII", "Andalusian / descending minor setup", "strong");
      push(I, "Home (i)", "VI → i soft return", "resolve");
      push(iii, "To III", "Stay on the relative major side", "color");
    } else {
      push(IV, "vi → IV", "Axis of awesome motion — huge in pop", "strong");
      push(ii, "vi → ii", "Cycle of fourths toward dominant", "color");
      push(I, "Back home", "vi → I soft return", "resolve");
      push(V, "vi → V", "Set up a chorus hit", "tension");
      if (jazz) push(`${deg[5]}7`, "Make V7/ii", "Turn vi into secondary dominant", "tension");
    }
  } else if (
    chordsMatch(L, `${deg[1]}m`) ||
    chordsMatch(L, `${deg[1]}m7`) ||
    chordsMatch(L, `${deg[1]}dim`) ||
    chordsMatch(L, `${deg[1]}m7b5`) ||
    chordsMatch(L, `${deg[1]}m9`)
  ) {
    push(V, "ii → V", isMinor ? "Minor ii–V engine" : "The jazz/pop pre-dominant → dominant", "tension");
    push(I, isMinor ? "ii → i" : "ii → I", "Soft land skipping strong V", "resolve");
    if (!isMinor) push(IV, "ii → IV", "Side-step color", "color");
    if (jazz && !isMinor) push(`${pick(1)}7`, "Tritone sub", "subV7/I chromatic approach to I", "color");
  } else if (
    chordsMatch(L, `${deg[2]}m`) ||
    chordsMatch(L, `${deg[2]}m7`) ||
    (isMinor && chordsMatch(L, deg[2]))
  ) {
    if (isMinor) {
      push(vi, "III → VI", "Relative major loop", "strong");
      push(I, "Back to i", "Return to minor home", "resolve");
    } else {
      push(IV, "iii → IV", "Lift into plagal side", "strong");
      push(vi, "iii → vi", "Circle of fifths", "color");
      push(I, "iii → I", "Soft tonic neighbor", "resolve");
    }
  } else if (
    chordsMatch(L, pick(10)) ||
    chordsMatch(L, deg[6]) ||
    chordsMatch(L, `${pick(10)}7`) ||
    chordsMatch(L, `${deg[6]}7`)
  ) {
    push(I, "Modal land", isMinor ? "VII → i" : "bVII → I rock land", "resolve");
    push(IV, "Keep open", "bVII → IV open modal feel", "strong");
    if (!isMinor) push(V, "To V", "Then cadence home", "tension");
  } else if (chordsMatch(L, `${deg[2]}7`)) {
    push(vi, "→ vi / VI", "Secondary dominant resolves to relative minor / VI", "resolve");
    push(IV, "Creep move", "III7 → IV — Radiohead / alt lift", "color");
  } else if (chordsMatch(L, `${deg[1]}7`)) {
    push(V, "→ V", "V of V lifts into the real dominant", "tension");
    if (jazz) push(vi, "Deceptive", "II7 → vi surprise", "color");
  } else if (chordsMatch(L, `${deg[0]}7`) && parseChord(L).kind === "dom") {
    push(IV, "→ IV", "Blues / gospel push I7 → IV", "strong");
  } else if (!isMinor && chordsMatch(L, `${deg[5]}7`)) {
    push(ii, "→ ii7", "Secondary resolves to ii", "resolve");
    if (jazz) push(`${pick(3)}7`, "Tritone of V/ii", "Chromatic side-step", "color");
  } else if (chordsMatch(L, `${pick(1)}7`)) {
    push(I, "Chromatic home", "Tritone sub resolves down a half step to I/i", "resolve");
  } else if (chordsMatch(L, `${pick(10)}7`)) {
    push(I, "Backdoor home", "bVII7 → I — jazz backdoor cadence", "resolve");
  } else if (
    chordsMatch(L, `${pick(8)}maj7`) ||
    (isMinor && chordsMatch(L, `${deg[5]}maj7`))
  ) {
    push(V, "Half-step to V", "bVI → V — cinematic cadence setup", "tension");
    push(I, "Plagal chromatic", "bVI → I direct land", "resolve");
    if (!isMinor) push(`${pick(10)}7`, "Mario cadence", "bVI → bVII7 → I setup", "color");
  } else if (
    chordsMatch(L, `${pick(3)}maj7`) ||
    (isMinor && chordsMatch(L, `${deg[2]}maj7`))
  ) {
    push(ii, "Slide to ii", "Neo-soul mediant motion", "strong");
    push(I, "Mediant home", "Chromatic mediant resolve", "resolve");
  } else {
    push(I, "Home", "Safe landing in the key", "resolve");
    push(V, "Dominant", "Add tension", "tension");
    push(IV, "Subdominant", "Open the harmony", "strong");
    push(vi, "Relative color", "Emotional side door", "color");
  }

  const pad = [
    [I, "Home", "Return to tonic", "resolve"],
    [V, "Tension", "Dominant pull", "tension"],
    [IV, "Open", "Subdominant color", "strong"],
    [vi, "Color", "Relative side", "color"],
  ];
  for (const [n, l, w, s] of pad) {
    if (moves.length >= 5) break;
    push(n, l, w, s);
  }

  const strengthOrder = { resolve: 0, strong: 1, tension: 2, color: 3 };
  moves.forEach((m, i) => {
    m._i = i;
  });
  moves.sort(
    (a, b) =>
      (strengthOrder[a.strength] ?? 9) - (strengthOrder[b.strength] ?? 9) || a._i - b._i
  );
  return moves.slice(0, 5).map(({ _i, ...rest }) => rest);
}

export function getCadences(key, complexity = "simple") {
  const cpx = resolveComplexity(complexity);
  const jazz = cpx === "jazz";
  const color = cpx === "color" || jazz;
  const { isMinor } = scaleDegrees(key);

  const c = (numerals, name, tip) => ({
    name,
    tip,
    numerals,
    chords: resolveProgression(numerals, key, jazz ? "jazz" : color ? "color" : "simple"),
  });

  if (isMinor) {
    return [
      c(["i", "iv", "V", "i"], "Minor perfect", "Strong classical minor cadence"),
      c(["i", "VI", "III", "VII"], "Pop minor loop", "Modern minor chassis"),
      c(["i", "iv", "i", "V"], "Plagal minor", "Soft then strong"),
      c(["iiø", "V", "i"], "Minor ii–V–i", "Jazz minor engine"),
    ];
  }
  return [
    c(["I", "V", "vi", "IV"], "Axis / pop", "The most used loop in modern music"),
    c(["I", "vi", "IV", "V"], "50s doo-wop", "Nostalgic turnaround"),
    c(["ii", "V", "I"], "ii–V–I", "Jazz sentence — resolve home"),
    c(["I", "IV", "V", "I"], "Basic cadence", "Clear functional grammar"),
    c(["vi", "IV", "I", "V"], "Sensitive pop", "Start minor, land bright"),
  ];
}

export function resolveProgression(numerals, key, jazzOrComplexity = false) {
  const complexity = resolveComplexity(jazzOrComplexity);
  const { full_palette } = generateHarmony(key, null, complexity);
  const { isMinor, deg, pick } = scaleDegrees(key);
  const Vmaj = pick(7);
  const color = complexity === "color" || complexity === "jazz";
  const jazz = complexity === "jazz";

  const map = {};
  for (const p of full_palette) {
    const clean = p.roman.split(" ")[0];
    map[clean] = p.name;
    map[p.roman] = p.name;
  }

  if (!isMinor) {
    Object.assign(map, {
      I: color || jazz ? `${deg[0]}maj7` : deg[0],
      ii: color || jazz ? `${deg[1]}m7` : `${deg[1]}m`,
      iii: color || jazz ? `${deg[2]}m7` : `${deg[2]}m`,
      IV: color || jazz ? `${deg[3]}maj7` : deg[3],
      V: color || jazz ? `${deg[4]}7` : deg[4],
      vi: color || jazz ? `${deg[5]}m7` : `${deg[5]}m`,
      "vii°": `${deg[6]}dim`,
      bVII: pick(10),
      iv: `${deg[3]}m`,
      III: `${deg[2]}7`,
      II: `${deg[1]}7`,
      I7: `${deg[0]}7`,
      "V/vi": `${deg[2]}7`,
      "V/V": `${deg[1]}7`,
    });
  } else {
    Object.assign(map, {
      i: color || jazz ? `${deg[0]}m7` : `${deg[0]}m`,
      iiø: `${deg[1]}m7b5`,
      iiø7: `${deg[1]}m7b5`,
      III: deg[2],
      iv: color || jazz ? `${deg[3]}m7` : `${deg[3]}m`,
      v: `${deg[4]}m`,
      V: color || jazz ? `${Vmaj}7` : Vmaj,
      VI: deg[5],
      VII: deg[6],
      bVII: deg[6],
      bVI: deg[5],
    });
  }

  return numerals.map((n) => {
    if (map[n]) return map[n];
    const cleaned = n.replace(/[^IVivb#ø°0-9/]/g, "");
    if (map[cleaned]) return map[cleaned];
    return isMinor
      ? color
        ? `${deg[0]}m7`
        : `${deg[0]}m`
      : color
        ? `${deg[0]}maj7`
        : deg[0];
  });
}

export const PROGRESSION_LIBRARY = [
  { id: "pop-axis", name: "Axis of Awesome", genre: "Pop", mood: "Anthemic", mode: "major", numerals: ["I", "V", "vi", "IV"], tip: "The 4-chord loop behind countless hits." },
  { id: "pop-50s", name: "50s Doo-Wop", genre: "Pop", mood: "Nostalgic", mode: "major", numerals: ["I", "vi", "IV", "V"], tip: "Classic turnaround." },
  { id: "pop-vi-start", name: "vi–IV–I–V", genre: "Pop", mood: "Bittersweet", mode: "major", numerals: ["vi", "IV", "I", "V"], tip: "Start on vi for emotional pop." },
  { id: "pop-sensitive", name: "Sensitive Pop", genre: "Pop", mood: "Tender", mode: "major", numerals: ["I", "V", "vi", "iii", "IV"], tip: "Adds iii for a softer walk-down." },
  { id: "pop-minor-loop", name: "Minor Pop Loop", genre: "Pop", mood: "Brooding", mode: "minor", numerals: ["i", "VI", "III", "VII"], tip: "Modern minor chassis." },
  { id: "rock-mixo", name: "Mixolydian Rock", genre: "Rock", mood: "Open", mode: "major", numerals: ["I", "bVII", "IV"], tip: "Flat-7 keeps it modal and driving." },
  { id: "rock-creep", name: "Creep / Alt Lift", genre: "Rock", mood: "Angsty", mode: "major", numerals: ["I", "III", "IV", "iv"], tip: "III energy into IV, then minor iv." },
  { id: "rock-power", name: "Power Loop", genre: "Rock", mood: "Driving", mode: "major", numerals: ["I", "IV", "V", "IV"], tip: "Simple and huge on guitar." },
  { id: "rock-minor", name: "Minor Rock Drive", genre: "Rock", mood: "Dark drive", mode: "minor", numerals: ["i", "VII", "VI", "VII"], tip: "Modal minor rock." },
  { id: "folk-plagal", name: "Folk Plagal", genre: "Folk", mood: "Warm", mode: "major", numerals: ["I", "IV", "I", "V"], tip: "Amen cadence DNA." },
  { id: "folk-walk", name: "Country Walkdown", genre: "Folk", mood: "Story", mode: "major", numerals: ["I", "V", "vi", "I", "IV"], tip: "Narrative motion." },
  { id: "folk-minor", name: "Minor Folk", genre: "Folk", mood: "Weathered", mode: "minor", numerals: ["i", "iv", "i", "VII"], tip: "Quiet minor verse material." },
  { id: "rnb-loop", name: "R&B Loop", genre: "R&B", mood: "Smooth", mode: "major", numerals: ["ii", "V", "I", "vi"], tip: "ii–V gravity with soft vi." },
  { id: "soul-minor-iv", name: "Soul Minor IV", genre: "R&B", mood: "Yearning", mode: "major", numerals: ["I", "iii", "IV", "iv"], tip: "Major warmth then minor-IV ache." },
  { id: "rnb-minor", name: "Minor R&B", genre: "R&B", mood: "Late night", mode: "minor", numerals: ["i", "iv", "VI", "V"], tip: "Minor groove with strong V." },
  { id: "sad-vi", name: "Sad Loop (major key)", genre: "Cinematic", mood: "Melancholy", mode: "major", numerals: ["vi", "IV", "I", "V"], tip: "Start relative minor, land bright." },
  { id: "sad-andalusian", name: "Andalusian Cadence", genre: "Cinematic", mood: "Dark", mode: "minor", numerals: ["i", "VII", "VI", "V"], tip: "Descending minor spine." },
  { id: "sad-plagal", name: "Minor Plagal", genre: "Cinematic", mood: "Soft-sad", mode: "minor", numerals: ["i", "iv", "i", "V"], tip: "Quiet grief then strong V." },
  { id: "sad-i-VI-III-VII", name: "Epic Minor", genre: "Cinematic", mood: "Wide", mode: "minor", numerals: ["i", "VI", "III", "VII"], tip: "Huge minor cinematic loop." },
  { id: "jazz-251", name: "ii–V–I", genre: "Jazz", mood: "Classic", mode: "major", numerals: ["ii", "V", "I"], tip: "The sentence of jazz harmony." },
  { id: "jazz-turnaround", name: "Jazz Turnaround", genre: "Jazz", mood: "Swing", mode: "major", numerals: ["I", "vi", "ii", "V"], tip: "End-of-form glue." },
  { id: "jazz-rhythm", name: "Rhythm Changes A", genre: "Jazz", mood: "Bright", mode: "major", numerals: ["I", "vi", "ii", "V", "I"], tip: "Skeleton of rhythm changes." },
  { id: "jazz-minor-251", name: "Minor ii–V–i", genre: "Jazz", mood: "Smoky", mode: "minor", numerals: ["iiø", "V", "i"], tip: "Minor jazz engine." },
  { id: "chorus-lift", name: "Chorus Lift", genre: "Song form", mood: "Lift", mode: "major", numerals: ["IV", "V", "I", "vi"], tip: "Start off-tonic." },
  { id: "verse-hold", name: "Verse Hold", genre: "Song form", mood: "Steady", mode: "major", numerals: ["I", "V", "I", "V"], tip: "Two-chord verse space." },
  { id: "bridge-escape", name: "Bridge Escape", genre: "Song form", mood: "Contrast", mode: "major", numerals: ["vi", "IV", "ii", "V"], tip: "Leave home then return." },
  { id: "verse-minor", name: "Minor Verse Hold", genre: "Song form", mood: "Steady", mode: "minor", numerals: ["i", "V", "i", "V"], tip: "Two-chord minor verse." },
  { id: "chorus-minor", name: "Minor Chorus Open", genre: "Song form", mood: "Lift", mode: "minor", numerals: ["VI", "VII", "i", "i"], tip: "Bright VI–VII into minor." },
];

export const PROGRESSION_GENRES = ["All", "Pop", "Rock", "Folk", "R&B", "Cinematic", "Jazz", "Song form"];

export function getProgressionsForKey(key, jazzOrComplexity = false, genre = "All") {
  const isMinor = /m$/.test(key);
  const mode = isMinor ? "minor" : "major";
  const complexity = resolveComplexity(jazzOrComplexity);

  let list = PROGRESSION_LIBRARY.filter((p) => !p.mode || p.mode === mode || p.mode === "both");
  if (genre !== "All") list = list.filter((p) => p.genre === genre);

  return list.map((p) => ({
    ...p,
    chords: resolveProgression(p.numerals, key, complexity),
  }));
}

export function lastChordFromLyrics(lyrics, fallbackKey = "C") {
  const matches = String(lyrics || "").match(/\[([A-G][b#]?[^\]]*)\]/g);
  if (!matches || !matches.length) {
    const isMinor = /m$/.test(fallbackKey);
    const root = fallbackKey.replace(/m$/, "");
    return isMinor ? `${normalizeRoot(root)}m` : normalizeRoot(root);
  }
  return matches[matches.length - 1].slice(1, -1);
}

export const FUNCTION_LABELS = {
  T: { name: "Tonic", tip: "Home / rest" },
  S: { name: "Subdominant", tip: "Away / open" },
  D: { name: "Dominant", tip: "Tension / pull" },
  P: { name: "Passing", tip: "Connective tissue" },
  "?": { name: "Other", tip: "Context-dependent" },
};
