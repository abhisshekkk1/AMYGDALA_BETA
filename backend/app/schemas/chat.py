from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class ChatMessageCreate(BaseModel):
    session_id: Optional[int] = None
    content: str
    document_ids: Optional[List[int]] = []
    tone: Optional[str] = "academic"  # academic, simplified, bullet_points

class CitationItem(BaseModel):
    chunk_id: Optional[int] = None
    document_id: int
    document_title: str
    page_number: int
    heading: Optional[str] = None
    excerpt: str
    citation: Optional[str] = None
    relevance_score: Optional[float] = None

class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    citations: List[CitationItem] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatSessionOut(BaseModel):
    id: int
    title: str
    selected_document_ids: List[int] = []
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageOut] = []

    model_config = ConfigDict(from_attributes=True)
