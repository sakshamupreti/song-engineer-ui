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
  { name: "Alliteration", desc: "The repetition of the same consonant sounds at the beginning of words near each other.", usage: "Creates a rhythmic, driving, or hypnotic musicality.", examples: ["'Whisper words of wisdom'"] },
  { name: "Assonance", desc: "The repetition of internal vowel sounds in nearby words.", usage: "Creates an internal, hidden rhyme scheme that makes lines flow beautifully.", examples: ["'I feel the need, the need for speed'"] },
  { name: "Anaphora", desc: "Repeating the same word or phrase at the beginning of successive lines.", usage: "Builds massive emotional momentum and tension.", examples: ["'Every breath you take / Every move you make'"] },
  { name: "Personification", desc: "Giving human qualities to inanimate objects.", usage: "Helps you 'show, don't tell'.", examples: ["'While my guitar gently weeps'"] },
  { name: "Hyperbole", desc: "Deliberate exaggeration not meant to be taken literally.", usage: "Raises the emotional stakes.", examples: ["'I'd catch a grenade for ya'"] },
  { name: "Oxymoron", desc: "A phrase combining two contradictory terms.", usage: "Captures complex, conflicted feelings perfectly.", examples: ["'The sound of silence'"] }
];

const PROMPT_LIBRARY = {
  "Story": [{ title: "The Overheard Conversation", desc: "Start with a line of dialogue you 'overheard' at a coffee shop." }, { title: "Two Strangers", desc: "Write about two strangers waiting for a delayed train in the rain." }],
  "Emotion": [{ title: "The Quiet Aftermath", desc: "The exact moment of silence after a massive argument ends." }, { title: "Bittersweet Success", desc: "Achieving your biggest dream, but the person you wanted to share it with is gone." }],
  "Concept": [{ title: "Inanimate Witness", desc: "Write from the perspective of an object witnessing a breakup." }, { title: "Reverse Chronology", desc: "Start at the bitter end of a relationship and write backwards." }]
};

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
  const [activeMenu, setActiveMenu] = useState(null);
  const [playMode, setPlayMode] = useState(false);
  const [bpm, setBpm] = useState(120);
  
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [isDronePlaying, setIsDronePlaying] = useState(false);
  const [playbackStyle, setPlaybackStyle] = useState("strum"); 
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState(null); 
  
  const [playingProgIndex, setPlayingProgIndex] = useState(null);
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
  
  const metronomeInterval = useRef(null);
  const droneNodes = useRef([]);
  const audioCtxRef = useRef(null);

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
    const third = isMinor || isDim ? 1.189 : 1.26;
    const fifth = isDim ? 1.414 : 1.498;
    const ratios = [1, third, fifth];
    if (is7th) {
        if (isMaj7) ratios.push(1.887);
        else ratios.push(1.782);
    }
    return ratios.map(r => rootFreq * r);
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
        gain.gain.value = 0.02;
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

  useEffect(() => {
    if (playingProgIndex === null) { clearTimeout(sequenceTimerRef.current); return; }
    const scheduleAheadTime = 0.1; 
    const lookahead = 25; 
    const scheduler = () => {
      const ctx = getAudioCtx();
      while (nextChordTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        const chords = activeProgressionRef.current;
        scheduleChord(chords[currentChordIndexRef.current], nextChordTimeRef.current, playbackStyle, bpm);
        const barDuration = (60.0 / bpm) * 4;
        nextChordTimeRef.current += barDuration;
        currentChordIndexRef.current = (currentChordIndexRef.current + 1) % chords.length;
      }
      sequenceTimerRef.current = setTimeout(scheduler, lookahead);
    };
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    if (currentChordIndexRef.current === 0 && nextChordTimeRef.current === 0) { nextChordTimeRef.current = ctx.currentTime + 0.05; }
    scheduler();
    return () => clearTimeout(sequenceTimerRef.current);
  }, [playingProgIndex, playbackStyle, bpm]);

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
        const chordMatches = lyrics.match(/\[([A-G][b#]?[a-zA-Z0-9]*[ø]?[7]?[b]?[5]?)\]/g);
        let lastChord = "C"; 
        if (chordMatches && chordMatches.length > 0) {
          const lastFullMatch = chordMatches[chordMatches.length - 1];
          lastChord = lastFullMatch.substring(1, lastFullMatch.length - 1);
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
        console.error("Failed to fetch jazz palette:", err);
        setPalette([{name: "C", roman: "I", group: "Diatonic"}]);
      }
    };
    fetchPalette();
  }, [jazzMode, projectKey, (lyrics.match(/\[.*?\]/g) || []).length]);

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
      setPlayingProgIndex(null); currentChordIndexRef.current = 0; nextChordTimeRef.current = 0;
    } else {
      activeProgressionRef.current = actualChords; setPlayingProgIndex(index);
      currentChordIndexRef.current = 0; nextChordTimeRef.current = 0;
    }
  };

  const playTick = () => {
    const ctx = getAudioCtx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.05);
  };

  // --- VOICE MEMO RECORDER ---
  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader(); reader.readAsDataURL(audioBlob);
          reader.onloadend = () => setAudioData(reader.result);
          stream.getTracks().forEach(track => track.stop()); 
        };
        mediaRecorderRef.current.start(); setIsRecording(true);
      } catch (err) { alert("Microphone access denied or unavailable."); }
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

  useEffect(() => {
    if (isMetronomePlaying) {
      const ctx = getAudioCtx(); if (ctx.state === 'suspended') ctx.resume();
      metronomeInterval.current = setInterval(playTick, 60000 / bpm);
    } else { clearInterval(metronomeInterval.current); }
    return () => clearInterval(metronomeInterval.current);
  }, [isMetronomePlaying, bpm]);

  // --- THE NEW SCROLL SYNC ENGINE ---
  const handleScroll = () => {
    if (!wrapperRef.current) return;

    const currentScrollTop = wrapperRef.current.scrollTop;
    const currentScrollLeft = wrapperRef.current.scrollLeft;
    
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <audio className="custom-audio-player" src={audioData} controls />
              <button onClick={deleteRecording} style={{ background: 'transparent', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
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

          <div 
            className="editor-wrapper" 
            ref={wrapperRef} 
            onScroll={handleScroll}
          >
            <div className="editor-backdrop" ref={backdropRef}>
              {renderLyricsIDE()}
            </div>
            
            <textarea
              className="editor-textarea"
              ref={editorRef}
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

        <div className={`drawer ${activeMenu ? 'open' : ''}`}>
          <button className="close-btn" onClick={() => setActiveMenu(null)}>✕</button>

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
              <div className="progression-controls">
                <label style={{color: '#888', fontSize: '0.85rem'}}>Playback Style</label>
                <div className="style-selector">
                  <button className={`style-btn ${playbackStyle === 'block' ? 'active' : ''}`} onClick={() => setPlaybackStyle('block')}>Block</button>
                  <button className={`style-btn ${playbackStyle === 'strum' ? 'active' : ''}`} onClick={() => setPlaybackStyle('strum')}>Strum</button>
                  <button className={`style-btn ${playbackStyle === 'fingerstyle' ? 'active' : ''}`} onClick={() => setPlaybackStyle('fingerstyle')}>Finger</button>
                </div>
              </div>
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

          {activeMenu === 'figures' && (
            <div className="drawer-content">
              <h3>Figures of Speech</h3>
              <div className="song-list">
                {FIGURES_OF_SPEECH.map((fig, i) => (
                  <div key={i} className="phrase-card" onClick={() => insertAtCursor(`\n[Try using ${fig.name} here]\n`)}>
                    <span className="phrase-text" style={{color: '#3b82f6'}}>{fig.name}</span>
                    <span className="phrase-meaning" style={{marginBottom: '8px'}}>{fig.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMenu === 'prompts' && (
            <div className="drawer-content">
              <h3>Song Prompts</h3>
              <div className="tool-tabs">
                {Object.keys(PROMPT_LIBRARY).map(tab => (
                  <button key={tab} className={activePromptTab === tab ? "tab-btn active" : "tab-btn"} onClick={() => setActivePromptTab(tab)}>{tab}</button>
                ))}
              </div>
              <div className="song-list" style={{marginTop: '10px'}}>
                {PROMPT_LIBRARY[activePromptTab].map((item, i) => (
                  <div key={i} className="phrase-card" onClick={() => insertAtCursor(`\n[Prompt: ${item.desc}]\n`)}>
                    <span className="phrase-text">{item.title}</span>
                    <span className="phrase-meaning">{item.desc}</span>
                  </div>
                ))}
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