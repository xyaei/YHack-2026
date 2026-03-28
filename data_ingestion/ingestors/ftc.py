import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

BASE_URL = "https://www.ftc.gov"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

PAGES = [
    "/news-events/news/press-releases",
    "/news-events/news/speeches",
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

def is_relevant(title, summary):
    text = f"{title} {summary}".lower()
    keywords = [
        "health", "privacy", "data", "artificial intelligence", "ai",
        "consumer protection", "medical", "patient", "algorithm", "security",
        "technology", "software", "digital"
    ]
    return any(kw in text for kw in keywords)

def fetch_ftc():
    inserted = 0
    skipped = 0

    for page_path in PAGES:
        url = f"{BASE_URL}{page_path}"
        print(f"Fetching: {url}")

        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code != 200:
                print(f"  Error {r.status_code}")
                continue

            soup = BeautifulSoup(r.text, "html.parser")
            articles = soup.find_all("article")
            print(f"  Found {len(articles)} articles")

            for article in articles:
                # get title and link
                title_tag = article.find("h3")
                if not title_tag:
                    continue
                a_tag = title_tag.find("a")
                if not a_tag:
                    continue

                title = a_tag.get_text(strip=True)
                href = a_tag.get("href", "")
                source_url = f"{BASE_URL}{href}" if href.startswith("/") else href

                # get date
                date_tag = article.find("time")
                if date_tag and date_tag.get("datetime"):
                    try:
                        pub_date = datetime.strptime(
                            date_tag["datetime"][:10], "%Y-%m-%d"
                        ).replace(tzinfo=timezone.utc)
                    except:
                        pub_date = datetime.now(timezone.utc)
                else:
                    pub_date = datetime.now(timezone.utc)

                # get summary
                summary_tag = article.find("div", class_=lambda c: c and "summary" in c)
                summary = summary_tag.get_text(strip=True) if summary_tag else ""

                if not is_relevant(title, summary):
                    continue

                days_old = (datetime.now(timezone.utc) - pub_date).days
                recency_score = max(0, 1 - (days_old / 90))
                signal_score = round((0.9 * 0.6) + (recency_score * 0.4), 3)

                signal = {
                    "signal_type": "ftc",
                    "title": title,
                    "summary": summary,
                    "source_url": source_url,
                    "jurisdiction": "federal",
                    "agency": "Federal Trade Commission",
                    "topics": classify_topics(title, summary),
                    "signal_score": signal_score,
                    "document_type": "Enforcement Action",
                    "document_number": "",
                    "published_date": pub_date,
                    "created_at": datetime.now(timezone.utc),
                    "processed_at": None,
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

        except Exception as e:
            print(f"  Exception: {e}")

    print(f"\nFTC done: {inserted} upserted, {skipped} skipped")
    print(f"Total signals in DB: {signals.count_documents({})}")

if __name__ == "__main__":
    fetch_ftc()
