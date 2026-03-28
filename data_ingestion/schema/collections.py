from datetime import datetime, timezone
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

    # signals
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

    # predictions
    if "predictions" not in existing:
        db.create_collection("predictions")
    db["predictions"].create_indexes([
        IndexModel([("topic", ASCENDING), ("jurisdiction", ASCENDING)], name="topic_jurisdiction"),
        IndexModel([("probability_12mo", DESCENDING)], name="probability_12mo_desc"),
        IndexModel([("generated_at", DESCENDING)], name="generated_at_desc"),
        IndexModel([("confidence", ASCENDING)], name="confidence"),
    ])
    print("predictions collection ready")

    # reports
    if "reports" not in existing:
        db.create_collection("reports")
    db["reports"].create_indexes([
        IndexModel([("company_id", ASCENDING), ("generated_at", DESCENDING)], name="company_reports"),
        IndexModel([("report_type", ASCENDING)], name="report_type"),
    ])
    print("reports collection ready")

    # companies
    if "companies" not in existing:
        db.create_collection("companies")
    db["companies"].create_indexes([
        IndexModel([("company_id", ASCENDING)], unique=True, name="company_id_unique"),
    ])
    print("companies collection ready")

    return db

def seed_demo_company(db):
    company = {
        "company_id": "demo_company_001",
        "name": "HealthBridge AI",
        "industry": {
            "primary": "Healthcare SaaS",
            "naics_code": "621999",
            "vertical": "Digital Health"
        },
        "jurisdictions": {
            "headquarters": "CA",
            "operating_states": ["CA", "NY", "TX", "FL"],
            "federal": True
        },
        "business_model": {
            "type": "B2B",
            "customers": "Healthcare providers",
            "data_handling": ["PHI", "PII"],
            "uses_ai_ml": True,
            "ai_description": "Clinical decision support"
        },
        "compliance_status": {
            "hipaa": True,
            "soc2_in_progress": True,
            "certifications": ["HIPAA"]
        },
        "risk_profile": {
            "key_concerns": [
                "State privacy laws",
                "AI regulations",
                "HIPAA updates"
            ],
            "topics_to_monitor": [
                "privacy",
                "health_data",
                "ai_ml",
                "ftc_enforcement",
                "hipaa"
            ]
        },
        "created_at": datetime.now(timezone.utc)
    }
    db["companies"].update_one(
        {"company_id": "demo_company_001"},
        {"$set": company},
        upsert=True
    )
    print("Demo company seeded: HealthBridge AI")

if __name__ == "__main__":
    db = setup_collections()
    seed_demo_company(db)
    print("\nFinal collections:", db.list_collection_names())
