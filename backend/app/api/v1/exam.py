import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, AISetting
from app.models.document import Document, DocumentChunk
from app.models.exam import PracticeTest, TestQuestion
from app.models.mindmap import ActivityLog
from app.schemas.exam import (
    MCQGenerateRequest, MarksQuestionRequest, PaperGenerateRequest,
    SubmitTestRequest, PracticeTestOut, TestQuestionOut
)
from app.api.deps import get_current_user
from app.services.rag_engine import RAGEngine
from app.services.exam_engine import ExamEngine

router = APIRouter()

@router.post("/generate-mcqs")
async def generate_mcqs(
    req: MCQGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ai_setting = db.query(AISetting).filter(
        AISetting.user_id == current_user.id,
        AISetting.is_active == True
    ).first()

    provider = ai_setting.provider if ai_setting else "openai"
    api_key = ai_setting.api_key if ai_setting else None

    # Retrieve chunks for topic or document
    chunks = RAGEngine.retrieve_relevant_chunks(
        db=db,
        query=req.topic or "concepts definitions principles examination summary",
        document_ids=req.document_ids,
        top_k=8
    )

    mcqs = await ExamEngine.generate_mcqs(
        context_chunks=chunks,
        num_questions=req.num_questions,
        difficulty=req.difficulty,
        provider=provider,
        api_key=api_key
    )

    return {"questions": mcqs}

@router.post("/generate-marks-question")
async def generate_marks_question(
    req: MarksQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ai_setting = db.query(AISetting).filter(
        AISetting.user_id == current_user.id,
        AISetting.is_active == True
    ).first()

    provider = ai_setting.provider if ai_setting else "openai"
    api_key = ai_setting.api_key if ai_setting else None

    chunks = RAGEngine.retrieve_relevant_chunks(
        db=db,
        query=req.topic or "concept mechanism detailed explanation",
        document_ids=req.document_ids,
        top_k=6
    )

    question_data = await ExamEngine.generate_marks_question(
        context_chunks=chunks,
        marks=req.marks,
        topic=req.topic or "",
        provider=provider,
        api_key=api_key
    )

    return question_data

@router.post("/generate-paper")
async def generate_paper(
    req: PaperGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ai_setting = db.query(AISetting).filter(
        AISetting.user_id == current_user.id,
        AISetting.is_active == True
    ).first()

    provider = ai_setting.provider if ai_setting else "openai"
    api_key = ai_setting.api_key if ai_setting else None

    chunks = RAGEngine.retrieve_relevant_chunks(
        db=db,
        query="examination syllabus questions chapters key concepts",
        document_ids=req.document_ids,
        top_k=10
    )

    paper = await ExamEngine.generate_full_question_paper(
        context_chunks=chunks,
        title=req.title,
        subject=req.subject,
        total_marks=req.total_marks,
        duration_minutes=req.duration_minutes,
        provider=provider,
        api_key=api_key
    )

    return paper

@router.post("/tests/create-from-mcqs", response_model=PracticeTestOut)
async def create_practice_test(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates an interactive test session from generated MCQs.
    """
    questions_list = data.get("questions", [])
    title = data.get("title", "Practice Assessment")
    duration = data.get("duration_minutes", 20)
    doc_id = data.get("document_id")

    test = PracticeTest(
        user_id=current_user.id,
        document_id=doc_id,
        title=title,
        difficulty=data.get("difficulty", "medium"),
        duration_minutes=duration,
        total_marks=len(questions_list),
        status="in_progress"
    )
    db.add(test)
    db.commit()
    db.refresh(test)

    for idx, q in enumerate(questions_list):
        opts = q.get("options", [])
        question_rec = TestQuestion(
            test_id=test.id,
            order_index=idx + 1,
            question_type="mcq",
            marks=1,
            question_text=q.get("question", "Question"),
            options_json=json.dumps(opts),
            correct_answer=q.get("correct_answer", ""),
            explanation=q.get("explanation", ""),
            source_citation_json=json.dumps({
                "page": q.get("source_page", 1),
                "doc": q.get("document_name", "Document")
            })
        )
        db.add(question_rec)

    db.commit()
    db.refresh(test)
    return format_test_out(test)

@router.get("/tests", response_model=List[PracticeTestOut])
def get_practice_tests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tests = db.query(PracticeTest).filter(
        PracticeTest.user_id == current_user.id
    ).order_by(PracticeTest.created_at.desc()).all()
    return [format_test_out(t) for t in tests]

@router.get("/tests/{test_id}", response_model=PracticeTestOut)
def get_practice_test(
    test_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    test = db.query(PracticeTest).filter(
        PracticeTest.id == test_id,
        PracticeTest.user_id == current_user.id
    ).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return format_test_out(test)

@router.post("/tests/{test_id}/submit", response_model=PracticeTestOut)
def submit_practice_test(
    test_id: int,
    req: SubmitTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    test = db.query(PracticeTest).filter(
        PracticeTest.id == test_id,
        PracticeTest.user_id == current_user.id
    ).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    correct_count = 0
    total_q = len(test.questions)

    for q in test.questions:
        user_ans = req.answers.get(q.id) or req.answers.get(str(q.id))
        q.user_answer = user_ans

        if user_ans and q.correct_answer:
            # Check correctness (prefix letter match or exact text)
            ua_clean = user_ans.strip().lower()
            ca_clean = q.correct_answer.strip().lower()
            
            is_match = (
                ua_clean == ca_clean or
                ua_clean.startswith(ca_clean[:2]) or
                ca_clean.startswith(ua_clean[:2])
            )
            q.is_correct = is_match
            if is_match:
                q.marks_awarded = float(q.marks)
                correct_count += 1
            else:
                q.marks_awarded = 0.0
        else:
            q.is_correct = False
            q.marks_awarded = 0.0

    pct = round((correct_count / max(1, total_q)) * 100.0, 1)
    test.score_achieved = float(correct_count)
    test.percentage = pct
    test.status = "completed"
    test.completed_at = datetime.utcnow()

    # Log activity for analytics
    activity = ActivityLog(
        user_id=current_user.id,
        activity_type="test_completed",
        score_percentage=pct,
        duration_seconds=test.duration_minutes * 60,
        topic_or_subject=test.title
    )
    db.add(activity)

    db.commit()
    db.refresh(test)
    return format_test_out(test)

def format_test_out(t: PracticeTest) -> dict:
    formatted_questions = []
    for q in t.questions:
        opts = []
        try:
            opts = json.loads(q.options_json or "[]")
        except Exception:
            pass

        cit = None
        try:
            cit = json.loads(q.source_citation_json or "{}")
        except Exception:
            pass

        formatted_questions.append({
            "id": q.id,
            "order_index": q.order_index,
            "question_type": q.question_type,
            "marks": q.marks,
            "question_text": q.question_text,
            "options": opts,
            "correct_answer": q.correct_answer if t.status == "completed" else None,
            "explanation": q.explanation if t.status == "completed" else None,
            "source_citation": cit,
            "user_answer": q.user_answer,
            "is_correct": q.is_correct,
            "marks_awarded": q.marks_awarded,
            "is_marked_for_review": q.is_marked_for_review
        })

    return {
        "id": t.id,
        "title": t.title,
        "subject": t.subject,
        "difficulty": t.difficulty,
        "duration_minutes": t.duration_minutes,
        "total_marks": t.total_marks,
        "score_achieved": t.score_achieved,
        "percentage": t.percentage,
        "status": t.status,
        "completed_at": t.completed_at,
        "created_at": t.created_at,
        "questions": formatted_questions
    }
