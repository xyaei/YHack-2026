"""
Entity extraction for all signals.
Extracts agencies, states, laws, and companies mentioned
in signal titles and summaries.
"""

from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
import re
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

# Known federal agencies
AGENCIES = [
    "HHS", "FDA", "FTC", "CMS", "ONC", "CISA", "NIST", "OCR",
    "DOJ", "SEC", "CFPB", "EEOC", "OSHA", "EPA", "CBO", "OMB",
    "NIH", "CDC", "DEA", "ATF", "DHS", "DOL", "DOE", "USDA",
    "Department of Health", "Department of Justice", "Department of Labor",
    "Federal Trade Commission", "Food and Drug Administration",
    "Centers for Medicare", "Office for Civil Rights",
]

# US states full names and abbreviations
STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
}

# Known laws and regulations
LAWS = [
    "HIPAA", "CCPA", "CPRA", "GDPR", "ADA", "HITECH", "CARES Act",
    "ACA", "FDCA", "FTC Act", "COPPA", "FERPA", "GLBA", "SOX",
    "My Health My Data Act", "Colorado AI Act", "Illinois BIPA",
    "California Consumer Privacy Act", "Health Insurance Portability",
    "American Recovery and Reinvestment", "21st Century Cures",
    "No Surprises Act", "Inflation Reduction Act",
]

# Bill number pattern
BILL_PATTERN = re.compile(r'\b(H\.?R\.?|S\.?|H\.?J\.?Res\.?|S\.?J\.?Res\.?)\s*(\d+)\b', re.IGNORECASE)

def extract_entities(title, summary):
    text = f"{title} {summary}"
    text_lower = text.lower()

    entities = {
        "agencies": [],
        "states": [],
        "laws": [],
        "bill_references": [],
    }

    # extract agencies
    for agency in AGENCIES:
        if agency.lower() in text_lower:
            if agency not in entities["agencies"]:
                entities["agencies"].append(agency)

    # extract states
    for abbrev, full_name in STATES.items():
        if abbrev in text or full_name in text:
            if abbrev not in entities["states"]:
                entities["states"].append(abbrev)

    # extract laws
    for law in LAWS:
        if law.lower() in text_lower:
            if law not in entities["laws"]:
                entities["laws"].append(law)

    # extract bill references
    bill_matches = BILL_PATTERN.findall(text)
    for match in bill_matches:
        bill_ref = f"{match[0].replace('.', '').replace(' ', '')}{match[1]}"
        if bill_ref not in entities["bill_references"]:
            entities["bill_references"].append(bill_ref)

    return entities

def run_entity_extraction(batch_size=500):
    # get signals that haven't been entity-extracted yet
    total_unprocessed = signals.count_documents({"entities": {"$exists": False}})
    print(f"Signals needing entity extraction: {total_unprocessed}")

    processed = 0
    has_entities = 0

    while True:
        batch = list(
            signals.find(
                {"entities": {"$exists": False}},
                {"_id": 1, "title": 1, "summary": 1}
            ).limit(batch_size)
        )

        if not batch:
            break

        for signal in batch:
            title = signal.get("title", "")
            summary = signal.get("summary", "")
            entities = extract_entities(title, summary)

            signals.update_one(
                {"_id": signal["_id"]},
                {"$set": {
                    "entities": entities,
                    "entities_extracted_at": datetime.now(timezone.utc),
                }}
            )
            processed += 1
            if any(entities.values()):
                has_entities += 1

        print(f"  Processed {processed}/{total_unprocessed} signals...")

        if processed >= total_unprocessed:
            break

    print(f"\nEntity extraction complete:")
    print(f"  Processed: {processed}")
    print(f"  Signals with at least one entity: {has_entities}")

    # show breakdown
    print("\nEntity coverage:")
    for entity_type in ["agencies", "states", "laws", "bill_references"]:
        count = signals.count_documents({f"entities.{entity_type}": {"$not": {"$size": 0}}})
        print(f"  {entity_type:<20} {count} signals")

    # show examples
    print("\nExample extractions:")
    examples = list(
        signals.find(
            {
                "entities.laws": {"$not": {"$size": 0}},
                "entities.states": {"$not": {"$size": 0}},
            },
            {"_id": 0, "title": 1, "entities": 1}
        ).limit(3)
    )
    for ex in examples:
        print(f"\n  Title: {ex['title'][:70]}")
        print(f"  Laws: {ex['entities'].get('laws', [])}")
        print(f"  States: {ex['entities'].get('states', [])}")
        print(f"  Agencies: {ex['entities'].get('agencies', [])}")

if __name__ == "__main__":
    run_entity_extraction()
