"""
Hermes Report Server — port 8002
Calls the Nous Research Hermes API (OpenAI-compatible) at inference-api.nousresearch.com.
"""

import os
import json
import re
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI(title="Hermes Report Server")

HERMES_API_KEY = os.getenv("HERMES_API_KEY")
HERMES_BASE_URL = os.getenv("HERMES_BASE_URL_MODEL", "https://inference-api.nousresearch.com/v1")
HERMES_MODEL = os.getenv("HERMES_MODEL", "Hermes-4.3-36B")

client = OpenAI(api_key=HERMES_API_KEY or "stub", base_url=HERMES_BASE_URL)


# ── Schemas (inline so this server is standalone) ────────────────────────────

class CompanyProfile(BaseModel):
    name: str
    legal_structure: str
    industry: str
    size: int
    location: str
    description: str
    revenue_range: Optional[str] = None
    operating_states: List[str] = []
    operating_countries: List[str] = ["US"]
    handles_pii: bool = False
    handles_phi: bool = False
    handles_financial_data: bool = False
    uses_ai_ml: bool = False
    b2b: bool = True
    customer_count: Optional[int] = None
    certifications: List[str] = []
    has_legal_counsel: bool = False
    has_compliance_team: bool = False
    funding_stage: Optional[str] = None
    is_public: bool = False


class ReportRequest(BaseModel):
    company: CompanyProfile
    prediction_ids: List[str] = []
    predictions: Optional[List[dict]] = []  # full prediction objects from K2


class ReportSection(BaseModel):
    title: str
    whats_happening: str
    why_it_matters: str
    what_to_do: str


class PriorityAction(BaseModel):
    priority: str  # high | medium | low
    action: str
    deadline: str
    effort: str


class ReportResponse(BaseModel):
    headline: str
    executive_summary: str
    sections: List[ReportSection]
    priority_actions: List[PriorityAction]
    predictions_used: List[str]


# ── Prompt ────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a regulatory advisor writing for a busy small business owner who is not a lawyer.
Write in plain English — no jargon, no legalese. Be specific to the company's situation.
Return ONLY valid JSON — no prose, no markdown fences.\
"""

def build_user_prompt(req: ReportRequest) -> str:
    c = req.company

    predictions_text = ""
    if req.predictions:
        for p in req.predictions:
            predictions_text += f"""
Topic: {p.get('topic')} ({p.get('jurisdiction')})
12-month probability: {int(p.get('probability_12mo', 0) * 100)}%
Confidence: {p.get('confidence')}
Likely requirements: {', '.join(p.get('likely_requirements', []))}
Reasoning: {p.get('reasoning', '')}
Recommended preparation: {', '.join(p.get('recommended_preparation', []))}
"""
    elif req.prediction_ids:
        predictions_text = f"Topics to cover: {', '.join(req.prediction_ids)}"
    else:
        predictions_text = "No predictions provided."

    topics_json = json.dumps(
        [p.get("topic") for p in req.predictions] if req.predictions else req.prediction_ids
    )

    return f"""Write a regulatory briefing for the company below based on the predictions provided.

COMPANY
Name: {c.name}
Industry: {c.industry}
Location: {c.location}
Operating states: {', '.join(c.operating_states) or 'N/A'}
Handles PHI: {c.handles_phi} | PII: {c.handles_pii} | Uses AI/ML: {c.uses_ai_ml}
Certifications: {', '.join(c.certifications) or 'None'}
Description: {c.description}

REGULATORY PREDICTIONS:
{predictions_text}

Return ONLY a JSON object with this exact structure:
{{
  "headline": "<attention-grabbing one-liner summarising the biggest risk>",
  "executive_summary": "<2-3 sentences max, plain English>",
  "sections": [
    {{
      "title": "<section title>",
      "whats_happening": "<plain English explanation of the regulatory development>",
      "why_it_matters": "<specific impact on this company>",
      "what_to_do": "<concrete action items>"
    }}
  ],
  "priority_actions": [
    {{
      "priority": "<high|medium|low>",
      "action": "<specific action>",
      "deadline": "<e.g. Within 30 days, Q3 2026>",
      "effort": "<e.g. 1 day, 2-3 weeks>"
    }}
  ],
  "predictions_used": {topics_json}
}}"""


def extract_json(text: str) -> dict:
    # Strip <think>...</think> reasoning block if present
    text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text.strip())
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return json.loads(match.group())
    raise ValueError(f"No JSON object found in response: {text[:300]}")


# ── Endpoint ──────────────────────────────────────────────────────────────────

STUB_REPORT = {
    "headline": "State health data privacy laws are spreading — your app may need new consent flows within 12 months",
    "executive_summary": (
        "Multiple states are passing health data privacy laws modeled on Washington's My Health My Data Act. "
        "With a 72% chance of new compliance requirements in your operating states within 12 months, "
        "you should start auditing data flows now to avoid a last-minute scramble."
    ),
    "sections": [
        {
            "title": "State Health Data Privacy Laws Are Spreading",
            "whats_happening": (
                "Washington's My Health My Data Act created a replicable template that 4+ states have already copied. "
                "These laws cover health data your app collects even when HIPAA doesn't apply — "
                "like symptom logs or wellness data outside a provider relationship."
            ),
            "why_it_matters": (
                "Your clinical decision support tool processes patient symptoms and health history. "
                "Operating in CA, NY, TX, and FL means you could face overlapping requirements with slightly different rules."
            ),
            "what_to_do": (
                "1. Audit your data flows to identify health data not covered by HIPAA (2–3 days). "
                "2. Update your privacy policy to disclose health data practices (1 day). "
                "3. Build consent mechanisms adaptable to different state requirements (1–2 weeks)."
            ),
        },
        {
            "title": "AI in Healthcare Is Getting Regulated",
            "whats_happening": (
                "The FDA is tightening oversight of AI/ML-based clinical decision support tools, "
                "and California has introduced bills requiring transparency in algorithmic healthcare decisions."
            ),
            "why_it_matters": (
                "Your product uses AI for clinical recommendations. Depending on how outputs are used by providers, "
                "you may be reclassified as a regulated medical device."
            ),
            "what_to_do": (
                "1. Review FDA's updated Software as a Medical Device (SaMD) guidance against your product (1 week). "
                "2. Document model inputs, outputs, and intended use for regulatory readiness. "
                "3. Consult a regulatory attorney if your tool influences clinical decisions directly."
            ),
        },
    ],
    "priority_actions": [
        {
            "priority": "high",
            "action": "Audit health data flows outside HIPAA scope",
            "deadline": "Within 30 days",
            "effort": "2–3 days internal",
        },
        {
            "priority": "high",
            "action": "Review FDA SaMD guidance for AI/ML clinical tools",
            "deadline": "Within 45 days",
            "effort": "1 week with legal review",
        },
        {
            "priority": "medium",
            "action": "Update privacy policy to cover non-HIPAA health data",
            "deadline": "Q3 2026",
            "effort": "1 day",
        },
        {
            "priority": "medium",
            "action": "Design adaptable consent mechanism for multi-state compliance",
            "deadline": "Q3 2026",
            "effort": "1–2 weeks engineering",
        },
    ],
    "predictions_used": ["State Health Data Privacy", "AI in Healthcare Regulation"],
}


@app.post("/report", response_model=ReportResponse)
async def report(req: ReportRequest):
    # --- Hermes API call commented out (no API key) ---
    # try:
    #     response = client.chat.completions.create(
    #         model=HERMES_MODEL,
    #         messages=[
    #             {"role": "system", "content": SYSTEM_PROMPT},
    #             {"role": "user", "content": build_user_prompt(req)},
    #         ],
    #         temperature=0.7,
    #         max_tokens=3000,
    #         stream=False,
    #     )
    #     raw_text = response.choices[0].message.content
    #     data = extract_json(raw_text)
    # except json.JSONDecodeError as e:
    #     raise HTTPException(status_code=502, detail=f"Failed to parse Hermes response as JSON: {e}")
    # except Exception as e:
    #     raise HTTPException(status_code=502, detail=f"Hermes API error: {e}")
    # data["sections"] = [ReportSection(**s) for s in data.get("sections", [])]
    # data["priority_actions"] = [PriorityAction(**a) for a in data.get("priority_actions", [])]
    # return ReportResponse(**data)

    data = dict(STUB_REPORT)
    data["sections"] = [ReportSection(**s) for s in data["sections"]]
    data["priority_actions"] = [PriorityAction(**a) for a in data["priority_actions"]]
    return ReportResponse(**data)


@app.get("/health")
def health():
    return {"status": "ok", "model": HERMES_MODEL, "base_url": HERMES_BASE_URL}
