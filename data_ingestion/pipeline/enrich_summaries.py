"""
Backfill CRS summaries for existing Congress bills.
Targets bills that have topic tags but weak summaries.
"""
import requests
import re
import time
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

API_KEY = os.getenv("CONGRESS_API_KEY")
BASE_URL = "https://api.congress.gov/v3/bill"

def get_bill_summary(congress, bill_type, bill_number):
    try:
        url = f"{BASE_URL}/{congress}/{bill_type.lower()}/{bill_number}/summaries"
        r = requests.get(url, params={"api_key": API_KEY, "format": "json"}, timeout=10)
        if r.status_code != 200:
            return None
        summaries = r.json().get("summaries", [])
        if not summaries:
            return None
        latest = sorted(summaries, key=lambda x: x.get("actionDate", ""), reverse=True)[0]
        text = latest.get("text", "")
        text = re.sub(r'<[^>]+>', ' ', text)
        text = ' '.join(text.split())
        return text[:1000] if text else None
    except Exception:
        return None

def enrich_summaries(limit=300):
    # target bills with meaningful topics but short/weak summaries
    bills = list(
        signals.find(
            {
                "signal_type": "congress",
                "topics": {"$in": ["health_data", "privacy", "ai_ml", "hipaa", "ftc_enforcement"]},
                "metadata.congress": {"$in": [118, 119]},
                "summary_enriched": {"$exists": False},
            },
            {"_id": 1, "metadata": 1, "title": 1, "summary": 1}
        )
        .sort("signal_score", -1)
        .limit(limit)
    )

    print(f"Enriching summaries for {len(bills)} relevant bills...")
    enriched = 0
    no_summary = 0

    for i, bill in enumerate(bills):
        meta = bill.get("metadata", {})
        congress = meta.get("congress")
        bill_type = meta.get("bill_type", "")
        bill_number = meta.get("bill_number", "")

        if not all([congress, bill_type, bill_number]):
            continue

        summary = get_bill_summary(congress, bill_type, bill_number)

        if summary:
            signals.update_one(
                {"_id": bill["_id"]},
                {"$set": {
                    "summary": summary,
                    "summary_enriched": True,
                    "summary_enriched_at": datetime.now(timezone.utc),
                }}
            )
            enriched += 1
        else:
            signals.update_one(
                {"_id": bill["_id"]},
                {"$set": {"summary_enriched": False}}
            )
            no_summary += 1

        if (i + 1) % 25 == 0:
            print(f"  Processed {i + 1}/{len(bills)} — {enriched} enriched, {no_summary} no summary available")

        time.sleep(0.4)

    print(f"\nSummary enrichment complete:")
    print(f"  Enriched: {enriched}")
    print(f"  No CRS summary available: {no_summary}")

    # show examples of enriched summaries
    print("\nExample enriched summaries:")
    examples = list(
        signals.find(
            {"summary_enriched": True},
            {"_id": 0, "title": 1, "summary": 1}
        ).limit(3)
    )
    for ex in examples:
        print(f"\n  Title: {ex['title'][:70]}")
        print(f"  Summary: {ex['summary'][:200]}...")

if __name__ == "__main__":
    enrich_summaries(limit=300)
