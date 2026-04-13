from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from conceptual_metaphors import CONCEPTUAL_MAPPINGS
import aiohttp
import asyncio
import math
from theory_engine import generate_chords

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChordRequest(BaseModel):
    last_chord: str
    key: str
    jazz_mode: bool = False

async def fetch_datamuse(params: dict):
    async with aiohttp.ClientSession() as session:
        async with session.get("https://api.datamuse.com/words", params=params) as response:
            try:
                return await response.json()
            except Exception:
                return []

# ==================== GRAMMAR & LINGUISTICS ENGINES ====================

def get_article(word: str) -> str:
    if not word:
        return "a"
    return "an" if word[0].lower() in "aeiou" else "a"

def get_verb(word: str) -> str:
    word = word.lower().strip()
    irregular_plurals = {"people", "children", "men", "women", "teeth", "feet", "mice", "leaves", "lives"}
    if word in irregular_plurals:
        return "are"
    singular_endings = ("ss", "ics", "news", "us", "is")
    if word.endswith(singular_endings):
        return "is"
    if word.endswith('s'):
        return "are"
    return "is"

def get_stress_pattern(tags: list) -> str:
    """Extract stress pattern from Datamuse pronunciation tags"""
    for tag in tags:
        if tag.startswith("pron:"):
            pron = tag[5:]
            pattern = ""
            for char in pron:
                if char == '0':
                    pattern += "◦"
                elif char in ('1', '2'):
                    pattern += "•"
            return pattern
    return ""

# --- FILTERS ---
UNPOETIC_ADJS = {
    "short", "long", "good", "bad", "big", "small", "high", "low", "great", "real", "past",
    "present", "future", "term", "first", "last", "same", "different", "own", "old", "new",
    "early", "late", "much", "many", "certain", "various", "recent", "general", "medical",
    "main", "primary", "secondary", "major", "minor", "important", "simple", "complex",
    "single", "multiple", "human", "personal", "public", "private", "physical", "mental",
    "true", "false", "clear", "whole", "entire", "full", "empty", "total", "actual",
    "specific", "common", "active"
}

BORING_CONCEPTS = {
    "concept", "idea", "feeling", "emotion", "state", "event", "thing", "person", "quality",
    "action", "activity", "condition", "situation", "process", "experience", "thought",
    "belief", "fact", "issue", "problem", "way", "manner", "method", "sense", "loss",
    "gain", "system", "level", "reason", "period"
}

# --- SMART METAPHOR ARTICLE ---
def get_metaphor_article(noun: str) -> str:
    if not noun:
        return ""
    
    noun_lower = noun.lower().strip()
    
    no_article = {
        "fire", "flame", "heat", "cold", "darkness", "light", "shadow", "echo", "void", "chaos",
        "madness", "gravity", "poison", "pressure", "storm", "wind", "rain", "fog", "mist",
        "ocean", "river", "tide", "wave", "fluid", "blood", "breath", "soul", "spirit", "energy",
        "power", "music", "silence", "peace", "war", "time", "death", "night", "winter", "life",
        "love", "anger", "fear", "joy", "grief", "desire", "shame", "pride", "ice", "snow",
        "air", "water", "earth", "sky", "horizon", "dawn", "twilight", "sunset", "ashes", "smoke",
        "steam", "vapor", "dust", "sand", "mud", "thunder", "lightning", "melody", "harmony",
        "rhythm", "song", "dance", "flight", "ascent", "descent", "motion", "change", "flow",
        "wildfire", "inferno", "blaze", "ember", "spark", "glow", "radiance", "warmth", "chill",
        "dark", "silence", "noise", "whisper", "howl", "constellation", "starlight", "magnetism",
        "electricity", "current", "undertow", "flood", "drowning", "sinking", "rising", "falling",
        "burning", "smoldering", "flicker", "pressure cooker", "tangled vine", "labyrinth", "canvas",
        "tapestry", "mosaic", "wheel", "season", "dream", "plant", "battle", "game", "book",
        "story", "play", "journey", "day", "night", "harvest", "sleep", "abyss", "door", "thief",
        "reaper", "destination", "compass", "north star", "anchor", "chameleon", "alchemy",
        "phoenix", "caterpillar", "forge", "kaleidoscope", "garden", "shelter", "drug", "knot",
        "vine", "feast", "addiction", "balm", "weight", "descent", "illness", "veil", "desert",
        "cloud", "pit", "vitality", "intoxication", "monster", "predator", "ghost", "disease",
        "web", "cliff", "tightrope", "stone", "wound", "fog", "hunger", "thirst", "itch", "animal",
        "stain", "nakedness", "smallness", "scarlet letter", "height", "swelling", "armor", "crown",
        "monument", "sun", "lion", "machine", "container", "mirror", "computer", "sky", "muscle",
        "sponge", "engine", "food", "light", "building block", "virus", "spark", "storehouse",
        "museum", "photograph", "scar", "anchor", "fabric", "treasure", "vault", "theater", "magic",
        "conduit", "bridge", "combat", "transaction", "weapons", "threads", "keys", "seeds", "coins",
        "spells", "stones", "daggers", "war", "building", "wrestling match", "chess", "fabrics",
        "tapestries", "webs", "labyrinths", "mirrors", "accounting", "straightness", "cleanliness",
        "balance", "path", "fabric", "organism", "ship", "hive", "physical bond", "investment",
        "contract", "up", "possession", "size", "electricity", "weapon", "scales", "blindfold",
        "sword", "harvest", "race", "family", "person", "house", "body", "tree", "fortress",
        "orchestra", "motion", "weaving", "fighting", "cultivating", "burden", "impediment",
        "obstacle", "maze", "knot", "wall", "mountain", "mud", "destination", "wealth", "peak",
        "summit", "trophy", "down", "falling", "shipwreck", "ruin", "crash", "alignment",
        "solid object", "unhidden thing", "nakedness", "water", "darkness", "cover", "twisting",
        "crookedness", "fabrication", "mask", "web", "smoke", "door", "window", "path", "gift",
        "seed", "train", "tide"
    }
    
    if noun_lower in no_article:
        return ""
    
    if noun_lower.endswith('s') and not noun_lower.endswith(('ss', 'us', 'is', 'cs', 'ys')):
        return ""
    
    return get_article(noun) + " "


# ==================== MAIN METAPHOR ENDPOINT ====================
@app.get("/api/phrases")
async def get_phrases(query: str = "", phrase_type: str = "Idioms"):
    if not query:
        return {"phrases": []}
    
    formatted_phrases = []
    query_lower = query.lower().strip()

    if phrase_type == "Idioms":
        data = await fetch_datamuse({"sp": "* *", "md": "d", "ml": query, "max": 40})
        for item in data:
            word = item.get("word", "").capitalize()
            defs = item.get("defs", [])
            meaning = defs[0].split("\t")[-1] if defs else f"An idiom associated with '{query}'."
            formatted_phrases.append({"text": word, "meaning": meaning})
        return {"phrases": formatted_phrases}

    elif phrase_type == "Metaphors":
        seen = set()
        tasks = [
            fetch_datamuse({"rel_trg": query, "md": "dp", "max": 25}), 
            fetch_datamuse({"rel_jjb": query, "md": "p", "max": 15}),  
            fetch_datamuse({"rel_gen": query, "max": 10})              
        ]
        
        sources = []
        if query_lower in CONCEPTUAL_MAPPINGS:
            sources = CONCEPTUAL_MAPPINGS[query_lower]["sources"]
            for source in sources:
                tasks.append(fetch_datamuse({"rel_trg": source, "md": "dp", "max": 8}))

        results = await asyncio.gather(*tasks)
        hypernyms = {item.get("word", "").lower() for item in results[2]}
        hypernyms.update(BORING_CONCEPTS)
        verb = get_verb(query_lower)

        # 1. Basic Conceptual Metaphors (from your dictionary)
        if query_lower in CONCEPTUAL_MAPPINGS:
            source_extension_results = results[3:] 
            for i, source in enumerate(sources):
                article = get_metaphor_article(source)
                phrase = f"{query.capitalize()} {verb} {article}{source}"
                
                if phrase.lower() not in seen:
                    seen.add(phrase.lower())
                    formatted_phrases.append({
                        "text": phrase,
                        "meaning": f"🧠 BASIC CONCEPTUAL METAPHOR | Understanding the abstract target ({query}) through the concrete structure of a {source}."
                    })
                
                dataset = source_extension_results[i]
                for item in dataset:
                    word = item.get("word", "")
                    tags = item.get("tags", [])
                    if "n" in tags and " " not in word and word.lower() not in hypernyms and word.lower() != query_lower:
                        extension = f"The {word} of {query}"
                        if extension.lower() not in seen:
                            seen.add(extension.lower())
                            formatted_phrases.append({
                                "text": extension.capitalize(),
                                "meaning": f"🌿 POETIC EXTENSION | Extending the '{source}' mapping further down to its structural component ('{word}')."
                            })

        # 2. IMPROVED ONTOLOGICAL METAPHORS (moved outside the if block)
        for item in results[0]:
            word = item.get("word", "").strip()
            score = item.get("score", 0)
            tags = item.get("tags", [])

            if not word or " " in word:
                continue
            if word.lower() in hypernyms or word.lower() == query_lower:
                continue
            if "n" not in tags:
                continue
            if score < 200:
                continue

            generic_words = {"thing", "person", "way", "kind", "type", "form", "part", "side", "place", "time", 
                           "state", "level", "point", "case", "fact", "idea", "concept", "feeling", "emotion"}
            if word.lower() in generic_words or word.lower() in BORING_CONCEPTS:
                continue

            article = get_metaphor_article(word)
            bold_metaphor = f"{query.capitalize()} {verb} {article}{word}"

            if bold_metaphor.lower() not in seen:
                seen.add(bold_metaphor.lower())
                
                meaning = f"🔗 ONTOLOGICAL MAPPING | Treating the abstract concept of '{query}' as a concrete physical entity or substance: a '{word}'."
                
                formatted_phrases.append({
                    "text": bold_metaphor,
                    "meaning": meaning
                })

        # 3. Poetic Elaborations
        valid_adjectives = [
            item["word"].lower() 
            for item in results[1] 
            if "adj" in item.get("tags", ["adj"]) 
            and " " not in item["word"] 
            and item["word"].lower() not in UNPOETIC_ADJS
        ]
        
        bridge_tasks = [fetch_datamuse({"rel_jja": adj, "md": "dp", "max": 5}) for adj in valid_adjectives[:8]]
        bridge_results = await asyncio.gather(*bridge_tasks) if bridge_tasks else []

        for i, noun_dataset in enumerate(bridge_results):
            anchor_adj = valid_adjectives[i]
            for item in noun_dataset:
                word = item.get("word", "")
                tags = item.get("tags", [])
                if "n" in tags and " " not in word and word.lower() not in hypernyms and word.lower() != query_lower:
                    article = get_metaphor_article(word)
                    bridge_metaphor = f"{query.capitalize()} {verb} {article}{anchor_adj} {word}"
                    if bridge_metaphor.lower() not in seen:
                        seen.add(bridge_metaphor.lower())
                        formatted_phrases.append({
                            "text": bridge_metaphor,
                            "meaning": f"✨ POETIC ELABORATION | Filling in the source domain ('{word}') with highly specific, evocative traits ('{anchor_adj}')."
                        })

        return {"phrases": formatted_phrases}

    elif phrase_type == "Similes":
        # (Your simile section with the fix for "As sweet as honey")
        seen = set()
        tasks = [
            fetch_datamuse({"rel_trg": query, "md": "dp", "max": 25}), 
            fetch_datamuse({"rel_jjb": query, "md": "p", "max": 15})
        ]
        sources = CONCEPTUAL_MAPPINGS.get(query_lower, {}).get("sources", [])
        results = await asyncio.gather(*tasks)
        verb = get_verb(query_lower)

        if sources:
            for source in sources:
                phrase = f"{query.capitalize()} {verb} like a {source}"
                if phrase.lower() not in seen:
                    seen.add(phrase.lower())
                    formatted_phrases.append({
                        "text": phrase,
                        "meaning": f"🧠 CONCEPTUAL SIMILE | Explicitly comparing '{query}' to the structure of a {source}."
                    })
        
        for item in results[0]:
            word = item.get("word", "")
            tags = item.get("tags", [])
            if "n" in tags and " " not in word and word.lower() != query_lower:
                article = get_article(word)
                phrase = f"{query.capitalize()} {verb} like {article}{word}"
                if phrase.lower() not in seen:
                    seen.add(phrase.lower())
                    formatted_phrases.append({
                        "text": phrase,
                        "meaning": f"🔗 ASSOCIATIVE SIMILE | Likening the abstract concept of '{query}' to the physical presence of '{word}'."
                    })

        valid_adjectives = [
            item["word"].lower() 
            for item in results[1] 
            if "adj" in item.get("tags", ["adj"]) 
            and " " not in item["word"] 
            and item["word"].lower() not in UNPOETIC_ADJS
        ]

        for adj in valid_adjectives[:12]:
            phrase = f"As {query} as {adj}"
            if phrase.lower() not in seen:
                seen.add(phrase.lower())
                formatted_phrases.append({
                    "text": phrase.capitalize(),
                    "meaning": f"✨ DESCRIPTIVE SIMILE | Standard English simile comparing '{query}' to '{adj}'."
                })

        return {"phrases": formatted_phrases}

    return {"phrases": formatted_phrases}

# ==================== ADVANCED RHYTHMIC RHYME ENGINE ====================
@app.get("/api/words")
async def get_words(word: str, query_type: str, sub_type: str = "Perfect", syllables: int = None, topic: str = None):
    word_lower = word.lower().strip()
    
    if query_type == "Rhymes":
        target_info = await fetch_datamuse({"sp": word_lower, "md": "srf", "max": 1})
        target_syl = target_info[0].get("numSyllables", 1) if target_info else 1

        def build_params(rel_key, rel_val, max_res):
            p = {rel_key: rel_val, "md": "srf", "max": max_res}
            if topic:
                p["topics"] = topic 
            return p

        tasks = []
        if sub_type == "Perfect":
            tasks.append(fetch_datamuse(build_params("rel_rhy", word_lower, 150)))
        elif sub_type == "Near":
            tasks.append(fetch_datamuse(build_params("rel_nry", word_lower, 150)))
        elif sub_type == "Slant":
            tasks.append(fetch_datamuse(build_params("rel_nry", word_lower, 100))) 
            tasks.append(fetch_datamuse(build_params("rel_cns", word_lower, 100))) 
        elif sub_type == "Consonant":
            tasks.append(fetch_datamuse(build_params("rel_cns", word_lower, 150)))
        results = await asyncio.gather(*tasks)
        
        raw_words = {}
        for dataset in results:
            for item in dataset:
                w = item.get("word", "").lower()
                
                if w == word_lower or len(w) <= 1: continue
                if w == word_lower + "s" or w + "s" == word_lower: continue
                if w == word_lower + "d" or w == word_lower + "ed" or w + "d" == word_lower: continue
                
                freq = 1.0
                tags = item.get("tags", [])
                for tag in tags:
                    if tag.startswith("f:"):
                        try: freq = float(tag.split(":")[1])
                        except ValueError: pass
                        
                if freq < 0.1: continue
                
                item_syl = item.get("numSyllables", 1)
                if syllables and syllables > 0 and item_syl != syllables:
                    continue
                    
                if w not in raw_words:
                    dm_score = item.get("score", 0)
                    rhythm_modifier = 1.0
                    if not syllables or syllables == 0:
                        syl_diff = abs(item_syl - target_syl)
                        if syl_diff == 1: rhythm_modifier = 0.85   
                        elif syl_diff >= 2: rhythm_modifier = 0.65 
                    
                    poetic_score = dm_score * math.log10(freq + 5) * rhythm_modifier
                    
                    stress = get_stress_pattern(tags) if 'get_stress_pattern' in globals() else ""
                    
                    raw_words[w] = {"word": w.capitalize(), "score": poetic_score, "stress": stress}
                    
        sorted_words = sorted(raw_words.values(), key=lambda x: x["score"], reverse=True)
        return {"words": sorted_words[:60]}

    elif query_type == "Imagery":
        categories = {
            "Sight": await fetch_datamuse({"rel_jja": word, "md": "sr", "max": 15}),
            "Sound": await fetch_datamuse({"ml": f"{word} sound", "md": "sr", "max": 15}),
            "Touch": await fetch_datamuse({"ml": f"{word} texture", "md": "sr", "max": 15}),
            "Smell": await fetch_datamuse({"ml": f"{word} smell", "md": "sr", "max": 10}),
            "Taste": await fetch_datamuse({"ml": f"{word} taste", "md": "sr", "max": 10})
        }
        for cat in categories:
            for item in categories[cat]:
                item["word"] = item["word"].capitalize()
                item["stress"] = get_stress_pattern(item.get("tags", [])) if 'get_stress_pattern' in globals() else ""
        return {"categories": categories}

    else:
        m_map = {"Concept": "ml", "Family": "rel_trg", "Adjectives": "rel_jja"}
        param = m_map.get(query_type, "ml")
        data = await fetch_datamuse({param: word, "md": "sr", "max": 80})
        
        if syllables and syllables > 0:
            data = [item for item in data if item.get('numSyllables') == syllables]
            
        return {"words": [{"word": i['word'].capitalize(), "score": i.get('score', 0), "stress": get_stress_pattern(i.get("tags", [])) if 'get_stress_pattern' in globals() else ""} for i in data[:60]]}

# ==================== ADVANCED PROCEDURAL CHORD ENGINE ====================

@app.post("/api/chords")
async def get_chords(req: ChordRequest):
    return generate_chords(req.key, req.last_chord, req.jazz_mode)

