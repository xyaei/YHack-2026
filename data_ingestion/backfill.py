import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pymongo import MongoClient
from dotenv import load_dotenv
import requests

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

# ── Federal Register backfill ─────────────────────────────────────────────────

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
    recency_score = max(0, 1 - (days_old / (365 * 5)))
    return round((type_score * 0.6) + (recency_score * 0.4), 3)

def backfill_federal_register():
    from_date = "2021-01-01"
    BASE_URL = "https://www.federalregister.gov/api/v1/documents"
    inserted = 0
    skipped = 0
    seen_urls = set()

    print(f"Federal Register backfill from {from_date}")

    for term in SEARCH_TERMS:
        offset = 0
        print(f"  Term: '{term}'")
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
                r = requests.get(BASE_URL, params=params, timeout=15)
                if r.status_code != 200:
                    print(f"    Error {r.status_code}")
                    break

                data = r.json()
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
                    except Exception:
                        skipped += 1

                total = data.get("count", 0)
                offset += len(results)
                print(f"    {offset}/{total}")
                if offset >= total or offset >= 2000:
                    break

            except Exception as e:
                print(f"    Exception: {e}")
                break

    print(f"  Federal Register backfill done: {inserted} upserted, {skipped} skipped")
    return inserted

# ── Congress backfill ─────────────────────────────────────────────────────────

def backfill_congress():
    from ingestors.congress import classify_topics, is_relevant
    API_KEY = os.getenv("CONGRESS_API_KEY")
    BASE_URL = "https://api.congress.gov/v3/bill"

    # 115th (2017) through 119th (2026)
    CONGRESSES = [115, 116, 117, 118, 119]

    inserted = 0
    skipped = 0

    print("Congress backfill — 115th through 119th congress")

    for congress_num in CONGRESSES:
        print(f"  Congress: {congress_num}th")
        offset = 0

        while True:
            params = {
                "limit": 250,
                "offset": offset,
                "sort": "updateDate+desc",
                "api_key": API_KEY,
                "format": "json",
            }

            try:
                r = requests.get(f"{BASE_URL}/{congress_num}", params=params, timeout=15)
                if r.status_code != 200:
                    print(f"    Error {r.status_code}")
                    break

                data = r.json()
                bills = data.get("bills", [])
                if not bills:
                    break

                for bill in bills:
                    title = bill.get("title") or ""
                    latest_action = bill.get("latestAction", {})
                    last_action_text = latest_action.get("text", "")

                    if not is_relevant(title, last_action_text):
                        continue

                    bill_type = bill.get("type", "")
                    bill_number = bill.get("number", "")
                    origin_chamber = bill.get("originChamber", "")
                    source_url = f"https://www.congress.gov/bill/{congress_num}th-congress/{bill_type.lower()}-bill/{bill_number}"

                    action_date_str = latest_action.get("actionDate", "")
                    try:
                        pub_date = datetime.strptime(action_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    except:
                        pub_date = datetime.now(timezone.utc)

                    days_old = (datetime.now(timezone.utc) - pub_date).days
                    recency_score = max(0, 1 - (days_old / (365 * 5)))
                    signal_score = round((0.75 * 0.6) + (recency_score * 0.4), 3)

                    signal = {
                        "signal_type": "congress",
                        "title": title,
                        "summary": last_action_text,
                        "source_url": source_url,
                        "jurisdiction": "federal",
                        "agency": f"Congress - {origin_chamber}",
                        "topics": classify_topics(title, last_action_text),
                        "signal_score": signal_score,
                        "document_type": f"Bill ({bill_type})",
                        "document_number": f"{congress_num}-{bill_type}-{bill_number}",
                        "published_date": pub_date,
                        "created_at": datetime.now(timezone.utc),
                        "processed_at": None,
                        "metadata": {
                            "congress": congress_num,
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
                    except Exception:
                        skipped += 1

                total = data.get("pagination", {}).get("count", 0)
                offset += len(bills)
                print(f"    {offset}/{total} processed ({inserted} relevant so far)")
                if offset >= total or offset >= 5000:
                    break

            except Exception as e:
                print(f"    Exception: {e}")
                break

    print(f"  Congress backfill done: {inserted} upserted, {skipped} skipped")
    return inserted

# ── Run backfill ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    start = datetime.now(timezone.utc)
    print("=" * 50)
    print("FORESEEN historical backfill")
    print(f"Started: {start.strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 50)

    print("\n[1/2] Federal Register (2021-present)")
    fr_count = backfill_federal_register()

    print("\n[2/2] Congress (115th-119th, 2017-present)")
    cong_count = backfill_congress()

    from pipeline.velocity import compute_velocity
    print("\n[Updating velocity scores]")
    compute_velocity()

    end = datetime.now(timezone.utc)
    elapsed = round((end - start).total_seconds(), 1)
    print("\n" + "=" * 50)
    print(f"Backfill complete in {elapsed}s")
    print(f"Federal Register: {fr_count} signals")
    print(f"Congress: {cong_count} signals")
    print(f"Total in DB: {signals.count_documents({})}")
    print("=" * 50)
