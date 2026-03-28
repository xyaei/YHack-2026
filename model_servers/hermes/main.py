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

@app.post("/report", response_model=ReportResponse)
async def report(req: ReportRequest):
    try:
        response = client.chat.completions.create(
            model=HERMES_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(req)},
            ],
            temperature=0.7,
            max_tokens=3000,
            stream=False,
        )
        raw_text = response.choices[0].message.content
        data = extract_json(raw_text)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Failed to parse Hermes response as JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Hermes API error: {e}")

    data["sections"] = [ReportSection(**s) for s in data.get("sections", [])]
    data["priority_actions"] = [PriorityAction(**a) for a in data.get("priority_actions", [])]
    return ReportResponse(**data)


@app.get("/health")
def health():
    return {"status": "ok", "model": HERMES_MODEL, "base_url": HERMES_BASE_URL}
