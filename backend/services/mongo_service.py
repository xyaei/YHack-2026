"""
MongoDB service.
Fetches signals from the `signals` collection using Atlas vector search.
"""

import os
import re
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "foreseen")

_client: Optional[AsyncIOMotorClient] = None
_model = None

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "must", "can", "could", "not", "no", "so",
    "that", "this", "these", "those", "i", "we", "you", "he", "she", "it",
    "they", "what", "which", "who", "how", "when", "where", "why", "all",
    "any", "into", "about", "also", "only", "s", "t",
}


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    return _client


def get_db():
    return get_client()[MONGO_DB]


def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _model


def embed_query(text: str) -> List[float]:
    tokens = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower()).split()
    cleaned = " ".join(t for t in tokens if t not in STOP_WORDS and len(t) > 1)
    return get_model().encode(cleaned, normalize_embeddings=True).tolist()


async def fetch_signals(
    topics: List[str],
    jurisdiction: Optional[str] = None,
    limit: int = 20,
) -> List[dict]:
    """
    Fetch signals using Atlas vector search on the query built from topic tags.
    Fetches extra candidates then post-filters by jurisdiction.
    """
    db = get_db()

    query_text = " ".join(topics)
    query_vector = embed_query(query_text)

    # Fetch more candidates to account for jurisdiction post-filtering
    num_candidates = limit * 10

    pipeline = [
        {
            "$vectorSearch": {
                "index": "signal_embedding_index",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": num_candidates,
                "limit": num_candidates,
            }
        },
        {"$project": {"embedding": 0}},  # exclude large embedding field
    ]

    signals = []
    async for doc in db["signals"].aggregate(pipeline):
        if jurisdiction:
            if doc.get("jurisdiction") not in (jurisdiction, "federal"):
                continue
        # Coerce datetime fields to ISO strings
        for field in ("published_date", "created_at", "processed_at", "embedded_at"):
            if doc.get(field):
                doc[field] = doc[field].isoformat()
        # Coerce ObjectId to string
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        signals.append(doc)
        if len(signals) >= limit:
            break

    return signals


async def close():
    if _client:
        _client.close()
