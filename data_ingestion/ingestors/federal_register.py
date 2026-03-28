import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

BASE_URL = "https://www.federalregister.gov/api/v1/documents"

SEARCH_TERMS = [
    "HIPAA",
    "health data privacy",
    "artificial intelligence healthcare",
    "patient data",
    "health information technology",
    "FTC health",
    "telehealth",
    "medical device software",
]

TOPIC_KEYWORDS = {
    "privacy":         ["privacy", "personal data", "consumer data", "CCPA", "CPRA"],
    "health_data":     ["health data", "PHI", "HIPAA", "patient", "medical records"],
    "ai_ml":           ["artificial intelligence", "machine learning", "algorithm", "automated decision"],
    "ftc_enforcement": ["FTC", "Federal Trade Commission", "consent decree", "settlement"],
    "hipaa":           ["HIPAA", "health insurance portability", "protected health information"],
}

def classify_topics(title, summary):
    text = f"{title} {summary}".lower()
    matched = []
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(kw.lower() in text for kw in keywords):
            matched.append(topic)
    return matched if matched else ["general"]

def compute_signal_score(doc_type, days_old):
    type_score = {"Rule": 1.0, "Proposed Rule": 0.85, "Notice": 0.6, "Presidential Document": 0.7}.get(doc_type, 0.5)
    recency_score = max(0, 1 - (days_old / 90))
    return round((type_score * 0.6) + (recency_score * 0.4), 3)

def fetch_federal_register(days_back=30):
    from_date = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    inserted = 0
    skipped = 0
    seen_urls = set()

    for term in SEARCH_TERMS:
        offset = 0
        print(f"Fetching: '{term}'")
        while True:
            params = {
                "conditions[term]": term,
                "conditions[publication_date][gte]": from_date,
                "fields[]": ["title", "abstract", "document_number",
                             "publication_date", "type", "agencies", "html_url"],
                "per_page": 100,
                "offset": offset,
                "order": "newest",
            }

            try:
                response = requests.get(BASE_URL, params=params, timeout=15)
                if response.status_code != 200:
                    print(f"  Error {response.status_code}: {response.text[:200]}")
                    break

                data = response.json()
                results = data.get("results", [])
                if not results:
                    break

                for doc in results:
                    url = doc.get("html_url", "")
                    if not url or url in seen_urls:
                        continue
                    seen_urls.add(url)

                    pub_date_str = doc.get("publication_date", "")
                    try:
                        pub_date = datetime.strptime(pub_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    except:
                        pub_date = datetime.now(timezone.utc)

                    days_old = (datetime.now(timezone.utc) - pub_date).days
                    title = doc.get("title") or ""
                    summary = doc.get("abstract") or ""
                    doc_type = doc.get("type") or "Notice"
                    agencies = doc.get("agencies") or []
                    agency_name = agencies[0].get("name") if agencies else "Unknown"

                    signal = {
                        "signal_type": "federal_register",
                        "title": title,
                        "summary": summary,
                        "source_url": url,
                        "jurisdiction": "federal",
                        "agency": agency_name,
                        "topics": classify_topics(title, summary),
                        "signal_score": compute_signal_score(doc_type, days_old),
                        "document_type": doc_type,
                        "document_number": doc.get("document_number", ""),
                        "published_date": pub_date,
                        "created_at": datetime.now(timezone.utc),
                        "processed_at": None,
                    }

                    try:
                        signals.update_one(
                            {"source_url": url},
                            {"$set": signal},
                            upsert=True
                        )
                        inserted += 1
                    except Exception as e:
                        skipped += 1

                offset += len(results)
                total = data.get("count", 0)
                print(f"  {offset}/{total} fetched so far")
                if offset >= total or offset >= 300:
                    break

            except Exception as e:
                print(f"  Exception: {e}")
                break

    print(f"\nFederal Register done: {inserted} upserted, {skipped} skipped")
    print(f"Total signals in DB: {signals.count_documents({})}")

if __name__ == "__main__":
    fetch_federal_register(days_back=30)
