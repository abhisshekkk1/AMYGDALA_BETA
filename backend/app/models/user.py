from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    theme_preference = Column(String(20), default="dark")  # "dark" or "light"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    ai_settings = relationship("AISetting", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    flashcard_decks = relationship("FlashcardDeck", back_populates="user", cascade="all, delete-orphan")
    practice_tests = relationship("PracticeTest", back_populates="user", cascade="all, delete-orphan")
    mind_maps = relationship("MindMap", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("StudyNote", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")


class AISetting(Base):
    __tablename__ = "ai_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    provider = Column(String(50), default="openai")  # openai, gemini, ollama, custom
    api_key = Column(Text, nullable=True)  # user's key if configured
    model_name = Column(String(100), default="gpt-4o-mini")
    base_url = Column(String(255), nullable=True)
    temperature = Column(String(10), default="0.3")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="ai_settings")

