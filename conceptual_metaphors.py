# conceptual_metaphors.py

# ==================== LAKOFF & TURNER / COGNITIVE LINGUISTICS DICTIONARY ====================
# A vast mapping of Abstract Targets to Concrete Sources based on Conceptual Metaphor Theory.

CONCEPTUAL_MAPPINGS = {
    
    # --- 1. EXISTENTIAL & TEMPORAL ---
    "life": {
        "sources": ["journey", "day", "play", "story", "battle", "plant", "dream", "fire", "fluid", "burden", "game", "book", "tapestry", "season", "wheel"],
        "mappings": {
            "journey": {"traveler": "you", "destination": "goals/death", "path": "choices", "crossroads": "decisions", "baggage": "past trauma"}, 
            "day": {"dawn": "birth", "noon": "prime", "twilight": "old age", "night": "death"},
            "play": {"actor": "person", "stage": "world", "script": "destiny", "curtain": "death"}
        }
    },
    "death": {
        "sources": ["departure", "night", "harvest", "destination", "sleep", "winter", "reaper", "adversary", "silence", "door", "abyss", "thief"],
        "mappings": {"departure": {"leaving": "dying", "crossing over": "passing away"}, "night": {"sunset": "moment of death", "darkness": "the unknown"}}
    },
    "time": {
        "sources": ["money", "thief", "river", "arrow", "dressmaker", "healer", "devourer", "ocean", "landscape", "judge", "currency", "train"],
        "mappings": {"money": {"spend": "use", "waste": "squander", "invest": "use wisely"}, "river": {"flow": "passes irreversibly", "current": "unstoppable momentum"}}
    },
    "purpose": {
        "sources": ["destination", "target", "holy grail", "compass", "north star", "anchor"],
        "mappings": {"destination": {"moving forward": "making progress", "getting lost": "losing focus"}}
    },
    "change": {
        "sources": ["motion", "fluid", "weather", "alchemy", "chameleon", "tide", "season"],
        "mappings": {"motion": {"moving forward": "progressing", "going backward": "regressing"}}
    },

    # --- 2. EMOTIONS & FEELINGS ---
    "love": {
        "sources": ["journey", "war", "fire", "madness", "physical force", "disease", "magic", "gravity", "ocean", "garden", "shelter", "drug", "knot", "canvas"],
        "mappings": {"journey": {"dead end": "breakup", "bumpy road": "relationship issues"}, "fire": {"ignite": "passion", "smolder": "hidden desire", "ashes": "dead romance"}}
    },
    "anger": {
        "sources": ["heat", "fire", "explosive", "dangerous animal", "storm", "burden", "poison", "volcano", "blindness", "acid", "pressure cooker"],
        "mappings": {"pressure cooker": {"blowing off steam": "venting", "boiling over": "losing control"}, "dangerous animal": {"unleashing": "lashing out", "taming": "calming down"}}
    },
    "sadness": {
        "sources": ["weight", "darkness", "cold", "descent", "drowning", "winter", "illness", "veil", "desert", "cloud", "pit"],
        "mappings": {"weight": {"heavy heart": "sorrow", "crushed": "devastated"}, "descent": {"feeling down": "depressed", "hitting bottom": "deepest despair"}}
    },
    "happiness": {
        "sources": ["light", "warmth", "ascent", "fluid in a container", "vitality", "flight", "music", "spring", "intoxication"],
        "mappings": {"ascent": {"feeling high": "joyful", "floating": "euphoric"}, "light": {"radiant": "happy", "glowing": "content"}}
    },
    "fear": {
        "sources": ["darkroom", "monster", "shadow", "cold", "prison", "weight", "storm", "paralysis", "predator", "abyss", "ghost", "disease"],
        "mappings": {"cold": {"chilling": "terrifying", "frozen": "unable to move"}, "prison": {"trapped": "panicking", "paralyzed": "helpless"}}
    },
    "grief": {
        "sources": ["ocean", "wave", "stone", "shadow", "wound", "ghost", "fog", "thief", "winter", "echo"],
        "mappings": {"ocean": {"drowning": "overwhelmed", "waves": "bouts of crying"}, "wound": {"healing": "recovering", "scar": "lasting memory"}}
    },
    "desire": {
        "sources": ["hunger", "thirst", "heat", "magnetism", "itch", "fire", "animal", "void"],
        "mappings": {"hunger": {"starving": "craving", "appetite": "lust", "devour": "consume sexually"}}
    },
    "shame": {
        "sources": ["stain", "nakedness", "weight", "smallness", "disease", "scarlet letter", "shadow"],
        "mappings": {"smallness": {"shrinking": "embarrassed", "feeling tiny": "humiliated"}, "stain": {"blemish": "ruined reputation"}}
    },
    "pride": {
        "sources": ["height", "swelling", "armor", "crown", "monument", "sun", "lion"],
        "mappings": {"height": {"standing tall": "proud", "looking down": "arrogant"}, "swelling": {"puffed up": "conceited", "bursting": "overly proud"}}
    },

    # --- 3. THE MIND & INTELLECT ---
    "mind": {
        "sources": ["machine", "container", "brittle object", "garden", "mirror", "computer", "sky", "labyrinth", "muscle", "sponge", "engine"],
        "mappings": {"container": {"open-minded": "receptive", "empty-headed": "foolish", "stuffed": "overwhelmed"}, "garden": {"planting seeds": "teaching", "weeds": "bad thoughts"}}
    },
    "ideas": {
        "sources": ["food", "plant", "product", "commodity", "light", "cutting instrument", "building block", "clothing", "currency", "virus", "spark"],
        "mappings": {"food": {"digesting": "understanding", "half-baked": "poorly thought out", "swallowing": "accepting"}, "light": {"bright": "intelligent", "dim": "slow"}}
    },
    "understanding": {
        "sources": ["seeing", "grasping", "digesting", "illuminating", "unlocking", "connecting", "mapping"],
        "mappings": {"seeing": {"clear": "understood", "murky": "confused", "blind": "ignorant"}, "grasping": {"catching on": "learning", "slipping away": "forgetting"}}
    },
    "memory": {
        "sources": ["storehouse", "museum", "ghost", "echo", "photograph", "scar", "anchor", "fabric", "shadow", "treasure", "vault", "hard drive"],
        "mappings": {"storehouse": {"searching": "trying to recall", "dusty": "forgotten", "locked": "repressed"}}
    },
    "imagination": {
        "sources": ["flight", "canvas", "theater", "magic", "wildfire", "ocean", "horizon"],
        "mappings": {"flight": {"soaring": "creative", "grounded": "uninspired"}}
    },

    # --- 4. COMMUNICATION & LANGUAGE ---
    "communication": {
        "sources": ["sending", "conduit", "bridge", "dance", "combat", "music", "transaction"],
        "mappings": {"conduit": {"packing": "putting thoughts into words", "unpacking": "extracting meaning"}}
    },
    "words": {
        "sources": ["containers", "weapons", "threads", "bridges", "keys", "seeds", "coins", "spells", "stones", "daggers"],
        "mappings": {"weapons": {"sharp": "insulting", "cutting": "hurtful", "target": "listener"}}
    },
    "argument": {
        "sources": ["war", "building", "journey", "dance", "game", "wrestling match", "chess"],
        "mappings": {"war": {"defend": "support a claim", "attack": "critique", "shoot down": "disprove", "win": "convince"}}
    },
    "stories": {
        "sources": ["journeys", "fabrics", "tapestries", "webs", "labyrinths", "mirrors"],
        "mappings": {"fabrics": {"weaving": "telling", "thread": "plotline", "unraveling": "falling apart"}}
    },

    # --- 5. SOCIAL, MORAL, & POLITICAL ---
    "morality": {
        "sources": ["accounting", "straightness", "cleanliness", "light", "balance", "weight", "path"],
        "mappings": {"accounting": {"debt": "guilt", "payback": "restitution"}, "cleanliness": {"pure": "good", "dirty": "immoral", "stain": "sin"}}
    },
    "society": {
        "sources": ["family", "person", "building", "machine", "fabric", "organism", "ship", "hive"],
        "mappings": {"fabric": {"woven together": "united", "tearing apart": "divided", "fraying": "decaying"}}
    },
    "relationships": {
        "sources": ["journey", "physical bond", "investment", "living organism", "machine", "contract", "shelter", "dance"],
        "mappings": {"physical bond": {"attached": "close", "drifting": "growing apart", "tied down": "committed/trapped"}}
    },
    "power": {
        "sources": ["up", "physical force", "possession", "size", "electricity", "weapon", "gravity"],
        "mappings": {"up": {"high status": "powerful", "underling": "powerless"}, "physical force": {"crushing": "oppressive", "pushing around": "bullying"}}
    },
    "justice": {
        "sources": ["scales", "blindfold", "sword", "light", "straight line", "harvest", "accounting"],
        "mappings": {"scales": {"weighing": "judging", "tipping": "bias", "balanced": "fair"}}
    },
    "economy": {
        "sources": ["organism", "machine", "weather", "fluid", "race", "engine"],
        "mappings": {"fluid": {"liquid assets": "cash", "frozen": "unavailable", "trickling down": "distributing", "drying up": "running out"}}
    },
    "nation": {
        "sources": ["family", "person", "ship", "house", "body"],
        "mappings": {"family": {"founding fathers": "creators", "motherland": "origin", "brotherhood": "unity"}}
    },

    # --- 6. ABSTRACT STATES & ACTIONS ---
    "action": {
        "sources": ["motion", "building", "weaving", "fighting", "cultivating"],
        "mappings": {"motion": {"moving": "doing", "stopped": "idle", "speeding": "rushing"}}
    },
    "difficulty": {
        "sources": ["burden", "impediment", "obstacle", "maze", "knot", "wall", "storm", "mountain", "mud"],
        "mappings": {"obstacle": {"hurdle": "problem", "roadblock": "stoppage", "climbing": "overcoming"}}
    },
    "success": {
        "sources": ["up", "destination", "wealth", "harvest", "light", "crown", "peak"],
        "mappings": {"up": {"rising": "succeeding", "at the top": "successful"}}
    },
    "failure": {
        "sources": ["down", "falling", "shipwreck", "dead end", "bankruptcy", "darkness", "ruin"],
        "mappings": {"falling": {"crashing": "failing badly", "ruined": "destroyed"}}
    },
    "truth": {
        "sources": ["light", "alignment", "solid object", "unhidden thing", "mirror", "sword", "compass", "nakedness", "water"],
        "mappings": {"light": {"illuminating": "revealing", "brilliant": "obvious", "shadow": "doubt"}}
    },
    "lies": {
        "sources": ["darkness", "cover", "twisting", "crookedness", "fabrication", "maze", "mask", "poison", "web", "smoke"],
        "mappings": {"crookedness": {"bent": "dishonest", "twisted": "distorted", "straight": "honest"}, "web": {"tangled": "complicated lie", "trapped": "caught in a lie"}}
    },
    "opportunity": {
        "sources": ["door", "window", "path", "gift", "seed", "train", "tide"],
        "mappings": {"door": {"opening": "available", "closing": "lost", "knocking": "arriving"}}
    }
}