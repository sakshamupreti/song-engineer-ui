import { useState, useRef, useEffect } from 'react';
import { syllable } from 'syllable';
import './App.css';

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

const PROGRESSIONS = [
  { name: "Pop Punk / Optimistic", numerals: ["I", "V", "vi", "IV"] },
  { name: "Jazz Turnaround", numerals: ["ii", "V", "I", "vi"] },
  { name: "Doo-Wop / 50s", numerals: ["I", "vi", "IV", "V"] },
  { name: "Creep / Melancholy", numerals: ["I", "III", "IV", "iv"] }
];

function App() {
  const [lyrics, setLyrics] = useState("");
  const [songTitle, setSongTitle] = useState("Untitled Song");
  const [activeSongId, setActiveSongId] = useState(null);

  const [projectKey, setProjectKey] = useState("C");
  const [jazzMode, setJazzMode] = useState(false);
  const [palette, setPalette] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [hoverInfo, setHoverInfo] = useState(null);
  
  const [songTopic, setSongTopic] = useState(""); 
  const [wordMeter, setWordMeter] = useState(""); 
  
  const [searchWord, setSearchWord] = useState("");
  const [activeWordTool, setActiveWordTool] = useState("Rhymes");
  const [rhymeType, setRhymeType] = useState("Perfect");
  const [syllableFilter, setSyllableFilter] = useState(0);
  const [foundWords, setFoundWords] = useState([]);
  
  const [activePhraseTab, setActivePhraseTab] = useState("Idioms");
  const [phraseSearch, setPhraseSearch] = useState("");
  const [phrases, setPhrases] = useState([]);

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

  // --- API FETCH EFFECTS ---
  useEffect(() => {
    if (phraseSearch.trim().length < 2) { setPhrases([]); return; }
    const delay = setTimeout(() => {
      fetch(`https://song-engineer-ui-2.onrender.com/api/phrases?query=${phraseSearch}&phrase_type=${activePhraseTab}`)
        .then(res => res.json())
        .then(data => setPhrases(data.phrases || []))
        .catch(err => console.error("Metaphor Engine Failure:", err));
    }, 300);
    return () => clearTimeout(delay);
  }, [phraseSearch, activePhraseTab]);

  useEffect(() => {
    const fetchPalette = async () => {
      try {
        let lastChord = projectKey.replace('m', ''); 

        if (playMode && lastPlayedChord) {
          lastChord = lastPlayedChord;
        } else {
          const chordMatches = lyrics.match(/\[([A-G][b#]?[a-zA-Z0-9]*[ø]?[7]?[b]?[5]?)\]/g);
          if (chordMatches && chordMatches.length > 0) {
            const lastFullMatch = chordMatches[chordMatches.length - 1];
            lastChord = lastFullMatch.substring(1, lastFullMatch.length - 1);
          }
        }

        const response = await fetch("https://song-engineer-ui-2.onrender.com/api/chords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ last_chord: lastChord, key: projectKey, jazz_mode: jazzMode })
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        setPalette(data.full_palette || []); 
        setSuggestions(data.suggestions || {});
      } catch (err) {
        console.error("Failed to fetch palette:", err);
      }
    };
    fetchPalette();
  }, [jazzMode, projectKey, (lyrics.match(/\[.*?\]/g) || []).length, lastPlayedChord, playMode]);

  useEffect(() => {
    if (searchWord.trim().length < 2) { setFoundWords(activeWordTool === "Imagery" ? {} : []); return; }
    const delay = setTimeout(() => {
      const sylParam = syllableFilter > 0 ? `&syllables=${syllableFilter}` : "";
      const subParam = activeWordTool === "Rhymes" ? `&sub_type=${rhymeType}` : "";
      const topicParam = songTopic.trim() ? `&topic=${encodeURIComponent(songTopic)}` : "";

      fetch(`https://song-engineer-ui-2.onrender.com/api/words?word=${searchWord}&query_type=${activeWordTool}${subParam}${sylParam}${topicParam}`)
        .then(res => res.json()).then(data => setFoundWords(data.categories ? data : data.words));
    }, 300);
    return () => clearTimeout(delay);
  }, [searchWord, activeWordTool, rhymeType, syllableFilter, songTopic]);

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
    else if (toolCategory === "Metaphor") { setPhraseSearch(selectedText); setActiveMenu("phrases"); setActivePhraseTab("Metaphors"); }
  };

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

  const parseScat = (meterStr) => {
    if (!meterStr.trim()) return "";
    return meterStr.trim().split(/\s+/).map(w => {
      if(!w) return "";
      return (w === w.toUpperCase() && w.match(/[A-Z]/)) ? "•" : "◦";
    }).join("");
  };

  const renderWordTags = (wordList) => {
    const targetStress = parseScat(wordMeter);
    const filtered = wordList.filter(item => !targetStress || item.stress === targetStress);
    
    if (filtered.length === 0 && targetStress) {
      return <span style={{opacity: 0.5, fontSize: '0.85rem'}}>No words match the pattern [{targetStress}]</span>;
    }
    
    return filtered.map((item, i) => (
      <span key={i} className="word-tag-refined" onClick={() => insertAtCursor(item.word)}>
        {item.word} {item.stress && <span className="word-stress">[{item.stress}]</span>}
      </span>
    ));
  };

  const lines = lyrics.split('\n');

  const groupedPalette = palette.reduce((acc, obj) => {
    const key = obj.group || 'Chords';
    if (!acc[key]) acc[key] = [];
    acc[key].push(obj);
    return acc;
  }, {});

  return (
    <div className="dashboard" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header>
        <div className="brand" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <svg className="w-8 h-8 text-[#ff4b4b]" style={{width: '32px', height: '32px', color: '#ff4b4b'}} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="50" cy="50" rx="48" ry="18" transform="rotate(-60 50 50)" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2"/>
            <ellipse cx="50" cy="50" rx="48" ry="18" transform="rotate(60 50 50)" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2"/>
            <ellipse cx="50" cy="50" rx="48" ry="18" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2"/>
            <circle cx="50" cy="50" r="4" fill="currentColor"/>
            <path d="M20,60 L35,30 L50,70 L65,40 L80,55" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(0px 2px 4px rgba(255,75,75,0.4))'}}/>
          </svg>
          <h1 style={{margin: 0, fontSize: '1.2rem'}}>Song<span style={{color: '#ff4b4b'}}>Engineer</span></h1>
        </div>
        
        <div className="song-title-container">
          <input type="text" className="song-title-input" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="Enter song title..." />
        </div>
        
        <div className="recording-bar">
          <button className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={toggleRecording} title="Record Voice Memo">🎙️</button>
          {audioData && (
            <div className="audio-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <audio className="custom-audio-player" src={audioData} controls />
              <button className="audio-delete-btn" onClick={deleteRecording}>✕</button>
            </div>
          )}

          <div style={{ borderLeft: '1px solid #444', height: '20px' }}></div>
          <button onClick={() => setIsMetronomePlaying(!isMetronomePlaying)} style={{background: isMetronomePlaying ? '#ff4b4b' : '#333', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer'}}>
            {isMetronomePlaying ? "⏹" : "▶ MET"}
          </button>
          <input type="range" min="40" max="220" value={bpm} onChange={(e) => setBpm(e.target.value)} style={{width: '60px'}}/>
          <span style={{fontSize: '0.8rem', color: '#aaa'}}>{bpm}</span>
        </div>
      </header>

      <div className="main-layout">
        <div className="editor-container">
          
          <div className="syllable-gutter" ref={gutterRef}>
            {lines.map((line, i) => {
              const sylCount = getSyllables(line);
              const isStructural = line.trim().length > 0 && !line.startsWith('[');
              return (
                <div key={i} className="gutter-line">
                  <span className="gutter-syl">{isStructural ? (sylCount || 0) : ""}</span>
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
              placeholder="Focus here and write..."
              spellCheck="false"
            />
          </div>

          {selectedText && (
            <div className="magic-tooltip">
              <span>"{selectedText}"</span>
              <button className="magic-btn" onClick={() => triggerMagicTool("Words", "Rhymes")}>Rhyme</button>
              <button className="magic-btn" onClick={() => triggerMagicTool("Words", "Imagery")}>Imagery</button>
              <button className="magic-btn" onClick={() => triggerMagicTool("Metaphor", null)}>Metaphor</button>
            </div>
          )}
        </div>

        <div className="side-nav">
          <button onClick={() => setActiveMenu(activeMenu === 'palette' ? null : 'palette')} className={activeMenu === 'palette' ? 'nav-btn active' : 'nav-btn'} title="Harmonic Palette">🎹</button>
          <button onClick={() => setActiveMenu(activeMenu === 'progressions' ? null : 'progressions')} className={activeMenu === 'progressions' ? 'nav-btn active' : 'nav-btn'} title="Chord Progressions">🎸</button>
          <button onClick={() => setActiveMenu(activeMenu === 'words' ? null : 'words')} className={activeMenu === 'words' ? 'nav-btn active' : 'nav-btn'} title="Word Finder">🔍</button>
          <button onClick={() => setActiveMenu(activeMenu === 'phrases' ? null : 'phrases')} className={activeMenu === 'phrases' ? 'nav-btn active' : 'nav-btn'} title="Metaphor Engine">💡</button>
          <button onClick={() => setActiveMenu(activeMenu === 'figures' ? null : 'figures')} className={activeMenu === 'figures' ? 'nav-btn active' : 'nav-btn'} title="Figures of Speech">🗣️</button>
          <button onClick={() => setActiveMenu(activeMenu === 'prompts' ? null : 'prompts')} className={activeMenu === 'prompts' ? 'nav-btn active' : 'nav-btn'} title="Song Prompts">📓</button>
          <div className="nav-divider"></div>
          <button className="nav-btn" onClick={handleNewSong} title="New Song">➕</button>
          <button className="nav-btn" onClick={saveToLibrary} title="Save to Library">💾</button>
          <button onClick={() => setActiveMenu(activeMenu === 'library' ? null : 'library')} className={activeMenu === 'library' ? 'nav-btn active' : 'nav-btn'} title="Library">📚</button>
        </div>

        {activeMenu && (
          <div className="drawer-overlay" onClick={() => setActiveMenu(null)}></div>
        )}

        <div 
          className={`drawer ${activeMenu ? 'open' : ''}`}
          ref={drawerRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndEvent}
        >
          <div className="drag-handle"></div>
          <button className="close-btn" onClick={() => setActiveMenu(null)}>
            <span className="desktop-close-icon">✕</span>
          </button>

          {activeMenu === 'palette' && (
            <div className="drawer-content">
              <h3>Harmonic Palette</h3>
              <div className="palette-settings-row">
                <div className="setting-item">
                  <label>Active Scale</label>
                  <select value={projectKey} onChange={(e) => setProjectKey(e.target.value)}>
                    {allKeys.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="setting-item">
                  <label>Mode</label>
                  <div className="mode-toggle-group">
                    <button className={!playMode ? 'mode-btn active' : 'mode-btn'} onClick={() => setPlayMode(false)}>WRITE</button>
                    <button className={playMode ? 'mode-btn active' : 'mode-btn'} onClick={() => setPlayMode(true)}>PLAY</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px' }}>
                <span style={{ fontSize: '0.9rem', color: jazzMode ? '#eab308' : '#888' }}>🎷 Jazz Harmony Mode</span>
                <button 
                  onClick={() => setJazzMode(!jazzMode)} 
                  style={{ background: jazzMode ? '#eab308' : '#333', color: jazzMode ? '#000' : '#fff', border: 'none', padding: '5px 12px', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {jazzMode ? "ON" : "OFF"}
                </button>
              </div>

              <div className={`drone-module ${isDronePlaying ? 'active' : ''}`} onClick={toggleDrone}>
                <div className="drone-status"><div className="pulse-dot"></div><span>DRONE</span></div>
                <div className="drone-info">{projectKey} Resonance</div>
              </div>

              <div className="theory-tracker">
                <div className="theory-label">Relationship / Function</div>
                <div className="theory-value" style={{color: hoverInfo && hoverInfo.includes('Tritone') ? '#ef4444' : '#e0e0e0'}}>
                  {hoverInfo || "Hover over a chord..."}
                </div>
              </div>

              <div className="palette-grid-container" style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px'}}>
                {Object.keys(groupedPalette).map(groupName => (
                  <div key={groupName}>
                    <div style={{fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px'}}>{groupName}</div>
                    <div className="palette-grid">
                      {groupedPalette[groupName].map((chordObj, i) => (
                        <div 
                          key={i} 
                          className={`chord-tag ${suggestions[chordObj.name] ? 'suggested' : ''}`} 
                          onMouseDown={(e) => e.preventDefault()} 
                          onClick={() => handleSidebarChordClick(chordObj.name)}
                          onMouseEnter={() => setHoverInfo(suggestions[chordObj.name] ? `${chordObj.roman} | ${suggestions[chordObj.name]}` : `${chordObj.roman} (Static)`)} 
                          onMouseLeave={() => setHoverInfo(null)}
                        >
                          <span className="tag-roman">{chordObj.roman}</span>
                          <span className="tag-name">{chordObj.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

{activeMenu === 'progressions' && (
            <div className="drawer-content">
              <h3>Sequence Builder</h3>
              
              <div className="progression-controls" style={{ marginBottom: '15px' }}>
                <label style={{color: '#888', fontSize: '0.85rem'}}>Playback Style</label>
                <div className="style-selector">
                  <button className={`style-btn ${playbackStyle === 'block' ? 'active' : ''}`} onClick={() => setPlaybackStyle('block')}>Block</button>
                  <button className={`style-btn ${playbackStyle === 'strum' ? 'active' : ''}`} onClick={() => setPlaybackStyle('strum')}>Strum</button>
                  <button className={`style-btn ${playbackStyle === 'fingerstyle' ? 'active' : ''}`} onClick={() => setPlaybackStyle('fingerstyle')}>Finger</button>
                </div>
              </div>

              {/* 🛠️ NEW: CUSTOM SEQUENCE BUILDER */}
              <div className="custom-sequence-builder">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ color: '#a855f7', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Build Your Own</strong>
                  {customSequence.length > 0 && (
                    <button onClick={() => setCustomSequence([])} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>Clear All</button>
                  )}
                </div>

                {/* The Dropzone / Display */}
                <div className="custom-sequence-display">
                  {customSequence.length === 0 ? (
                    <span style={{ color: '#666', fontSize: '0.85rem', fontStyle: 'italic', padding: '5px 0' }}>Tap chords below to build a sequence...</span>
                  ) : (
                    customSequence.map((chord, i) => (
                      <div key={i} className="sequence-chord-chip" onClick={() => removeFromCustomSequence(i)} title="Click to remove">
                        {chord} <span style={{ color: '#ef4444', fontSize: '0.7rem', marginLeft: '4px' }}>✕</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Action Buttons for Custom Sequence */}
                {customSequence.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      style={{ flex: 1, backgroundColor: playingProgIndex === 'custom' ? '#ef4444' : '#22c55e', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => toggleProgression('custom', customSequence)}
                    >
                      {playingProgIndex === 'custom' ? '⏸ Stop' : '▶ Play Custom'}
                    </button>
                    <button
                      style={{ flex: 1, backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => insertAtCursor(`\n[${customSequence.join("] [")}]\n`)}
                    >
                      ➕ Insert
                    </button>
                  </div>
                )}

                {/* Mini Palette for Selection */}
                <div style={{ marginTop: '15px', borderTop: '1px solid #333', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>AVAILABLE CHORDS:</span>
                    <span style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 'bold' }}>{projectKey} {jazzMode ? 'JAZZ' : 'STANDARD'}</span>
                  </div>
                  <div className="mini-palette">
                    {palette.map((p, i) => (
                      <button key={i} className="mini-chord-btn" onClick={() => addToCustomSequence(p.name)}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* EXISTING PROGRESSION TEMPLATES */}
              <h4 style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '10px', marginTop: '20px' }}>Templates</h4>
              <div className="song-list">
                {PROGRESSIONS.map((prog, i) => {
                  const actualChords = prog.numerals.map(numeral => {
                    const found = palette.find(p => p.roman.replace(/[^IivV]/g, '') === numeral.replace(/[^IivV]/g, ''));
                    return found ? found.name : palette[0]?.name; 
                  });
                  const isPlayingThis = playingProgIndex === i;
                  return (
                    <div key={i} className="progression-card" style={isPlayingThis ? {borderColor: '#22c55e'} : {}}>
                      <div className="prog-info">
                        <span className="prog-name">{prog.name}</span>
                        <span className="prog-chords">{actualChords.join(" - ")}</span>
                      </div>
                      <div className="prog-actions">
                        <button className="play-btn" style={isPlayingThis ? {backgroundColor: '#ef4444'} : {}} onClick={() => toggleProgression(i, actualChords)}>{isPlayingThis ? '⏸' : '▶'}</button>
                        <button onClick={() => insertAtCursor(`\n[${actualChords.join("] [")}]\n`)}>➕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeMenu === 'words' && (
            <div className="drawer-content">
              <h3>Word Finder</h3>
              <div className="tool-tabs" style={{flexWrap: 'wrap', gap: '5px'}}>
                {["Rhymes", "Concept", "Imagery", "Family"].map(tool => (
                  <button key={tool} className={activeWordTool === tool ? "tab-btn active" : "tab-btn"} onClick={() => setActiveWordTool(tool)}>{tool}</button>
                ))}
              </div>
              <div className="search-command-bar">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <input type="text" value={songTopic} onChange={(e) => setSongTopic(e.target.value)} placeholder="Theme (e.g. ocean)..." style={{ borderBottom: '2px solid #3b82f6', backgroundColor: '#1a1a1a', flex: '1 1 100px' }}/>
                  <input type="text" value={wordMeter} onChange={(e) => setWordMeter(e.target.value)} placeholder="Meter (e.g. da DUM)" style={{ borderBottom: '2px solid #a855f7', backgroundColor: '#1a1a1a', flex: '1 1 100px' }}/>
                </div>
                <input type="text" value={searchWord} onChange={(e) => setSearchWord(e.target.value)} placeholder={`Search ${activeWordTool}...`} />
                {activeWordTool === "Rhymes" && (
                  <div className="rhyme-type-strip" style={{flexWrap: 'wrap'}}>
                    {["Perfect", "Near", "Slant", "Consonant"].map(r => (
                      <button key={r} className={rhymeType === r ? "mini-type-btn active" : "mini-type-btn"} onClick={() => setRhymeType(r)}>{r}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="word-cloud-container">
                {activeWordTool === "Imagery" && foundWords?.categories ? (
                  Object.keys(foundWords.categories).map(sense => (
                    <div key={sense} className="sense-group">
                      <label className="sense-label-minimal">{sense}</label>
                      <div className="word-results-list">
                        {renderWordTags(foundWords.categories[sense])}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="word-results-list">
                    {Array.isArray(foundWords) && renderWordTags(foundWords)}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === 'phrases' && (
            <div className="drawer-content">
              <h3>Phrase & Metaphor</h3>
              <div className="tool-tabs">
                {["Idioms", "Metaphors", "Similes"].map(tab => (
                  <button key={tab} className={activePhraseTab === tab ? "tab-btn active" : "tab-btn"} onClick={() => setActivePhraseTab(tab)}>{tab}</button>
                ))}
              </div>
              <div className="search-command-bar">
                <input type="text" value={phraseSearch} onChange={(e) => setPhraseSearch(e.target.value)} placeholder={`Search concept...`} />
              </div>
              <div className="song-list" style={{marginTop: '10px'}}>
                {phrases.length === 0 ? (
                  <div className="placeholder-text" style={{ textAlign: 'center', opacity: 0.3, padding: '20px' }}>No phrases found.</div>
                ) : (
                  phrases.map((item, i) => (
                    <div key={i} className="phrase-card" onClick={() => insertAtCursor(item.text)}>
                      <span className="phrase-text">{item.text}</span>
                      <span className="phrase-meaning">{item.meaning}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 🎸 INTEGRATED ACCORDION UPDATE HERE */}
          {activeMenu === 'figures' && (
            <div className="drawer-content">
              <h3>Figures of Speech</h3>
              <div className="sense-group" style={{ borderTop: 'none', paddingTop: 0 }}>
                <span className="sense-label-minimal" style={{ marginBottom: '15px' }}>Lyrical Devices</span>
                
                <div className="figures-list">
                  {FIGURES_OF_SPEECH.map((fos) => (
                    <div 
                      key={fos.name} 
                      className={`figure-card ${expandedFigure === fos.name ? 'expanded' : ''}`}
                      onClick={() => toggleFigure(fos.name)}
                    >
                      <div className="figure-header">
                        <span className="figure-name">{fos.name}</span>
                        {/* Changes from a plus to a minus when open */}
                        <span className="expand-icon">{expandedFigure === fos.name ? '−' : '+'}</span>
                      </div>
                      
                      <span className="figure-desc">{fos.desc}</span>
                      
                      {/* 🔽 THIS SECTION ONLY RENDERS IF CLICKED 🔽 */}
                      {expandedFigure === fos.name && (
                        <div className="figure-details" onClick={(e) => {
                          e.stopPropagation(); // Prevents the accordion from closing when trying to copy text
                        }}>
                          <div className="detail-section">
                            <strong>The Impact:</strong>
                            <p>{fos.usage}</p>
                          </div>
                          <div className="detail-section">
                            <strong>Examples:</strong>
                            <ul>
                              {fos.examples.map((ex, i) => (
                                <li key={i} className="example-text">{ex}</li>
                              ))}
                            </ul>
                          </div>
                          {/* Dedicated Insert button for clarity */}
                          <button 
                            className="magic-btn" 
                            style={{marginTop: '10px', width: '100%', padding: '8px'}} 
                            onClick={(e) => {
                              e.stopPropagation();
                              insertAtCursor(`\n[Try using ${fos.name} here]\n`);
                            }}
                          >
                            + Insert Reminder
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

{activeMenu === 'prompts' && (
            <div className="drawer-content">
              <h3>Writing Studio</h3>

              {/* 🎛️ Primary Toggle for Prompts vs Techniques */}
              <div className="mode-toggle-group" style={{ marginBottom: '15px' }}>
                <button 
                  className={activePromptMode === 'Prompts' ? 'mode-btn active' : 'mode-btn'} 
                  onClick={() => setActivePromptMode('Prompts')}
                >
                  PROMPTS
                </button>
                <button 
                  className={activePromptMode === 'Techniques' ? 'mode-btn active' : 'mode-btn'} 
                  onClick={() => setActivePromptMode('Techniques')}
                >
                  TECHNIQUES
                </button>
              </div>

              {/* 📑 SECONDARY TABS: Only show if Prompts is selected */}
              {activePromptMode === 'Prompts' && (
                <div className="tool-tabs">
                  {Object.keys(SONG_PROMPTS).map(tab => (
                    <button 
                      key={tab} 
                      className={activePromptTab === tab ? "tab-btn active" : "tab-btn"} 
                      onClick={() => setActivePromptTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}

              {/* 📋 LIST RENDERING */}
              <div className="song-list" style={{marginTop: '10px'}}>
                {activePromptMode === 'Prompts' ? (
                  /* Render the Prompt Cards */
                  SONG_PROMPTS[activePromptTab].map((item, i) => (
                    <div key={i} className="phrase-card" onClick={() => insertAtCursor(`\n[Prompt: ${item.desc}]\n`)}>
                      <span className="phrase-text">{item.title}</span>
                      <span className="phrase-meaning">{item.desc}</span>
                    </div>
                  ))
                ) : (
                  /* 🧠 Render the Interactive Technique Accordion */
                  <div className="figures-list">
                    {SONG_TECHNIQUES.map((tech) => (
                      <div 
                        key={tech.title} 
                        className={`figure-card ${expandedTechnique === tech.title ? 'expanded' : ''}`}
                        onClick={() => toggleTechnique(tech.title)}
                      >
                        <div className="figure-header">
                          <span className="figure-name" style={{color: '#a855f7'}}>{tech.title}</span>
                          <span className="expand-icon">{expandedTechnique === tech.title ? '−' : '+'}</span>
                        </div>
                        
                        <span className="figure-desc">{tech.desc}</span>
                        
                        {/* 🔽 EXPANDED DETAILS 🔽 */}
                        {expandedTechnique === tech.title && (
                          <div className="figure-details" onClick={(e) => e.stopPropagation()}>
                            <div className="detail-section">
                              <strong style={{color: '#a855f7', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px'}}>How to execute:</strong>
                              <ul style={{ listStyleType: 'none', paddingLeft: 0, marginTop: '8px' }}>
                                {tech.steps.map((step, i) => (
                                  <li key={i} style={{ fontSize: '0.75rem', color: '#ccc', marginBottom: '6px', lineHeight: '1.4' }}>
                                    {step}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="detail-section" style={{ marginTop: '12px' }}>
                              <strong style={{color: '#a855f7', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Why it works:</strong>
                              <p style={{ fontStyle: 'italic', color: '#888', margin: 0, marginTop: '6px', fontSize: '0.75rem', lineHeight: '1.4' }}>{tech.whyItWorks}</p>
                            </div>
                            
                            <button 
                              className="magic-btn" 
                              style={{marginTop: '15px', width: '100%', padding: '8px', backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', border: '1px solid #a855f7'}} 
                              onClick={(e) => {
                                e.stopPropagation();
                                insertAtCursor(`\n[Try using the '${tech.title}' technique here]\n`);
                              }}
                            >
                              + Insert Reminder
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
              <h3>My Song Library</h3>
              <div className="song-list">
                {JSON.parse(localStorage.getItem('songEngineer_library') || "[]").map((song) => (
                  <div key={song.id} className="drum-preset-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div onClick={() => {
                        setLyrics(song.content); setSongTitle(song.title);
                        setAudioData(song.audioData || null); setActiveSongId(song.id); setActiveMenu(null);
                      }} style={{ cursor: 'pointer', flex: 1 }}>
                      <span className="preset-name">{song.title}</span>
                    </div>
                    <button onClick={() => {
                        const lib = JSON.parse(localStorage.getItem('songEngineer_library') || "[]");
                        localStorage.setItem('songEngineer_library', JSON.stringify(lib.filter(s => s.id !== song.id)));
                        if (activeSongId === song.id) handleNewSong(); else setActiveMenu('library');
                      }} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', padding: '10px' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;