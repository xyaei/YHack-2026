import requests
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

LEGISCAN_API_KEY = os.getenv("LEGISCAN_API_KEY")
LEGISCAN_BASE = "https://api.legiscan.com/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

ALL_STATES = [
    "CA", "NY", "TX", "FL", "WA", "CO", "IL", "VA", "CT", "MA",
    "NJ", "OR", "MT", "NH", "IN", "TN", "GA", "NC", "MN", "AZ",
    "AL", "AK", "AR", "DE", "HI", "ID", "IA", "KS", "KY", "LA",
    "ME", "MD", "MI", "MS", "MO", "NE", "NV", "NM", "ND", "OH",
    "OK", "PA", "RI", "SC", "SD", "UT", "VT", "WV", "WI", "WY",
    "DC"
]

SEARCH_TERMS = [
    "health data privacy",
    "artificial intelligence",
    "patient data",
    "consumer data protection",
    "HIPAA",
    "health information",
    "medical records",
    "data breach",
]

TOPIC_KEYWORDS = {
    "privacy":         ["privacy", "personal data", "consumer data", "data protection", "CCPA"],
    "health_data":     ["health data", "health app", "patient", "medical", "health information", "PHI"],
    "ai_ml":           ["artificial intelligence", "machine learning", "algorithm", "automated decision", "AI"],
    "ftc_enforcement": ["consumer protection", "unfair", "deceptive", "enforcement"],
    "hipaa":           ["HIPAA", "health insurance", "protected health information"],
}

def classify_topics(title, summary):
    text = f"{title} {summary}".lower()
    matched = []
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(kw.lower() in text for kw in keywords):
            matched.append(topic)
    return matched if matched else ["general"]

def is_relevant(title, summary):
    text = f"{title} {summary}".lower()
    keywords = [
        "health", "privacy", "data", "artificial intelligence", "ai",
        "patient", "medical", "algorithm", "security", "telehealth",
        "consumer protection", "information technology", "digital",
        "breach", "records", "hipaa"
    ]
    return any(kw in text for kw in keywords)

def fetch_legiscan_state(state):
    inserted = 0
    seen_ids = set()

    for term in SEARCH_TERMS:
        try:
            params = {
                "op": "getSearch",
                "key": LEGISCAN_API_KEY,
                "state": state,
                "query": term,
                "year": 2,
            }
            r = requests.get(LEGISCAN_BASE, params=params, headers=HEADERS, timeout=15)
            if r.status_code != 200:
                continue

            data = r.json()
            if data.get("status") != "OK":
                continue

            results = data.get("searchresult", {})
            for key, bill in results.items():
                if key == "summary":
                    continue

                bill_id = bill.get("bill_id")
                if bill_id in seen_ids:
                    continue
                seen_ids.add(bill_id)

                title = bill.get("title", "")
                last_action = bill.get("last_action", "")

                if not is_relevant(title, last_action):
                    continue

                source_url = bill.get("url", "")
                bill_number = bill.get("bill_number", "")

                last_action_date = bill.get("last_action_date", "")
                try:
                    pub_date = datetime.strptime(last_action_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                except:
                    pub_date = datetime.now(timezone.utc)

                days_old = (datetime.now(timezone.utc) - pub_date).days
                recency_score = max(0, 1 - (days_old / 90))
                signal_score = round((0.75 * 0.6) + (recency_score * 0.4), 3)

                signal = {
                    "signal_type": "state_legislature",
                    "title": title,
                    "summary": last_action,
                    "source_url": source_url,
                    "jurisdiction": state,
                    "agency": f"{state} Legislature",
                    "topics": classify_topics(title, last_action),
                    "signal_score": signal_score,
                    "document_type": "State Bill",
                    "document_number": bill_number,
                    "published_date": pub_date,
                    "created_at": datetime.now(timezone.utc),
                    "processed_at": None,
                    "metadata": {
                        "state": state,
                        "bill_id": bill_id,
                        "bill_number": bill_number,
                        "last_action": last_action,
                        "relevance": bill.get("relevance"),
                    }
                }

                try:
                    signals.update_one(
                        {"source_url": source_url},
                        {"$set": signal},
                        upsert=True
                    )
                    inserted += 1
                except Exception:
                    pass

        except Exception as e:
            pass

    return inserted

def fetch_state_legislatures(states=None):
    target_states = states or ALL_STATES
    total_inserted = 0

    for state in target_states:
        count = fetch_legiscan_state(state)
        print(f"  {state}: {count} signals")
        total_inserted += count

    print(f"\nState legislatures done: {total_inserted} upserted")
    print(f"Total signals in DB: {signals.count_documents({})}")

if __name__ == "__main__":
    fetch_state_legislatures()
