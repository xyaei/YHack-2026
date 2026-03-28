from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from pymongo.operations import IndexModel
import os
from dotenv import load_dotenv

load_dotenv()

def get_db():
    client = MongoClient(os.getenv("MONGODB_URI"))
    return client[os.getenv("DB_NAME", "foreseen")]

def setup_collections():
    db = get_db()
    existing = db.list_collection_names()

    if "signals" not in existing:
        db.create_collection("signals")
    db["signals"].create_indexes([
        IndexModel([("source_url", ASCENDING)], unique=True, name="source_url_unique"),
        IndexModel([("signal_type", ASCENDING)], name="signal_type"),
        IndexModel([("jurisdiction", ASCENDING)], name="jurisdiction"),
        IndexModel([("topics", ASCENDING)], name="topics"),
        IndexModel([("published_date", DESCENDING)], name="published_date_desc"),
        IndexModel([("signal_score", DESCENDING)], name="signal_score_desc"),
        IndexModel([("title", TEXT), ("summary", TEXT)], name="fulltext"),
    ])
    print("signals collection ready")
    return db

if __name__ == "__main__":
    db = setup_collections()
    print("\nFinal collections:", db.list_collection_names())
