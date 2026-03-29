import re
import feedparser
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
from email.utils import parsedate_to_datetime
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

# Google Alerts RSS feeds
# These are public RSS feeds from Google Alerts for regulatory keywords
# Format: https://www.google.com/alerts/feeds/{user_id}/{alert_id}
# Since we can't auto-generate these, we use Google News RSS instead
# which gives similar results without needing a Google account

GOOGLE_NEWS_FEEDS = [
    {
        "query": "HIPAA+regulation",
        "url": "https://news.google.com/rss/search?q=HIPAA+regulation&hl=en-US&gl=US&ceid=US:en",
        "topics": ["hipaa", "health_data"],
    },
    {
        "query": "health+data+privacy+law",
        "url": "https://news.google.com/rss/search?q=health+data+privacy+law&hl=en-US&gl=US&ceid=US:en",
        "topics": ["privacy", "health_data"],
    },
    {
        "query": "AI+healthcare+regulation",
        "url": "https://news.google.com/rss/search?q=AI+healthcare+regulation&hl=en-US&gl=US&ceid=US:en",
        "topics": ["ai_ml", "health_data"],
    },
    {
        "query": "FTC+health+enforcement",
        "url": "https://news.google.com/rss/search?q=FTC+health+enforcement+2026&hl=en-US&gl=US&ceid=US:en",
        "topics": ["ftc_enforcement"],
    },
    {
        "query": "state+health+privacy+bill",
        "url": "https://news.google.com/rss/search?q=state+health+privacy+bill+2026&hl=en-US&gl=US&ceid=US:en",
        "topics": ["privacy", "health_data"],
    },
    {
        "query": "patient+data+protection+law",
        "url": "https://news.google.com/rss/search?q=patient+data+protection+law&hl=en-US&gl=US&ceid=US:en",
        "topics": ["health_data", "privacy"],
    },
    {
        "query": "digital+health+regulation+2026",
        "url": "https://news.google.com/rss/search?q=digital+health+regulation+2026&hl=en-US&gl=US&ceid=US:en",
        "topics": ["health_data", "ai_ml"],
    },
    {
        "query": "healthcare+AI+compliance",
        "url": "https://news.google.com/rss/search?q=healthcare+AI+compliance+regulation&hl=en-US&gl=US&ceid=US:en",
        "topics": ["ai_ml", "health_data"],
    },
]

TOPIC_KEYWORDS = {
    "privacy":         ["privacy", "personal data", "consumer data", "data protection"],
    "health_data":     ["health data", "health app", "patient", "medical", "health information", "PHI"],
    "ai_ml":           ["artificial intelligence", "machine learning", "algorithm", "automated"],
    "ftc_enforcement": ["FTC", "enforcement", "settlement", "consent decree", "penalty"],
    "hipaa":           ["HIPAA", "health insurance", "protected health information"],
}

def strip_html(text):
    """Remove HTML tags from text."""
    return re.sub(r"<[^>]+>", "", text).strip()

def classify_topics(title, summary, default_topics=None):
    text = f"{title} {summary}".lower()
    matched = []
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(kw.lower() in text for kw in keywords):
            matched.append(topic)
    return matched if matched else (default_topics or ["general"])

def fetch_google_news():
    total = 0

    for feed_config in GOOGLE_NEWS_FEEDS:
        try:
            feed = feedparser.parse(feed_config["url"])
            inserted = 0

            for entry in feed.entries:
                title = strip_html(entry.get("title", ""))
                summary = strip_html(entry.get("summary", "") or entry.get("description", ""))
                url = entry.get("link", "")

                if not url or not title:
                    continue

                try:
                    pub_date = parsedate_to_datetime(entry.get("published", "")).replace(tzinfo=timezone.utc)
                except:
                    pub_date = datetime.now(timezone.utc)

                days_old = (datetime.now(timezone.utc) - pub_date).days
                recency_score = max(0, 1 - (days_old / 90))
                signal_score = round((0.55 * 0.6) + (recency_score * 0.4), 3)

                signal = {
                    "signal_type": "google_news",
                    "title": title,
                    "summary": summary,
                    "source_url": url,
                    "jurisdiction": "federal",
                    "agency": "Google News",
                    "topics": classify_topics(title, summary, feed_config["topics"]),
                    "signal_score": signal_score,
                    "document_type": "News Article",
                    "document_number": "",
                    "published_date": pub_date,
                    "created_at": datetime.now(timezone.utc),
                    "processed_at": None,
                    "metadata": {
                        "query": feed_config["query"],
                    }
                }

                try:
                    signals.update_one(
                        {"source_url": url},
                        {"$set": signal},
                        upsert=True
                    )
                    inserted += 1
                except Exception:
                    pass

            if inserted > 0:
                print(f"    '{feed_config['query']}': {inserted} signals")
            total += inserted

        except Exception as e:
            print(f"    Exception for '{feed_config['query']}': {e}")

    print(f"\nGoogle News done: {total} upserted")
    print(f"Total signals in DB: {signals.count_documents({})}")

if __name__ == "__main__":
    fetch_google_news()
