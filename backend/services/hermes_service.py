import os
import httpx
from schemas.report import ReportRequest, ReportResponse, ReportSection, PriorityAction

HERMES_BASE_URL = os.getenv("HERMES_BASE_URL", "http://localhost:8002")


async def get_report(req: ReportRequest) -> ReportResponse:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{HERMES_BASE_URL}/report",
            json=req.model_dump(),
            timeout=60,
        )
        response.raise_for_status()
        raw = response.json()

    raw["sections"] = [ReportSection(**s) for s in raw["sections"]]
    raw["priority_actions"] = [PriorityAction(**a) for a in raw["priority_actions"]]
    return ReportResponse(**raw)
