"""
Combined endpoint: fetches signals from MongoDB, then runs prediction + report generation.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from schemas.company import CompanyProfile
from schemas.prediction import PredictionRequest, PredictionResponse
from schemas.report import ReportRequest, ReportResponse
from services.k2_service import get_prediction
from services.hermes_service import get_report
from services.mongo_service import fetch_signals

router = APIRouter(prefix="/analyze", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    company: CompanyProfile
    topic: str
    jurisdiction: str
    topic_tags: Optional[List[str]] = None  # derived from topic if omitted
    signal_limit: int = 20


class AnalyzeResponse(BaseModel):
    signals_used: int
    prediction: PredictionResponse
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

    prediction = await get_prediction(PredictionRequest(
        topic=req.topic,
        jurisdiction=req.jurisdiction,
        company=req.company,
        signals=signals,
    ))

    report = await get_report(ReportRequest(
        company=req.company,
        prediction_ids=[prediction.topic],
        predictions=[prediction.model_dump()],
    ))

    return AnalyzeResponse(
        signals_used=len(signals),
        prediction=prediction,
        report=report,
    )
