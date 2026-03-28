"""
Test POST calls for the K2 Prediction Server (port 8001).
Uses mock signals that would normally come from MongoDB.

Run the server first: uvicorn main:app --port 8001
Then: python test_requests.py
"""

import json
import requests

BASE_URL = "http://localhost:8001"

DEMO_COMPANY = {
    "name": "CareIQ Health",
    "legal_structure": "LLC",
    "industry": "Healthcare SaaS",
    "size": 45,
    "location": "San Francisco, CA",
    "description": "B2B clinical decision support platform using AI to assist healthcare providers.",
    "operating_states": ["CA", "NY", "TX", "FL"],
    "handles_pii": True,
    "handles_phi": True,
    "uses_ai_ml": True,
    "b2b": True,
    "certifications": ["HIPAA"],
    "has_compliance_team": False,
    "funding_stage": "Series A",
}

# Mock signals as they would come out of MongoDB (signals collection)
MOCK_SIGNALS_HEALTH_DATA = [
    {
        "title": "Washington My Health My Data Act — Final Rule",
        "summary": (
            "WA enacted broad health data privacy law covering consumer health data outside HIPAA scope. "
            "Requires consent for collection, prohibits sale, grants deletion rights, includes private right of action."
        ),
        "source_url": "https://app.leg.wa.gov/billsummary?BillNumber=1155&Year=2023",
        "jurisdiction": "WA",
        "agency": "Washington State Legislature",
        "topics": ["health_data", "privacy"],
        "signal_score": 0.95,
        "published_date": "2023-04-27",
    },
    {
        "title": "Connecticut SB 3 — Health Data Privacy Bill Introduced",
        "summary": (
            "Connecticut introduced a bill mirroring the WA My Health My Data Act. "
            "Targets apps and platforms collecting health data not regulated by HIPAA."
        ),
        "source_url": "https://www.cga.ct.gov/2024/TOB/S/PDF/2024SB-00003-R00-SB.PDF",
        "jurisdiction": "CT",
        "agency": "Connecticut General Assembly",
        "topics": ["health_data", "privacy"],
        "signal_score": 0.78,
        "published_date": "2024-01-10",
    },
    {
        "title": "FTC Enforcement Action — GoodRx Health Data Sharing",
        "summary": (
            "FTC took action against GoodRx for sharing health data with advertisers without consent. "
            "$1.5M civil penalty. Signals active federal enforcement even without new legislation."
        ),
        "source_url": "https://www.ftc.gov/news-events/news/press-releases/2023/02/ftc-takes-action-against-goodrx",
        "jurisdiction": "federal",
        "agency": "Federal Trade Commission",
        "topics": ["health_data", "ftc_enforcement"],
        "signal_score": 0.88,
        "published_date": "2023-02-01",
    },
    {
        "title": "Nevada AB 381 — Consumer Health Data Protection Act",
        "summary": (
            "Nevada bill in committee that would require explicit consent for health data processing "
            "and ban sharing health data for advertising. Similar scope to WA law."
        ),
        "source_url": "https://www.leg.state.nv.us/App/NELIS/REL/82nd2023/Bill/AB381",
        "jurisdiction": "NV",
        "agency": "Nevada Legislature",
        "topics": ["health_data", "privacy"],
        "signal_score": 0.65,
        "published_date": "2023-03-15",
    },
    {
        "title": "HHS OCR — HIPAA Right of Access Enforcement Surge",
        "summary": (
            "HHS Office for Civil Rights has significantly increased HIPAA enforcement actions "
            "related to patient right of access. 40+ settlements in 2023 alone."
        ),
        "source_url": "https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/index.html",
        "jurisdiction": "federal",
        "agency": "HHS Office for Civil Rights",
        "topics": ["health_data", "hipaa"],
        "signal_score": 0.82,
        "published_date": "2023-12-01",
    },
]

MOCK_SIGNALS_AI_HEALTHCARE = [
    {
        "title": "FDA — Updated Guidance on AI/ML-Based Software as a Medical Device (SaMD)",
        "summary": (
            "FDA released updated guidance clarifying when AI/ML clinical decision support tools "
            "qualify as regulated medical devices. Emphasizes transparency, bias testing, and change management."
        ),
        "source_url": "https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-and-machine-learning-samd",
        "jurisdiction": "federal",
        "agency": "FDA",
        "topics": ["ai_ml", "health_data"],
        "signal_score": 0.92,
        "published_date": "2024-03-22",
    },
    {
        "title": "California AB 3030 — AI in Healthcare Disclosure Requirements",
        "summary": (
            "California bill requiring healthcare providers to disclose when AI generates clinical content. "
            "Applies to tools used in patient communication and treatment recommendations."
        ),
        "source_url": "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB3030",
        "jurisdiction": "CA",
        "agency": "California Legislature",
        "topics": ["ai_ml", "health_data"],
        "signal_score": 0.80,
        "published_date": "2024-02-15",
    },
    {
        "title": "EU AI Act — High-Risk AI in Healthcare Provisions",
        "summary": (
            "EU AI Act classifies clinical decision support AI as high-risk. "
            "Requires conformity assessment, human oversight, and audit trail. "
            "Creates global pressure for similar US requirements."
        ),
        "source_url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689",
        "jurisdiction": "EU",
        "agency": "European Parliament",
        "topics": ["ai_ml"],
        "signal_score": 0.75,
        "published_date": "2024-08-01",
    },
]

MOCK_SIGNALS_PRIVACY = [
    {
        "title": "Texas Data Privacy and Security Act (TDPSA) — Signed into Law",
        "summary": (
            "Texas enacted a comprehensive consumer privacy law effective July 2024. "
            "Covers businesses processing personal data of 100k+ Texas consumers. "
            "Grants rights to access, correct, delete, and opt out of targeted advertising."
        ),
        "source_url": "https://capitol.texas.gov/BillLookup/History.aspx?LegSess=88R&Bill=HB4",
        "jurisdiction": "TX",
        "agency": "Texas Legislature",
        "topics": ["privacy"],
        "signal_score": 0.90,
        "published_date": "2023-06-18",
    },
    {
        "title": "Florida SB 262 — Digital Rights Act",
        "summary": (
            "Florida enacted its own privacy law with unique provisions around biometric data and children. "
            "Effective July 2024. Applies to large data controllers."
        ),
        "source_url": "https://www.flsenate.gov/Session/Bill/2023/262",
        "jurisdiction": "FL",
        "agency": "Florida Legislature",
        "topics": ["privacy"],
        "signal_score": 0.85,
        "published_date": "2023-06-06",
    },
]


def pretty(r: requests.Response):
    print(f"Status: {r.status_code}")
    try:
        print(json.dumps(r.json(), indent=2))
    except Exception:
        print(r.text)


def test_health():
    print("\n=== GET /health ===")
    r = requests.get(f"{BASE_URL}/health")
    pretty(r)


def test_predict_health_data_privacy():
    print("\n=== POST /predict — State Health Data Privacy (multi-state) ===")
    payload = {
        "topic": "State Health Data Privacy Laws",
        "jurisdiction": "Multi-state (WA model spreading)",
        "company": DEMO_COMPANY,
        "signals": MOCK_SIGNALS_HEALTH_DATA,
    }
    r = requests.post(f"{BASE_URL}/predict", json=payload)
    pretty(r)


def test_predict_ai_healthcare():
    print("\n=== POST /predict — AI in Healthcare Regulation ===")
    payload = {
        "topic": "AI/ML Regulation in Healthcare",
        "jurisdiction": "Federal + CA",
        "company": DEMO_COMPANY,
        "signals": MOCK_SIGNALS_AI_HEALTHCARE,
    }
    r = requests.post(f"{BASE_URL}/predict", json=payload)
    pretty(r)


def test_predict_comprehensive_privacy():
    print("\n=== POST /predict — Comprehensive State Privacy Laws (TX, FL) ===")
    payload = {
        "topic": "Comprehensive State Privacy Laws",
        "jurisdiction": "TX, FL",
        "company": DEMO_COMPANY,
        "signals": MOCK_SIGNALS_PRIVACY,
    }
    r = requests.post(f"{BASE_URL}/predict", json=payload)
    pretty(r)


def test_predict_no_signals():
    print("\n=== POST /predict — No signals (edge case) ===")
    payload = {
        "topic": "HIPAA Enforcement Trends",
        "jurisdiction": "Federal",
        "company": DEMO_COMPANY,
        "signals": [],
    }
    r = requests.post(f"{BASE_URL}/predict", json=payload)
    pretty(r)


if __name__ == "__main__":
    test_health()
    test_predict_health_data_privacy()
    test_predict_ai_healthcare()
    test_predict_comprehensive_privacy()
    test_predict_no_signals()
