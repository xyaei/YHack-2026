"""
MongoDB service.
Fetches signals from the `signals` collection filtered by topic and jurisdiction.
"""

import os
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from schemas.signal import Signal

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "foreseen")

_client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    return _client


def get_db():
    return get_client()[MONGO_DB]


async def fetch_signals(
    topics: List[str],
    jurisdiction: Optional[str] = None,
    limit: int = 20,
) -> List[dict]:
    """
    Query the signals collection by topic tags and optional jurisdiction.
    Returns plain dicts ready to forward to model servers.
    """
    db = get_db()
    query: dict = {}

    if topics:
        query["topics"] = {"$in": topics}

    if jurisdiction:
        # Match exact jurisdiction OR "federal" which applies everywhere
        query["jurisdiction"] = {"$in": [jurisdiction, "federal"]}

    cursor = (
        db["signals"]
        .find(query, {"_id": 0})  # exclude ObjectId — not JSON-serializable
        .sort("signal_score", -1)
        .limit(limit)
    )

    signals = []
    async for doc in cursor:
        # Coerce datetime fields to ISO strings for JSON forwarding
        for field in ("published_date", "created_at", "processed_at"):
            if doc.get(field):
                doc[field] = doc[field].isoformat()
        signals.append(doc)

    return signals


async def close():
    if _client:
        _client.close()
