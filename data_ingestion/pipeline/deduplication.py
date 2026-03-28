"""
Signal deduplication across sources.
Detects near-duplicate signals about the same event
and links them with a related_signals array.
"""

from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
import re
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

def normalize_title(title):
    """Normalize title for comparison."""
    title = title.lower()
    title = re.sub(r'[^\w\s]', '', title)
    title = re.sub(r'\s+', ' ', title).strip()
    # remove common filler words
    stopwords = {"a", "an", "the", "of", "in", "on", "at", "to", "for",
                 "is", "are", "was", "were", "and", "or", "but", "with"}
    words = [w for w in title.split() if w not in stopwords]
    return " ".join(words)

def get_title_keywords(title):
    """Extract significant keywords from title."""
    normalized = normalize_title(title)
    words = normalized.split()
    # keep words longer than 4 chars as keywords
    return set(w for w in words if len(w) > 4)

def compute_similarity(title1, title2):
    """
    Compute keyword overlap similarity between two titles.
    Returns 0.0 to 1.0
    """
    kw1 = get_title_keywords(title1)
    kw2 = get_title_keywords(title2)

    if not kw1 or not kw2:
        return 0.0

    intersection = kw1 & kw2
    union = kw1 | kw2
    return len(intersection) / len(union)

def find_duplicates(similarity_threshold=0.6, days_window=7):
    """
    Find near-duplicate signals published within days_window of each other.
    Groups them and links with related_signals.
    """
    print("Finding duplicate signals...")

    # focus on news and google_news which are most likely to duplicate
    duplicate_prone_types = ["news", "google_news", "reddit", "ftc"]

    cutoff = datetime.now(timezone.utc) - timedelta(days=60)

    candidates = list(
        signals.find(
            {
                "signal_type": {"$in": duplicate_prone_types},
                "published_date": {"$gte": cutoff},
                "is_duplicate": {"$exists": False},
            },
            {"_id": 1, "title": 1, "signal_type": 1,
             "published_date": 1, "source_url": 1, "topics": 1}
        )
        .sort("published_date", -1)
        .limit(2000)
    )

    print(f"  Checking {len(candidates)} recent signals for duplicates...")

    duplicate_groups = 0
    total_linked = 0

    for i, signal_a in enumerate(candidates):
        if i % 100 == 0 and i > 0:
            print(f"  Processed {i}/{len(candidates)}...")

        title_a = signal_a.get("title", "")
        date_a = signal_a.get("published_date")
        topics_a = set(signal_a.get("topics", []))

        related = []

        for signal_b in candidates[i+1:]:
            # skip if already found as duplicate
            if signal_b["_id"] in [r["_id"] for r in related]:
                continue

            title_b = signal_b.get("title", "")
            date_b = signal_b.get("published_date")
            topics_b = set(signal_b.get("topics", []))

            # must share at least one topic
            if not topics_a & topics_b:
                continue

            # must be within time window
            if date_a and date_b:
                diff = abs((date_a - date_b).days)
                if diff > days_window:
                    continue

            # compute title similarity
            similarity = compute_similarity(title_a, title_b)
            if similarity >= similarity_threshold:
                related.append({
                    "_id": signal_b["_id"],
                    "source_url": signal_b.get("source_url"),
                    "signal_type": signal_b.get("signal_type"),
                    "similarity": round(similarity, 3),
                })

        if related:
            # mark signal_a with its related signals
            signals.update_one(
                {"_id": signal_a["_id"]},
                {"$set": {
                    "related_signals": related,
                    "duplicate_checked": True,
                }}
            )
            # mark the related signals as duplicates
            for r in related:
                signals.update_one(
                    {"_id": r["_id"]},
                    {"$set": {
                        "is_duplicate": True,
                        "canonical_signal": signal_a.get("source_url"),
                        "duplicate_checked": True,
                    }}
                )
            duplicate_groups += 1
            total_linked += len(related)
        else:
            signals.update_one(
                {"_id": signal_a["_id"]},
                {"$set": {"duplicate_checked": True}}
            )

    print(f"\nDeduplication complete:")
    print(f"  Duplicate groups found: {duplicate_groups}")
    print(f"  Total signals linked as duplicates: {total_linked}")

    # stats
    total = signals.count_documents({})
    duplicates = signals.count_documents({"is_duplicate": True})
    with_related = signals.count_documents({"related_signals": {"$exists": True}})
    print(f"  Total signals: {total}")
    print(f"  Unique signals: {total - duplicates}")
    print(f"  Signals with related duplicates: {with_related}")

    # show examples
    print("\nExample duplicate groups:")
    examples = list(
        signals.find(
            {"related_signals": {"$exists": True}},
            {"_id": 0, "title": 1, "signal_type": 1, "related_signals": 1}
        ).limit(3)
    )
    for ex in examples:
        print(f"\n  Canonical [{ex['signal_type']}]: {ex['title'][:65]}")
        for r in ex["related_signals"][:2]:
            print(f"  Related   [{r['signal_type']}]: similarity={r['similarity']}")

if __name__ == "__main__":
    find_duplicates()
