from pydantic import BaseModel
from typing import List, Optional
from schemas.company import CompanyProfile


class SignalRef(BaseModel):
    signal_id: str
    weight: float
    rationale: str


class PredictionRequest(BaseModel):
    topic: str
    jurisdiction: str
    company: CompanyProfile
    signals: Optional[List[dict]] = []  # raw scraped data forwarded to model server


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
