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

AGENCY_SOURCES = [
    {
        "name": "FDA",
        "agency": "Food and Drug Administration",
        "url": "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml",
        "type": "rss",
        "jurisdiction": "federal",
    },
    {
        "name": "FDA Digital Health",
        "agency": "Food and Drug Administration",
        "url": "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medical-devices/rss.xml",
        "type": "rss",
        "jurisdiction": "federal",
    },
    {
        "name": "NIST",
        "agency": "National Institute of Standards and Technology",
        "url": "https://www.nist.gov/news-events/news/rss.xml",
        "type": "rss",
        "jurisdiction": "federal",
    },
    {
        "name": "CISA",
        "agency": "Cybersecurity and Infrastructure Security Agency",
        "url": "https://www.cisa.gov/news.xml",
        "type": "rss",
        "jurisdiction": "federal",
    },
    {
        "name": "CMS",
        "agency": "Centers for Medicare & Medicaid Services",
        "type": "scrape",
        "scrape_url": "https://www.cms.gov/newsroom",
        "base_url": "https://www.cms.gov",
        "jurisdiction": "federal",
    },
    {
        "name": "ONC",
        "agency": "Office of the National Coordinator for Health IT",
        "type": "scrape",
        "scrape_url": "https://www.healthit.gov/newsroom/news-and-updates",
        "base_url": "https://www.healthit.gov",
        "jurisdiction": "federal",
    },
]

TOPIC_KEYWORDS = {
    "privacy":         ["privacy", "personal data", "consumer data", "data protection"],
    "health_data":     ["health data", "health app", "patient", "medical", "health information", "PHI", "EHR"],
    "ai_ml":           ["artificial intelligence", "machine learning", "algorithm", "automated", "digital health"],
    "ftc_enforcement": ["enforcement", "settlement", "consent decree", "penalty", "violation", "compliance"],
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
        "telehealth", "digital", "information technology", "algorithm",
        "software", "device", "interoperability", "breach", "cyber",
        "medicare", "medicaid", "cms", "fax", "electronic"
    ]
    return any(kw in text for kw in keywords)

def upsert_signal(signal):
    try:
        signals.update_one(
            {"source_url": signal["source_url"]},
            {"$set": signal},
            upsert=True
        )
        return True
    except Exception:
        return False

def fetch_rss(source):
    inserted = 0
    try:
        feed = feedparser.parse(source["url"])
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
                "signal_type": source["name"].lower().replace(" ", "_"),
                "title": title,
                "summary": summary,
                "source_url": url,
                "jurisdiction": source["jurisdiction"],
                "agency": source["agency"],
                "topics": classify_topics(title, summary),
                "signal_score": signal_score,
                "document_type": "Agency Notice",
                "document_number": "",
                "published_date": pub_date,
                "created_at": datetime.now(timezone.utc),
                "processed_at": None,
            }

            if upsert_signal(signal):
                inserted += 1

    except Exception as e:
        print(f"    RSS error: {e}")

    return inserted

def fetch_scrape(source):
    inserted = 0
    try:
        r = requests.get(source["scrape_url"], headers=HEADERS, timeout=15)
        if r.status_code != 200:
            print(f"    Error {r.status_code}")
            return 0

        soup = BeautifulSoup(r.text, "html.parser")
        base = source.get("base_url", "")

        for a in soup.find_all("a", href=True):
            href = a["href"]
            title = a.get_text(strip=True)

            if not title or len(title) < 15:
                continue
            if not any(kw in href.lower() for kw in ["press-release", "fact-sheet", "news", "update", "announcement"]):
                continue
            if not is_relevant(title, ""):
                continue

            url = f"{base}{href}" if href.startswith("/") else href
            if not url.startswith("http"):
                continue

            signal = {
                "signal_type": source["name"].lower().replace(" ", "_"),
                "title": title,
                "summary": "",
                "source_url": url,
                "jurisdiction": source["jurisdiction"],
                "agency": source["agency"],
                "topics": classify_topics(title, ""),
                "signal_score": 0.80,
                "document_type": "Agency Notice",
                "document_number": "",
                "published_date": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
                "processed_at": None,
            }

            if upsert_signal(signal):
                inserted += 1

    except Exception as e:
        print(f"    Scrape error: {e}")

    return inserted

def fetch_federal_agencies():
    total_inserted = 0

    for source in AGENCY_SOURCES:
        print(f"  Fetching: {source['name']}")
        if source["type"] == "rss":
            count = fetch_rss(source)
        else:
            count = fetch_scrape(source)
        print(f"    {count} signals")
        total_inserted += count

    print(f"\nFederal agencies done: {total_inserted} upserted")
    print(f"Total signals in DB: {signals.count_documents({})}")

if __name__ == "__main__":
    fetch_federal_agencies()
