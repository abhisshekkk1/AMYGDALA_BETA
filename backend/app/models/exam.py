from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class PracticeTest(Base):
    __tablename__ = "practice_tests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=True)
    difficulty = Column(String(20), default="medium")  # easy, medium, hard, mixed
    duration_minutes = Column(Integer, default=30)
    total_marks = Column(Integer, default=50)
    score_achieved = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    status = Column(String(30), default="draft")  # draft, in_progress, completed
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="practice_tests")
    questions = relationship("TestQuestion", back_populates="test", cascade="all, delete-orphan", order_by="TestQuestion.order_index")


class TestQuestion(Base):
    __tablename__ = "test_questions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("practice_tests.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, default=1)
    question_type = Column(String(20), default="mcq")  # mcq, short_2, short_3, short_5, long_5, long_10, long_15
    marks = Column(Integer, default=1)
    question_text = Column(Text, nullable=False)
    options_json = Column(Text, nullable=True)  # JSON list of options for MCQs: ["A", "B", "C", "D"]
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    source_citation_json = Column(Text, nullable=True)  # {doc_title, page, excerpt}
    user_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    marks_awarded = Column(Float, nullable=True)
    is_marked_for_review = Column(Boolean, default=False)

    test = relationship("PracticeTest", back_populates="questions")
