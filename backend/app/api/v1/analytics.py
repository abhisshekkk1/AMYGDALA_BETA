from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.exam import PracticeTest, TestQuestion
from app.models.flashcard import FlashcardDeck, Flashcard
from app.models.mindmap import ActivityLog
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/dashboard")
def get_dashboard_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    # 1. Total documents processed
    doc_count = db.query(Document).filter(Document.user_id == current_user.id).count()

    # 2. Practice tests & MCQ Accuracy
    tests = db.query(PracticeTest).filter(
        PracticeTest.user_id == current_user.id,
        PracticeTest.status == "completed"
    ).all()
    
    total_tests_taken = len(tests)
    average_score = round(sum(t.percentage for t in tests) / max(1, len(tests)), 1) if tests else 0.0

    # Questions attempted and correct
    questions_attempted = db.query(TestQuestion).join(PracticeTest).filter(
        PracticeTest.user_id == current_user.id,
        TestQuestion.user_answer.isnot(None)
    ).count()

    questions_correct = db.query(TestQuestion).join(PracticeTest).filter(
        PracticeTest.user_id == current_user.id,
        TestQuestion.is_correct == True
    ).count()

    mcq_accuracy = round((questions_correct / max(1, questions_attempted)) * 100.0, 1) if questions_attempted else 0.0

    # 3. Flashcards stats
    total_cards = db.query(Flashcard).join(FlashcardDeck).filter(FlashcardDeck.user_id == current_user.id).count()
    cards_reviewed = db.query(Flashcard).join(FlashcardDeck).filter(
        FlashcardDeck.user_id == current_user.id,
        Flashcard.repetition > 0
    ).count()

    now = datetime.utcnow()
    cards_due = db.query(Flashcard).join(FlashcardDeck).filter(
        FlashcardDeck.user_id == current_user.id,
        Flashcard.next_review_due <= now
    ).count()

    # 4. Study time & Activity logs
    activities = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id).all()
    total_study_minutes = round(sum(a.duration_seconds for a in activities) / 60, 1)

    # 5. Weekly Activity (last 7 days)
    seven_days_ago = now - timedelta(days=7)
    recent_activities = db.query(ActivityLog).filter(
        ActivityLog.user_id == current_user.id,
        ActivityLog.created_at >= seven_days_ago
    ).all()

    weekly_map = {}
    for i in range(7):
        day_date = (now - timedelta(days=6 - i)).strftime("%a")
        weekly_map[day_date] = 0

    for a in recent_activities:
        day_str = a.created_at.strftime("%a")
        if day_str in weekly_map:
            weekly_map[day_str] += round(a.duration_seconds / 60, 1)

    weekly_chart = [{"day": day, "minutes": mins} for day, mins in weekly_map.items()]

    # 6. Test scores over time
    test_trend = [
        {
            "date": t.completed_at.strftime("%b %d") if t.completed_at else t.created_at.strftime("%b %d"),
            "title": t.title[:20],
            "score": t.percentage or 0
        }
        for t in tests[-6:]
    ]

    # 7. Weak Topics Detection (based on failed test questions)
    incorrect_questions = db.query(TestQuestion).join(PracticeTest).filter(
        PracticeTest.user_id == current_user.id,
        TestQuestion.is_correct == False
    ).limit(5).all()

    weak_topics = []
    for iq in incorrect_questions:
        snippet = iq.question_text[:60] + "..."
        weak_topics.append({
            "topic": snippet,
            "error_type": "Incorrect assessment answer",
            "suggested_action": "Review source material and retake practice assessment"
        })

    # If no weak topics yet, suggest general topic from uploaded documents
    if not weak_topics:
        recent_doc = db.query(Document).filter(Document.user_id == current_user.id).first()
        if recent_doc:
            weak_topics.append({
                "topic": recent_doc.title,
                "error_type": "Upcoming revision",
                "suggested_action": "Complete a 5-question diagnostic MCQ assessment"
            })

    return {
        "summary": {
            "documents_count": doc_count,
            "total_tests_taken": total_tests_taken,
            "average_score": average_score,
            "questions_attempted": questions_attempted,
            "mcq_accuracy": mcq_accuracy,
            "total_flashcards": total_cards,
            "cards_due_for_review": cards_due,
            "cards_mastered": cards_reviewed,
            "total_study_minutes": total_study_minutes
        },
        "weekly_activity": weekly_chart,
        "test_trend": test_trend,
        "weak_topics": weak_topics
    }

@router.get("/recommendations")
def get_smart_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recommendations = []

    # 1. Check due flashcards
    now = datetime.utcnow()
    due_count = db.query(Flashcard).join(FlashcardDeck).filter(
        FlashcardDeck.user_id == current_user.id,
        Flashcard.next_review_due <= now
    ).count()

    if due_count > 0:
        recommendations.append({
            "type": "flashcards",
            "priority": "high",
            "title": f"{due_count} Flashcards Due for Review",
            "description": "Your spaced-repetition memory retention interval has elapsed. Review now to consolidate long-term memory.",
            "action_link": "/flashcards"
        })

    # 2. Check failed questions for revision
    failed_q = db.query(TestQuestion).join(PracticeTest).filter(
        PracticeTest.user_id == current_user.id,
        TestQuestion.is_correct == False
    ).order_by(TestQuestion.id.desc()).first()

    if failed_q:
        recommendations.append({
            "type": "quiz",
            "priority": "medium",
            "title": "Review Missed Examination Concepts",
            "description": f"You previously missed: \"{failed_q.question_text[:70]}...\". Revisit the source explanation.",
            "action_link": "/exam-prep"
        })

    # 3. Check if documents have no flashcards or mindmaps yet
    doc_without_tools = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.processing_status == "completed"
    ).first()

    if doc_without_tools:
        recommendations.append({
            "type": "mindmap",
            "priority": "normal",
            "title": f"Explore Mind Map for {doc_without_tools.title}",
            "description": "Visualizing concepts hierarchically increases knowledge retention by up to 40%.",
            "action_link": "/mind-maps"
        })

    return recommendations
