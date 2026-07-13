/**
 * Word Finder — songwriting-first lexicon.
 * Rhymes are ranked for lyric use (common, singable, usable at line-end)
 * rather than dumped as raw dictionary matches or rhyme-type tabs.
 */

const DATAMUSE = 'https://api.datamuse.com/words';

/**
 * High-value lyric vocabulary. Words that show up in real songs get a boost
 * when they appear as rhyme/related hits.
 */
const LYRIC_GOLD = new Set(`
  love heart night light right fire desire higher pain rain again train stay away day
  way say pray play free me see be sea key believe leave grieve sleeve home alone stone
  bone phone known own gone song long wrong strong belong break take make wake ache
  shake mistake time rhyme climb mine line fine mind blind find life wife knife crime
  dime chime prime dream seem stream team scream true blue you through new moon june
  soon room doom boom eyes skies lies cries try why cry sky high fly die lie
  fall call wall small all touch much such rush hush dark spark mark park start part
  art apart smart cart cold gold hold old sold told fold soul whole control roll
  hope rope tone grown thrown close nose rose goes clothes knows chose freeze please
  knees seas ease breathe receive need seed bleed feed lead speed feel real steal deal
  heal wheel reveal conceal fight sight white tight bright flight write tonight midnight
  sunlight highlight daylight run sun fun done one none won young tongue sung along upon
  wait late fate gate hate date state great weight change strange range remain chain lane
  wire tired liar choir admire above dove glove shove enough tough rough stuff us was
  because more door floor war pour score before explore over closer lower slower sober
  colder older shoulder never forever together weather better letter always days ways
  maze haze phase baby maybe crazy lady darling star far car scar lonely only holy
  slowly body somebody nobody feeling ceiling revealing wanting haunting missing kissing
  wishing holding folding falling calling running coming leaving believing standing
  landing broken open token spoken empty plenty silence violence distance memory heaven
  seven angel danger stranger shadow window pillow river ocean emotion devotion water
  daughter mother brother another father sister honey money somehow somewhere someone
  nothing everything anything something beyond dawn drawn belong alone tomorrow yesterday
  blood flood mud good should could would coulda shoulda woulda world girl whirl curl
  burn turn learn yearn earn return concern
`.trim().split(/\s+/));

/** Technical / archaic / unsingable patterns to bury */
const AVOID_PATTERNS = [
  /ology$|ometry$|itis$|osis$|ectomy$|graphy$/,
  /aceous$|iferous$|escent$/,
  /^un[a-z]{8,}/,
  /dehyde|chloride|oxide|sulfate|phosphate/,
  /^(xx|zz|qq)/,
  /^(there|here|where)of$/,
];

const AVOID_WORDS = new Set([
  'erudite', 'contrite', 'incite', 'excise', 'annex', 'complex', 'duplex',
  'reflex', 'convex', 'apex', 'index', 'cortex', 'latex', 'vortex',
  'trite', 'blight', 'plight', 'sleight', 'wight', 'sprite',
  'dight', 'hight', 'bight', 'affright', 'bedight',
  'alight', 'relight', 'backlight', 'floodlight', 'headlight',
  'thereof', 'hereof', 'whereof', 'belove', 'godlove', 'gov',
  'proton', 'enzyme', 'paradigm', 'maritime', 'hormone', 'syndrome',
  'liaison', 'phenomenon', 'pantomime', 'clime', 'stime', 'foxglove',
  'john', 'don', 'con', 'lawn', 'buyer', 'prior', 'require', 'acquire',
  'assert', 'exert', 'overt', 'import', 'export', 'convert', 'transport',
  'deneuve', 'lxxiv', 'nylon', 'baton', 'salon', 'amazon', 'woebegone',
  'macworld', 'eworld', 'neworld', 'sunworld', 'transworld', 'westworld',
  'waterworld', 'sterne', 'dern', 'spurn', 'adjourn', 'discern',
]);

/** Drop multi-word dictionary junk ("out of", "put on") and unsingable tokens */
function isUsableRhymeWord(word) {
  const w = (word || '').trim().toLowerCase();
  if (!w || w.length < 2) return false;
  // Multi-word phrases almost never land as clean line-end rhymes from Datamuse
  if (/\s/.test(w)) return false;
  if (/\d/.test(w)) return false;
  // Roman-numeral-ish / pure letter junk
  if (/^[ilvx]+$/i.test(w) && w.length >= 3) return false;
  if (AVOID_WORDS.has(w)) return false;
  for (const re of AVOID_PATTERNS) {
    if (re.test(w)) return false;
  }
  // Brand / tech "Xworld" compounds
  if (/world$/.test(w) && w.length > 8 && !/^(under|nether|dream|other|real)/.test(w)) {
    return false;
  }
  // Hyphen compounds from APIs are usually "put-on" style junk
  if (w.includes('-')) return false;
  // Extremely long single tokens
  if (w.length > 16) return false;
  return true;
}

/**
 * Curated rhymes songwriters actually use. Always merged with API results
 * so "love" surfaces enough/tough — not "thereof" / "out of".
 * Format: seed → array of { word, kind: 'perfect'|'near' }
 */
const SONG_RHYME_BANK = {
  love: [
    ['above', 'perfect'], ['dove', 'perfect'], ['glove', 'perfect'], ['shove', 'perfect'],
    ['enough', 'near'], ['tough', 'near'], ['rough', 'near'], ['stuff', 'near'],
    ['us', 'near'], ['was', 'near'], ['because', 'near'], ['of', 'near'],
  ],
  heart: [
    ['start', 'perfect'], ['part', 'perfect'], ['apart', 'perfect'], ['art', 'perfect'],
    ['dark', 'near'], ['spark', 'near'], ['mark', 'near'], ['hard', 'near'],
    ['smart', 'perfect'], ['chart', 'perfect'],
  ],
  night: [
    ['light', 'perfect'], ['right', 'perfect'], ['fight', 'perfect'], ['sight', 'perfect'],
    ['white', 'perfect'], ['tight', 'perfect'], ['bright', 'perfect'], ['flight', 'perfect'],
    ['tonight', 'perfect'], ['midnight', 'perfect'], ['sunlight', 'perfect'],
    ['daylight', 'perfect'], ['might', 'perfect'], ['write', 'perfect'],
  ],
  time: [
    ['rhyme', 'perfect'], ['climb', 'perfect'], ['prime', 'perfect'], ['crime', 'perfect'],
    ['dime', 'perfect'], ['chime', 'perfect'], ['lifetime', 'perfect'], ['sometime', 'perfect'],
    ['mine', 'near'], ['line', 'near'], ['fine', 'near'], ['mind', 'near'],
    ['blind', 'near'], ['find', 'near'], ['sign', 'near'], ['wine', 'near'],
  ],
  fire: [
    ['desire', 'perfect'], ['higher', 'perfect'], ['liar', 'perfect'], ['wire', 'perfect'],
    ['tired', 'near'], ['choir', 'perfect'], ['admire', 'perfect'], ['pyre', 'perfect'],
    ['inspire', 'perfect'], ['retire', 'perfect'],
  ],
  gone: [
    ['song', 'perfect'], ['long', 'perfect'], ['wrong', 'perfect'], ['strong', 'perfect'],
    ['belong', 'perfect'], ['along', 'perfect'], ['on', 'perfect'], ['upon', 'perfect'],
    ['dawn', 'near'], ['drawn', 'near'], ['beyond', 'near'],
  ],
  alone: [
    ['bone', 'perfect'], ['stone', 'perfect'], ['phone', 'perfect'], ['known', 'perfect'],
    ['own', 'perfect'], ['home', 'near'], ['tone', 'perfect'], ['grown', 'perfect'],
    ['thrown', 'perfect'], ['zone', 'perfect'], ['control', 'near'], ['tomorrow', 'near'],
  ],
  rain: [
    ['pain', 'perfect'], ['again', 'perfect'], ['train', 'perfect'], ['lane', 'perfect'],
    ['chain', 'perfect'], ['remain', 'perfect'], ['vein', 'perfect'], ['name', 'near'],
    ['same', 'near'], ['flame', 'near'],
  ],
  home: [
    ['alone', 'perfect'], ['phone', 'perfect'], ['known', 'perfect'], ['stone', 'perfect'],
    ['bone', 'perfect'], ['own', 'perfect'], ['tone', 'perfect'], ['roam', 'perfect'],
  ],
  free: [
    ['me', 'perfect'], ['see', 'perfect'], ['be', 'perfect'], ['sea', 'perfect'],
    ['key', 'perfect'], ['believe', 'near'], ['need', 'near'], ['leave', 'near'],
  ],
  stay: [
    ['away', 'perfect'], ['day', 'perfect'], ['way', 'perfect'], ['say', 'perfect'],
    ['pray', 'perfect'], ['today', 'perfect'], ['play', 'perfect'], ['break', 'near'],
  ],
  break: [
    ['take', 'perfect'], ['make', 'perfect'], ['wake', 'perfect'], ['ache', 'perfect'],
    ['shake', 'perfect'], ['mistake', 'perfect'], ['fake', 'perfect'],
  ],
  true: [
    ['you', 'perfect'], ['blue', 'perfect'], ['through', 'perfect'], ['new', 'perfect'],
    ['do', 'perfect'], ['too', 'perfect'], ['who', 'perfect'],
  ],
  feel: [
    ['real', 'perfect'], ['steal', 'perfect'], ['deal', 'perfect'], ['heal', 'perfect'],
    ['wheel', 'perfect'], ['reveal', 'perfect'],
  ],
  fall: [
    ['call', 'perfect'], ['wall', 'perfect'], ['all', 'perfect'], ['small', 'perfect'],
    ['crawl', 'perfect'], ['ball', 'perfect'],
  ],
  run: [
    ['sun', 'perfect'], ['fun', 'perfect'], ['done', 'perfect'], ['one', 'perfect'],
    ['none', 'perfect'], ['young', 'near'], ['come', 'near'],
  ],
  cry: [
    ['why', 'perfect'], ['try', 'perfect'], ['sky', 'perfect'], ['high', 'perfect'],
    ['die', 'perfect'], ['lie', 'perfect'], ['fly', 'perfect'],
  ],
  dream: [
    ['seem', 'perfect'], ['stream', 'perfect'], ['team', 'perfect'], ['scream', 'perfect'],
    ['between', 'near'], ['mean', 'near'],
  ],
  soul: [
    ['whole', 'perfect'], ['control', 'perfect'], ['roll', 'perfect'], ['cold', 'near'],
    ['gold', 'near'], ['hold', 'near'], ['goal', 'perfect'],
  ],
  pain: [
    ['rain', 'perfect'], ['again', 'perfect'], ['train', 'perfect'], ['remain', 'perfect'],
    ['vein', 'perfect'], ['name', 'near'], ['shame', 'near'], ['flame', 'near'],
  ],
  blue: [
    ['you', 'perfect'], ['true', 'perfect'], ['through', 'perfect'], ['new', 'perfect'],
    ['do', 'perfect'], ['too', 'perfect'], ['who', 'perfect'],
  ],
  life: [
    ['wife', 'perfect'], ['knife', 'perfect'], ['strife', 'perfect'], ['tonight', 'near'],
    ['light', 'near'], ['fight', 'near'],
  ],
  world: [
    ['girl', 'perfect'], ['curl', 'perfect'], ['whirl', 'perfect'], ['unfurled', 'perfect'],
    ['hurled', 'perfect'],
  ],
  burn: [
    ['turn', 'perfect'], ['learn', 'perfect'], ['yearn', 'perfect'], ['return', 'perfect'],
    ['concern', 'perfect'], ['earn', 'perfect'],
  ],
};

function bankRhymes(seed) {
  const list = SONG_RHYME_BANK[seed] || [];
  return list.map(([word, kind]) => ({
    word,
    syllables: estimateSyllables(word),
    stress: null,
    score: 200,
    freq: LYRIC_GOLD.has(word) ? 8 : 5,
    rhymeKind: kind,
    fromBank: true,
  }));
}

/**
 * Fetch word results. Rhymes return a single songwriting-ranked list.
 */
export async function findWords({
  word,
  tool = 'Rhymes',
  rhymeType = 'Perfect', // kept for API compat; ignored for ranked rhymes
  topic = '',
  max = 48,
  signal,
} = {}) {
  const q = (word || '').trim().toLowerCase();
  if (q.length < 2) return { words: [], source: 'empty' };

  try {
    if (tool === 'Rhymes') {
      return await findSongwritingRhymes(q, max, signal);
    }

    if (tool === 'Related') {
      const [ml, trg] = await Promise.all([
        getJson(
          `${DATAMUSE}?${new URLSearchParams({
            ml: q,
            max: String(Math.floor(max * 0.8)),
            md: 'f',
          })}`,
          signal
        ),
        getJson(
          `${DATAMUSE}?${new URLSearchParams({
            rel_trg: q,
            max: String(Math.floor(max * 0.5)),
            md: 'f',
          })}`,
          signal
        ),
      ]);
      let words = mergeUnique(normalizeList(ml, 'related'), normalizeList(trg, 'related'));
      words = rankForSongwriting(words, q).slice(0, max);
      return {
        words: words.length ? words : offlineRelated(q),
        source: words.length ? 'datamuse' : 'offline',
      };
    }

    if (tool === 'Imagery') {
      const params = new URLSearchParams({
        ml: q,
        max: String(max),
        md: 'f',
      });
      if (topic.trim()) params.set('topics', topic.trim());
      const data = await getJson(`${DATAMUSE}?${params}`, signal);
      let words = rankForSongwriting(normalizeList(data, 'imagery'), q);
      if (!words.length) words = offlineImagery(q);
      const categories = groupBySense(words, q);
      return {
        categories,
        words: flattenCategories(categories),
        source: words.length ? 'datamuse' : 'offline',
      };
    }

    return { words: [], source: 'empty' };
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    if (tool === 'Rhymes') return { words: offlineRhymes(q), source: 'offline', error: 'offline' };
    if (tool === 'Imagery') {
      const categories = groupBySense(offlineImagery(q), q);
      return { categories, words: flattenCategories(categories), source: 'offline', error: 'offline' };
    }
    return { words: offlineRelated(q), source: 'offline', error: 'offline' };
  }
}

/**
 * Pull perfect + near + sound-alike rhymes, merge curated bank, rank for lyric use.
 * One list: songwriting-usable first — not Perfect / Near / Sound tabs.
 */
async function findSongwritingRhymes(q, max, signal) {
  const fetchRel = (rel, n) =>
    getJson(
      `${DATAMUSE}?${new URLSearchParams({
        [rel]: q,
        max: String(n),
        md: 'sf', // syllables + frequency
      })}`,
      signal
    );

  const [perfect, near, sound] = await Promise.all([
    fetchRel('rel_rhy', 80),
    fetchRel('rel_nry', 40),
    fetchRel('rel_slr', 24),
  ]);

  const tagged = [
    ...bankRhymes(q),
    ...normalizeList(perfect, 'perfect'),
    ...normalizeList(near, 'near'),
    ...normalizeList(sound, 'sound'),
  ].filter((w) => w.word !== q && isUsableRhymeWord(w.word));

  let words = rankForSongwriting(mergeUniqueKeepBest(tagged), q, { forRhymes: true });

  if (!words.length) {
    words = offlineRhymes(q);
    return { words: words.slice(0, max), source: 'offline' };
  }

  return {
    words: words.slice(0, max),
    source: 'datamuse',
  };
}
async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function normalizeList(data, rhymeKind = null) {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const word = item.word || item;
      if (typeof word !== 'string' || !word.trim()) return null;
      const clean = word.trim().toLowerCase();
      if (!isUsableRhymeWord(clean) && rhymeKind) return null;
      // Related/imagery may keep short multi-word; rhymes already filtered
      if (clean.includes(' ') && clean.split(/\s+/).length > 2) return null;
      if (clean.length > 14 && clean.includes('-')) return null;

      const syllables = item.numSyllables || estimateSyllables(clean);
      // Datamuse frequency tag: "f:12.345" (log freq of word in Google books)
      let freq = 0;
      if (Array.isArray(item.tags)) {
        const ft = item.tags.find((t) => typeof t === 'string' && t.startsWith('f:'));
        if (ft) freq = parseFloat(ft.slice(2)) || 0;
      }

      return {
        word: clean,
        syllables,
        stress: null,
        score: item.score || 0,
        freq,
        rhymeKind, // perfect | near | sound | related | imagery
      };
    })
    .filter(Boolean);
}
function mergeUnique(a, b) {
  return mergeUniqueKeepBest([...a, ...b]);
}

function mergeUniqueKeepBest(list) {
  const map = new Map();
  const kindRank = { perfect: 3, near: 2, sound: 1, related: 0, imagery: 0 };
  for (const item of list) {
    const prev = map.get(item.word);
    if (!prev) {
      map.set(item.word, item);
      continue;
    }
    // Keep better rhyme kind + higher freq; preserve bank / gold boosts
    const prevK = kindRank[prev.rhymeKind] || 0;
    const nextK = kindRank[item.rhymeKind] || 0;
    const preferNext = nextK > prevK || (nextK === prevK && (item.freq || 0) > (prev.freq || 0));
    const base = preferNext ? item : prev;
    const other = preferNext ? prev : item;
    map.set(item.word, {
      ...base,
      rhymeKind: (nextK >= prevK ? item.rhymeKind : prev.rhymeKind) || base.rhymeKind,
      freq: Math.max(prev.freq || 0, item.freq || 0),
      score: Math.max(prev.score || 0, item.score || 0),
      fromBank: !!(prev.fromBank || item.fromBank),
      syllables: base.syllables || other.syllables,
    });
  }
  return [...map.values()];
}
/**
 * Score a word for lyric usefulness. Higher = show first.
 */
export function songwritingScore(item, seed = '') {
  const w = item.word;
  let s = 0;

  // Frequency (Datamuse f: tag) — biggest signal of "normal English"
  const freq = item.freq || 0;
  if (freq > 0) {
    // log scale: common words ~4–7, rare ~0–2
    s += Math.min(40, freq * 5.5);
  } else {
    s += item.fromBank ? 18 : 8;
  }

  // Curated lyric vocabulary
  if (LYRIC_GOLD.has(w)) s += 32;

  // Songwriter bank entries — always surface
  if (item.fromBank) s += 22;

  // Singable length & syllables
  const syl = item.syllables || estimateSyllables(w);
  if (syl === 1) s += 14;
  else if (syl === 2) s += 16; // sweet spot for hooks
  else if (syl === 3) s += 10;
  else if (syl === 4) s += 2;
  else s -= 12; // 5+ syllables hard to sing cleanly

  // Word length (letters)
  const len = w.length;
  if (len >= 3 && len <= 6) s += 10;
  else if (len <= 8) s += 5;
  else if (len > 11) s -= 10;

  // Prefer single tokens
  if (!w.includes(' ') && !w.includes('-')) s += 4;
  if (w.includes(' ')) s -= 20;

  // Perfect rhymes well ahead of near/sound — but gold near rhymes still win
  if (item.rhymeKind === 'perfect') s += 14;
  else if (item.rhymeKind === 'near') s += LYRIC_GOLD.has(w) || item.fromBank ? 10 : 0;
  else if (item.rhymeKind === 'sound') s += LYRIC_GOLD.has(w) ? 4 : -6;

  // Compounds that end with the seed (tonight, midnight, sunlight…) — gold in songs
  if (seed && w.length > seed.length + 1 && w.endsWith(seed) && !w.includes(' ')) {
    s += 20;
  }

  // Datamuse raw score (relatedness) — soft influence
  if (item.score > 0) s += Math.min(8, Math.log10(item.score + 1) * 2);

  // Emotional / concrete-ish endings often good in songs
  if (/(ing|ed|er|ly|ful|less|ness|ment)$/.test(w) && syl <= 3) s += 3;
  // Strong content words
  if (/^(heart|love|night|light|fire|rain|pain|soul|dream|tear|blood|bone|skin|breath)/.test(w)) {
    s += 6;
  }

  // Penalties
  if (AVOID_WORDS.has(w)) s -= 40;
  for (const re of AVOID_PATTERNS) {
    if (re.test(w)) {
      s -= 30;
      break;
    }
  }
  // Very rare orthography
  if (/[qxjz]{2}|[aeiou]{4}/i.test(w)) s -= 8;
  // Same as seed
  if (w === seed) s -= 100;

  // Bare function words — rarely strong line endings (except a few bank near-rhymes)
  if (['a', 'an', 'the', 'to', 'in', 'at', 'is', 'are'].includes(w)) {
    s -= 24;
  }
  // "of" / "on" / "was" / "be" can work as near rhymes if bank/gold tagged them
  if (['of', 'on', 'was', 'be', 'me', 'you', 'do'].includes(w) && !item.fromBank && !LYRIC_GOLD.has(w)) {
    s -= 12;
  }

  return s;
}

function rankForSongwriting(words, seed, { forRhymes = false } = {}) {
  return words
    .map((w) => ({ ...w, songScore: songwritingScore(w, seed) }))
    .filter((w) => {
      if (w.songScore <= 8) return false;
      if (!forRhymes) return true;
      // Near/sound: curated bank only — Datamuse near lists are noisy
      // ("score"≈fire, "report"≈heart). Perfect rhymes still come from the API.
      if (w.rhymeKind === 'near' || w.rhymeKind === 'sound') {
        return w.fromBank && w.songScore > 35;
      }
      return true;
    })
    .sort((a, b) => b.songScore - a.songScore || (b.freq || 0) - (a.freq || 0));
}

function estimateSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return 1;
  const matches = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function flattenCategories(cats) {
  const out = [];
  for (const list of Object.values(cats || {})) out.push(...list);
  return out;
}

function groupBySense(words, seed) {
  const SIGHT = /light|dark|color|colour|glow|shadow|bright|shine|look|see|eye|red|blue|gold|flash|mirror|window|sky|sun|moon/;
  const SOUND = /sound|noise|ring|hum|buzz|whisper|echo|voice|song|music|click|crash|silence|quiet|loud|bell/;
  const TOUCH = /soft|hard|cold|hot|warm|rough|smooth|sharp|heavy|light|touch|skin|burn|freeze|wet|dry/;
  const SMELL = /smell|scent|perfume|smoke|dust|rain|salt|sweet|sour|bitter|air|breath/;
  const TASTE = /taste|sweet|bitter|salt|sour|metal|blood|coffee|wine|sugar|spice/;
  const BODY = /heart|hand|bone|blood|breath|chest|throat|pulse|scar|teeth|jaw|spine/;

  const cats = {
    Sight: [],
    Sound: [],
    Touch: [],
    Smell: [],
    Taste: [],
    Body: [],
    Other: [],
  };

  for (const item of words) {
    const w = item.word;
    if (SIGHT.test(w)) cats.Sight.push(item);
    else if (SOUND.test(w)) cats.Sound.push(item);
    else if (TOUCH.test(w)) cats.Touch.push(item);
    else if (SMELL.test(w)) cats.Smell.push(item);
    else if (TASTE.test(w)) cats.Taste.push(item);
    else if (BODY.test(w)) cats.Body.push(item);
    else cats.Other.push(item);
  }

  const out = {};
  for (const [k, v] of Object.entries(cats)) {
    if (v.length) out[k] = v.slice(0, 20);
  }
  if (!Object.keys(out).length) out.Other = words.slice(0, 20);
  return out;
}

// ── Offline fallbacks (already lyric-friendly) ────────────────

const OFFLINE_RELATED = {
  love: ['hold', 'want', 'near', 'promise', 'tender', 'stay'],
  heartbreak: ['quiet', 'empty', 'distance', 'after', 'silence', 'gone'],
  night: ['midnight', 'street', 'window', 'shadow', 'moon', 'alone'],
  home: ['door', 'key', 'return', 'kitchen', 'hallway', 'safe'],
};

function offlineRhymes(q) {
  const bank = bankRhymes(q);
  if (bank.length) {
    return rankForSongwriting(bank, q, { forRhymes: true });
  }
  // Generic offline: empty → UI shows no hits
  return [];
}
function offlineRelated(q) {
  const list = OFFLINE_RELATED[q] || [];
  return list.map((word) => ({
    word,
    syllables: estimateSyllables(word),
    stress: null,
    score: 1,
    freq: 4,
    songScore: 50,
  }));
}

function offlineImagery(q) {
  const bank = {
    love: ['porchlight', 'coat', 'key', 'coffee', 'handshake', 'pulse'],
    night: ['streetlamp', 'window', 'neon', 'asphalt', 'siren', 'curtain'],
    home: ['stair', 'mailbox', 'kettle', 'threshold', 'doormat', 'hallway'],
    rain: ['puddle', 'umbrella', 'gutter', 'glass', 'steam', 'slick'],
  };
  const list = bank[q] || ['window', 'road', 'room', 'hand', 'sky', 'door'];
  return list.map((word) => ({
    word,
    syllables: estimateSyllables(word),
    stress: null,
    score: 1,
    freq: 3,
    songScore: 40,
  }));
}

export const WORD_TOOLS = [
  { id: 'Rhymes', label: 'Rhymes', hint: 'Usable songwriting rhymes — singable words first' },
  { id: 'Related', label: 'Related', hint: 'Nearby words — push past the first idea' },
  { id: 'Imagery', label: 'Imagery', hint: 'Sensory nouns you can film' },
];
/** @deprecated rhyme type tabs removed — kept so old imports don't crash */
export const RHYME_TYPES = [];
