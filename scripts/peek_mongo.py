#!/usr/bin/env python3
"""
Peek at the top N documents from each MongoDB collection.
Usage: python scripts/peek_mongo.py [--limit 5] [--collection signals]
"""

import os
import argparse
import json
from pathlib import Path
import certifi
from pymongo import MongoClient

# Load backend/.env if env vars aren't already set
_env_file = Path(__file__).parent.parent / "backend" / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "foreseen")

COLLECTIONS = ["signals", "predictions", "reports", "companies"]


def serialize(doc: dict) -> dict:
    """Convert ObjectId and datetime to strings for printing."""
    result = {}
    for k, v in doc.items():
        if hasattr(v, "isoformat"):
            result[k] = v.isoformat()
        else:
            result[k] = str(v) if not isinstance(v, (str, int, float, bool, list, dict, type(None))) else v
    return result


def peek(collection: str, limit: int, client: MongoClient):
    db = client[MONGO_DB]
    docs = list(db[collection].find().limit(limit))
    print(f"\n{'='*60}")
    print(f"  {collection}  ({len(docs)} shown, limit={limit})")
    print(f"{'='*60}")
    if not docs:
        print("  (empty)")
        return
    for doc in docs:
        print(json.dumps(serialize(doc), indent=2, default=str))
        print("-" * 40)


def main():
    parser = argparse.ArgumentParser(description="Peek at MongoDB collections")
    parser.add_argument("--limit", type=int, default=3, help="Documents per collection (default: 3)")
    parser.add_argument("--collection", default=None, help="Only show this collection")
    args = parser.parse_args()

    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    targets = [args.collection] if args.collection else COLLECTIONS

    for col in targets:
        peek(col, args.limit, client)

    client.close()


if __name__ == "__main__":
    main()
