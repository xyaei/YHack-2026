import time
import threading
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import sys

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

FEDERAL_REGISTER_BASE = "https://www.federalregister.gov/api/v1/documents"

SEARCH_TERMS = [
    "HIPAA", "health data privacy", "artificial intelligence healthcare",
    "patient data", "health information technology", "FTC health",
    "telehealth", "medical device software",
]

TOPIC_KEYWORDS = {
    "privacy":         ["privacy", "personal data", "consumer data", "CCPA"],
    "health_data":     ["health data", "PHI", "HIPAA", "patient", "medical records"],
    "ai_ml":           ["artificial intelligence", "machine learning", "algorithm"],
    "ftc_enforcement": ["FTC", "Federal Trade Commission", "consent decree", "settlement"],
    "hipaa":           ["HIPAA", "health insurance portability", "protected health information"],
}

def classify_topics(title, summary):
    text = f"{title} {summary}".lower()
    matched = [t for t, kws in TOPIC_KEYWORDS.items() if any(kw.lower() in text for kw in kws)]
    return matched if matched else ["general"]

def compute_signal_score(doc_type, days_old):
    type_score = {"Rule": 1.0, "Proposed Rule": 0.85, "Notice": 0.6}.get(doc_type, 0.5)
    recency_score = max(0, 1 - (days_old / 90))
    return round((type_score * 0.6) + (recency_score * 0.4), 3)

def poll_federal_register():
    """Poll Federal Register every 15 minutes for new documents."""
    from_date = (datetime.now(timezone.utc) - timedelta(hours=1)).strftime("%Y-%m-%d")
    new_signals = 0

    for term in SEARCH_TERMS:
        try:
            params = {
                "conditions[term]": term,
                "conditions[publication_date][gte]": from_date,
                "fields[]": ["title", "abstract", "document_number",
                             "publication_date", "type", "agencies", "html_url"],
                "per_page": 20,
                "order": "newest",
            }
            r = requests.get(FEDERAL_REGISTER_BASE, params=params, timeout=15)
            if r.status_code != 200:
                continue

            for doc in r.json().get("results", []):
                url = doc.get("html_url", "")
                if not url:
                    continue

                # check if already exists
                if signals.find_one({"source_url": url}):
                    continue

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
                    "realtime": True,
                }

                signals.update_one(
                    {"source_url": url},
                    {"$set": signal},
                    upsert=True
                )
                new_signals += 1
                print(f"  [NEW SIGNAL] {title[:80]}")

        except Exception as e:
            pass

    return new_signals

def poll_news(news_api_key):
    """Poll NewsAPI for articles from the last hour."""
    from_date = (datetime.now(timezone.utc) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    new_signals = 0

    queries = [
        "HIPAA regulation",
        "health data privacy law",
        "AI healthcare regulation",
        "FTC health enforcement",
    ]

    for query in queries:
        try:
            params = {
                "q": query,
                "from": from_date,
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": 10,
                "apiKey": news_api_key,
            }
            r = requests.get("https://newsapi.org/v2/everything", params=params, timeout=15)
            if r.status_code != 200:
                continue

            for article in r.json().get("articles", []):
                url = article.get("url", "")
                if not url or signals.find_one({"source_url": url}):
                    continue

                title = article.get("title") or ""
                summary = article.get("description") or ""

                pub_date_str = article.get("publishedAt", "")
                try:
                    pub_date = datetime.strptime(pub_date_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                except:
                    pub_date = datetime.now(timezone.utc)

                signal = {
                    "signal_type": "news",
                    "title": title,
                    "summary": summary,
                    "source_url": url,
                    "jurisdiction": "federal",
                    "agency": article.get("source", {}).get("name", "Unknown"),
                    "topics": classify_topics(title, summary),
                    "signal_score": 0.60,
                    "document_type": "News Article",
                    "document_number": "",
                    "published_date": pub_date,
                    "created_at": datetime.now(timezone.utc),
                    "processed_at": None,
                    "realtime": True,
                }

                signals.update_one(
                    {"source_url": url},
                    {"$set": signal},
                    upsert=True
                )
                new_signals += 1
                print(f"  [NEW NEWS] {title[:80]}")

        except Exception as e:
            pass

    return new_signals

def run_realtime_loop(interval_minutes=15):
    """Main loop — polls all sources every interval_minutes."""
    news_api_key = os.getenv("NEWS_API_KEY")

    print("=" * 50)
    print("FORESEEN real-time watcher started")
    print(f"Polling every {interval_minutes} minutes")
    print("Ctrl+C to stop")
    print("=" * 50)

    while True:
        now = datetime.now(timezone.utc)
        print(f"\n[{now.strftime('%H:%M UTC')}] Polling...")

        fr_count = poll_federal_register()
        news_count = poll_news(news_api_key)
        total = fr_count + news_count

        if total > 0:
            print(f"  {total} new signals found")
            # recompute velocity when new signals arrive
            from pipeline.velocity import compute_velocity
            compute_velocity()
        else:
            print(f"  No new signals")

        print(f"  Total in DB: {signals.count_documents({})}")
        print(f"  Next poll in {interval_minutes} minutes...")
        time.sleep(interval_minutes * 60)

if __name__ == "__main__":
    run_realtime_loop(interval_minutes=15)
