"""
FORESEEN — Embedding pipeline using sentence-transformers/all-MiniLM-L6-v2
Embeds signal title+summary (stop words removed) and stores 384-dim vectors in MongoDB.
"""

import re
import os
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# ── Stop words ────────────────────────────────────────────────────────────────

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "shall", "should", "may", "might", "must", "can", "could", "not",
    "no", "nor", "so", "yet", "both", "either", "neither", "each",
    "few", "more", "most", "other", "some", "such", "than", "too",
    "very", "just", "as", "if", "then", "that", "this", "these", "those",
    "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
    "its", "they", "their", "what", "which", "who", "whom", "how",
    "when", "where", "why", "all", "any", "into", "through", "during",
    "before", "after", "above", "below", "between", "out", "up", "down",
    "about", "against", "over", "under", "again", "further", "once",
    "here", "there", "also", "only", "same", "while", "although",
    "s", "t", "re", "ve", "ll", "d", "m", "new", "said", "says",
}

# ── Model (lazy singleton) ────────────────────────────────────────────────────

_model = None

def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        print("Loading sentence-transformer model (all-MiniLM-L6-v2)...")
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _model

# ── Text preprocessing ────────────────────────────────────────────────────────

def preprocess(text: str) -> str:
    """Lowercase, strip punctuation, remove stop words."""
    tokens = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower()).split()
    return " ".join(t for t in tokens if t not in STOP_WORDS and len(t) > 1)

def embed_text(text: str) -> list[float]:
    """Return a 384-dim normalized embedding for a single text string."""
    cleaned = preprocess(text)
    return get_model().encode(cleaned, normalize_embeddings=True).tolist()

# ── Batch embed signals ───────────────────────────────────────────────────────

def embed_signals(batch_size: int = 128):
    """
    Embed all signals that don't yet have an embedding vector.
    Stores result in signal["embedding"] (384-dim list of floats).
    """
    db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
    signals = db["signals"]

    pending = list(signals.find(
        {"embedding": {"$exists": False}},
        {"_id": 1, "title": 1, "summary": 1}
    ))

    if not pending:
        print("All signals already embedded.")
        return 0

    print(f"Embedding {len(pending)} signals in batches of {batch_size}...")
    model = get_model()
    embedded = 0

    for i in range(0, len(pending), batch_size):
        batch = pending[i : i + batch_size]
        texts = [
            preprocess(f"{d.get('title', '')} {d.get('summary', '')}")
            for d in batch
        ]
        vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)

        for doc, vec in zip(batch, vectors):
            signals.update_one(
                {"_id": doc["_id"]},
                {"$set": {"embedding": vec.tolist(), "embedded_at": datetime.now(timezone.utc)}}
            )
        embedded += len(batch)
        print(f"  {embedded}/{len(pending)}")

    print(f"Embedding complete: {embedded} signals updated.")
    return embedded


# ── Atlas vector search index setup ──────────────────────────────────────────

def setup_vector_index():
    """
    Create the Atlas vector search index on signals.embedding (384 dims, cosine).
    Requires MongoDB Atlas M10+ and pymongo >= 4.7.
    Safe to call repeatedly — skips if the index already exists.
    """
    db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
    collection = db["signals"]

    existing = [idx["name"] for idx in collection.list_search_indexes()]
    if "signal_embedding_index" in existing:
        print("Vector search index already exists.")
        return

    collection.create_search_index({
        "name": "signal_embedding_index",
        "definition": {
            "mappings": {
                "dynamic": False,
                "fields": {
                    "embedding": {
                        "type": "knnVector",
                        "dimensions": 384,
                        "similarity": "cosine",
                    }
                }
            }
        }
    })
    print("Vector search index created: signal_embedding_index")


if __name__ == "__main__":
    setup_vector_index()
    embed_signals()
