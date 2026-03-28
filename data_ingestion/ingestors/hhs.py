import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
from email.utils import parsedate_to_datetime
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

HHS_FEEDS = [
    "https://www.hhs.gov/rss/news.xml",
    "https://www.hhs.gov/hipaa/newsroom/rss/index.xml",
]

TOPIC_KEYWORDS = {
    "privacy":         ["privacy", "personal data", "consumer data", "data protection"],
    "health_data":     ["health data", "health app", "patient", "medical", "health information", "PHI"],
    "ai_ml":           ["artificial intelligence", "machine learning", "algorithm", "automated"],
    "ftc_enforcement": ["enforcement", "settlement", "consent decree", "penalty", "violation"],
    "hipaa":           ["HIPAA", "health insurance portability", "protected health information", "OCR"],
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
        "health", "privacy", "data", "hipaa", "patient", "medical",
        "artificial intelligence", "ai", "enforcement", "security",
        "telehealth", "digital", "information technology"
    ]
    return any(kw in text for kw in keywords)

def fetch_hhs():
    inserted = 0
    skipped = 0

    for feed_url in HHS_FEEDS:
        print(f"Fetching: {feed_url}")
        try:
            feed = feedparser.parse(feed_url)
            print(f"  Status: {feed.status if hasattr(feed, 'status') else 'unknown'}, entries: {len(feed.entries)}")

            for entry in feed.entries:
                title = entry.get("title", "")
                summary = entry.get("summary", "") or entry.get("description", "")
                url = entry.get("link", "")

                if not url or not is_relevant(title, summary):
                    continue

                try:
                    pub_date = parsedate_to_datetime(entry.get("published", "")).replace(tzinfo=timezone.utc)
                except:
                    pub_date = datetime.now(timezone.utc)

                days_old = (datetime.now(timezone.utc) - pub_date).days
                recency_score = max(0, 1 - (days_old / 90))
                signal_score = round((0.85 * 0.6) + (recency_score * 0.4), 3)

                signal = {
                    "signal_type": "hhs",
                    "title": title,
                    "summary": summary,
                    "source_url": url,
                    "jurisdiction": "federal",
                    "agency": "HHS / OCR",
                    "topics": classify_topics(title, summary),
                    "signal_score": signal_score,
                    "document_type": "Agency Notice",
                    "document_number": "",
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
                except Exception:
                    skipped += 1

        except Exception as e:
            print(f"  Exception: {e}")

    print(f"\nHHS done: {inserted} upserted, {skipped} skipped")
    print(f"Total signals in DB: {signals.count_documents({})}")

if __name__ == "__main__":
    fetch_hhs()
