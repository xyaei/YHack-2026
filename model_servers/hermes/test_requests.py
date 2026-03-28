"""
Test POST calls for the Hermes Report Server (port 8002).
Run the server first: uvicorn main:app --port 8002
Then: python test_requests.py
"""

import json
import requests

BASE_URL = "http://localhost:8002"

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

SAMPLE_PREDICTIONS = [
    {
        "topic": "State Health Data Privacy",
        "jurisdiction": "Multi-state",
        "probability_6mo": 0.55,
        "probability_12mo": 0.72,
        "probability_24mo": 0.88,
        "confidence": "high",
        "likely_requirements": [
            "Consumer consent for health data collection",
            "Right to deletion",
            "Prohibition on sale of health data",
            "Private right of action",
        ],
        "reasoning": (
            "Washington's My Health My Data Act (2023) created a replicable template. "
            "4 states have introduced similar bills in 2024-25. Pattern mirrors CCPA diffusion."
        ),
        "recommended_preparation": [
            "Audit health data flows outside HIPAA scope",
            "Update privacy policy",
            "Build adaptable consent mechanisms",
        ],
    },
    {
        "topic": "AI in Healthcare Regulation",
        "jurisdiction": "Federal + CA",
        "probability_6mo": 0.40,
        "probability_12mo": 0.61,
        "probability_24mo": 0.80,
        "confidence": "medium",
        "likely_requirements": [
            "Algorithmic transparency disclosures",
            "FDA SaMD reclassification for clinical AI",
            "Bias auditing requirements",
        ],
        "reasoning": (
            "FDA updated SaMD guidance in 2024. CA AB 3030 and similar bills signal state-level action. "
            "EU AI Act creating global pressure for AI regulation in high-risk sectors."
        ),
        "recommended_preparation": [
            "Review FDA SaMD guidance",
            "Document model inputs/outputs",
            "Engage regulatory counsel",
        ],
    },
]


def test_health():
    print("\n=== GET /health ===")
    r = requests.get(f"{BASE_URL}/health")
    print(f"Status: {r.status_code}")
    print(json.dumps(r.json(), indent=2))


def test_report_with_full_predictions():
    print("\n=== POST /report (full predictions) ===")
    payload = {
        "company": DEMO_COMPANY,
        "predictions": SAMPLE_PREDICTIONS,
    }
    r = requests.post(f"{BASE_URL}/report", json=payload)
    print(f"Status: {r.status_code}")
    print(json.dumps(r.json(), indent=2))


def test_report_with_prediction_ids_only():
    print("\n=== POST /report (prediction_ids only) ===")
    payload = {
        "company": DEMO_COMPANY,
        "prediction_ids": ["State Health Data Privacy", "AI in Healthcare Regulation"],
    }
    r = requests.post(f"{BASE_URL}/report", json=payload)
    print(f"Status: {r.status_code}")
    print(json.dumps(r.json(), indent=2))


def test_report_minimal_company():
    print("\n=== POST /report (minimal company profile) ===")
    payload = {
        "company": {
            "name": "Acme Corp",
            "legal_structure": "Corporation",
            "industry": "FinTech",
            "size": 10,
            "location": "Austin, TX",
            "description": "Small payments startup.",
        },
        "predictions": [],
    }
    r = requests.post(f"{BASE_URL}/report", json=payload)
    print(f"Status: {r.status_code}")
    print(json.dumps(r.json(), indent=2))


if __name__ == "__main__":
    test_health()
    test_report_with_full_predictions()
    test_report_with_prediction_ids_only()
    test_report_minimal_company()
