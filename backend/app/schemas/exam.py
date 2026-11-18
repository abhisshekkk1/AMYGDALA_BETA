from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class MCQGenerateRequest(BaseModel):
    document_ids: List[int]
    topic: Optional[str] = None
    num_questions: int = 5
    difficulty: str = "medium"  # easy, medium, hard

class MarksQuestionRequest(BaseModel):
    document_ids: List[int]
    marks: int = 5  # 2, 3, 5, 10, 15
    topic: Optional[str] = None

class PaperGenerateRequest(BaseModel):
    document_ids: List[int]
    title: str = "Midterm Examination"
    subject: str = "General Studies"
    total_marks: int = 50
    duration_minutes: int = 60

class SubmitTestRequest(BaseModel):
    answers: Dict[int, str]  # question_id -> user answer string

class TestQuestionOut(BaseModel):
    id: int
    order_index: int
    question_type: str
    marks: int
    question_text: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    source_citation: Optional[Dict[str, Any]] = None
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    marks_awarded: Optional[float] = None
    is_marked_for_review: bool = False

    class Config:
        from_attributes = True

class PracticeTestOut(BaseModel):
    id: int
    title: str
    subject: Optional[str] = None
    difficulty: str
    duration_minutes: int
    total_marks: int
    score_achieved: Optional[float] = None
    percentage: Optional[float] = None
    status: str
    completed_at: Optional[datetime] = None
    created_at: datetime
    questions: List[TestQuestionOut] = []

    class Config:
        from_attributes = True
