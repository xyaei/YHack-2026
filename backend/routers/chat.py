"""
Chat router — POST /chat/
Accepts a user message and conversation history,
returns a RAG-grounded conversational reply from Hermes.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.chat_service import chat as chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    # Pass these directly from the /analyze response to skip a redundant vector search
    signals: Optional[List[dict]] = None
    predictions: Optional[List[dict]] = None
    company_context: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        reply = await chat_service(
            message=req.message,
            history=[m.model_dump() for m in req.history],
            signals=req.signals,
            predictions=req.predictions,
            company_context=req.company_context,
        )
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
