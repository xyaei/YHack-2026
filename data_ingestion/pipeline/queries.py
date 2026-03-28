"""
FORESEEN — Query helpers for P2 (AI/Agent Engineer)
Import these functions to pull signals from MongoDB without writing raw queries.
"""

from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]


# ── Signal queries ────────────────────────────────────────────────────────────

def get_top_signals_by_topic(topic, limit=20, days_back=None, min_score=0.0):
    """
    Get highest-scored signals for a given topic.
    Topics: privacy, health_data, ai_ml, ftc_enforcement, hipaa, general
    """
    query = {"topics": topic, "signal_score": {"$gte": min_score}}
    if days_back:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
        query["published_date"] = {"$gte": cutoff}

    return list(
        db["signals"]
        .find(query, {"_id": 0, "title": 1, "summary": 1, "source_url": 1,
                      "signal_type": 1, "jurisdiction": 1, "agency": 1,
                      "signal_score": 1, "published_date": 1, "topics": 1})
        .sort("signal_score", -1)
        .limit(limit)
    )


def get_signals_by_jurisdiction(jurisdiction, limit=20, days_back=None):
    """
    Get signals for a specific jurisdiction.
    jurisdiction: 'federal', 'CA', 'NY', 'TX', 'FL', or any state code
    """
    query = {"jurisdiction": jurisdiction}
    if days_back:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
        query["published_date"] = {"$gte": cutoff}

    return list(
        db["signals"]
        .find(query, {"_id": 0, "title": 1, "summary": 1, "source_url": 1,
                      "signal_type": 1, "agency": 1, "signal_score": 1,
                      "published_date": 1, "topics": 1})
        .sort("signal_score", -1)
        .limit(limit)
    )


def get_signals_for_company(company_id="demo_company_001", limit=30, days_back=90):
    """
    Get signals matched to a company's risk profile.
    Pulls company profile from MongoDB and filters signals by topics and jurisdictions.
    """
    company = db["companies"].find_one({"company_id": company_id})
    if not company:
        print(f"Company {company_id} not found")
        return []

    topics = company.get("risk_profile", {}).get("topics_to_monitor", [])
    states = company.get("jurisdictions", {}).get("operating_states", [])
    jurisdictions = states + ["federal"]

    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)

    return list(
        db["signals"]
        .find({
            "topics": {"$in": topics},
            "jurisdiction": {"$in": jurisdictions},
            "published_date": {"$gte": cutoff},
        }, {"_id": 0, "title": 1, "summary": 1, "source_url": 1,
            "signal_type": 1, "jurisdiction": 1, "agency": 1,
            "signal_score": 1, "published_date": 1, "topics": 1})
        .sort("signal_score", -1)
        .limit(limit)
    )


def get_recent_signals(limit=50, hours_back=24):
    """Get most recently ingested signals."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    return list(
        db["signals"]
        .find({"created_at": {"$gte": cutoff}},
              {"_id": 0, "title": 1, "summary": 1, "source_url": 1,
               "signal_type": 1, "jurisdiction": 1, "signal_score": 1,
               "published_date": 1, "topics": 1})
        .sort("created_at", -1)
        .limit(limit)
    )


def get_signals_by_type(signal_type, limit=20, days_back=30):
    """
    Get signals by source type.
    Types: federal_register, congress, ftc, news, state_legislature,
           fda, nist, cisa, cms, onc
    """
    query = {"signal_type": signal_type}
    if days_back:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
        query["published_date"] = {"$gte": cutoff}

    return list(
        db["signals"]
        .find(query, {"_id": 0, "title": 1, "summary": 1, "source_url": 1,
                      "agency": 1, "signal_score": 1, "published_date": 1,
                      "topics": 1})
        .sort("signal_score", -1)
        .limit(limit)
    )


def search_signals(keyword, limit=20):
    """Full-text search across signal titles and summaries."""
    return list(
        db["signals"]
        .find(
            {"$text": {"$search": keyword}},
            {"_id": 0, "title": 1, "summary": 1, "source_url": 1,
             "signal_type": 1, "signal_score": 1, "published_date": 1,
             "topics": 1, "score": {"$meta": "textScore"}}
        )
        .sort([("score", {"$meta": "textScore"})])
        .limit(limit)
    )


# ── Velocity queries ──────────────────────────────────────────────────────────

def get_velocity_scores():
    """Get all topic velocity scores sorted by acceleration."""
    return list(
        db["signal_scores"]
        .find({}, {"_id": 0})
        .sort("velocity_7d", -1)
    )


def get_top_accelerating_topics(limit=5):
    """Get the fastest accelerating regulatory topics right now."""
    return list(
        db["signal_scores"]
        .find({}, {"_id": 0, "topic": 1, "velocity_7d": 1,
                   "count_7d": 1, "count_30d": 1, "avg_signal_score": 1})
        .sort("velocity_7d", -1)
        .limit(limit)
    )


# ── Company queries ───────────────────────────────────────────────────────────

def get_company_profile(company_id="demo_company_001"):
    """Get the demo company profile."""
    return db["companies"].find_one(
        {"company_id": company_id},
        {"_id": 0}
    )


# ── Stats ─────────────────────────────────────────────────────────────────────

def get_pipeline_stats():
    """Summary of what's in the database — useful for debugging."""
    total = db["signals"].count_documents({})

    by_type = {}
    for t in db["signals"].distinct("signal_type"):
        by_type[t] = db["signals"].count_documents({"signal_type": t})

    by_topic = {}
    for t in db["signals"].distinct("topics"):
        by_topic[t] = db["signals"].count_documents({"topics": t})

    by_jurisdiction = {}
    for j in db["signals"].distinct("jurisdiction"):
        by_jurisdiction[j] = db["signals"].count_documents({"jurisdiction": j})

    return {
        "total_signals": total,
        "by_type": by_type,
        "by_topic": by_topic,
        "by_jurisdiction": by_jurisdiction,
        "velocity_scores": get_velocity_scores(),
    }


# ── Semantic search ───────────────────────────────────────────────────────────

def semantic_search(query: str, limit: int = 20, min_score: float = 0.4):
    """
    Vector similarity search over signal embeddings.
    Requires the Atlas vector search index 'signal_embedding_index'.
    query: free-form text (stop words removed + embedded internally)
    """
    from pipeline.embeddings import embed_text
    query_vec = embed_text(query)

    results = db["signals"].aggregate([
        {
            "$vectorSearch": {
                "index": "signal_embedding_index",
                "path": "embedding",
                "queryVector": query_vec,
                "numCandidates": limit * 10,
                "limit": limit,
            }
        },
        {
            "$addFields": {"semantic_score": {"$meta": "vectorSearchScore"}}
        },
        {
            "$match": {"semantic_score": {"$gte": min_score}}
        },
        {
            "$project": {
                "_id": 0, "title": 1, "summary": 1, "source_url": 1,
                "signal_type": 1, "jurisdiction": 1, "agency": 1,
                "signal_score": 1, "published_date": 1, "topics": 1,
                "semantic_score": 1,
            }
        },
    ])
    return list(results)


# ── Quick test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== Pipeline Stats ===")
    stats = get_pipeline_stats()
    print(f"Total signals: {stats['total_signals']}")

    print("\nBy type:")
    for t, c in sorted(stats["by_type"].items(), key=lambda x: -x[1]):
        print(f"  {t:<30} {c}")

    print("\nBy topic:")
    for t, c in sorted(stats["by_topic"].items(), key=lambda x: -x[1]):
        print(f"  {t:<30} {c}")

    print("\nTop accelerating topics:")
    for v in get_top_accelerating_topics():
        print(f"  {v['topic']:<25} velocity={v['velocity_7d']} 7d={v['count_7d']} 30d={v['count_30d']}")

    print("\nTop 3 signals for health_data:")
    for s in get_top_signals_by_topic("health_data", limit=3):
        print(f"  [{s['signal_score']}] {s['title'][:70]}")

    print("\nCompany profile:")
    company = get_company_profile()
    if company:
        print(f"  {company['name']} — {company['industry']['primary']}")
        print(f"  States: {company['jurisdictions']['operating_states']}")
        print(f"  Topics: {company['risk_profile']['topics_to_monitor']}")

    print("\nSignals matched to demo company:")
    matched = get_signals_for_company(limit=5)
    for s in matched:
        print(f"  [{s['signal_score']}] [{s['jurisdiction']}] {s['title'][:65]}")
