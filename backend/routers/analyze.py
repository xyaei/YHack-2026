"""
Combined endpoint: fetches signals from MongoDB, decomposes the topic into
sub-topics, runs parallel predictions, then generates a report.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from schemas.company import CompanyProfile
from schemas.prediction import PredictionRequest, PredictionResponse
from schemas.report import ReportRequest, ReportResponse
from schemas.signal import Signal
from services.k2_service import get_prediction, decompose_topic, get_predictions_parallel
from services.hermes_service import get_report
from services.mongo_service import fetch_signals

router = APIRouter(prefix="/analyze", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    company: CompanyProfile
    topic: str
    jurisdiction: str
    topic_tags: Optional[List[str]] = None  # derived from topic if omitted
    signal_limit: int = 20
    max_sub_topics: int = 3


class AnalyzeResponse(BaseModel):
    signals: List[dict]
    signals_used: int
    predictions: List[PredictionResponse]
    report: ReportResponse


@router.post("/", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    tags = req.topic_tags or [t.strip().lower() for t in req.topic.replace("-", "_").split()]

    signals = await fetch_signals(
        topics=tags,
        jurisdiction=req.jurisdiction,
        limit=req.signal_limit,
    )

    if not signals:
        raise HTTPException(
            status_code=404,
            detail=f"No signals found for topic={req.topic}, jurisdiction={req.jurisdiction}",
        )

    # Decompose broad topic into specific sub-topics
    try:
        sub_topics = await decompose_topic(
            topic=req.topic,
            jurisdiction=req.jurisdiction,
            company_dict=req.company.model_dump(),
            signals=signals,
            max_sub_topics=req.max_sub_topics,
        )
    except Exception:
        sub_topics = []

    # Run predictions in parallel for each sub-topic
    if sub_topics:
        predictions = await get_predictions_parallel(sub_topics, req.company, signals)
    if not sub_topics or not predictions:
        # Fallback: single prediction on original topic
        pred = await get_prediction(PredictionRequest(
            topic=req.topic,
            jurisdiction=req.jurisdiction,
            company=req.company,
            signals=signals,
        ))
        predictions = [pred]

    report = await get_report(ReportRequest(
        company=req.company,
        prediction_ids=[p.topic for p in predictions],
        predictions=[p.model_dump() for p in predictions],
    ))

    return AnalyzeResponse(
        signals=[{k: v for k, v in s.items() if k not in ("embedding",)} for s in signals],
        signals_used=len(signals),
        predictions=predictions,
        report=report,
    )
