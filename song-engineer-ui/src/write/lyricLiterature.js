/**
 * Literature sparks for songwriters
 * ─────────────────────────────────
 * Goal: originality. We give vehicles, prompts, and twists —
 * not finished lines to paste. The songwriter still writes the song.
 */

const CLICHE_PATTERNS = [
  /break(s|ing)? my heart/i,
  /fire in (my|the) soul/i,
  /lost without you/i,
  /love is (a )?fire/i,
  /like a rose/i,
  /walk(ing)? in the rain/i,
  /tears? (falling|running)/i,
  /never let you go/i,
  /light in the dark/i,
  /down on my knees/i,
  /spread my wings/i,
  /time stands still/i,
  /eyes wide open/i,
  /love like (a |the )?drug/i,
  /butterflies in (my|the)/i,
  /heart of gold/i,
  /broken heart/i,
  /cold as ice/i,
  /hot as fire/i,
  /deep as the ocean/i,
  /high as (a |the )?sky/i,
  /free as a bird/i,
  /dark as night/i,
  /bright as (the )?sun/i,
  /sharp as a knife/i,
  /soft as (a )?cloud/i,
];

/**
 * Vehicles: concrete, filmable images — never the finished metaphor.
 * prompt = question that forces the writer to invent the connection.
 */
const THEME_BANK = {
  love: [
    { vehicle: 'a porch light left on past midnight', sense: 'sight', prompt: 'Who is it for — and what would it mean if it went dark?' },
    { vehicle: 'a coat still warm on the chair', sense: 'touch', prompt: 'What just left the room that the coat still knows?' },
    { vehicle: 'two coffees, one undrunk', sense: 'taste', prompt: 'What habit of care outlived the person?' },
    { vehicle: 'a key that only fits one door', sense: 'touch', prompt: 'What exclusive access is this really about?' },
    { vehicle: 'your name fogged on a bathroom mirror', sense: 'sight', prompt: 'How long until it disappears — and who wipes it?' },
  ],
  heartbreak: [
    { vehicle: 'a toothbrush still in the cup', sense: 'sight', prompt: 'What ordinary object proves they\'re gone better than "I miss you"?' },
    { vehicle: 'a voicemail you can\'t delete', sense: 'sound', prompt: 'What digital ghost are you feeding?' },
    { vehicle: 'the dent in the mattress', sense: 'touch', prompt: 'Where does the body keep score after the goodbye?' },
    { vehicle: 'a song between the cereal aisles', sense: 'sound', prompt: 'Where does private grief ambush you in public?' },
    { vehicle: 'keys that feel lighter now', sense: 'touch', prompt: 'What mass went missing from your hand?' },
  ],
  time: [
    { vehicle: 'calendar squares scratched out in ink', sense: 'sight', prompt: 'What are you counting toward — or killing time for?' },
    { vehicle: 'a train that left without you', sense: 'sound', prompt: 'What opportunity made a sound when it abandoned you?' },
    { vehicle: 'dust on unlit birthday candles', sense: 'sight', prompt: 'What celebration never happened?' },
    { vehicle: 'the same song on year three of a playlist', sense: 'sound', prompt: 'How do you measure time without a clock?' },
  ],
  night: [
    { vehicle: 'streetlights walking someone home', sense: 'sight', prompt: 'What keeps company when no person will?' },
    { vehicle: 'the fridge humming at 3 a.m.', sense: 'sound', prompt: 'What is the only honest sound in the house?' },
    { vehicle: 'moonlight on a parking lot', sense: 'sight', prompt: 'Where does beauty show up in a plain place?' },
    { vehicle: 'a motel sign missing half its letters', sense: 'sight', prompt: 'What almost-message is the night spelling?' },
  ],
  home: [
    { vehicle: 'the creak of the third stair', sense: 'sound', prompt: 'What secret does only a local know?' },
    { vehicle: 'mail piling under the slot', sense: 'sight', prompt: 'What is building a city of absence?' },
    { vehicle: 'a spare key under a fake rock', sense: 'touch', prompt: 'Who is still allowed back in?' },
    { vehicle: 'wallpaper peeling like a confession', sense: 'sight', prompt: 'What is the house revealing against its will?' },
  ],
  road: [
    { vehicle: 'white lines ticking under tires', sense: 'sight', prompt: 'What rhythm replaces conversation?' },
    { vehicle: 'a map folded wrong so many times', sense: 'touch', prompt: 'How has the journey softened the plan?' },
    { vehicle: 'exit signs you almost take', sense: 'sight', prompt: 'What second chance keeps advertising itself?' },
    { vehicle: 'coffee rings on the dashboard', sense: 'sight', prompt: 'What residue marks the miles?' },
  ],
  fire: [
    { vehicle: 'a match struck just to watch it die', sense: 'sight', prompt: 'What desire is only about the burn, not the light?' },
    { vehicle: 'embers under cold ash', sense: 'touch', prompt: 'What isn\'t finished even when it looks finished?' },
    { vehicle: 'smoke in your hair till morning', sense: 'smell', prompt: 'What night refuses to wash out?' },
    { vehicle: 'a pilot light that never went out', sense: 'sight', prompt: 'What tiny flame survived the whole winter?' },
  ],
  water: [
    { vehicle: 'tide lines on jetty wood', sense: 'sight', prompt: 'What mark did the leaving leave?' },
    { vehicle: 'rain stitching a window shut', sense: 'sound', prompt: 'What weather is isolating you on purpose?' },
    { vehicle: 'a glass sweating on the table', sense: 'touch', prompt: 'What is the room confessing without words?' },
    { vehicle: 'ice talking under a boot', sense: 'sound', prompt: 'What danger lives under a calm surface?' },
  ],
  silence: [
    { vehicle: 'the space between two unanswered texts', sense: 'sight', prompt: 'How do you measure modern silence?' },
    { vehicle: 'a needle at the end of a record', sense: 'sound', prompt: 'What sound lives after the song?' },
    { vehicle: 'snow muting a whole street', sense: 'sound', prompt: 'What outside quiet matches your inside?' },
    { vehicle: 'holding your breath in a hallway', sense: 'body', prompt: 'What are you afraid the house will hear?' },
  ],
  memory: [
    { vehicle: 'a polaroid fading at the edges', sense: 'sight', prompt: 'Where does remembering wear out first?' },
    { vehicle: 'a stranger wearing their perfume', sense: 'smell', prompt: 'What ambush does scent still run?' },
    { vehicle: 'the same booth at the diner', sense: 'sight', prompt: 'What place is a time machine against your will?' },
    { vehicle: 'a scar that only hurts when it rains', sense: 'touch', prompt: 'What weather wakes the past in the body?' },
  ],
  hope: [
    { vehicle: 'a green shoot in cracked concrete', sense: 'sight', prompt: 'Where is life refusing the official story?' },
    { vehicle: 'gray dawn before it turns gold', sense: 'sight', prompt: 'What promise lives before arrival?' },
    { vehicle: 'one window lit on a dark block', sense: 'sight', prompt: 'Who is still awake — and for what?' },
    { vehicle: 'a letter you haven\'t sent yet', sense: 'touch', prompt: 'What future action is still possible?' },
  ],
  anger: [
    { vehicle: 'a glass set down too hard', sense: 'sound', prompt: 'What controlled violence fits in a small gesture?' },
    { vehicle: 'an engine idling in the driveway', sense: 'sound', prompt: 'What is ready to leave or explode?' },
    { vehicle: 'a door that never quite latches', sense: 'sound', prompt: 'What conflict stays unfinished on purpose?' },
    { vehicle: 'smoke bitten back in the throat', sense: 'body', prompt: 'What did you swallow instead of say?' },
  ],
  freedom: [
    { vehicle: 'an open passenger door at a red light', sense: 'sight', prompt: 'What choice freezes in a single second?' },
    { vehicle: 'shoes by the door you don\'t put on', sense: 'touch', prompt: 'Is staying also a kind of running?' },
    { vehicle: 'a fence with one missing board', sense: 'sight', prompt: 'Where is the quiet escape route?' },
    { vehicle: 'windows down on the highway', sense: 'touch', prompt: 'What name does the air take from you?' },
  ],
  loneliness: [
    { vehicle: 'two place settings, one used', sense: 'sight', prompt: 'What table evidence can\'t be argued with?' },
    { vehicle: 'a laugh track in an empty room', sense: 'sound', prompt: 'What fake company are you settling for?' },
    { vehicle: 'a second toothbrush still dry', sense: 'sight', prompt: 'Who were you prepared for that never came?' },
    { vehicle: 'echo in a stairwell after midnight', sense: 'sound', prompt: 'What answers when no one else will?' },
  ],
  regret: [
    { vehicle: 'a door closed mid-sentence', sense: 'sound', prompt: 'What half-truth still hangs in the air?' },
    { vehicle: 'tickets for a show you never saw', sense: 'sight', prompt: 'What future did you pay for and abandon?' },
    { vehicle: 'a message stuck in drafts at 2 a.m.', sense: 'sight', prompt: 'What courage never left the phone?' },
    { vehicle: 'a bridge burned for the heat', sense: 'touch', prompt: 'What short warmth cost you a way back?' },
  ],
  leaving: [
    { vehicle: 'a suitcase by the door that learned your name', sense: 'sight', prompt: 'What object knows before you admit it?' },
    { vehicle: 'keys left on the counter like a period', sense: 'sight', prompt: 'How do you punctuate a goodbye?' },
    { vehicle: 'a taxi idling while you invent one more reason', sense: 'sound', prompt: 'What is the meter charging you for?' },
    { vehicle: 'half a closet emptied to bare hangers', sense: 'sight', prompt: 'What sound do empty hangers make in a quiet room?' },
  ],
  desire: [
    { vehicle: 'a match held too close to the curtain', sense: 'sight', prompt: 'How near is want to damage?' },
    { vehicle: 'lipstick on a glass you pretend is yours', sense: 'sight', prompt: 'What mark are you borrowing?' },
    { vehicle: 'two hands almost touching', sense: 'touch', prompt: 'What is louder than contact?' },
    { vehicle: 'a keycard still warm in a back pocket', sense: 'touch', prompt: 'What possibility has weight?' },
  ],
  distance: [
    { vehicle: 'a map where your cities never touch', sense: 'sight', prompt: 'What geography is pretending to be fate?' },
    { vehicle: 'lag freezing a smile mid-kindness', sense: 'sight', prompt: 'What tech lag is really emotional lag?' },
    { vehicle: 'a timezone that steals half your sentences', sense: 'sound', prompt: 'Who gets your morning — who gets your midnight?' },
    { vehicle: 'weather on their city open on your phone', sense: 'sight', prompt: 'What care looks like when you can\'t be there?' },
  ],
};

const ALIASES = {
  heartbreak: ['breakup', 'broken', 'grief', 'loss', 'sad', 'hurt', 'miss', 'missing', 'pain'],
  love: ['romance', 'lover', 'desire', 'want', 'crush', 'devotion', 'adore'],
  time: ['years', 'aging', 'waiting', 'clock', 'future', 'past', 'forever'],
  night: ['midnight', 'dark', 'darkness', 'evening', 'insomnia', 'late'],
  home: ['house', 'hometown', 'family', 'kitchen', 'bedroom', 'apartment'],
  road: ['drive', 'driving', 'highway', 'journey', 'travel', 'car', 'trip'],
  fire: ['burn', 'burning', 'flame', 'heat', 'passion', 'smoke'],
  water: ['rain', 'ocean', 'sea', 'river', 'tears', 'drown', 'flood', 'tide'],
  silence: ['quiet', 'speechless', 'mute', 'unspoken', 'wordless'],
  memory: ['remember', 'nostalgia', 'flashback', 'yesterday', 'souvenir'],
  hope: ['faith', 'promise', 'maybe', 'tomorrow', 'wish', 'dream'],
  anger: ['rage', 'fury', 'hate', 'mad', 'bitter'],
  freedom: ['free', 'escape', 'release', 'liberty', 'run'],
  loneliness: ['alone', 'lonely', 'isolate', 'empty', 'solitude'],
  regret: ['sorry', 'mistake', 'guilt', 'should', 'would\'ve'],
  leaving: ['goodbye', 'farewell', 'exit', 'depart', 'gone', 'leave'],
  desire: ['want', 'lust', 'crave', 'hunger', 'thirst', 'longing', 'yearn'],
  distance: ['far', 'away', 'miles', 'apart', 'separate', 'remote'],
};

/** Odd / lateral vehicles to push outside the theme box */
const WILD_VEHICLES = [
  { vehicle: 'a vending machine that ate your last dollar', sense: 'sound', prompt: 'What small unfairness stands in for the big one?' },
  { vehicle: 'static between radio stations', sense: 'sound', prompt: 'What in-between state has a texture?' },
  { vehicle: 'a coin spinning before it chooses a face', sense: 'sight', prompt: 'What decision is still mid-air?' },
  { vehicle: 'gum under a desk from a class you failed', sense: 'touch', prompt: 'What petty past still sticks?' },
  { vehicle: 'a browser tab you never let them see', sense: 'sight', prompt: 'What private room lives in plain digital sight?' },
  { vehicle: 'frost writing on a car windshield', sense: 'sight', prompt: 'What message is temporary by design?' },
  { vehicle: 'a moth beating soft against a bulb', sense: 'sight', prompt: 'What want hurts itself to get closer?' },
  { vehicle: 'mud drying in the tread of your shoes', sense: 'touch', prompt: 'Where have you been that still rides with you?' },
];

const TWIST_FRAMES = [
  (q) => `Don\'t write "${q}" — write the object it leaves behind.`,
  (q) => `If a camera filmed "${q}", what is in the frame for three full seconds?`,
  (q) => `Swap the expected sense: what does "${q}" sound like? Smell like?`,
  (q) => `Blame a place, not a person, for "${q}".`,
  (q) => `Make "${q}" do one small physical action. No adjectives.`,
  (q) => `Cut the word "${q}" from the draft. Prove it with evidence only.`,
];

function cap(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function resolveTheme(query) {
  const q = query.toLowerCase().trim();
  if (THEME_BANK[q]) return q;
  for (const [theme, aliases] of Object.entries(ALIASES)) {
    if (aliases.some((a) => q.includes(a) || a.includes(q))) return theme;
  }
  for (const theme of Object.keys(THEME_BANK)) {
    if (q.includes(theme) || theme.includes(q)) return theme;
  }
  return null;
}

export function isCliche(text) {
  return CLICHE_PATTERNS.some((re) => re.test(text));
}

/**
 * Generate originality-first sparks for a query.
 * Cards are vehicles + prompts, not lines to steal.
 */
export function generateLocalLiterature(query, phraseType = 'Metaphors') {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  const theme = resolveTheme(q);
  const cards = [];
  const seen = new Set();

  const push = (card) => {
    const key = (card.vehicle || card.text || '').toLowerCase();
    if (!key || seen.has(key)) return;
    if (card.sample && isCliche(card.sample)) return;
    seen.add(key);
    cards.push({
      kind: card.kind || 'spark',
      vehicle: card.vehicle,
      prompt: card.prompt,
      sense: card.sense || null,
      // Optional starter — labeled as disposable, not the goal
      sample: card.sample || null,
      craft: card.craft || null,
      mode: phraseType,
      source: 'local',
      // Compat fields for older UI bits
      text: card.sample || card.vehicle,
      meaning: card.prompt,
      cliche: false,
      score: card.score ?? 70,
    });
  };

  // Theme vehicles → sparks
  const entries = theme && THEME_BANK[theme] ? THEME_BANK[theme] : [];
  for (const e of entries) {
    const sample =
      phraseType === 'Similes'
        ? `${cap(q)} like ${e.vehicle}`
        : phraseType === 'Idioms'
          ? null
          : null; // metaphors: no free full line by default

    push({
      kind: 'spark',
      vehicle: e.vehicle,
      prompt: e.prompt,
      sense: e.sense,
      sample,
      craft:
        phraseType === 'Similes'
          ? 'Steal the vehicle, not the sentence. Rewrite the comparison in your mouth\'s rhythm.'
          : phraseType === 'Idioms'
            ? 'Don\'t use a stock idiom. Borrow its skeleton, swap one noun for something only you would say.'
            : 'Don\'t write "X is Y". Show the vehicle doing something. Let the listener name the feeling.',
      score: 80,
    });
  }

  // Lateral / outside-the-box vehicles
  for (const w of WILD_VEHICLES) {
    push({
      kind: 'wild',
      vehicle: w.vehicle,
      prompt: `${w.prompt} (How does this touch "${q}" without saying it?)`,
      sense: w.sense,
      craft: 'Odd vehicles force original connections. If it feels wrong, you\'re close — push the link private.',
      score: 75,
    });
  }

  // Thinking prompts (no vehicle)
  for (const frame of TWIST_FRAMES.slice(0, 4)) {
    const prompt = frame(q);
    push({
      kind: 'prompt',
      vehicle: null,
      prompt,
      craft: 'Answer in images only. No abstract words.',
      text: prompt,
      score: 65,
    });
  }

  // Sense challenges
  const senses = ['sight', 'sound', 'touch', 'smell', 'taste'];
  for (const sense of senses) {
    push({
      kind: 'challenge',
      vehicle: null,
      prompt: `Describe "${q}" using only the ${sense} sense. One object. No similes yet.`,
      sense,
      craft: 'Constraint breeds surprise. Lock one sense before you unlock comparison.',
      text: `Only ${sense}: ${q}`,
      score: 60,
    });
  }

  // Sort: sparks first, then wild, then prompts
  const order = { spark: 0, wild: 1, prompt: 2, challenge: 3 };
  cards.sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9) || (b.score || 0) - (a.score || 0));
  return cards.slice(0, 28);
}

/**
 * Merge API phrases as optional "starters" only (de-emphasized).
 * Local sparks always lead.
 */
export function mergeLiterature(apiPhrases, query, phraseType) {
  const local = generateLocalLiterature(query, phraseType);
  const fromApi = (apiPhrases || [])
    .map((p) => {
      const text = (p.text || p.phrase || '').trim();
      if (!text || isCliche(text)) return null;
      // Convert API result into a spark-ish card: extract possible vehicle
      const vehicle = text
        .replace(new RegExp(`^${query}\\s+(is|are|like|as)\\s+`, 'i'), '')
        .replace(/^like\s+/i, '')
        .trim();
      return {
        kind: 'starter',
        vehicle: vehicle.length > 3 && vehicle.length < 80 ? vehicle : null,
        prompt: `Rewrite this so only you could have written it — change the place, object, or era: “${text}”`,
        sample: text,
        craft: 'Starter only. If you insert it raw, rewrite at least two words to make it yours.',
        sense: null,
        mode: phraseType,
        source: 'api',
        text,
        meaning: 'External starter — twist it hard',
        cliche: false,
        score: 40,
      };
    })
    .filter(Boolean);

  const seen = new Set();
  const merged = [];
  for (const card of [...local, ...fromApi]) {
    const key = (card.vehicle || card.prompt || card.text || '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(card);
  }
  return merged.slice(0, 36);
}

/** @deprecated kept for imports that still call enrichPhrase */
export function enrichPhrase(item, query = '', phraseType = 'Metaphors') {
  const text = (item.text || item.phrase || '').trim();
  if (!text) return null;
  return {
    kind: 'starter',
    vehicle: text,
    prompt: `Make this yours for “${query}”.`,
    sample: text,
    craft: 'Rewrite before you keep it.',
    text,
    meaning: item.meaning || '',
    cliche: isCliche(text),
    sense: item.sense || null,
    source: item.source || 'api',
    score: 40,
    mode: phraseType,
  };
}

export const LITERATURE_SEEDS = [
  'love', 'heartbreak', 'night', 'home', 'leaving', 'time',
  'silence', 'memory', 'hope', 'anger', 'freedom', 'loneliness',
  'fire', 'water', 'regret', 'desire', 'distance', 'road',
];

export const PLACEMENT_HINTS = {
  spark: 'Vehicle',
  wild: 'Outside the box',
  prompt: 'Think first',
  challenge: 'Constraint',
  starter: 'Starter — rewrite',
  structural: 'Chorus thesis',
  simile: 'Verse soft-land',
  image: 'Any section',
  sensory: 'Sense lock',
  personification: 'Let it act',
  idiom: 'Twist carefully',
};

export const SENSE_FILTERS = ['all', 'sight', 'sound', 'touch', 'smell', 'taste', 'body'];
