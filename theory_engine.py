import re

# ==========================================
# 1. THE FACTORY FUNCTIONS
# ==========================================

def build_major_key(I, ii, iii, IV, V, V7, vi, vii_dim, V_of_V, V_of_vi, V_of_IV, V_of_ii, borrowed_iv, borrowed_bVII):
    return {
        I: [(V7, "Dominant Prep"), (IV, "Plagal Movement"), (vi, "Relative Departure"), (V_of_vi, f"Secondary Dom to {vi}"), (V_of_IV, f"Secondary Dom to {IV}")],
        ii: [(V7, "ii-V7 progression"), (V, "ii-V progression"), (vii_dim, "Leading-tone push"), (IV, "Pre-dominant expansion")],
        iii: [(vi, "Circle of 5ths down"), (IV, "Stepwise rise"), (I, "Tonic substitution")],
        IV: [(V7, "Authentic Prep"), (I, "Plagal Cadence (Amen)"), (borrowed_iv, "Minor Plagal (iv-I)"), (vii_dim, "Leading-tone to I")],
        V: [(I, "Authentic Resolution"), (V7, "Add 7th for Tension"), (vi, "Deceptive Cadence"), (V_of_V, "Secondary Dom to V")],
        V7: [(I, "Full Authentic Resolution"), (vi, "Deceptive Cadence"), (I, "Strongest Pull Home")],
        vi: [(IV, "Modern/Epic"), (ii, "Predominant"), (V7, "Back to Dominant"), (V_of_vi, "Tense approach to vi")],
        vii_dim: [(I, "Leading-Tone Resolution"), (iii, "Deceptive drop")],
        borrowed_bVII: [(IV, "Mixolydian Rock"), (I, "Back-door Resolution")],
        borrowed_iv: [(I, "Minor Plagal (Emotional)")],
        V_of_IV: [(IV, "Applied Dominant to IV")],
        V_of_ii: [(ii, "Applied Dominant to ii")],
        V_of_V: [(V, "Applied Dominant to V")],
        V_of_vi: [(vi, "Applied Dominant to vi")]
    }

# FIXED: Added V7 to the parameters (13 total)
def build_minor_key(i, ii_dim, III, iv, v_min, V7, VI, VII, vii_dim, V_harm, V_of_iv, V_of_VI, V_of_VII):
    return {
        i: [(VI, "Modern Epic"), (iv, "Subdominant minor"), (VII, "Natural Minor path"), (V7, "Strong Harmonic Pull")],
        ii_dim: [(V7, "ii°-V7-i (Jazz standard)"), (V_harm, "Classical ii°-V-i")],
        III: [(VI, "Relative major move"), (VII, "Stepwise rise"), (iv, "Subdominant flow")],
        iv: [(i, "Plagal Minor"), (V7, "Predominant to Dom"), (ii_dim, "Dark predominant")],
        v_min: [(i, "Natural Resolution"), (VI, "Aeolian flow")],
        V7: [(i, "Strongest Minor Resolution"), (VI, "Deceptive (Dark)")],
        VI: [(VII, "Epic rise"), (iv, "Dark drop"), (V7, "Back to Dominant")],
        VII: [(III, "Relative Major key"), (i, "Natural resolution")],
        V_harm: [(i, "Harmonic Resolution")],
        vii_dim: [(i, "Harmonic Leading-tone pull")],
        V_of_iv: [(iv, "Applied Dominant to iv")],
        V_of_VI: [(VI, "Applied Dominant to VI")],
        V_of_VII: [(VII, "Applied Dominant to VII")]
    }

# ==========================================
# 2. THE DATA INJECTION
# ==========================================

THEORY_MAP = {
    # MAJOR KEYS: (I, ii, iii, IV, V, V7, vi, vii°, V/V, V/vi, V/IV, V/ii, iv, bVII)
    "C":  build_major_key("C", "Dm", "Em", "F", "G", "G7", "Am", "Bdim", "D7", "E7", "C7", "A7", "Fm", "Bb"),
    "Db": build_major_key("Db", "Ebm", "Fm", "Gb", "Ab", "Ab7", "Bbm", "Cdim", "Eb7", "F7", "Db7", "Bb7", "Gbm", "Cb"),
    "D":  build_major_key("D", "Em", "F#m", "G", "A", "A7", "Bm", "C#dim", "E7", "F#7", "D7", "B7", "Gm", "C"),
    "Eb": build_major_key("Eb", "Fm", "Gm", "Ab", "Bb", "Bb7", "Cm", "Ddim", "F7", "G7", "Eb7", "C7", "Abm", "Db"),
    "E":  build_major_key("E", "F#m", "G#m", "A", "B", "B7", "C#m", "D#dim", "F#7", "G#7", "E7", "C#7", "Am", "D"),
    "F":  build_major_key("F", "Gm", "Am", "Bb", "C", "C7", "Dm", "Edim", "G7", "A7", "F7", "D7", "Bbm", "Eb"),
    "F#": build_major_key("F#", "G#m", "A#m", "B", "C#", "C#7", "D#m", "E#dim", "G#7", "A#7", "F#7", "D#7", "Bm", "E"),
    "G":  build_major_key("G", "Am", "Bm", "C", "D", "D7", "Em", "F#dim", "A7", "B7", "G7", "E7", "Cm", "F"),
    "Ab": build_major_key("Ab", "Bbm", "Cm", "Db", "Eb", "Eb7", "Fm", "Gdim", "Bb7", "C7", "Ab7", "F7", "Dbm", "Gb"),
    "A":  build_major_key("A", "Bm", "C#m", "D", "E", "E7", "F#m", "G#dim", "B7", "C#7", "A7", "F#7", "Dm", "G"),
    "Bb": build_major_key("Bb", "Cm", "Dm", "Eb", "F", "F7", "Gm", "Adim", "C7", "D7", "Bb7", "G7", "Ebm", "Ab"),
    "B":  build_major_key("B", "C#m", "D#m", "E", "F#", "F#7", "G#m", "A#dim", "C#7", "D#7", "B7", "G#7", "Em", "A"),

    # MINOR KEYS: (i, ii°, III, iv, v_min, V7, VI, VII, vii°, V_harm, V/iv, V/VI, V/VII)
    "Cm":  build_minor_key("Cm", "Ddim", "Eb", "Fm", "Gm", "G7", "Ab", "Bb", "Bdim", "G7", "C7", "Eb7", "F7"),
    "C#m": build_minor_key("C#m", "D#dim", "E", "F#m", "G#m", "G#7", "A", "B", "B#dim", "G#7", "C#7", "E7", "F#7"),
    "Dm":  build_minor_key("Dm", "Edim", "F", "Gm", "Am", "A7", "Bb", "C", "C#dim", "A7", "D7", "F7", "G7"),
    "Ebm": build_minor_key("Ebm", "Fdim", "Gb", "Abm", "Bbm", "Bb7", "Cb", "Db", "Ddim", "Bb7", "Eb7", "Gb7", "Ab7"),
    "Em":  build_minor_key("Em", "F#dim", "G", "Am", "Bm", "B7", "C", "D", "D#dim", "B7", "E7", "G7", "A7"),
    "Fm":  build_minor_key("Fm", "Gdim", "Ab", "Bbm", "Cm", "C7", "Db", "Eb", "Edim", "C7", "F7", "Ab7", "Bb7"),
    "F#m": build_minor_key("F#m", "G#dim", "A", "Bm", "C#m", "C#7", "D", "E", "E#dim", "C#7", "F#7", "A7", "B7"),
    "Gm":  build_minor_key("Gm", "Adim", "Bb", "Cm", "Dm", "D7", "Eb", "F", "F#dim", "D7", "G7", "Bb7", "C7"),
    "G#m": build_minor_key("G#m", "A#dim", "B", "C#m", "D#m", "D#7", "E", "F#", "Fxdim", "D#7", "G#7", "B7", "C#7"),
    "Am":  build_minor_key("Am", "Bdim", "C", "Dm", "Em", "E7", "F", "G", "G#dim", "E7", "A7", "C7", "D7"),
    "Bbm": build_minor_key("Bbm", "Cdim", "Db", "Ebm", "Fm", "F7", "Gb", "Ab", "Adim", "F7", "Bb7", "Db7", "Eb7"),
    "Bm":  build_minor_key("Bm", "C#dim", "D", "Em", "F#m", "F#7", "G", "A", "A#dim", "F#7", "B7", "D7", "E7"),
}
# Expanded templates in theory_engine.py
GENRE_TEMPLATES = {
    "Pop": [
        ["I", "V", "vi", "IV"],
        ["I", "V/ii", "ii", "V"], # Secondary Dominant (V of ii)
        ["I", "iv", "I", "V"],     # Borrowed iv from parallel minor
        ["vi", "IV", "I", "V"]
    ],
    "Jazz": [
        ["ii", "V7", "I"],
        ["I", "V/ii", "ii", "V/V", "V7", "I"], # Chain of Secondary Dominants
        ["ii", "bII7", "I"],                    # Tritone Substitution
        ["Imaj7", "vi7", "ii7", "V7"]
    ],
    "Rock": [
        ["I", "bVII", "IV", "I"], # Borrowed bVII
        ["I", "bIII", "bVI", "bVII"], # Pure Modal Interchange (Rock/Grunge)
        ["I", "V/vi", "vi", "IV"]
    ],
    "Blues": [
        ["I7", "IV7", "I7", "I7"],
        ["IV7", "IV7", "I7", "V/ii"],
        ["ii7", "V7", "I7", "V7"]
    ]
}

def get_progression(genre, key_name):
    import random
    from theory_engine import THEORY_MAP
    
    templates = GENRE_TEMPLATES.get(genre, GENRE_TEMPLATES["Pop"])
    template = random.choice(templates)
    key_chords = list(THEORY_MAP.get(key_name, THEORY_MAP["C"]).keys())
    
    # Updated mapping to include the extended slots in your THEORY_MAP
    # Inside your get_progression function
    if key_name.endswith('m'):
        # Minor Key: 0 through 12
        mapping = {
            "i":0, "ii°":1, "III":2, "iv":3, "v":4, "V7":5, "VI":6, "VII":7,
            "vii°":8, "V_harm":9, "V/iv":10, "V/VI":11, "V/VII":12
        }
    else:
        # Major Key: 0 through 15
        mapping = {
            "I":0, "ii":1, "iii":2, "IV":3, "V":4, "V7":5, "vi":6, "vii°":7,
            "V/V":8, "V/vi":9, "V/IV":10, "V/ii":11, "iv":12, "bVII":13, "bIII":14, "bVI":15
        }

    return [key_chords[mapping[num]] for num in template if num in mapping]

# ==========================================
# 3. THE EXECUTABLE LOGIC (The API)
# ==========================================

def get_smart_suggestions(last_chord, key="C"):
    current_key_map = THEORY_MAP.get(key, THEORY_MAP["C"])
    if last_chord in current_key_map:
        return current_key_map[last_chord]
    return [(key, "Return Home (I)"), (list(current_key_map.keys())[4], "Try Dominant (V)")]