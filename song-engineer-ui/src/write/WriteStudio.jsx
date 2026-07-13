import { useState, useRef, useEffect } from 'react';
import { syllable } from 'syllable';
import {
  mergeLiterature,
  LITERATURE_SEEDS,
  PLACEMENT_HINTS,
  generateLocalLiterature,
  SENSE_FILTERS,
} from './lyricLiterature';
import { findWords, WORD_TOOLS } from './wordFinder';
import {
  generateHarmony,
  getProgressionsForKey,
  getCadences,
  PROGRESSION_GENRES,
  COMPLEXITY_LEVELS,
  FUNCTION_LABELS,
  lastChordFromLyrics,
  chordsMatch,
} from './chordEngine';
import './WriteStudio.css';

const chordsMatchLoose = chordsMatch;

const NOTE_FREQS = {
  "C": 261.63, "C#": 277.18, "Db": 277.18, "D": 293.66, "D#": 311.13, "Eb": 311.13,
  "E": 329.63, "F": 349.23, "F#": 369.99, "Gb": 369.99, "G": 392.00, "G#": 415.30,
  "Ab": 415.30, "A": 440.00, "A#": 466.16, "Bb": 466.16, "B": 493.88
};

const CLICHES = [
  "break my heart", "tears falling down", "walk in the rain", "walking in the rain", 
  "never let you go", "miss you so", "without you", "fire in my soul", 
  "light in the dark", "lost without you", "down on my knees", "spread my wings",
  "time stands still", "eyes wide open"
];

const FIGURES_OF_SPEECH = [
  // --- SONIC & RHYTHMIC DEVICES (Prosody Focus) ---
  { 
    name: "Alliteration", 
    desc: "The repetition of the same consonant sounds at the beginning of words near each other.", 
    usage: "Creates a rhythmic, driving, or hypnotic musicality. Great for locking into a drum groove.", 
    examples: ["'Whisper words of wisdom' (The Beatles)", "'Bad blood' (Taylor Swift)"] 
  },
  { 
    name: "Assonance", 
    desc: "The repetition of internal vowel sounds in nearby words.", 
    usage: "Creates an internal, hidden rhyme scheme that makes lines flow beautifully and smoothly without sounding forced.", 
    examples: ["'I feel the need, the need for speed'", "'Hear the mellow wedding bells' (Edgar Allan Poe)"] 
  },
  { 
    name: "Consonance", 
    desc: "The repetition of consonant sounds within or at the end of words.", 
    usage: "Acts like a linguistic drum kit. Creates a percussive, biting rhythm that helps vocals cut through a dense mix.", 
    examples: ["'Ticking in the dark, the clock struck a spark'", "'Mike likes his new bike'"] 
  },
  { 
    name: "Enjambment", 
    desc: "Continuing a sentence or thought across a line break without a grammatical pause.", 
    usage: "Pulls the listener forward, blurring the strict musical grid to create conversational, unpredictable, and breathless phrasing.", 
    examples: ["'I've got a hundred million reasons to walk away / But baby, I just need one good one to stay' (Lady Gaga)"] 
  },
  { 
    name: "Epizeuxis", 
    desc: "The immediate, rapid-fire repetition of a single word.", 
    usage: "Hammers home an emotional peak and creates an inescapable, driving rhythmic hook.", 
    examples: ["'Never, never, never, never giving up'", "'Work, work, work, work, work' (Rihanna)"] 
  },

  // --- REPETITION & STRUCTURE ---
  { 
    name: "Anaphora", 
    desc: "Repeating the same word or phrase at the beginning of successive lines.", 
    usage: "Builds massive emotional momentum, tension, and a chant-like predictability that audiences love.", 
    examples: ["'Every breath you take / Every move you make' (The Police)"] 
  },
  { 
    name: "Epistrophe", 
    desc: "Repeating the same word or phrase at the end of successive lines.", 
    usage: "Creates a haunting echo effect and provides a very satisfying, conclusive anchor to a verse or chorus.", 
    examples: ["'Cause if you liked it then you should have put a ring on it / If you liked it then you should've put a ring on it' (Beyoncé)"] 
  },

  // --- IMAGERY & CONTRAST ---
  { 
    name: "Metaphor", 
    desc: "Directly equating two unrelated things to highlight a shared trait, without using 'like' or 'as'.", 
    usage: "Paints an immediate, vivid image without wasting syllables. Great for intense emotional declarations.", 
    examples: ["'Your face is a sun outshining the moon'", "'You're a falling star, you're the get away car' (Bruno Mars)"] 
  },
  { 
    name: "Simile", 
    desc: "Comparing two different things using the words 'like' or 'as'.", 
    usage: "Creates relatable imagery while maintaining a softer, more reflective lyrical flow than a direct metaphor.", 
    examples: ["'Shine bright like a diamond' (Rihanna)", "'Cuts like a knife' (Bryan Adams)"] 
  },
  { 
    name: "Personification", 
    desc: "Giving human qualities to inanimate objects, weather, or concepts.", 
    usage: "Helps you 'show, don't tell'. Turns static scenery into an active character in your song.", 
    examples: ["'While my guitar gently weeps' (The Beatles)", "'The city sleeps'"] 
  },
  { 
    name: "Hyperbole", 
    desc: "Deliberate, extreme exaggeration not meant to be taken literally.", 
    usage: "Raises the emotional stakes to a 10/10. Perfect for anthemic choruses or expressions of extreme heartbreak/love.", 
    examples: ["'I'd catch a grenade for ya' (Bruno Mars)", "'A thousand years' (Christina Perri)"] 
  },
  { 
    name: "Oxymoron", 
    desc: "A phrase combining two contradictory terms.", 
    usage: "Captures complex, conflicted feelings perfectly. Great for highlighting the bittersweet nature of a relationship.", 
    examples: ["'The sound of silence' (Simon & Garfunkel)", "'Cruel summer' (Taylor Swift)"] 
  },
  { 
    name: "Metonymy", 
    desc: "Substituting the name of one object for another object closely associated with it.", 
    usage: "Makes abstract concepts highly tangible and saves valuable metric real estate in tight melodic lines.", 
    examples: ["'The suits are coming' (meaning corporate executives)", "'The pen is mightier than the sword'"] 
  },
  { 
    name: "Synecdoche", 
    desc: "A figure of speech where a specific part is used to represent the whole (or vice versa).", 
    usage: "Focuses the listener on a highly specific, tangible detail rather than a generic object. It saves syllables and creates immediate visual grounding.", 
    examples: ["'Got a new set of wheels' (meaning a car)", "'All hands on deck' (meaning the crew/people)"] 
  },
];

const SONG_PROMPTS = {
  "Story": [
    { title: "The Overheard Conversation", desc: "Start with a line of dialogue you 'overheard' at a coffee shop." }, 
    { title: "Two Strangers", desc: "Write about two strangers waiting for a delayed train in the rain." },
    { title: "The Unsent Letter", desc: "Write the exact contents of a letter/text you wrote but deleted before sending." },
    { title: "Hometown Ghost", desc: "Describe the feeling of driving through your hometown and realizing you don't belong there anymore." },
    { title: "The Getaway Car", desc: "Focus entirely on the 5 minutes immediately following a terrible, but necessary, life decision." }
  ],
  "Emotion": [
    { title: "The Quiet Aftermath", desc: "The deafening silence in the room right after a massive argument ends." }, 
    { title: "Bittersweet Success", desc: "Achieving your biggest dream, but the person you wanted to share it with is gone." },
    { title: "Right Person, Wrong Time", desc: "The agony of perfect compatibility completely ruined by circumstance." },
    { title: "Pre-emptive Grief", desc: "Mourning the end of a relationship or era while you are still actively in it." },
    { title: "Imposter Syndrome", desc: "The terrifying feeling that you are a fraud right as everyone is cheering for you." }
  ],
  "Concept": [
    { title: "Inanimate Witness", desc: "Write from the perspective of a piece of furniture witnessing a breakup." }, 
    { title: "Reverse Chronology", desc: "Start at the bitter end of a relationship and write backwards to the first hello." },
    { title: "The Answer Song", desc: "Write a direct response to a famous song from the 'villain's' perspective (e.g., Jolene's side of the story)." },
    { title: "The Unreliable Narrator", desc: "Write a heartbreak song where it slowly becomes obvious to the listener that the singer was actually the toxic one." },
    { title: "Micro to Macro", desc: "Verse 1 is about a coffee stain. The Chorus is about the end of the world." }
  ],
  "Challenge": [
    { title: "No Pronouns", desc: "Write an entire verse and chorus without using 'I', 'Me', 'You', 'He', or 'She'." },
    { title: "One-Chord Wonder", desc: "Write a melody so compelling that the underlying chord progression never has to change." },
    { title: "Title at the End", desc: "Do not reveal the title or main hook of the song until the very last line of the chorus." },
    { title: "Syllable Match", desc: "Write two verses where every single line has the exact same syllable count as the corresponding line in the other verse." },
    { title: "Sensory Overload", desc: "Use all five senses (sight, sound, touch, taste, smell) before the first chorus hits." }
  ]
};

const SONG_TECHNIQUES = [
  // 🧠 METHOD WRITING TECHNIQUES
  { 
    title: "The Deep Voice (Method Writing)", 
    desc: "Bypass your inner censor by writing continuously without editing, focusing on raw, unpolished truth.",
    steps: [
      "1. Open a blank page.",
      "2. Write continuously for 10 minutes without stopping.",
      "3. Do not cross anything out, apologize, or try to rhyme.",
      "4. Let the ugly, petty, or unpolished thoughts out. Mine this text for lyric fragments later."
    ],
    whyItWorks: "Your first instinct is usually to 'sound like a writer,' which leads to clichés. The Deep Voice forces you past the polite surface into raw, authentic emotion."
  },
  { 
    title: "Image-Making (Method Writing)", 
    desc: "Ban all abstract words (love, sadness, freedom, time) and translate emotions into physical, cinematic images.",
    steps: [
      "1. Identify the abstract emotion you want to convey (e.g., 'I miss you').",
      "2. Forbid yourself from using the emotion's actual name.",
      "3. Describe a physical scene a camera could film that proves the emotion (e.g., 'Your toothbrush is still in the cup')."
    ],
    whyItWorks: "Listeners don't feel abstractions; they feel physical realities. 'Show, don't tell' makes the emotion undeniable rather than just a stated fact."
  },

  // 🛠️ STRUCTURAL / WORKFLOW TECHNIQUES
  { 
    title: "Dummy Lyrics (Vowel Focus)", 
    desc: "Mumble gibberish or vowel sounds over your chords to find the catchiest melody and rhythm first.",
    steps: [
      "1. Loop your chord progression.",
      "2. Hit record and sing total nonsense (focus on strong vowel sounds like 'Oh' and 'Ah').",
      "3. Transcribe the rhythm of the gibberish.",
      "4. Find real words that map perfectly to those vowel sounds."
    ],
    whyItWorks: "It completely separates melody creation from lyric writing. If you try to do both at the same time, one usually suffers."
  },
  { 
    title: "Object Writing", 
    desc: "Set a timer for 5 minutes and write continuously about a random object using all five senses.",
    steps: [
      "1. Pick a random noun (e.g., 'a rusted key', 'coffee grounds').",
      "2. Set a timer for 5 to 10 minutes.",
      "3. Write continuously. Do not stop to edit or rhyme.",
      "4. Force yourself to include Sight, Sound, Touch, Smell, and Taste."
    ],
    whyItWorks: "It acts as a daily warm-up for your brain, forcing you to bypass clichés and access highly specific, cinematic sensory language."
  },
  { 
    title: "Conversational Phrasing", 
    desc: "Speak your lyric out loud like a normal sentence to ensure the natural emphasis lands on the strong beats.",
    steps: [
      "1. Strip away the melody and speak the lyric like you are talking to a friend.",
      "2. Notice which syllables naturally get louder or longer.",
      "3. Adjust the melody so those stressed syllables land on the '1' or '3' beat of the measure."
    ],
    whyItWorks: "It prevents 'Yoda-speak' (awkwardly re-arranging words to force a rhyme) and makes the vocal performance sound effortless."
  },
  { 
    title: "The Title-First Method", 
    desc: "Start with a strong title or hook, and write backwards so every line points to that exact moment.",
    steps: [
      "1. Brainstorm a compelling, standalone title.",
      "2. Place that title at the very end of your chorus.",
      "3. Write verse lines that pose questions the title answers, or build tension the title releases."
    ],
    whyItWorks: "It keeps the song hyper-focused. Every great song is a single thesis statement; if a line doesn't support the title, it gets cut."
  },
  { 
    title: "Subtraction (The Breath Check)", 
    desc: "Remove filler words and adjectives to leave physical space for the singer to breathe.",
    steps: [
      "1. Read the section to a metronome.",
      "2. Identify places where the phrasing feels rushed or you run out of breath.",
      "3. Cut filler words ('just', 'really', 'very') and replace them with rests."
    ],
    whyItWorks: "Space creates groove. Singers need time to breathe, and listeners need a fraction of a second to process the emotional weight of the last line."
  }
];

function WriteStudio() {
  const [lyrics, setLyrics] = useState("");
  const [songTitle, setSongTitle] = useState("Untitled Song");
  const [activeSongId, setActiveSongId] = useState(null);

  const [projectKey, setProjectKey] = useState("C");
  const [harmonyComplexity, setHarmonyComplexity] = useState('simple'); // simple | color | jazz
  const [palette, setPalette] = useState([]);
  const [paletteGroups, setPaletteGroups] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [nextMoves, setNextMoves] = useState([]);
  const [contextChord, setContextChord] = useState('C');
  const [currentFunction, setCurrentFunction] = useState('T');
  const [currentRoman, setCurrentRoman] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [hoverInfo, setHoverInfo] = useState(null);
  const [progGenre, setProgGenre] = useState('All');
  // legacy alias for progressions that still expect jazz boolean
  const jazzMode = harmonyComplexity === 'jazz';
  
  const [searchWord, setSearchWord] = useState("");
  const [activeWordTool, setActiveWordTool] = useState("Rhymes");
  const [foundWords, setFoundWords] = useState([]);
  const [wordCategories, setWordCategories] = useState(null);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [wordsSource, setWordsSource] = useState('');

  const [activePhraseTab, setActivePhraseTab] = useState("Metaphors");
  const [phraseSearch, setPhraseSearch] = useState("");
  const [phrases, setPhrases] = useState([]);
  const [phrasesLoading, setPhrasesLoading] = useState(false);
  const [expandedPhrase, setExpandedPhrase] = useState(null);
  const [senseFilter, setSenseFilter] = useState('all');

  const [activePromptTab, setActivePromptTab] = useState("Story");
  const [activePromptMode, setActivePromptMode] = useState("Prompts"); // Tracks the master toggle
  const [expandedTechnique, setExpandedTechnique] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [playMode, setPlayMode] = useState(false);
  const [bpm, setBpm] = useState(120);

  const toggleTechnique = (title) => {
    setExpandedTechnique(expandedTechnique === title ? null : title);
  };

  // 🎸 NEW: Track the last chord clicked in Play Mode
  const [lastPlayedChord, setLastPlayedChord] = useState(null);
  
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [isDronePlaying, setIsDronePlaying] = useState(false);
  const [playbackStyle, setPlaybackStyle] = useState("strum"); 
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState(null); 
  
  const [playingProgIndex, setPlayingProgIndex] = useState(null);
  // 🎸 NEW: Custom Sequence Builder State
  const [customSequence, setCustomSequence] = useState([]);

  const addToCustomSequence = (chordName) => {
    setCustomSequence([...customSequence, chordName]);
  };

  const removeFromCustomSequence = (indexToRemove) => {
    setCustomSequence(customSequence.filter((_, index) => index !== indexToRemove));
  };
  const activeProgressionRef = useRef([]);
  const nextChordTimeRef = useRef(0);
  const currentChordIndexRef = useRef(0);
  const sequenceTimerRef = useRef(null);

  const [selectedText, setSelectedText] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // --- HARDWARE WIRES (REFS) ---
  const editorRef = useRef(null);   // Textarea
  const backdropRef = useRef(null); // Colored Syntax
  const gutterRef = useRef(null);   // Numbers
  const wrapperRef = useRef(null);  // NEW: The Scroll Boss
  
  const nextTickTimeRef = useRef(0);
  const beatCountRef = useRef(0);
  const droneNodes = useRef([]);
  const audioCtxRef = useRef(null);

  // --- SWIPE TO DISMISS ENGINE ---
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const drawerRef = useRef(null);

  // Minimum swipe distance in pixels required to close the drawer
  const minSwipeDistance = 50; 

  const onTouchStart = (e) => {
    setTouchEnd(null); // Reset on new touch
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchEnd - touchStart;
    const isDownSwipe = distance > minSwipeDistance;
    
    // Safety check: Only swipe-close if the drawer content is scrolled to the top
    const isAtTop = drawerRef.current ? drawerRef.current.scrollTop <= 0 : true;

    if (isDownSwipe && isAtTop) {
      setActiveMenu(null); // Close the drawer!
    }
  };

  const allKeys = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];

  // --- iOS AUDIO UNLOCKER ---
  useEffect(() => {
    const unlockAudioEngine = () => {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const tempCtx = new AudioContext();
        if (tempCtx.state === 'suspended') {
          tempCtx.resume();
        }
      }
      window.removeEventListener('touchstart', unlockAudioEngine);
      window.removeEventListener('click', unlockAudioEngine);
    };

    window.addEventListener('touchstart', unlockAudioEngine, { once: true });
    window.addEventListener('click', unlockAudioEngine, { once: true });

    return () => {
      window.removeEventListener('touchstart', unlockAudioEngine);
      window.removeEventListener('click', unlockAudioEngine);
    };
  }, []);

  // --- CORE AUDIO SYSTEM ---
  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtxRef.current;
  };

  const getNotesForChord = (chordName) => {
    const rootMatch = chordName.match(/^[A-G][b#]?/);
    if (!rootMatch) return [];
    
    const rootFreq = NOTE_FREQS[rootMatch[0]];
    const isMinor = chordName.includes('m') && !chordName.includes('maj');
    const isDim = chordName.includes('dim') || chordName.includes('ø') || chordName.includes('m7b5');
    const is7th = chordName.includes('7');
    const isMaj7 = chordName.includes('maj7');
    
    // Pure ratio math
    const third = isMinor || isDim ? 1.189 : 1.26;
    const fifth = isDim ? 1.414 : 1.498;
    const ratios = [1, third, fifth];
    
    if (is7th) {
        if (isMaj7) ratios.push(1.887);
        else ratios.push(1.782); 
    }

    // 🎹 1. THE INVERSION CLAMP (Close Voicing)
    // We force all notes to sit in a smooth "Pad" range.
    // If a note goes too high, we drop it down an octave (divide by 2).
    let notes = ratios.map(r => {
      let freq = rootFreq * r;
      while (freq > 550) { 
        freq = freq / 2; // Automatically creates 1st and 2nd inversions!
      }
      return freq;
    });

    // 🎸 2. STRUM SORTING
    // Because we inverted the notes, they are out of order. We sort them 
    // from lowest to highest pitch so the "Strum" and "Fingerstyle" patterns sound correct.
    notes.sort((a, b) => a - b);

    // 🎸 3. SMART SUB-BASS
    // We add a dedicated bass note back to the bottom to ground the chord.
    let bassFreq = rootFreq / 2;
    
    // If the root is higher than F# (like G, A, or B), we drop the bass an extra octave.
    // This stops the bassline from jumping wildly, keeping it smooth and thick.
    if (rootFreq > 370) {
      bassFreq = bassFreq / 2; 
    }
    
    // Add the heavy bass note to the start of the array
    notes.unshift(bassFreq);

    return notes;
  };

  const scheduleNote = (ctx, freq, startTime, duration, volume = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  // --- FIGURES OF SPEECH ACCORDION STATE ---
  const [expandedFigure, setExpandedFigure] = useState(null);

  const toggleFigure = (name) => {
    setExpandedFigure(expandedFigure === name ? null : name);
  };

  const toggleDrone = () => {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    if (isDronePlaying) {
      droneNodes.current.forEach(node => node.stop());
      droneNodes.current = [];
      setIsDronePlaying(false);
    } else {
      const root = projectKey.replace('m', '');
      const rootFreq = NOTE_FREQS[root] / 2;
      [1, 1.002, 1.498].forEach(ratio => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = rootFreq * ratio;
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        gain.gain.value = 0.1;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        droneNodes.current.push(osc);
      });
      setIsDronePlaying(true);
    }
  };

  const scheduleChord = (chordName, startTime, style, currentBpm) => {
    const ctx = getAudioCtx();
    const freqs = getNotesForChord(chordName);
    if (!freqs.length) return;
    const secondsPerBeat = 60.0 / currentBpm;
    const barDuration = secondsPerBeat * 4; 

    if (style === "block") {
      freqs.forEach(freq => scheduleNote(ctx, freq, startTime, barDuration));
    } else if (style === "strum") {
      const strums = [
        { time: 0, dir: 'down' }, { time: secondsPerBeat, dir: 'down' },
        { time: secondsPerBeat * 1.5, dir: 'up' }, { time: secondsPerBeat * 2.5, dir: 'up' },
        { time: secondsPerBeat * 3, dir: 'down' }, { time: secondsPerBeat * 3.5, dir: 'up' }
      ];
      strums.forEach(strum => {
        const strumStart = startTime + strum.time;
        const notes = strum.dir === 'down' ? freqs : [...freqs].reverse();
        notes.forEach((freq, i) => scheduleNote(ctx, freq, strumStart + (i * 0.015), secondsPerBeat - 0.1, 0.08));
      });
    } else if (style === "fingerstyle") {
      scheduleNote(ctx, freqs[0] / 2, startTime, barDuration, 0.15); 
      scheduleNote(ctx, freqs[0], startTime, secondsPerBeat, 0.08);
      if (freqs.length > 1) scheduleNote(ctx, freqs[1], startTime + secondsPerBeat, secondsPerBeat, 0.08);
      if (freqs.length > 2) scheduleNote(ctx, freqs[2], startTime + (secondsPerBeat * 1.5), secondsPerBeat, 0.08);
      scheduleNote(ctx, freqs[0] * 2, startTime + (secondsPerBeat * 2), secondsPerBeat, 0.08);
      if (freqs.length > 1) scheduleNote(ctx, freqs[1], startTime + (secondsPerBeat * 3), secondsPerBeat, 0.08);
    }
  };

  // --- MASTER TRANSPORT ENGINE (Web Audio API) ---
  useEffect(() => {
    const isPlayingAnything = isMetronomePlaying || playingProgIndex !== null;

    if (!isPlayingAnything) {
      clearTimeout(sequenceTimerRef.current);
      // Reset the clocks when all audio stops so the next play is instant
      nextChordTimeRef.current = 0;
      nextTickTimeRef.current = 0;
      beatCountRef.current = 0;
      return;
    }

    const scheduleAheadTime = 0.1;
    const lookahead = 25;
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    // If starting from silence, establish "Time Zero"
    if (nextTickTimeRef.current === 0 || nextTickTimeRef.current < ctx.currentTime) {
      const startTime = ctx.currentTime + 0.05;
      nextTickTimeRef.current = startTime;
      nextChordTimeRef.current = startTime;
      beatCountRef.current = 0;
      currentChordIndexRef.current = 0;
    }

    const scheduler = () => {
      const beatDuration = 60.0 / bpm;
      const barDuration = beatDuration * 4;

      // 1. Process Metronome Ticks
      while (nextTickTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        if (isMetronomePlaying) {
           const isDownbeat = beatCountRef.current % 4 === 0;
           scheduleTick(nextTickTimeRef.current, isDownbeat);
        }
        nextTickTimeRef.current += beatDuration;
        beatCountRef.current += 1; // Advance the counter
      }

      // 2. Process Chords
      while (nextChordTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        if (playingProgIndex !== null) {
           const chords = activeProgressionRef.current;
           scheduleChord(chords[currentChordIndexRef.current], nextChordTimeRef.current, playbackStyle, bpm);
           currentChordIndexRef.current = (currentChordIndexRef.current + 1) % chords.length;
        }
        nextChordTimeRef.current += barDuration;
      }

      sequenceTimerRef.current = setTimeout(scheduler, lookahead);
    };

    scheduler();
    return () => clearTimeout(sequenceTimerRef.current);
  }, [isMetronomePlaying, playingProgIndex, playbackStyle, bpm]);

  // --- LITERATURE: local sparks first; optional API starters ---
  useEffect(() => {
    const q = phraseSearch.trim();
    if (q.length < 2) {
      setPhrases([]);
      setPhrasesLoading(false);
      return;
    }

    setPhrases(generateLocalLiterature(q, activePhraseTab));
    setPhrasesLoading(true);

    const controller = new AbortController();
    const delay = setTimeout(() => {
      fetch(
        `https://song-engineer-ui-2.onrender.com/api/phrases?query=${encodeURIComponent(q)}&phrase_type=${encodeURIComponent(activePhraseTab)}`,
        { signal: controller.signal }
      )
        .then((res) => res.json())
        .then((data) => {
          setPhrases(mergeLiterature(data.phrases || [], q, activePhraseTab));
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setPhrases(generateLocalLiterature(q, activePhraseTab));
          }
        })
        .finally(() => setPhrasesLoading(false));
    }, 320);

    return () => {
      clearTimeout(delay);
      controller.abort();
    };
  }, [phraseSearch, activePhraseTab]);

  // Local harmonic engine — instant, offline
  useEffect(() => {
    let lastChord;
    if (playMode && lastPlayedChord) {
      lastChord = lastPlayedChord;
    } else {
      lastChord = lastChordFromLyrics(lyrics, projectKey);
    }
    setContextChord(lastChord);
    const data = generateHarmony(projectKey, lastChord, harmonyComplexity);
    setPalette(data.full_palette || []);
    setPaletteGroups(data.groups || []);
    setSuggestions(data.suggestions || {});
    setNextMoves(data.nextMoves || []);
    setCurrentFunction(data.currentFunction || 'T');
    setCurrentRoman(data.currentRoman || '');
    setCurrentRole(data.currentRole || '');
  }, [harmonyComplexity, projectKey, lyrics, lastPlayedChord, playMode]);

  // --- WORD FINDER: Datamuse direct + offline fallback ---
  useEffect(() => {
    const q = searchWord.trim();
    if (q.length < 2) {
      setFoundWords([]);
      setWordCategories(null);
      setWordsLoading(false);
      setWordsSource('');
      return;
    }
    const controller = new AbortController();
    setWordsLoading(true);
    const delay = setTimeout(() => {
      findWords({
        word: q,
        tool: activeWordTool,
        max: 48,
        signal: controller.signal,
      })
        .then((res) => {
          setFoundWords(res.words || []);
          setWordCategories(res.categories || null);
          setWordsSource(res.source || '');
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            setFoundWords([]);
            setWordCategories(null);
          }
        })
        .finally(() => setWordsLoading(false));
    }, 280);
    return () => {
      clearTimeout(delay);
      controller.abort();
    };
  }, [searchWord, activeWordTool]);

  const toggleProgression = async (index, actualChords) => {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    
    if (playingProgIndex === index) {
      setPlayingProgIndex(null); 
    } else {
      activeProgressionRef.current = actualChords; 
      setPlayingProgIndex(index);
      
      if (!isMetronomePlaying) {
          // If total silence, start instantly
          nextChordTimeRef.current = 0;
          nextTickTimeRef.current = 0;
      }
      // Reset index to 0 so the first chord plays on the next downbeat!
      currentChordIndexRef.current = 0; 
    }
  };

  const scheduleTick = (time, isDownbeat) => {
    const ctx = getAudioCtx(); 
    const osc = ctx.createOscillator(); 
    const gain = ctx.createGain();
    
    // Higher pitch for the '1' count!
    osc.frequency.setValueAtTime(isDownbeat ? 1320 : 880, time);
    
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    
    osc.connect(gain); 
    gain.connect(ctx.destination);
    
    osc.start(time); 
    osc.stop(time + 0.1);
  };

  // --- VOICE MEMO RECORDER ---
  const toggleRecording = async () => {
    if (isRecording) { 
      mediaRecorderRef.current.stop(); 
      setIsRecording(false); 
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (e) => { 
          if (e.data.size > 0) audioChunksRef.current.push(e.data); 
        };
        
        mediaRecorderRef.current.onstop = () => {
          const browserFormat = mediaRecorderRef.current.mimeType;
          const audioBlob = new Blob(audioChunksRef.current, { type: browserFormat }); 
          
          const reader = new FileReader(); 
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => setAudioData(reader.result);
          stream.getTracks().forEach(track => track.stop()); 
        };
        
        mediaRecorderRef.current.start(); 
        setIsRecording(true);
      } catch (err) { 
        alert("Microphone access denied. Please check your system settings."); 
      }
    }
  };

  const deleteRecording = () => { if (window.confirm("Delete this voice memo?")) setAudioData(null); };

  // --- UTILITIES & IDE EVENTS ---
  const insertAtCursor = (content) => {
    const textArea = editorRef.current;
    if (!textArea) return;
    const start = textArea.selectionStart; const end = textArea.selectionEnd;
    const newText = lyrics.substring(0, start) + content + lyrics.substring(end);
    setLyrics(newText);
    setTimeout(() => { textArea.focus(); textArea.setSelectionRange(start + content.length, start + content.length); }, 10);
  };

  const handleSelection = (e) => {
    const start = e.target.selectionStart; const end = e.target.selectionEnd;
    const text = lyrics.substring(start, end).trim();
    if (text.length > 1 && !text.includes(' ') && !text.includes('\n')) setSelectedText(text); else setSelectedText("");
  };

  const handleEditorClick = (e) => {
    const start = e.target.selectionStart; const end = e.target.selectionEnd;
    if (start === end) {
      const regex = /\[([A-G][b#]?[a-zA-Z0-9]*[ø]?[7]?[b]?[5]?)\]/g;
      let match;
      while ((match = regex.exec(lyrics)) !== null) {
        const matchStart = match.index; const matchEnd = matchStart + match[0].length;
        if (start >= matchStart && start <= matchEnd) {
          const chordName = match[1];
          const ctx = getAudioCtx(); if (ctx.state === 'suspended') ctx.resume();
          scheduleChord(chordName, ctx.currentTime, "block", bpm);
          break; 
        }
      }
    }
  };

  const handleSidebarChordClick = (chordName) => {
    if (playMode) {
      const ctx = getAudioCtx(); if (ctx.state === 'suspended') ctx.resume();
      scheduleChord(chordName, ctx.currentTime, "block", bpm);
      setLastPlayedChord(chordName); 
    } else {
      insertAtCursor(`[${chordName}]`);
    }
  };

  const triggerMagicTool = (toolCategory, subTool) => {
    setSearchWord(selectedText);
    if (toolCategory === "Words") { setActiveMenu("words"); setActiveWordTool(subTool); }
    else if (toolCategory === "Metaphor") {
      setPhraseSearch(selectedText);
      setActiveMenu("phrases");
      setActivePhraseTab("Metaphors");
      setSenseFilter('all');
    }
  };

  const navItems = [
    { id: 'palette', label: 'Harmony', short: 'Chords', icon: '🎹' },
    { id: 'progressions', label: 'Progressions', short: 'Prog', icon: '🎸' },
    { id: 'words', label: 'Words', short: 'Words', icon: '⌕' },
    { id: 'phrases', label: 'Literature', short: 'Lit', icon: '✦' },
    { id: 'figures', label: 'Devices', short: 'Tools', icon: '§' },
    { id: 'prompts', label: 'Craft', short: 'Ideas', icon: '✎' },
    { id: 'library', label: 'Library', short: 'Lib', icon: '☰' },
  ];

  const visiblePhrases = senseFilter === 'all'
    ? phrases
    : phrases.filter((p) => p.sense === senseFilter || !p.sense);

  const getSyllables = (line) => {
    if (!line) return "";
    const clean = line.replace(/\[.*?\]/g, "").trim();
    if (!clean) return "";
    return syllable(clean); 
  };

  const saveToLibrary = () => {
    if (!lyrics.trim() && !audioData) return alert("Write or record something first!");
    const library = JSON.parse(localStorage.getItem('songEngineer_library') || "[]");
    if (activeSongId) {
      const songIndex = library.findIndex(s => s.id === activeSongId);
      if (songIndex >= 0) {
        library[songIndex].title = songTitle; library[songIndex].content = lyrics;
        library[songIndex].audioData = audioData;
        library[songIndex].date = new Date().toLocaleDateString();
        localStorage.setItem('songEngineer_library', JSON.stringify(library));
        return alert(`"${songTitle}" updated!`);
      }
    }
    const newId = Date.now();
    const newSong = { id: newId, title: songTitle, content: lyrics, audioData: audioData, date: new Date().toLocaleDateString() };
    localStorage.setItem('songEngineer_library', JSON.stringify([newSong, ...library]));
    setActiveSongId(newId); alert(`"${songTitle}" saved to library!`);
  };

  const handleNewSong = () => {
    if (lyrics.trim().length > 0 || audioData) {
      if (window.confirm(`Save "${songTitle}" before starting a new song?`)) saveToLibrary();
    }
    setLyrics(""); setSongTitle("Untitled Song"); setAudioData(null);
    setActiveSongId(null); setActiveMenu(null); setPlayingProgIndex(null); 
  };

  const renderLyricsIDE = () => {
    const clicheRegex = new RegExp("(" + CLICHES.join("|") + ")", "gi");
    const lines = lyrics.split('\n');
    return lines.map((line, i) => {
      if (/^\[(Verse|Chorus|Bridge|Pre-Chorus|Outro).*?\]/i.test(line.trim())) {
        return <span key={i}><span className="section-highlight">{line}</span>{i < lines.length - 1 ? '\n' : ''}</span>;
      }
      const parts = line.split(/(\[[A-G][b#]?[a-zA-Z0-9]*[ø]?[7]?[b]?[5]?\])/g);
      const renderedParts = parts.map((part, j) => {
        if (part.startsWith('[') && part.endsWith(']')) return <span key={j} className="chord-highlight">{part}</span>;
        const subParts = part.split(clicheRegex);
        return subParts.map((sp, k) => {
          if (new RegExp("^(" + CLICHES.join("|") + ")$", "i").test(sp)) return <span key={k} className="cliche-highlight" title="Cliché Detected!">{sp}</span>;
          return <span key={k}>{sp}</span>;
        });
      });
      return <span key={i}>{renderedParts}{i < lines.length - 1 ? '\n' : ''}</span>;
    });
  };

  // --- LOCAL STORAGE SYNCS ---
  useEffect(() => {
    const savedLyrics = localStorage.getItem("song_engineer_lyrics");
    const savedTitle = localStorage.getItem("song_engineer_title");
    const savedId = localStorage.getItem("song_engineer_id");
    const savedAudio = localStorage.getItem("song_engineer_audio");
    
    if (savedLyrics) setLyrics(savedLyrics); if (savedTitle) setSongTitle(savedTitle);
    if (savedId) setActiveSongId(Number(savedId)); if (savedAudio) setAudioData(savedAudio);
  }, []);

  useEffect(() => {
    localStorage.setItem("song_engineer_title", songTitle); localStorage.setItem("song_engineer_lyrics", lyrics); 
    if (audioData) localStorage.setItem("song_engineer_audio", audioData); else localStorage.removeItem("song_engineer_audio");
    if (activeSongId) localStorage.setItem("song_engineer_id", activeSongId.toString()); else localStorage.removeItem("song_engineer_id");
  }, [songTitle, lyrics, activeSongId, audioData]);


  // --- SCROLL SYNC ENGINE ---
  const handleScroll = () => {
    if (!editorRef.current) return;

    const currentScrollTop = editorRef.current.scrollTop;
    const currentScrollLeft = editorRef.current.scrollLeft;
    
    if (backdropRef.current) {
      backdropRef.current.scrollTop = currentScrollTop;
      backdropRef.current.scrollLeft = currentScrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = currentScrollTop;
    }
  };

  const renderWordTags = (wordList, { showRhymeKind = false } = {}) => {
    if (!wordList?.length) {
      return <span className="ws-placeholder">No words yet — try another spelling or tab.</span>;
    }
    return wordList.map((item, i) => {
      const kindLabel =
        showRhymeKind && item.rhymeKind && item.rhymeKind !== 'perfect'
          ? item.rhymeKind
          : null;
      const titleParts = [];
      if (item.syllables) titleParts.push(`${item.syllables} syl`);
      if (item.rhymeKind) titleParts.push(item.rhymeKind);
      if (item.songScore) titleParts.push(`lyric score ${Math.round(item.songScore)}`);
      return (
        <button
          key={`${item.word}-${i}`}
          type="button"
          className={`word-tag-refined ${item.rhymeKind === 'perfect' ? 'rhyme-perfect' : ''} ${kindLabel ? 'rhyme-soft' : ''}`}
          onClick={() => insertAtCursor(item.word + (item.word.endsWith(' ') ? '' : ' '))}
          title={titleParts.join(' · ') || 'Insert'}
        >
          {item.word}
          {kindLabel && <span className="word-rhyme-kind">{kindLabel === 'near' ? '~' : '≈'}</span>}
        </button>
      );
    });
  };

  const lines = lyrics.split('\n');

  const functionMeta = FUNCTION_LABELS[currentFunction] || FUNCTION_LABELS['?'];
  const cadences = getCadences(projectKey, harmonyComplexity);

  return (
    <div className="write-studio">
      <aside className="ws-sidebar">
        <div className="ws-sidebar-head">
          <span className="mode-chip write-chip">Write</span>
          <div>
            <h2>Song Studio</h2>
            <p>Lyrics · Harmony · Craft</p>
          </div>
        </div>

        <nav className="ws-nav" aria-label="Write tools">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ws-nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
              title={item.label}
            >
              <span className="ws-nav-icon">{item.icon}</span>
              <span className="ws-nav-label">{item.label}</span>
              <span className="ws-nav-short">{item.short}</span>
            </button>
          ))}
        </nav>

        <div className="ws-sidebar-foot">
          <button type="button" className="ws-btn ws-btn-ghost" onClick={handleNewSong}>
            New song
          </button>
          <button type="button" className="ws-btn ws-btn-primary" onClick={saveToLibrary}>
            Save to library
          </button>
        </div>
      </aside>

      <div className="ws-workspace">
        <header className="ws-topbar">
          <div className="song-title-container">
            <input
              type="text"
              className="song-title-input"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="Untitled song…"
            />
          </div>

          <div className="ws-mobile-actions" aria-label="Song actions">
            <button type="button" className="ws-btn ws-btn-ghost ws-btn-compact" onClick={handleNewSong}>
              New
            </button>
            <button type="button" className="ws-btn ws-btn-primary ws-btn-compact" onClick={saveToLibrary}>
              Save
            </button>
          </div>

          <div className="recording-bar">
            <button
              type="button"
              className={`record-btn ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
              title="Record Voice Memo"
            >
              🎙
            </button>
            {audioData && (
              <div className="audio-wrapper">
                <audio className="custom-audio-player" src={audioData} controls />
                <button type="button" className="audio-delete-btn" onClick={deleteRecording}>✕</button>
              </div>
            )}
            <div className="ws-bar-sep" />
            <button
              type="button"
              className={`ws-met-btn ${isMetronomePlaying ? 'on' : ''}`}
              onClick={() => setIsMetronomePlaying(!isMetronomePlaying)}
            >
              {isMetronomePlaying ? '■ MET' : '▶ MET'}
            </button>
            <div className="ws-bpm-control" title="Tempo (BPM)">
              <button
                type="button"
                className="ws-bpm-step"
                onClick={() => setBpm((b) => Math.max(40, Number(b) - 1))}
                aria-label="Slower"
              >
                −
              </button>
              <input
                type="number"
                className="ws-bpm-input"
                min="40"
                max="220"
                value={bpm}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) setBpm(Math.min(220, Math.max(40, v)));
                }}
              />
              <button
                type="button"
                className="ws-bpm-step"
                onClick={() => setBpm((b) => Math.min(220, Number(b) + 1))}
                aria-label="Faster"
              >
                +
              </button>
            </div>
          </div>
        </header>

        <div className="ws-body">
          <div className="editor-container">
            <div className="syllable-gutter" ref={gutterRef}>
              {lines.map((line, i) => {
                const sylCount = getSyllables(line);
                const isStructural = line.trim().length > 0 && !line.startsWith('[');
                return (
                  <div key={i} className="gutter-line">
                    <span className="gutter-syl">{isStructural ? (sylCount || 0) : ''}</span>
                  </div>
                );
              })}
            </div>

            <div className="editor-wrapper" ref={wrapperRef}>
              <div className="editor-backdrop" ref={backdropRef}>
                {renderLyricsIDE()}
              </div>
              <textarea
                className="editor-textarea"
                ref={editorRef}
                onScroll={handleScroll}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                onSelect={handleSelection}
                onKeyUp={handleSelection}
                onClick={handleEditorClick}
                placeholder="Write the song… chords in [brackets], sections like [Verse]"
                spellCheck="false"
              />
            </div>

            {selectedText && (
              <div className="magic-tooltip">
                <span>“{selectedText}”</span>
                <button type="button" className="magic-btn" onClick={() => triggerMagicTool('Words', 'Rhymes')}>Rhyme</button>
                <button type="button" className="magic-btn" onClick={() => triggerMagicTool('Words', 'Imagery')}>Image</button>
                <button type="button" className="magic-btn" onClick={() => triggerMagicTool('Metaphor', null)}>Metaphor</button>
              </div>
            )}
          </div>

          {activeMenu && (
            <div className="drawer-overlay" onClick={() => setActiveMenu(null)} />
          )}

          <aside
            className={`ws-panel ${activeMenu ? 'open' : ''}`}
            ref={drawerRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndEvent}
          >
            <div className="drag-handle" />
            <div className="ws-panel-head">
              <button type="button" className="close-btn" onClick={() => setActiveMenu(null)}>
                Close panel
              </button>
            </div>

          {activeMenu === 'palette' && (
            <div className="drawer-content hp">
              <p className="ws-eyebrow">Harmony workbench</p>
              <h3>Chord Palette</h3>
              <p className="hp-intro">
                Pick a key, set complexity, then click chords to insert or hear them.
                Suggestions always follow your last chord.
              </p>

              {/* Key + Insert/Play */}
              <div className="palette-settings-row">
                <div className="setting-item">
                  <label>Key</label>
                  <select value={projectKey} onChange={(e) => setProjectKey(e.target.value)}>
                    {allKeys.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div className="setting-item">
                  <label>Click does</label>
                  <div className="mode-toggle-group">
                    <button type="button" className={!playMode ? 'mode-btn active' : 'mode-btn'} onClick={() => setPlayMode(false)}>Insert</button>
                    <button type="button" className={playMode ? 'mode-btn active' : 'mode-btn'} onClick={() => setPlayMode(true)}>Play</button>
                  </div>
                </div>
              </div>

              {/* Complexity: Simple / Color / Jazz */}
              <div className="hp-complexity">
                <label className="ws-field-label">Complexity</label>
                <div className="hp-complexity-row">
                  {COMPLEXITY_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      className={`hp-complexity-btn ${harmonyComplexity === lvl.id ? 'active' : ''}`}
                      onClick={() => setHarmonyComplexity(lvl.id)}
                      title={lvl.desc}
                    >
                      <strong>{lvl.label}</strong>
                      <span>{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`drone-module ${isDronePlaying ? 'active' : ''}`} onClick={toggleDrone}>
                <div className="drone-status"><div className="pulse-dot" /><span>DRONE</span></div>
                <div className="drone-info">{projectKey} pedal — tune your ear to the key</div>
              </div>

              {/* You are here */}
              <div className="hp-here">
                <div className="hp-here-top">
                  <div>
                    <div className="chord-context-label">You are here</div>
                    <div className="chord-context-name">{contextChord}</div>
                  </div>
                  <div className="hp-here-meta">
                    {currentRoman && <span className="hp-roman">{currentRoman}</span>}
                    <span className={`hp-fn fn-${currentFunction}`}>{functionMeta.name}</span>
                  </div>
                </div>
                <p className="chord-context-hint">
                  {currentRole || (playMode
                    ? 'Suggestions follow the last chord you played.'
                    : 'Suggestions follow the last [chord] in your lyrics.')}
                </p>
              </div>

              {/* Ranked next moves — primary UX */}
              <div className="next-moves">
                <div className="ws-group-label">Where next?</div>
                <div className="next-moves-list">
                  {nextMoves.map((mv, idx) => (
                    <button
                      key={`${mv.name}-${idx}`}
                      type="button"
                      className={`next-move-card strength-${mv.strength}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSidebarChordClick(mv.name)}
                    >
                      <div className="next-move-rank">{idx + 1}</div>
                      <div className="next-move-body">
                        <div className="next-move-top">
                          <span className="next-move-chord">{mv.name}</span>
                          <span className={`next-move-badge ${mv.strength}`}>{mv.strength}</span>
                        </div>
                        <span className="next-move-label">{mv.label}</span>
                        <span className="next-move-why">{mv.why}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick cadences */}
              <div className="hp-cadences">
                <div className="ws-group-label">Quick cadences</div>
                <div className="hp-cadence-list">
                  {cadences.map((cad) => (
                    <div key={cad.name} className="hp-cadence">
                      <div className="hp-cadence-info">
                        <strong>{cad.name}</strong>
                        <span className="hp-cadence-chords">{cad.chords.join(' – ')}</span>
                        <span className="hp-cadence-tip">{cad.tip}</span>
                      </div>
                      <div className="hp-cadence-actions">
                        <button
                          type="button"
                          className="play-btn"
                          title="Play"
                          onClick={() => toggleProgression(`cad-${cad.name}`, cad.chords)}
                        >
                          {playingProgIndex === `cad-${cad.name}` ? '⏸' : '▶'}
                        </button>
                        <button
                          type="button"
                          className="insert-btn"
                          onClick={() => insertAtCursor(`\n[${cad.chords.join('] [')}]\n`)}
                        >
                          Insert
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="theory-tracker">
                <div className="theory-label">Hover detail</div>
                <div className={`theory-value ${hoverInfo?.toLowerCase?.().includes('tritone') ? 'warn' : ''}`}>
                  {hoverInfo || 'Hover a chord for roman numeral & role…'}
                </div>
              </div>

              {/* Functional palette grid */}
              <div className="palette-grid-container hp-groups">
                {(paletteGroups.length
                  ? paletteGroups
                  : [{ name: 'Chords', chords: palette }]
                ).map((group) => (
                  <div key={group.name} className="hp-group">
                    <div className="ws-group-label">{group.name}</div>
                    <div className="palette-grid">
                      {group.chords.map((chordObj, i) => {
                        const sug = suggestions[chordObj.name];
                        const sugLabel = typeof sug === 'string' ? sug : sug?.label;
                        const sugWhy = typeof sug === 'object' ? sug?.why : '';
                        const isCurrent = chordsMatchLoose(chordObj.name, contextChord);
                        return (
                          <div
                            key={`${chordObj.name}-${i}`}
                            className={`chord-tag fn-${chordObj.function || ''} ${sug ? 'suggested' : ''} ${sug ? `sug-${sug.strength || 'strong'}` : ''} ${isCurrent ? 'current' : ''}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSidebarChordClick(chordObj.name)}
                            onMouseEnter={() =>
                              setHoverInfo(
                                sug
                                  ? `${chordObj.roman} · ${sugLabel}${sugWhy ? ` — ${sugWhy}` : ''}`
                                  : `${chordObj.roman}${chordObj.role ? ` · ${chordObj.role}` : ''}`
                              )
                            }
                            onMouseLeave={() => setHoverInfo(null)}
                          >
                            <span className="tag-roman">{chordObj.roman}</span>
                            <span className="tag-name">{chordObj.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

{activeMenu === 'progressions' && (
            <div className="drawer-content">
              <p className="ws-eyebrow">Chord sequences</p>
              <h3>Progressions</h3>
              <p className="lit-intro">
                Pick a loop in <strong>{projectKey}</strong>, hear it, then drop it into the lyric page as real chords.
              </p>

              <div className="progression-controls">
                <label className="ws-field-label">Playback feel</label>
                <div className="style-selector">
                  <button type="button" className={`style-btn ${playbackStyle === 'block' ? 'active' : ''}`} onClick={() => setPlaybackStyle('block')}>Block</button>
                  <button type="button" className={`style-btn ${playbackStyle === 'strum' ? 'active' : ''}`} onClick={() => setPlaybackStyle('strum')}>Strum</button>
                  <button type="button" className={`style-btn ${playbackStyle === 'fingerstyle' ? 'active' : ''}`} onClick={() => setPlaybackStyle('fingerstyle')}>Finger</button>
                </div>
              </div>

              <div className="prog-genre-row">
                {PROGRESSION_GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`sense-filter-chip ${progGenre === g ? 'active' : ''}`}
                    onClick={() => setProgGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <div className="song-list prog-template-list">
                {getProgressionsForKey(projectKey, harmonyComplexity, progGenre).map((prog) => {
                  const actualChords = prog.chords;
                  const isPlayingThis = playingProgIndex === prog.id;
                  return (
                    <div key={prog.id} className={`progression-card rich ${isPlayingThis ? 'playing' : ''}`}>
                      <div className="prog-info">
                        <div className="prog-title-row">
                          <span className="prog-name">{prog.name}</span>
                          <span className="prog-mood">{prog.mood}</span>
                        </div>
                        <span className="prog-romans">{prog.numerals.join(' – ')}</span>
                        <span className="prog-chords">{actualChords.join(' – ')}</span>
                        {prog.tip && <span className="prog-tip">{prog.tip}</span>}
                      </div>
                      <div className="prog-actions stacked">
                        <button
                          type="button"
                          className={`play-btn ${isPlayingThis ? 'stop' : ''}`}
                          onClick={() => toggleProgression(prog.id, actualChords)}
                          title="Play loop"
                        >
                          {isPlayingThis ? '⏸' : '▶'}
                        </button>
                        <button
                          type="button"
                          className="insert-btn"
                          title="Insert chords into lyrics"
                          onClick={() => insertAtCursor(`\n[${actualChords.join('] [')}]\n`)}
                        >
                          Insert
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="custom-sequence-builder">
                <div className="ws-row-between">
                  <strong className="ws-section-label">Build your own</strong>
                  {customSequence.length > 0 && (
                    <button type="button" className="ws-text-danger" onClick={() => setCustomSequence([])}>Clear</button>
                  )}
                </div>

                <div className="custom-sequence-display">
                  {customSequence.length === 0 ? (
                    <span className="ws-placeholder">Tap chords below…</span>
                  ) : (
                    customSequence.map((chord, i) => (
                      <div key={`${chord}-${i}`} className="sequence-chord-chip" onClick={() => removeFromCustomSequence(i)} title="Remove">
                        {chord} <span className="chip-x">✕</span>
                      </div>
                    ))
                  )}
                </div>

                {customSequence.length > 0 && (
                  <div className="ws-btn-row">
                    <button
                      type="button"
                      className={`ws-btn ${playingProgIndex === 'custom' ? 'ws-btn-danger' : 'ws-btn-success'}`}
                      onClick={() => toggleProgression('custom', customSequence)}
                    >
                      {playingProgIndex === 'custom' ? 'Stop' : 'Play'}
                    </button>
                    <button
                      type="button"
                      className="ws-btn ws-btn-primary"
                      onClick={() => insertAtCursor(`\n[${customSequence.join('] [')}]\n`)}
                    >
                      Insert
                    </button>
                  </div>
                )}

                <div className="mini-palette-wrap">
                  <div className="ws-row-between">
                    <span className="ws-micro">Tap to add</span>
                    <span className="ws-micro accent">{projectKey} · {harmonyComplexity}</span>
                  </div>
                  <div className="mini-palette">
                    {palette.map((p, i) => (
                      <button key={`${p.name}-${i}`} type="button" className="mini-chord-btn" onClick={() => addToCustomSequence(p.name)}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'words' && (
            <div className="drawer-content wf">
              <p className="ws-eyebrow">Lexicon</p>
              <h3>Word Finder</h3>
              <p className="hp-intro">
                {activeWordTool === 'Rhymes'
                  ? 'Rhymes you can actually use in a song — common, singable line-end words first. No type tabs, no dictionary junk.'
                  : 'Type a word. Tap a result to insert at the cursor.'}
              </p>
              <div className="tool-tabs">
                {WORD_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className={activeWordTool === tool.id ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveWordTool(tool.id)}
                    title={tool.hint}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
              <div className="search-command-bar">
                <input
                  type="text"
                  value={searchWord}
                  onChange={(e) => setSearchWord(e.target.value)}
                  placeholder={
                    activeWordTool === 'Rhymes'
                      ? 'Word to rhyme…'
                      : activeWordTool === 'Imagery'
                        ? 'Theme for images…'
                        : 'Word or idea…'
                  }
                />
              </div>
              <p className="wf-status">
                {wordsLoading
                  ? 'Searching…'
                  : searchWord.trim().length < 2
                    ? WORD_TOOLS.find((t) => t.id === activeWordTool)?.hint
                    : wordsSource === 'offline'
                      ? 'Offline list — lyric-friendly fallbacks'
                      : foundWords.length
                        ? activeWordTool === 'Rhymes'
                          ? `${foundWords.length} songwriting rhymes · best first`
                          : `${foundWords.length} words · tap to insert`
                        : 'No hits — try another spelling'}
              </p>
              <div className="word-cloud-container">
                {activeWordTool === 'Imagery' && wordCategories ? (
                  Object.keys(wordCategories).map((sense) => (
                    <div key={sense} className="sense-group">
                      <label className="sense-label-minimal">{sense}</label>
                      <div className="word-results-list">
                        {renderWordTags(wordCategories[sense])}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="word-results-list">
                    {renderWordTags(foundWords, { showRhymeKind: activeWordTool === 'Rhymes' })}
                  </div>
                )}
              </div>
              {activeWordTool === 'Rhymes' && foundWords.length > 0 && (
                <p className="wf-legend">
                  Ranked for songwriting, not dictionary completeness.
                  {' '}
                  <span className="word-rhyme-kind">~</span> near rhyme
                  {' · '}
                  <span className="word-rhyme-kind">≈</span> sound-alike when it still sings
                </p>
              )}
            </div>
          )}

          {activeMenu === 'phrases' && (
            <div className="drawer-content lit">
              <p className="ws-eyebrow">Creative language</p>
              <h3>Literature Sparks</h3>
              <p className="lit-intro">
                We give you <strong>vehicles</strong> and <strong>questions</strong> — not lines to copy.
                Your job is the original connection. Steal the image, write the link yourself.
              </p>
              <div className="tool-tabs">
                {['Metaphors', 'Similes', 'Idioms'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activePhraseTab === tab ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => { setActivePhraseTab(tab); setExpandedPhrase(null); }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="search-command-bar">
                <input
                  type="text"
                  value={phraseSearch}
                  onChange={(e) => setPhraseSearch(e.target.value)}
                  placeholder="Feeling or idea — e.g. leaving, night…"
                />
              </div>

              {phraseSearch.trim().length >= 2 && (
                <div className="sense-filter-row">
                  {SENSE_FILTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`sense-filter-chip ${senseFilter === s ? 'active' : ''}`}
                      onClick={() => setSenseFilter(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {phraseSearch.trim().length < 2 && (
                <>
                  <span className="sense-label-minimal">Start from a seed</span>
                  <div className="seed-row">
                    {LITERATURE_SEEDS.map((seed) => (
                      <button
                        key={seed}
                        type="button"
                        className="seed-chip"
                        onClick={() => setPhraseSearch(seed)}
                      >
                        {seed}
                      </button>
                    ))}
                  </div>
                  <div className="lit-empty">
                    Type a feeling. You’ll get filmable objects and prompts that force a new angle —
                    not pre-written metaphors to paste.
                  </div>
                </>
              )}

              {phraseSearch.trim().length >= 2 && (
                <div className="song-list lit-results">
                  {phrasesLoading && phrases.length === 0 && (
                    <div className="lit-empty">Gathering sparks…</div>
                  )}
                  {!phrasesLoading && visiblePhrases.length === 0 && (
                    <div className="lit-empty">
                      Try a simpler seed like “home” or “fire”, or clear the sense filter.
                    </div>
                  )}
                  {visiblePhrases.map((item, i) => {
                    const open = expandedPhrase === i;
                    const place = PLACEMENT_HINTS[item.kind] || 'Spark';
                    return (
                      <div key={`${item.vehicle || item.prompt || item.text}-${i}`} className={`phrase-card spark-card kind-${item.kind || 'spark'}`}>
                        <div className="phrase-card-top">
                          <span className="phrase-kind">{place}</span>
                          <div className="phrase-badges">
                            {item.sense && <span className="phrase-sense">{item.sense}</span>}
                            {item.kind === 'wild' && <span className="phrase-craft-badge">Lateral</span>}
                            {item.kind === 'starter' && <span className="phrase-craft-badge">Rewrite me</span>}
                          </div>
                        </div>

                        {item.vehicle && (
                          <div className="spark-vehicle">
                            <span className="spark-label">Vehicle</span>
                            <span className="phrase-text spark-vehicle-text">{item.vehicle}</span>
                          </div>
                        )}

                        {item.prompt && (
                          <div className="spark-prompt">
                            <span className="spark-label">Think</span>
                            <p>{item.prompt}</p>
                          </div>
                        )}

                        {item.craft && (
                          <div className="phrase-craft">
                            <strong>Keep it original</strong>
                            {item.craft}
                          </div>
                        )}

                        {item.sample && open && (
                          <div className="spark-sample">
                            <span className="spark-label">Disposable starter</span>
                            <p className="spark-sample-line">“{item.sample}”</p>
                            <p className="spark-sample-warn">Paste only if you rewrite it. Prefer answering the prompt in your own words.</p>
                          </div>
                        )}

                        <div className="phrase-actions">
                          {item.vehicle && (
                            <button
                              type="button"
                              className="primary"
                              onClick={() => insertAtCursor(item.vehicle + '\n')}
                              title="Insert the image only — write the link yourself"
                            >
                              Use vehicle
                            </button>
                          )}
                          {item.prompt && (
                            <button
                              type="button"
                              onClick={() => insertAtCursor(`\n[Prompt: ${item.prompt}]\n`)}
                            >
                              Park prompt
                            </button>
                          )}
                          {(item.sample || item.vehicle) && (
                            <button type="button" onClick={() => setExpandedPhrase(open ? null : i)}>
                              {open ? 'Less' : item.sample ? 'Show starter' : 'More'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {phrasesLoading && phrases.length > 0 && (
                    <div className="lit-enriching">Optional starters loading…</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeMenu === 'figures' && (
            <div className="drawer-content">
              <p className="ws-eyebrow">Prosody &amp; imagery</p>
              <h3>Figures of Speech</h3>
              <span className="sense-label-minimal lit-device-label">Lyrical devices</span>
              <div className="figures-list">
                {FIGURES_OF_SPEECH.map((fos) => (
                  <div
                    key={fos.name}
                    className={`figure-card ${expandedFigure === fos.name ? 'expanded' : ''}`}
                    onClick={() => toggleFigure(fos.name)}
                  >
                    <div className="figure-header">
                      <span className="figure-name">{fos.name}</span>
                      <span className="expand-icon">{expandedFigure === fos.name ? '−' : '+'}</span>
                    </div>
                    <span className="figure-desc">{fos.desc}</span>
                    {expandedFigure === fos.name && (
                      <div className="figure-details" onClick={(e) => e.stopPropagation()}>
                        <div className="detail-section">
                          <strong>The impact</strong>
                          <p>{fos.usage}</p>
                        </div>
                        <div className="detail-section">
                          <strong>Examples</strong>
                          <ul>
                            {fos.examples.map((ex, i) => (
                              <li key={i} className="example-text">{ex}</li>
                            ))}
                          </ul>
                        </div>
                        <button
                          type="button"
                          className="magic-btn magic-btn-block"
                          onClick={(e) => {
                            e.stopPropagation();
                            insertAtCursor(`\n[Try using ${fos.name} here]\n`);
                          }}
                        >
                          + Insert reminder
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMenu === 'prompts' && (
            <div className="drawer-content">
              <p className="ws-eyebrow">Process</p>
              <h3>Writing Studio</h3>

              <div className="mode-toggle-group ws-mode-toggle">
                <button
                  type="button"
                  className={activePromptMode === 'Prompts' ? 'mode-btn active' : 'mode-btn'}
                  onClick={() => setActivePromptMode('Prompts')}
                >
                  Prompts
                </button>
                <button
                  type="button"
                  className={activePromptMode === 'Techniques' ? 'mode-btn active' : 'mode-btn'}
                  onClick={() => setActivePromptMode('Techniques')}
                >
                  Techniques
                </button>
              </div>

              {activePromptMode === 'Prompts' && (
                <div className="tool-tabs">
                  {Object.keys(SONG_PROMPTS).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={activePromptTab === tab ? 'tab-btn active' : 'tab-btn'}
                      onClick={() => setActivePromptTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}

              <div className="song-list">
                {activePromptMode === 'Prompts' ? (
                  SONG_PROMPTS[activePromptTab].map((item, i) => (
                    <div
                      key={i}
                      className="phrase-card phrase-card-click"
                      onClick={() => insertAtCursor(`\n[Prompt: ${item.desc}]\n`)}
                    >
                      <span className="phrase-text">{item.title}</span>
                      <span className="phrase-meaning">{item.desc}</span>
                    </div>
                  ))
                ) : (
                  <div className="figures-list">
                    {SONG_TECHNIQUES.map((tech) => (
                      <div
                        key={tech.title}
                        className={`figure-card ${expandedTechnique === tech.title ? 'expanded' : ''}`}
                        onClick={() => toggleTechnique(tech.title)}
                      >
                        <div className="figure-header">
                          <span className="figure-name figure-name-accent">{tech.title}</span>
                          <span className="expand-icon">{expandedTechnique === tech.title ? '−' : '+'}</span>
                        </div>
                        <span className="figure-desc">{tech.desc}</span>
                        {expandedTechnique === tech.title && (
                          <div className="figure-details" onClick={(e) => e.stopPropagation()}>
                            <div className="detail-section">
                              <strong>How to execute</strong>
                              <ul className="tech-steps">
                                {tech.steps.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="detail-section">
                              <strong>Why it works</strong>
                              <p className="tech-why">{tech.whyItWorks}</p>
                            </div>
                            <button
                              type="button"
                              className="magic-btn magic-btn-block"
                              onClick={(e) => {
                                e.stopPropagation();
                                insertAtCursor(`\n[Try using the '${tech.title}' technique here]\n`);
                              }}
                            >
                              + Insert reminder
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === 'library' && (
            <div className="drawer-content">
              <p className="ws-eyebrow">Your songs</p>
              <h3>Song Library</h3>
              <div className="song-list">
                {JSON.parse(localStorage.getItem('songEngineer_library') || '[]').map((song) => (
                  <div key={song.id} className="library-card">
                    <button
                      type="button"
                      className="library-open"
                      onClick={() => {
                        setLyrics(song.content);
                        setSongTitle(song.title);
                        setAudioData(song.audioData || null);
                        setActiveSongId(song.id);
                        setActiveMenu(null);
                      }}
                    >
                      <span className="preset-name">{song.title}</span>
                      {song.date && <span className="library-date">{song.date}</span>}
                    </button>
                    <button
                      type="button"
                      className="library-delete"
                      onClick={() => {
                        const lib = JSON.parse(localStorage.getItem('songEngineer_library') || '[]');
                        localStorage.setItem(
                          'songEngineer_library',
                          JSON.stringify(lib.filter((s) => s.id !== song.id))
                        );
                        if (activeSongId === song.id) handleNewSong();
                        else setActiveMenu('library');
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {JSON.parse(localStorage.getItem('songEngineer_library') || '[]').length === 0 && (
                  <div className="lit-empty">No saved songs yet. Write something and hit Save.</div>
                )}
              </div>
            </div>
          )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default WriteStudio;