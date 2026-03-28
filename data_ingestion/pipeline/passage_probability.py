"""
Passage probability scoring for Congressional bills.
Scores each bill on cosponsor count, committee progress,
companion bills, and legislative advancement.
"""

import requests
import time
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

API_KEY = os.getenv("CONGRESS_API_KEY")
BASE_URL = "https://api.congress.gov/v3"

def get_bill_cosponsors(congress, bill_type, bill_number):
    """Get cosponsor count for a bill."""
    try:
        url = f"{BASE_URL}/bill/{congress}/{bill_type.lower()}/{bill_number}/cosponsors"
        r = requests.get(url, params={"api_key": API_KEY, "format": "json"}, timeout=10)
        if r.status_code != 200:
            return 0
        data = r.json()
        pagination = data.get("pagination", {})
        return pagination.get("count", 0)
    except Exception:
        return 0

def get_bill_actions(congress, bill_type, bill_number):
    """Get actions for a bill to determine legislative progress."""
    try:
        url = f"{BASE_URL}/bill/{congress}/{bill_type.lower()}/{bill_number}/actions"
        r = requests.get(url, params={"api_key": API_KEY, "format": "json", "limit": 50}, timeout=10)
        if r.status_code != 200:
            return []
        return r.json().get("actions", [])
    except Exception:
        return []

def score_legislative_progress(actions):
    """
    Score how far a bill has advanced.
    Returns a score from 0.0 to 1.0
    """
    if not actions:
        return 0.0

    action_texts = " ".join([a.get("text", "").lower() for a in actions])
    action_types = " ".join([a.get("type", "").lower() for a in actions])

    # check for key milestones in order of significance
    if any(kw in action_texts for kw in ["became public law", "signed by president", "enacted"]):
        return 1.0
    if any(kw in action_texts for kw in ["passed senate", "passed house", "agreed to in senate", "agreed to in house"]):
        return 0.85
    if any(kw in action_texts for kw in ["vote scheduled", "floor consideration", "placed on calendar"]):
        return 0.65
    if any(kw in action_texts for kw in ["ordered to be reported", "reported by committee", "committee discharged"]):
        return 0.45
    if any(kw in action_texts for kw in ["hearing", "markup", "referred to subcommittee"]):
        return 0.25
    if "referred to committee" in action_texts:
        return 0.10

    return 0.05

def compute_passage_probability(cosponsor_count, progress_score, bill_type):
    """
    Combine factors into a final passage probability.
    
    Weights:
    - Legislative progress: 50% (most predictive)
    - Cosponsor count: 35%
    - Bill type: 15%
    """
    # cosponsor score — normalize, 20+ cosponsors is strong
    cosponsor_score = min(cosponsor_count / 20, 1.0)

    # bill type score — joint resolutions and amendments have different dynamics
    type_scores = {
        "hr": 0.7,   # House bill
        "s": 0.7,    # Senate bill
        "hjres": 0.6,
        "sjres": 0.6,
        "hconres": 0.4,
        "sconres": 0.4,
        "hres": 0.3,
        "sres": 0.3,
    }
    type_score = type_scores.get(bill_type.lower(), 0.5)

    probability = (
        progress_score * 0.50 +
        cosponsor_score * 0.35 +
        type_score * 0.15
    )

    return round(min(probability, 1.0), 3)

def update_passage_probabilities(limit=200):
    """
    Update passage probability for Congress bills.
    Processes most recent bills first.
    Limit controls how many API calls we make (each bill = 2 calls).
    """
    # get congress bills that don't have passage_probability yet
    bills = list(
        signals.find(
            {
                "signal_type": "congress",
                "metadata.congress": {"$in": [118, 119]},  # focus on recent congresses
                "passage_probability": {"$exists": False}
            },
            {"_id": 1, "metadata": 1, "title": 1}
        )
        .sort("published_date", -1)
        .limit(limit)
    )

    print(f"Scoring {len(bills)} bills for passage probability...")
    updated = 0

    for i, bill in enumerate(bills):
        meta = bill.get("metadata", {})
        congress = meta.get("congress")
        bill_type = meta.get("bill_type", "")
        bill_number = meta.get("bill_number", "")

        if not all([congress, bill_type, bill_number]):
            continue

        # get cosponsors and actions
        cosponsor_count = get_bill_cosponsors(congress, bill_type, bill_number)
        actions = get_bill_actions(congress, bill_type, bill_number)
        progress_score = score_legislative_progress(actions)
        probability = compute_passage_probability(cosponsor_count, progress_score, bill_type)

        # update signal in MongoDB
        signals.update_one(
            {"_id": bill["_id"]},
            {"$set": {
                "passage_probability": probability,
                "cosponsor_count": cosponsor_count,
                "legislative_progress": progress_score,
                "passage_scored_at": datetime.now(timezone.utc),
            }}
        )
        updated += 1

        if (i + 1) % 10 == 0:
            print(f"  Scored {i + 1}/{len(bills)} bills...")

        # rate limit — Congress API allows ~100 req/min
        time.sleep(0.7)

    print(f"\nPassage probability scoring complete: {updated} bills updated")

    # show top bills by passage probability
    top_bills = list(
        signals.find(
            {"signal_type": "congress", "passage_probability": {"$exists": True}},
            {"_id": 0, "title": 1, "passage_probability": 1,
             "cosponsor_count": 1, "legislative_progress": 1,
             "metadata.congress": 1, "metadata.bill_type": 1}
        )
        .sort("passage_probability", -1)
        .limit(10)
    )

    print(f"\nTop 10 bills by passage probability:")
    print(f"{'Bill':<12} {'Prob':>6} {'Cosponsors':>12} {'Progress':>10}  Title")
    print("-" * 90)
    for b in top_bills:
        meta = b.get("metadata", {})
        bill_id = f"{meta.get('congress', '')}-{meta.get('bill_type', '')}"
        print(f"{bill_id:<12} {b.get('passage_probability', 0):>6.3f} {b.get('cosponsor_count', 0):>12} {b.get('legislative_progress', 0):>10.3f}  {b.get('title', '')[:50]}")

if __name__ == "__main__":
    update_passage_probabilities(limit=200)
