import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
BASE_URL = "https://newsapi.org/v2/everything"

QUERIES = [
    "HIPAA regulation 2026",
    "health data privacy law",
    "AI healthcare regulation",
    "FTC health app enforcement",
    "state health privacy law",
    "patient data protection",
]

TOPIC_KEYWORDS = {
    "privacy":         ["privacy", "personal data", "consumer data", "data protection"],
    "health_data":     ["health data", "health app", "patient", "medical", "health information"],
    "ai_ml":           ["artificial intelligence", "machine learning", "algorithm", "automated"],
    "ftc_enforcement": ["FTC", "settlement", "consent decree", "enforcement", "complaint"],
    "hipaa":           ["HIPAA", "health insurance", "protected health"],
}

def classify_topics(title, summary):
    text = f"{title} {summary}".lower()
    matched = []
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(kw.lower() in text for kw in keywords):
            matched.append(topic)
    return matched if matched else ["general"]

def fetch_news(days_back=28):
    from_date = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    inserted = 0
    skipped = 0
    seen_urls = set()

    for query in QUERIES:
        print(f"Fetching: '{query}'")
        params = {
            "q": query,
            "from": from_date,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": 100,
            "apiKey": NEWS_API_KEY,
        }

        try:
            r = requests.get(BASE_URL, params=params, timeout=15)
            if r.status_code != 200:
                print(f"  Error {r.status_code}: {r.text[:200]}")
                continue

            data = r.json()
            articles = data.get("articles", [])
            print(f"  {len(articles)} articles found")

            for article in articles:
                url = article.get("url", "")
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)

                title = article.get("title") or ""
                summary = article.get("description") or ""

                pub_date_str = article.get("publishedAt", "")
                try:
                    pub_date = datetime.strptime(pub_date_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                except:
                    pub_date = datetime.now(timezone.utc)

                days_old = (datetime.now(timezone.utc) - pub_date).days
                recency_score = max(0, 1 - (days_old / 90))
                signal_score = round((0.5 * 0.6) + (recency_score * 0.4), 3)

                signal = {
                    "signal_type": "news",
                    "title": title,
                    "summary": summary,
                    "source_url": url,
                    "jurisdiction": "federal",
                    "agency": article.get("source", {}).get("name", "Unknown"),
                    "topics": classify_topics(title, summary),
                    "signal_score": signal_score,
                    "document_type": "News Article",
                    "document_number": "",
                    "published_date": pub_date,
                    "created_at": datetime.now(timezone.utc),
                    "processed_at": None,
                    "metadata": {
                        "author": article.get("author", ""),
                        "source": article.get("source", {}).get("name", ""),
                    }
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

        except Exception as e:
            print(f"  Exception: {e}")

    print(f"\nNews done: {inserted} upserted, {skipped} skipped")
    print(f"Total signals in DB: {signals.count_documents({})}")

if __name__ == "__main__":
    fetch_news(days_back=28)
