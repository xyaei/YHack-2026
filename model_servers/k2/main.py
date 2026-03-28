"""
K2 Prediction Server — port 8001
Calls the K2 Think V2 API (OpenAI-compatible) at api.k2think.ai.
"""

import os
import json
import re
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI(title="K2 Prediction Server")

K2_API_KEY = os.getenv("K2_API_KEY")
K2_BASE_URL = os.getenv("K2_BASE_URL", "https://api.k2think.ai/v1")
K2_MODEL = os.getenv("K2_MODEL", "MBZUAI-IFM/K2-Think-v2")

client = OpenAI(api_key=K2_API_KEY or "stub", base_url=K2_BASE_URL)


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


class PredictionRequest(BaseModel):
    topic: str
    jurisdiction: str
    company: CompanyProfile
    signals: Optional[List[dict]] = []


class SignalRef(BaseModel):
    signal_id: str
    weight: float
    rationale: str


class PredictionResponse(BaseModel):
    topic: str
    jurisdiction: str
    probability_6mo: float
    probability_12mo: float
    probability_24mo: float
    confidence: str  # low | medium | high
    likely_requirements: List[str]
    reasoning: str
    key_signals: List[SignalRef]
    counterfactors: List[str]
    recommended_preparation: List[str]


# ── Prompt ────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a regulatory prediction analyst with deep expertise in US federal and state law.
Given a company profile and regulatory signals, you reason step by step and produce a structured
JSON prediction. Return ONLY valid JSON — no prose, no markdown fences.\
"""

def build_user_prompt(req: PredictionRequest) -> str:
    c = req.company

    signals_text = ""
    for i, s in enumerate(req.signals[:10]):
        signals_text += f"\n[{i+1}] {s.get('title', 'Untitled')}: {s.get('summary', '')}"
    if not signals_text:
        signals_text = "No signals provided."

    return f"""Analyze the company and signals below. Predict the likelihood of formal regulation on the given topic.

COMPANY
Name: {c.name}
Industry: {c.industry}
Location: {c.location}
Operating states: {', '.join(c.operating_states) or 'N/A'}
Handles PHI: {c.handles_phi} | PII: {c.handles_pii} | Financial data: {c.handles_financial_data}
Uses AI/ML: {c.uses_ai_ml}
Certifications: {', '.join(c.certifications) or 'None'}
Description: {c.description}

TOPIC: {req.topic}
JURISDICTION: {req.jurisdiction}

REGULATORY SIGNALS:{signals_text}

Return ONLY a JSON object with this exact structure (replace example values with real ones):
{{
  "topic": "{req.topic}",
  "jurisdiction": "{req.jurisdiction}",
  "probability_6mo": 0.45,
  "probability_12mo": 0.65,
  "probability_24mo": 0.80,
  "confidence": "medium",
  "likely_requirements": ["example requirement 1", "example requirement 2"],
  "reasoning": "detailed chain of thought explaining the prediction",
  "key_signals": [
    {{"signal_id": "example signal title", "weight": 0.85, "rationale": "why this signal matters"}}
  ],
  "counterfactors": ["factor that could delay or prevent regulation"],
  "recommended_preparation": ["concrete action to take now"]
}}"""


def extract_json(text: str) -> dict:
    # Strip <think>...</think> / <thinking>...</thinking> reasoning blocks
    text = re.sub(r"<think(?:ing)?>[\s\S]*?</think(?:ing)?>", "", text).strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text.strip())
    # Use raw_decode to parse the first complete JSON object and ignore trailing text
    start = text.find("{")
    if start == -1:
        raise ValueError(f"No JSON object found in response: {text[:300]}")
    try:
        obj, _ = json.JSONDecoder().raw_decode(text, start)
        return obj
    except json.JSONDecodeError as e:
        snippet = text[max(0, e.pos - 80): e.pos + 80]
        raise json.JSONDecodeError(
            f"{e.msg} | context: ...{snippet!r}...", e.doc, e.pos
        )


# ── Endpoint ──────────────────────────────────────────────────────────────────

@app.post("/predict", response_model=PredictionResponse)
async def predict(req: PredictionRequest):
    try:
        response = client.chat.completions.create(
            model=K2_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(req)},
            ],
            temperature=0.2,
            max_tokens=4000,
            stream=False,
        )
        raw_text = response.choices[0].message.content
        data = extract_json(raw_text)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Failed to parse K2 response as JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"K2 API error: {e}")

    data["key_signals"] = [SignalRef(**s) for s in data.get("key_signals", [])]
    return PredictionResponse(**data)


@app.get("/health")
def health():
    return {"status": "ok", "model": K2_MODEL, "base_url": K2_BASE_URL}
