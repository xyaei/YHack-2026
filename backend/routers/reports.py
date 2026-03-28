from fastapi import APIRouter
from schemas.report import ReportRequest, ReportResponse
from services.hermes_service import get_report

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/", response_model=ReportResponse)
async def report(req: ReportRequest):
    return await get_report(req)
