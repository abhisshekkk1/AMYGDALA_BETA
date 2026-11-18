from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#6366f1")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="flashcard_decks")
    cards = relationship("Flashcard", back_populates="deck", cascade="all, delete-orphan")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("flashcard_decks.id", ondelete="CASCADE"), nullable=False)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    source_page = Column(Integer, nullable=True)
    source_citation = Column(Text, nullable=True)
    
    # SM-2 Spaced Repetition parameters
    ease_factor = Column(Float, default=2.5)
    repetition = Column(Integer, default=0)
    interval_days = Column(Integer, default=0)
    next_review_due = Column(DateTime, default=datetime.utcnow)
    last_reviewed_at = Column(DateTime, nullable=True)
    last_rating = Column(Integer, nullable=True)  # 0 to 5 or (1=Hard, 2=Medium, 3=Easy)

    deck = relationship("FlashcardDeck", back_populates="cards")
