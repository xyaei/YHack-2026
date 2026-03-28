from fastapi import APIRouter
from schemas.prediction import PredictionRequest, PredictionResponse
from services.k2_service import get_prediction

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.post("/", response_model=PredictionResponse)
async def predict(req: PredictionRequest):
    return await get_prediction(req)
