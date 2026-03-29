"""
Full pipeline test: backend /analyze endpoint
Usage: python scripts/test_pipeline.py
"""

import json
import sys
import time
import httpx

BASE_URL = "http://localhost:8000"

COMPANY = {
    "name": "HealthBridge AI",
    "legal_structure": "LLC",
    "industry": "Healthcare SaaS",
    "size": 50,
    "location": "CA",
    "description": "Clinical decision support AI for healthcare providers",
    "operating_states": ["CA", "NY", "TX", "FL"],
    "handles_phi": True,
    "handles_pii": True,
    "uses_ai_ml": True,
    "certifications": ["HIPAA"],
    "b2b": True,
    "funding_stage": "Seed",
}

SCENARIOS = [
    {
        "topic": "State Health Data Privacy",
        "jurisdiction": "CA",
        "topic_tags": ["health_data", "privacy"],
        "full_report": True,
    },
    # {
    #     "topic": "AI in Healthcare Regulation",
    #     "jurisdiction": "federal",
    #     "topic_tags": ["ai_ml", "health_data"],
    # },
    # {
    #     "topic": "FTC Health App Enforcement",
    #     "jurisdiction": "federal",
    #     "topic_tags": ["ftc_enforcement", "privacy"],
    # },
]


def check_health():
    for service, url in [
        ("backend", f"{BASE_URL}/health"),
        ("k2", "http://localhost:8001/health"),
        ("hermes", "http://localhost:8002/health"),
    ]:
        try:
            r = httpx.get(url, timeout=5)
            print(f"  [{service}] {r.json()}")
        except Exception as e:
            print(f"  [{service}] UNREACHABLE — {e}")
            sys.exit(1)


def run_scenario(scenario: dict):
    """Returns the response data dict on success, None on failure."""
    payload = {"company": COMPANY, **scenario}
    print(f"\n  topic={scenario['topic']}  jurisdiction={scenario['jurisdiction']}")

    start = time.time()
    r = httpx.post(f"{BASE_URL}/analyze/", json=payload, timeout=120)
    elapsed = round(time.time() - start, 1)

    if r.status_code != 200:
        print(f"  FAILED {r.status_code}: {r.text[:1000]}")
        return None

    data = r.json()
    pred = data["prediction"]
    report = data["report"]

    print(f"  signals_used:     {data['signals_used']}")
    print(f"  probability_12mo: {round(pred['probability_12mo'] * 100)}%")
    print(f"  confidence:       {pred['confidence']}")
    print(f"  headline:         {report['headline']}")
    print(f"  priority_actions: {len(report['priority_actions'])}")
    print(f"  elapsed:          {elapsed}s")

    if scenario.get("full_report"):
        print("\n" + "─" * 60)
        print("FULL REPORT")
        print("─" * 60)
        print(f"\n{report['headline']}")
        print(f"\n{report['executive_summary']}")
        for section in report["sections"]:
            print(f"\n▸ {section['title']}")
            print(f"  What's happening: {section['whats_happening']}")
            print(f"  Why it matters:   {section['why_it_matters']}")
            print(f"  What to do:       {section['what_to_do']}")
        print("\nPRIORITY ACTIONS:")
        for action in report["priority_actions"]:
            print(f"  [{action['priority'].upper()}] {action['action']}")
            print(f"         Deadline: {action['deadline']} | Effort: {action['effort']}")
        print("\nPREDICTION REASONING:")
        print(f"  {pred['reasoning']}")
        print("─" * 60)

    return data


def run_chat(signals: list, prediction: dict):
    """Send a follow-up chat message using context from the analyze response."""
    payload = {
        "message": "Based on this analysis, what should be my top 3 immediate action items?",
        "history": [],
        "signals": signals,
        "predictions": [prediction],
        "company_context": f"{COMPANY['name']} — {COMPANY['description']}",
    }

    start = time.time()
    r = httpx.post(f"{BASE_URL}/chat/", json=payload, timeout=60)
    elapsed = round(time.time() - start, 1)

    if r.status_code != 200:
        print(f"  CHAT FAILED {r.status_code}: {r.text[:500]}")
        return False

    reply = r.json()["reply"]
    print(f"  chat reply ({elapsed}s):\n  {reply[:400]}")
    return True


def main():
    print("=" * 60)
    print("FORESEEN — Full Pipeline Test")
    print("=" * 60)

    print("\n[1/3] Health checks")
    check_health()

    print("\n[2/3] Analyze scenarios")
    passed = 0
    first_result = None
    for scenario in SCENARIOS:
        data = run_scenario(scenario)
        if data is not None:
            passed += 1
            if first_result is None:
                first_result = data

    print(f"\n[3/3] Chat (using context from first analyze result)")
    chat_passed = False
    if first_result:
        chat_passed = run_chat(first_result["signals"], first_result["prediction"])
    else:
        print("  SKIPPED — no analyze result available")

    print(f"\n{'=' * 60}")
    print(f"Analyze: {passed}/{len(SCENARIOS)} passed")
    print(f"Chat:    {'passed' if chat_passed else 'FAILED'}")
    print("=" * 60)

    if passed < len(SCENARIOS) or not chat_passed:
        sys.exit(1)


if __name__ == "__main__":
    main()
