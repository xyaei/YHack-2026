import sys
import os
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ingestors.federal_register import fetch_federal_register
from ingestors.congress import fetch_congress
from ingestors.ftc import fetch_ftc
from ingestors.news import fetch_news
from ingestors.state_legislatures import fetch_state_legislatures
from ingestors.federal_agencies import fetch_federal_agencies
from ingestors.reddit import fetch_reddit
from ingestors.google_alerts import fetch_google_news
from pipeline.velocity import compute_velocity
from pipeline.embeddings import embed_signals

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]

def run_pipeline(days_back=28):
    start = datetime.now(timezone.utc)
    print("=" * 50)
    print(f"FORESEEN data pipeline started")
    print(f"Time: {start.strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"Days back: {days_back}")
    print("=" * 50)

    print("\n[1/9] Federal Register")
    fetch_federal_register(days_back=days_back)

    print("\n[2/9] Congress.gov")
    fetch_congress(days_back=days_back)

    print("\n[3/9] FTC")
    fetch_ftc()

    print("\n[4/9] News API")
    fetch_news(days_back=days_back)

    print("\n[5/9] State Legislatures (all 50 states)")
    fetch_state_legislatures()

    print("\n[6/9] Federal Agencies (FDA, CMS, ONC, NIST, CISA)")
    fetch_federal_agencies()

    print("\n[7/9] Reddit")
    fetch_reddit()

    print("\n[8/9] Google News")
    fetch_google_news()

    print("\n[9/10] Signal Velocity")
    compute_velocity()

    print("\n[10/10] Embeddings")
    embed_signals()

    end = datetime.now(timezone.utc)
    elapsed = round((end - start).total_seconds(), 1)
    total = db["signals"].count_documents({})
    print("\n" + "=" * 50)
    print(f"Pipeline complete in {elapsed}s")
    print(f"Total signals in DB: {total}")
    print("=" * 50)

if __name__ == "__main__":
    run_pipeline()
