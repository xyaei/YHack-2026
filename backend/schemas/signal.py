from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class Signal(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    signal_type: str  # federal_register | congress | state | ftc | manual
    title: str
    summary: str
    source_url: str
    jurisdiction: str
    agency: Optional[str] = None
    topics: List[str] = []
    signal_score: Optional[float] = None
    published_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None

    model_config = {"populate_by_name": True}
