import os
import httpx
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
