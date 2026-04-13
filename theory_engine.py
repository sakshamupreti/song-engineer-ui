CHROMATIC = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

def get_note_by_interval(root: str, semitones: int) -> str:
    alias_map = {"C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb"}
    safe_root = alias_map.get(root, root)
    if safe_root not in CHROMATIC: return root
    
    idx = CHROMATIC.index(safe_root)
    return CHROMATIC[(idx + semitones) % 12]

def generate_chords(key: str, last_chord: str, jazz_mode: bool) -> dict:
    root = key.replace('m', '')
    is_minor = 'm' in key
    
    intervals = [0, 2, 3, 5, 7, 8, 10] if is_minor else [0, 2, 4, 5, 7, 9, 11]
    deg = [get_note_by_interval(root, i) for i in intervals]
    
    palette = []
    suggestions = {}
    last = last_chord

    if not jazz_mode:
        # ==========================================
        # 🎸 STANDARD POP / ROCK ENGINE
        # ==========================================
        if not is_minor:
            palette = [
                {"name": deg[0], "roman": "I", "group": "Diatonic"},
                {"name": f"{deg[1]}m", "roman": "ii", "group": "Diatonic"},
                {"name": f"{deg[2]}m", "roman": "iii", "group": "Diatonic"},
                {"name": deg[3], "roman": "IV", "group": "Diatonic"},
                {"name": deg[4], "roman": "V", "group": "Diatonic"},
                {"name": f"{deg[5]}m", "roman": "vi", "group": "Diatonic"},
                {"name": get_note_by_interval(root, 10), "roman": "bVII", "group": "Borrowed"},
                {"name": f"{deg[3]}m", "roman": "iv", "group": "Borrowed"}
            ]
            
            # --- NEW: POP SECONDARY DOMINANTS ---
            palette.extend([
                {"name": f"{deg[2]}7", "roman": "III7 (V/vi)", "group": "Pop Dominants"},
                {"name": f"{deg[1]}7", "roman": "II7 (V/V)", "group": "Pop Dominants"},
                {"name": f"{deg[0]}7", "roman": "I7 (V/IV)", "group": "Pop Dominants"},
            ])
            
            # --- POP SUGGESTIONS ALGORITHM ---
            if last == deg[4]: # V chord
                suggestions[deg[0]] = "Perfect Cadence (Home)"
                suggestions[f"{deg[5]}m"] = "Deceptive Cadence (vi)"
            elif last == deg[3]: # IV chord
                suggestions[deg[4]] = "Build tension to V"
                suggestions[deg[0]] = "Plagal Cadence (Home)"
                suggestions[f"{deg[3]}m"] = "Minor IV tension (The Beatles vibe)"
            elif last == f"{deg[5]}m": # vi chord
                suggestions[deg[3]] = "Classic pop movement (vi → IV)"
            elif last == f"{deg[3]}m": # iv chord (borrowed minor 4)
                suggestions[deg[0]] = "Melancholy resolve (iv → I)"
                
            # --- NEW: RESOLVING THE POP DOMINANTS ---
            elif last == f"{deg[2]}7": # III7 (e.g., E7 in Key of C)
                suggestions[f"{deg[5]}m"] = "Natural resolve to minor (→ vi)"
                suggestions[deg[3]] = "Radiohead 'Creep' resolve (→ IV)"
            elif last == f"{deg[1]}7": # II7 (e.g., D7 in Key of C)
                suggestions[deg[4]] = "Gospel/Country lift (→ V)"
            elif last == f"{deg[0]}7": # I7 (e.g., C7 in Key of C)
                suggestions[deg[3]] = "Bluesy push (→ IV)"

        else:
            palette = [
                {"name": f"{deg[0]}m", "roman": "i", "group": "Diatonic"},
                {"name": deg[2], "roman": "III", "group": "Diatonic"},
                {"name": f"{deg[3]}m", "roman": "iv", "group": "Diatonic"},
                {"name": f"{deg[4]}m", "roman": "v", "group": "Diatonic"},
                {"name": deg[5], "roman": "VI", "group": "Diatonic"},
                {"name": deg[6], "roman": "VII", "group": "Diatonic"},
                {"name": get_note_by_interval(root, 7), "roman": "V", "group": "Harmonic Minor"}
            ]
            
            # --- NEW: MINOR POP SECONDARY DOMINANTS ---
            palette.extend([
                {"name": f"{deg[0]}7", "roman": "I7 (V/iv)", "group": "Pop Dominants"},
                {"name": f"{deg[2]}7", "roman": "III7 (V/VI)", "group": "Pop Dominants"},
            ])
            
            # --- MINOR POP SUGGESTIONS ---
            v_chord = get_note_by_interval(root, 7)
            if last == v_chord: # Harmonic Minor V
                suggestions[f"{deg[0]}m"] = "Perfect Minor Cadence"
                suggestions[deg[5]] = "Deceptive Cadence (VI)"
            elif last == f"{deg[3]}m": # iv chord
                suggestions[v_chord] = "Minor tension to V"
                suggestions[f"{deg[0]}m"] = "Plagal Minor Cadence (Home)"
                
            # --- NEW: RESOLVING MINOR DOMINANTS ---
            elif last == f"{deg[0]}7": # I7
                suggestions[f"{deg[3]}m"] = "Blues push (→ iv)"
            elif last == f"{deg[2]}7": # III7
                suggestions[deg[5]] = "Resolve to relative major (→ VI)"

    else:
        # ==========================================
        # 🎷 ADVANCED JAZZ HARMONY ENGINE
        # ==========================================
        if not is_minor:
            palette.extend([
                {"name": f"{deg[0]}maj7", "roman": "Imaj7", "group": "Diatonic 7ths"},
                {"name": f"{deg[1]}m7", "roman": "ii7", "group": "Diatonic 7ths"},
                {"name": f"{deg[2]}m7", "roman": "iii7", "group": "Diatonic 7ths"},
                {"name": f"{deg[3]}maj7", "roman": "IVmaj7", "group": "Diatonic 7ths"},
                {"name": f"{deg[4]}7", "roman": "V7", "group": "Diatonic 7ths"},
                {"name": f"{deg[5]}m7", "roman": "vi7", "group": "Diatonic 7ths"},
                {"name": f"{deg[6]}m7b5", "roman": "viiø7", "group": "Diatonic 7ths"},
            ])
            palette.extend([
                {"name": f"{deg[5]}7", "roman": "V7/ii", "group": "Secondary Dominants"},
                {"name": f"{deg[6]}7", "roman": "V7/iii", "group": "Secondary Dominants"},
                {"name": f"{deg[0]}7", "roman": "V7/IV", "group": "Secondary Dominants"},
                {"name": f"{deg[1]}7", "roman": "V7/V", "group": "Secondary Dominants"},
                {"name": f"{deg[2]}7", "roman": "V7/vi", "group": "Secondary Dominants"},
            ])
            palette.extend([
                {"name": f"{get_note_by_interval(root, 1)}7", "roman": "subV7/I", "group": "Tritone Substitutions"},
                {"name": f"{get_note_by_interval(root, 3)}7", "roman": "subV7/ii", "group": "Tritone Substitutions"},
                {"name": f"{get_note_by_interval(root, 6)}7", "roman": "subV7/IV", "group": "Tritone Substitutions"},
                {"name": f"{deg[3]}7", "roman": "IV7", "group": "Modal Interchange"},
            ])
            palette.extend([
                {"name": f"{root}#dim7", "roman": "#Idim7", "group": "Passing Chords"},
                {"name": f"{deg[2]}bdim7", "roman": "bIIIdim7", "group": "Passing Chords"},
                {"name": f"{deg[3]}#dim7", "roman": "#IVdim7", "group": "Passing Chords"},
            ])
            palette.extend([
                {"name": f"{get_note_by_interval(root, 10)}7", "roman": "bVII7", "group": "Modal Interchange"},
                {"name": f"{get_note_by_interval(root, 3)}maj7", "roman": "bIIImaj7", "group": "Modal Interchange"},
                {"name": f"{get_note_by_interval(root, 8)}maj7", "roman": "bVImaj7", "group": "Modal Interchange"},
            ])

            # --- JAZZ SUGGESTIONS ALGORITHM ---
            if last == f"{deg[0]}maj7" or last == root:
                suggestions[f"{deg[1]}m7"] = "Standard ii movement"
                suggestions[f"{deg[5]}7"] = "Secondary Dominant (V7/ii)"
                suggestions[f"{root}#dim7"] = "Ascending Diminished (→ ii7)"
                suggestions[f"{get_note_by_interval(root, 3)}maj7"] = "Modal Interchange (bIIImaj7)"
                
            elif last == f"{deg[1]}m7":
                suggestions[f"{deg[4]}7"] = "ii-V connection"
                suggestions[f"{get_note_by_interval(root, 1)}7"] = "Tritone Sub of V (subV7/I)"
                suggestions[f"{deg[2]}bdim7"] = "Descending Diminished (→ I)"
                
            elif last == f"{deg[4]}7":
                suggestions[f"{deg[0]}maj7"] = "Resolution to I"
                suggestions[f"{deg[5]}m7"] = "Deceptive Resolution (vi7)"
                
            elif last == f"{deg[3]}maj7":
                suggestions[f"{deg[3]}#dim7"] = "Ascending Diminished (→ V7)"
                suggestions[f"{get_note_by_interval(root, 10)}7"] = "Backdoor Setup (bVII7)"

            # 🎯 ==========================================
            # 🎯 SECONDARY DOMINANT RESOLUTIONS
            # ==========================================
            
            # V7/IV (e.g., C7 in C Major)
            elif last == f"{deg[0]}7":
                suggestions[f"{deg[3]}maj7"] = "Standard Resolve (→ IVmaj7)"
                suggestions[f"{deg[1]}m7"] = "Deceptive drop (→ ii7)"
                
            # V7/V (e.g., D7 in C Major)
            elif last == f"{deg[1]}7":
                suggestions[f"{deg[4]}7"] = "Standard Resolve (→ V7)"
                suggestions[f"{deg[5]}m7"] = "Deceptive Resolve (→ vi7)"
                
            # V7/vi (e.g., E7 in C Major) - Your "Creep" example
            elif last == f"{deg[2]}7":
                suggestions[f"{deg[5]}m7"] = "Standard Resolve (→ vi7)"
                suggestions[f"{deg[3]}maj7"] = "Deceptive Major lift (→ IVmaj7)"
                
            # V7/ii (e.g., A7 in C Major)
            elif last == f"{deg[5]}7":
                suggestions[f"{deg[1]}m7"] = "Standard Resolve (→ ii7)"
                suggestions[f"{deg[3]}maj7"] = "Deceptive cadence (→ IVmaj7)"
                suggestions[f"{get_note_by_interval(root, 3)}7"] = "Tritone Sub (subV7/ii)"
                
            # V7/iii (e.g., B7 in C Major)
            elif last == f"{deg[6]}7":
                suggestions[f"{deg[2]}m7"] = "Standard Resolve (→ iii7)"
                suggestions[f"{deg[5]}m7"] = "Cycle of 4ths (→ vi7)"

            # 🎹 ==========================================
            # 🎹 TRITONE & PASSING CHORD RESOLUTIONS
            # ==========================================
            elif last == f"{get_note_by_interval(root, 1)}7":
                suggestions[f"{deg[0]}maj7"] = "Chromatic Resolution (→ I)"
            elif last == f"{get_note_by_interval(root, 3)}7":
                suggestions[f"{deg[1]}m7"] = "Chromatic Resolution (→ ii7)"
            elif last == f"{get_note_by_interval(root, 6)}7":
                suggestions[f"{deg[3]}maj7"] = "Chromatic Resolution (→ IVmaj7)"
            elif last == f"{root}#dim7":
                suggestions[f"{deg[1]}m7"] = "Resolve up to ii7"
            elif last == f"{deg[2]}bdim7":
                suggestions[f"{deg[0]}maj7"] = "Resolve down to Imaj7"
            elif last == f"{deg[3]}#dim7":
                suggestions[f"{deg[4]}7"] = "Resolve up to V7"

            # 🎸 ==========================================
            # 🎸 DIATONIC 7TH RESOLUTIONS
            # ==========================================
            # Resolving the vi7 (e.g., Am7 in C)
            elif last == f"{deg[5]}m7":
                suggestions[f"{deg[1]}m7"] = "Cycle of 4ths (→ ii7)"
                suggestions[f"{deg[5]}7"] = "Dominant Shift (Turn into V7/ii)"
                suggestions[f"{deg[3]}maj7"] = "Diatonic step down (→ IVmaj7)"

            # Resolving the iii7 (e.g., Em7 in C)
            elif last == f"{deg[2]}m7":
                suggestions[f"{deg[5]}m7"] = "Cycle of 4ths (→ vi7)"
                suggestions[f"{deg[2]}7"] = "Dominant Shift (Turn into V7/vi)"
                suggestions[f"{deg[3]}maj7"] = "Deceptive half-step (→ IVmaj7)"

            # Resolving the IV7 (e.g., F7 in C)
            elif last == f"{deg[3]}7":
                suggestions[f"{deg[0]}maj7"] = "Blues Plagal resolve (→ Imaj7)"
                suggestions[f"{deg[2]}m7"] = "Tritone Sub resolve (→ iii7)"
                suggestions[f"{get_note_by_interval(root, 10)}7"] = "Cycle of 4ths (→ bVII7)"

            # 🌌 ==========================================
            # 🌌 MODAL INTERCHANGE RESOLUTIONS
            # ==========================================
            
            # 1. Landing on bIIImaj7 (e.g., Ebmaj7 in C)
            elif last == f"{get_note_by_interval(root, 3)}maj7":
                suggestions[f"{deg[1]}m7"] = "Neo-Soul slide down (→ ii7)"
                suggestions[f"{get_note_by_interval(root, 8)}maj7"] = "Cycle of 4ths (→ bVImaj7)"
                suggestions[f"{deg[0]}maj7"] = "Chromatic Mediant (→ Imaj7)"

            # 2. Landing on bVImaj7 (e.g., Abmaj7 in C)
            elif last == f"{get_note_by_interval(root, 8)}maj7":
                suggestions[f"{get_note_by_interval(root, 10)}7"] = "The 'Mario' Cadence (→ bVII7)"
                suggestions[f"{deg[4]}7"] = "Half-step down to Dominant (→ V7)"
                suggestions[f"{deg[0]}maj7"] = "Plagal chromatic resolve (→ Imaj7)"

            # 3. Landing on bVII7 (e.g., Bb7 in C)
            elif last == f"{get_note_by_interval(root, 10)}7":
                suggestions[f"{deg[0]}maj7"] = "Backdoor Resolution home (→ Imaj7)"
                suggestions[f"{deg[2]}m7"] = "Deceptive lift (→ iii7)"

        else:
            palette.extend([
                {"name": f"{deg[0]}m7", "roman": "im7", "group": "Diatonic 7ths"},
                {"name": f"{deg[1]}m7b5", "roman": "iiø7", "group": "Diatonic 7ths"},
                {"name": f"{deg[2]}maj7", "roman": "bIIImaj7", "group": "Diatonic 7ths"},
                {"name": f"{deg[3]}m7", "roman": "ivm7", "group": "Diatonic 7ths"},
                {"name": get_note_by_interval(root, 7), "roman": "V7", "group": "Diatonic 7ths"},
                {"name": f"{deg[5]}maj7", "roman": "bVImaj7", "group": "Diatonic 7ths"},
                {"name": f"{deg[6]}7", "roman": "bVII7", "group": "Diatonic 7ths"},
            ])
            palette.extend([
                {"name": f"{get_note_by_interval(root, 1)}maj7", "roman": "bIImaj7", "group": "Tritone Substitutions"},
                {"name": f"{get_note_by_interval(root, 1)}7", "roman": "subV7/i", "group": "Tritone Substitutions"}
            ])
            
            v_chord = get_note_by_interval(root, 7)
            if last == f"{deg[0]}m7" or last == f"{root}m":
                suggestions[f"{deg[1]}m7b5"] = "Move to iiø7"
                suggestions[f"{deg[3]}m7"] = "Move to ivm7"
            elif last == f"{deg[1]}m7b5":
                suggestions[v_chord] = "Minor ii-V connection"
                suggestions[f"{get_note_by_interval(root, 1)}7"] = "Tritone Sub of V"
            elif last == v_chord:
                suggestions[f"{deg[0]}m7"] = "Resolution to i"
                suggestions[f"{deg[5]}maj7"] = "Deceptive Resolution (bVI)"
            elif last == f"{get_note_by_interval(root, 1)}7":
                suggestions[f"{deg[0]}m7"] = "Chromatic Resolution (→ i)"

    return {
        "suggestions": suggestions,
        "full_palette": palette
    }