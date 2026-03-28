import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

BASE_URL = "https://api.congress.gov/v3/bill"
API_KEY = os.getenv("CONGRESS_API_KEY")

TOPIC_KEYWORDS = {
    "privacy":         ["privacy", "personal data", "consumer data", "CCPA", "data protection"],
    "health_data":     ["health data", "PHI", "HIPAA", "patient", "medical records", "health information"],
    "ai_ml":           ["artificial intelligence", "machine learning", "algorithm", "automated decision", "AI"],
    "ftc_enforcement": ["FTC", "Federal Trade Commission", "consumer protection", "unfair"],
    "hipaa":           ["HIPAA", "health insurance portability", "protected health information"],
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
        "health", "hipaa", "privacy", "artificial intelligence", "ai",
        "patient", "medical", "telehealth", "data", "ftc", "consumer protection"
    ]
    return any(kw in text for kw in keywords)

def fetch_congress(days_back=30):
    from_date = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%dT00:00:00Z")
    to_date = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00Z")

    inserted = 0
    skipped = 0
    offset = 0
    limit = 250

    print(f"Fetching bills from {from_date} to {to_date}")

    while True:
        params = {
            "fromDateTime": from_date,
            "toDateTime": to_date,
            "limit": limit,
            "offset": offset,
            "sort": "updateDate+desc",
            "api_key": API_KEY,
            "format": "json",
        }

        try:
            response = requests.get(BASE_URL, params=params, timeout=15)
            if response.status_code != 200:
                print(f"Error {response.status_code}: {response.text[:200]}")
                break

            data = response.json()
            bills = data.get("bills", [])
            if not bills:
                break

            for bill in bills:
                title = bill.get("title") or ""
                summary = ""
                url = bill.get("url", "")

                if not is_relevant(title, summary):
                    continue

                bill_type = bill.get("type", "")
                bill_number = bill.get("number", "")
                congress = bill.get("congress", "")
                external_id = f"{congress}-{bill_type}-{bill_number}"

                latest_action = bill.get("latestAction", {})
                action_date_str = latest_action.get("actionDate", "")
                try:
                    pub_date = datetime.strptime(action_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                except:
                    pub_date = datetime.now(timezone.utc)

                days_old = (datetime.now(timezone.utc) - pub_date).days
                recency_score = max(0, 1 - (days_old / 90))
                signal_score = round((0.75 * 0.6) + (recency_score * 0.4), 3)

                origin_chamber = bill.get("originChamber", "")
                source_url = f"https://www.congress.gov/bill/{congress}th-congress/{bill_type.lower()}-bill/{bill_number}"

                signal = {
                    "signal_type": "congress",
                    "title": title,
                    "summary": latest_action.get("text", ""),
                    "source_url": source_url,
                    "jurisdiction": "federal",
                    "agency": f"Congress - {origin_chamber}",
                    "topics": classify_topics(title, summary),
                    "signal_score": signal_score,
                    "document_type": f"Bill ({bill_type})",
                    "document_number": external_id,
                    "published_date": pub_date,
                    "created_at": datetime.now(timezone.utc),
                    "processed_at": None,
                    "metadata": {
                        "congress": congress,
                        "bill_type": bill_type,
                        "bill_number": bill_number,
                        "origin_chamber": origin_chamber,
                        "latest_action": latest_action,
                    }
                }

                try:
                    signals.update_one(
                        {"source_url": source_url},
                        {"$set": signal},
                        upsert=True
                    )
                    inserted += 1
                except Exception as e:
                    skipped += 1

            total = data.get("pagination", {}).get("count", 0)
            offset += len(bills)
            print(f"  {offset} bills processed so far ({inserted} relevant)")
            if offset >= total or offset >= 1000:
                break

        except Exception as e:
            print(f"Exception: {e}")
            break

    print(f"\nCongress done: {inserted} upserted, {skipped} skipped")
    print(f"Total signals in DB: {signals.count_documents({})}")

if __name__ == "__main__":
    fetch_congress(days_back=30)
