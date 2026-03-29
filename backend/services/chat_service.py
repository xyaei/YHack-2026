"""
RAG chat service.
Retrieves relevant signals and predictions from MongoDB,
then calls Hermes for a conversational answer.
"""

import os
import httpx
from typing import List, Optional

from services.mongo_service import embed_query, get_db

HERMES_BASE_URL = os.getenv("HERMES_BASE_URL", "http://localhost:8002")


async def fetch_relevant_signals(query: str, limit: int = 8) -> List[dict]:
    db = get_db()
    query_vector = embed_query(query)

    pipeline = [
        {
            "$vectorSearch": {
                "index": "signal_embedding_index",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": limit * 10,
                "limit": limit,
            }
        },
        {
            "$project": {
                "embedding": 0,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]

    results = []
    async for doc in db["signals"].aggregate(pipeline):
        for field in ("published_date", "created_at", "processed_at", "embedded_at"):
            if doc.get(field):
                doc[field] = doc[field].isoformat()
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        doc["similarity_score"] = round(doc.pop("score", 0), 4)
        results.append(doc)

    return results


async def fetch_recent_predictions(limit: int = 5) -> List[dict]:
    db = get_db()
    results = []
    async for doc in db["predictions"].find(
        {},
        {"embedding": 0},
        sort=[("generated_at", -1)],
        limit=limit,
    ):
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        if doc.get("generated_at"):
            doc["generated_at"] = doc["generated_at"].isoformat()
        results.append(doc)
    return results


async def chat(
    message: str,
    history: List[dict],
    signals: Optional[List[dict]] = None,
    predictions: Optional[List[dict]] = None,
    company_context: Optional[str] = None,
) -> str:
    # Use context passed from /analyze if available; otherwise fall back to live retrieval
    if signals is None:
        signals = await fetch_relevant_signals(message)
    if predictions is None:
        predictions = await fetch_recent_predictions()

    payload = {
        "message": message,
        "history": history,
        "signals": signals,
        "predictions": predictions,
        "company_context": company_context,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(f"{HERMES_BASE_URL}/chat", json=payload)
        response.raise_for_status()
        return response.json()["reply"]
