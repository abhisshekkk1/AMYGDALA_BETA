from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class MindMap(Base):
    __tablename__ = "mind_maps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    central_topic = Column(String(255), nullable=False)
    nodes_json = Column(Text, nullable=False)  # JSON array of nodes with id, label, level, parentId, etc.
    edges_json = Column(Text, nullable=False)  # JSON array of edges {id, source, target}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="mind_maps")


class StudyNote(Base):
    __tablename__ = "study_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    note_type = Column(String(50), default="summary")  # summary, revision, definitions, formulas, custom
    title = Column(String(255), nullable=False)
    content_markdown = Column(Text, nullable=False)
    tags_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="notes")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    activity_type = Column(String(50), nullable=False)  # "chat", "test_completed", "flashcard_reviewed", "doc_uploaded"
    topic_or_subject = Column(String(100), nullable=True)
    duration_seconds = Column(Integer, default=0)
    score_percentage = Column(Float, nullable=True)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="activities")
