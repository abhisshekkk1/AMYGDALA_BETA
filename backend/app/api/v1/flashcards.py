import json
import re
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, AISetting
from app.models.document import Document
from app.models.flashcard import FlashcardDeck, Flashcard
from app.models.mindmap import ActivityLog
from app.schemas.flashcard import (
    FlashcardDeckCreate, FlashcardCreate, FlashcardReviewRequest,
    FlashcardDeckOut, FlashcardOut
)
from app.api.deps import get_current_user
from app.services.rag_engine import RAGEngine
from app.services.ai_providers import AIProviderService
from app.services.spaced_rep import SpacedRepetitionService

router = APIRouter()

@router.get("/decks", response_model=List[FlashcardDeckOut])
def get_decks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(FlashcardDeck).filter(FlashcardDeck.user_id == current_user.id).all()

@router.post("/decks", response_model=FlashcardDeckOut)
def create_deck(
    deck_in: FlashcardDeckCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deck = FlashcardDeck(
        user_id=current_user.id,
        document_id=deck_in.document_id,
        title=deck_in.title,
        description=deck_in.description,
        color=deck_in.color or "#6366f1"
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return deck

@router.get("/decks/{deck_id}", response_model=FlashcardDeckOut)
def get_deck(deck_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    deck = db.query(FlashcardDeck).filter(
        FlashcardDeck.id == deck_id,
        FlashcardDeck.user_id == current_user.id
    ).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck

@router.delete("/decks/{deck_id}")
def delete_deck(deck_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    deck = db.query(FlashcardDeck).filter(
        FlashcardDeck.id == deck_id,
        FlashcardDeck.user_id == current_user.id
    ).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    db.delete(deck)
    db.commit()
    return {"message": "Deck deleted"}

@router.post("/decks/{deck_id}/cards", response_model=FlashcardOut)
def add_card(
    deck_id: int,
    card_in: FlashcardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deck = db.query(FlashcardDeck).filter(
        FlashcardDeck.id == deck_id,
        FlashcardDeck.user_id == current_user.id
    ).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    card = Flashcard(
        deck_id=deck.id,
        front=card_in.front,
        back=card_in.back,
        source_page=card_in.source_page,
        source_citation=card_in.source_citation
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card

@router.post("/decks/{deck_id}/generate-from-doc")
async def generate_cards_from_doc(
    deck_id: int,
    document_id: int,
    count: int = 6,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deck = db.query(FlashcardDeck).filter(
        FlashcardDeck.id == deck_id,
        FlashcardDeck.user_id == current_user.id
    ).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    # Use stratified chunks for comprehensive flashcard coverage across the full document
    chunks = RAGEngine.get_stratified_chunks(
        db=db, document_id=document_id, max_chunks=max(count * 2, 12)
    )

    ai_setting = db.query(AISetting).filter(
        AISetting.user_id == current_user.id,
        AISetting.is_active == True
    ).first()

    provider = ai_setting.provider if ai_setting else "openai"
    api_key = ai_setting.api_key if ai_setting else None

    prompt = (
        f"Extract exactly {count} high-yield study flashcards from the text below.\n"
        f"Each flashcard must reference the source page number.\n"
        f"Output strict JSON array: [ {{\"front\": \"Question or Concept\", \"back\": \"Clear concise answer/definition\", \"page\": 1, \"document\": \"Document Title\"}} ]\n"
        f"Output ONLY the JSON array. No markdown fences.\n\n"
        f"TEXT:\n" + "\n\n".join([f"[Page {c['page_number']}] {c['content']}" for c in chunks])
    )

    result = await AIProviderService.generate_structured_json(
        prompt=prompt,
        provider=provider,
        api_key=api_key,
        temperature=0.2,
        context_chunks=chunks
    )

    created_cards = []
    if result.get("status") == "success" and isinstance(result.get("data"), list):
        for c in result["data"]:
            card = Flashcard(
                deck_id=deck.id,
                front=c.get("front", "Concept"),
                back=c.get("back", "Definition"),
                source_page=c.get("page", 1),
                source_citation=f"{c.get('document', deck.title)} — Page {c.get('page', 1)}"
            )
            db.add(card)
            created_cards.append(card)
        db.commit()
    else:
        # Fallback cards from chunks
        for idx, c in enumerate(chunks[:count]):
            first_sentence = c["content"].split(".")[0]
            card = Flashcard(
                deck_id=deck.id,
                front=f"Key Concept: {c['heading'] or f'Page {c['page_number']}'}",
                back=first_sentence + ".",
                source_page=c["page_number"],
                source_citation=f"{c['document_title']} (Page {c['page_number']})"
            )
            db.add(card)
            created_cards.append(card)
        db.commit()

    return {"message": f"Successfully generated {len(created_cards)} flashcards"}

@router.post("/cards/{card_id}/review", response_model=FlashcardOut)
def review_card(
    card_id: int,
    review_in: FlashcardReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    card = db.query(Flashcard).join(FlashcardDeck).filter(
        Flashcard.id == card_id,
        FlashcardDeck.user_id == current_user.id
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    updated = SpacedRepetitionService.calculate_review(
        rating=review_in.rating,
        repetition=card.repetition,
        ease_factor=card.ease_factor,
        interval_days=card.interval_days
    )

    card.repetition = updated["repetition"]
    card.ease_factor = updated["ease_factor"]
    card.interval_days = updated["interval_days"]
    card.next_review_due = updated["next_review_due"]
    card.last_reviewed_at = updated["last_reviewed_at"]
    card.last_rating = updated["last_rating"]

    activity = ActivityLog(
        user_id=current_user.id,
        activity_type="flashcard_reviewed",
        duration_seconds=15,
        topic_or_subject=f"Card #{card.id}"
    )
    db.add(activity)

    db.commit()
    db.refresh(card)
    return card

@router.get("/due", response_model=List[FlashcardOut])
def get_due_cards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    cards = db.query(Flashcard).join(FlashcardDeck).filter(
        FlashcardDeck.user_id == current_user.id,
        Flashcard.next_review_due <= now
    ).all()
    return cards
