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
Legal structure: {c.legal_structure}
Industry: {c.industry}
Size: {c.size} employees
Revenue range: {c.revenue_range or 'Unknown'}
Funding stage: {c.funding_stage or 'Unknown'}
Location: {c.location}
Operating states: {', '.join(c.operating_states) or 'N/A'}
Operating countries: {', '.join(c.operating_countries) or 'US'}
Sells to: {'Businesses (B2B)' if c.b2b else 'Consumers (B2C)'}
Customer count: {c.customer_count or 'Unknown'}
Handles PHI: {c.handles_phi} | PII: {c.handles_pii} | Financial data: {c.handles_financial_data}
Uses AI/ML: {c.uses_ai_ml}
Certifications: {', '.join(c.certifications) or 'None'}
Has legal counsel: {c.has_legal_counsel}
Has compliance team: {c.has_compliance_team}
Public company: {c.is_public}
Description: {c.description}

TOPIC: {req.topic}
JURISDICTION: {req.jurisdiction}

REGULATORY SIGNALS:{signals_text}

Return ONLY a JSON object with this exact structure. All string values must be real, substantive content — do NOT use placeholder text, ellipsis, or empty strings:
{{
  "topic": "{req.topic}",
  "jurisdiction": "{req.jurisdiction}",
  "probability_6mo": 0.45,
  "probability_12mo": 0.65,
  "probability_24mo": 0.80,
  "confidence": "medium",
  "likely_requirements": ["specific requirement based on signals", "another concrete requirement"],
  "reasoning": "2-5 sentences of actual analysis explaining the probability estimates based on the signals and company profile",
  "key_signals": [
    {{"signal_id": "actual signal title from above", "weight": 0.85, "rationale": "specific reason this signal drives the prediction"}}
  ],
  "counterfactors": ["specific factor that could delay or prevent this regulation"],
  "recommended_preparation": ["concrete action this company should take now"]
}}"""


REQUIRED_FIELDS = {"topic", "jurisdiction", "probability_6mo", "probability_12mo", "probability_24mo", "confidence", "reasoning"}

def extract_json(text: str) -> dict:
    # Strip <think>...</think> / <thinking>...</thinking> reasoning blocks
    text = re.sub(r"<think(?:ing)?>[\s\S]*?</think(?:ing)?>", "", text).strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text.strip())
    # Try each '{' position and return the first object containing all required fields
    decoder = json.JSONDecoder()
    pos = 0
    while True:
        start = text.find("{", pos)
        if start == -1:
            break
        try:
            obj, _ = decoder.raw_decode(text, start)
            if isinstance(obj, dict) and REQUIRED_FIELDS.issubset(obj.keys()):
                return obj
        except json.JSONDecodeError:
            pass
        pos = start + 1
    raise ValueError(f"No valid PredictionResponse JSON found in response: {text[:300]}")


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


class DecomposeRequest(BaseModel):
    topic: str
    jurisdiction: str
    company: CompanyProfile
    signals: Optional[List[dict]] = []
    max_sub_topics: int = 3


class SubTopic(BaseModel):
    topic: str
    jurisdiction: str


class DecomposeResponse(BaseModel):
    sub_topics: List[SubTopic]


DECOMPOSE_SYSTEM = """\
You are a regulatory analyst. Given a broad regulatory topic, a jurisdiction, and a company profile,
identify distinct regulatory sub-topics that are relevant to this company. Each sub-topic should
represent a separate, concrete regulatory area that could produce its own prediction.
Return ONLY valid JSON — no prose, no markdown fences.\
"""


def build_decompose_prompt(req: DecomposeRequest) -> str:
    c = req.company
    signals_text = ""
    for i, s in enumerate(req.signals[:10]):
        signals_text += f"\n[{i+1}] {s.get('title', 'Untitled')}: {s.get('summary', '')}"
    if not signals_text:
        signals_text = "\nNo signals provided."

    return f"""Given the broad topic "{req.topic}" in jurisdiction "{req.jurisdiction}", identify up to {req.max_sub_topics} distinct, specific regulatory sub-topics relevant to this company.

COMPANY
Name: {c.name}
Industry: {c.industry}
Size: {c.size} employees
Description: {c.description}
Handles PHI: {c.handles_phi} | PII: {c.handles_pii} | Financial data: {c.handles_financial_data}
Uses AI/ML: {c.uses_ai_ml}
Operating states: {', '.join(c.operating_states) or 'N/A'}

REGULATORY SIGNALS:{signals_text}

Return a JSON object with this exact structure:
{{
  "sub_topics": [
    {{"topic": "specific regulatory sub-topic name", "jurisdiction": "{req.jurisdiction}"}},
    {{"topic": "another specific sub-topic", "jurisdiction": "{req.jurisdiction}"}}
  ]
}}

Rules:
- Each sub-topic must be a specific, distinct regulatory area (not the original broad topic restated)
- Only include sub-topics genuinely relevant to this company's profile
- Return between 2 and {req.max_sub_topics} sub-topics
- Use the signals to inform which sub-topics are most relevant right now"""


def extract_decompose_json(text: str) -> dict:
    """Extract a JSON object containing 'sub_topics' from LLM output."""
    text = re.sub(r"<think(?:ing)?>[\s\S]*?</think(?:ing)?>", "", text).strip()
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text.strip())
    decoder = json.JSONDecoder()
    pos = 0
    while True:
        start = text.find("{", pos)
        if start == -1:
            break
        try:
            obj, _ = decoder.raw_decode(text, start)
            if isinstance(obj, dict) and "sub_topics" in obj:
                return obj
        except json.JSONDecodeError:
            pass
        pos = start + 1
    raise ValueError(f"No valid decompose JSON found in response: {text[:300]}")


@app.post("/decompose", response_model=DecomposeResponse)
async def decompose(req: DecomposeRequest):
    try:
        response = client.chat.completions.create(
            model=K2_MODEL,
            messages=[
                {"role": "system", "content": DECOMPOSE_SYSTEM},
                {"role": "user", "content": build_decompose_prompt(req)},
            ],
            temperature=0.3,
            max_tokens=1000,
            stream=False,
        )
        raw_text = response.choices[0].message.content
        print(f"[decompose] raw LLM response: {raw_text[:500]}", flush=True)
        data = extract_decompose_json(raw_text)
    except Exception as e:
        print(f"[decompose] ERROR: {e}", flush=True)
        raise HTTPException(status_code=502, detail=f"K2 decompose error: {e}")

    return DecomposeResponse(
        sub_topics=[SubTopic(**st) for st in data.get("sub_topics", [])]
    )


@app.get("/health")
def health():
    return {"status": "ok", "model": K2_MODEL, "base_url": K2_BASE_URL}
