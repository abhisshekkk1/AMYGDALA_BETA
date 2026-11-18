from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class FlashcardDeckCreate(BaseModel):
    title: str
    description: Optional[str] = None
    document_id: Optional[int] = None
    color: Optional[str] = "#6366f1"

class FlashcardCreate(BaseModel):
    front: str
    back: str
    source_page: Optional[int] = None
    source_citation: Optional[str] = None

class FlashcardReviewRequest(BaseModel):
    rating: int  # 1: Hard, 2: Good, 3: Easy

class FlashcardOut(BaseModel):
    id: int
    deck_id: int
    front: str
    back: str
    source_page: Optional[int] = None
    source_citation: Optional[str] = None
    ease_factor: float
    repetition: int
    interval_days: int
    next_review_due: datetime
    last_reviewed_at: Optional[datetime] = None
    last_rating: Optional[int] = None

    class Config:
        from_attributes = True

class FlashcardDeckOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    document_id: Optional[int] = None
    color: str
    created_at: datetime
    updated_at: datetime
    cards: List[FlashcardOut] = []

    class Config:
        from_attributes = True
