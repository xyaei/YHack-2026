import os
import asyncio
from typing import List

import httpx
from schemas.company import CompanyProfile
from schemas.prediction import PredictionRequest, PredictionResponse, SignalRef

K2_BASE_URL = os.getenv("K2_BASE_URL", "http://localhost:8001")


async def get_prediction(req: PredictionRequest) -> PredictionResponse:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{K2_BASE_URL}/predict",
            json=req.model_dump(),
            timeout=60,
        )
        response.raise_for_status()
        raw = response.json()

    raw["key_signals"] = [SignalRef(**s) for s in raw["key_signals"]]
    return PredictionResponse(**raw)


async def decompose_topic(
    topic: str,
    jurisdiction: str,
    company_dict: dict,
    signals: list,
    max_sub_topics: int = 5,
) -> List[dict]:
    """Ask K2 to break a broad topic into specific regulatory sub-topics."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{K2_BASE_URL}/decompose",
            json={
                "topic": topic,
                "jurisdiction": jurisdiction,
                "company": company_dict,
                "signals": signals,
                "max_sub_topics": max_sub_topics,
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
    return data.get("sub_topics", [])


async def get_predictions_parallel(
    sub_topics: List[dict],
    company: CompanyProfile,
    signals: list,
) -> List[PredictionResponse]:
    """Run prediction calls in parallel for each sub-topic."""
    async def _predict(st: dict) -> PredictionResponse:
        req = PredictionRequest(
            topic=st["topic"],
            jurisdiction=st["jurisdiction"],
            company=company,
            signals=signals,
        )
        return await get_prediction(req)

    results = await asyncio.gather(*[_predict(st) for st in sub_topics], return_exceptions=True)
    # Filter out failures, return successful predictions
    return [r for r in results if isinstance(r, PredictionResponse)]
