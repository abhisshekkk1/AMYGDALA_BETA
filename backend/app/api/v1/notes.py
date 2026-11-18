import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, AISetting
from app.models.document import Document
from app.models.mindmap import StudyNote
from app.api.deps import get_current_user
from app.services.rag_engine import RAGEngine
from app.services.ai_providers import AIProviderService

router = APIRouter()

@router.post("/generate")
async def generate_note(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document_id = data.get("document_id")
    note_type = data.get("note_type", "summary")  # summary, revision, definitions, formulas
    title_override = data.get("title")

    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks = RAGEngine.retrieve_relevant_chunks(
        db=db,
        query="summary key concepts definitions formulas core revision notes",
        document_ids=[document_id],
        top_k=8
    )

    ai_setting = db.query(AISetting).filter(
        AISetting.user_id == current_user.id,
        AISetting.is_active == True
    ).first()

    provider = ai_setting.provider if ai_setting else "openai"
    api_key = ai_setting.api_key if ai_setting else None

    type_instructions = {
        "summary": "Create a comprehensive, beautifully structured chapter summary with an overview, core sections, key arguments, and takeaway conclusions.",
        "revision": "Create a high-density 'Last-Minute Revision Sheet' with bullet points, high-yield exam points, and quick memory anchors.",
        "definitions": "Extract an exhaustive glossary of all essential technical definitions and terminology, formatted with term names in bold, exact definitions, and page citations.",
        "formulas": "Extract all mathematical formulas, theorems, rules, and quantitative relationships with variable definitions and units."
    }

    instruction = type_instructions.get(note_type, "Create detailed academic study notes.")

    prompt = (
        f"{instruction} Base your response exclusively on the uploaded document text provided below.\n\n"
        f"Format with markdown headings (##, ###), bullet lists, and tables where appropriate.\n\n"
        f"DOCUMENT EXCERPTS:\n" + "\n\n".join([f"Page {c['page_number']}: {c['content']}" for c in chunks[:6]])
    )

    res = await AIProviderService.generate_chat_response(
        messages=[{"role": "user", "content": prompt}],
        context_chunks=chunks,
        provider=provider,
        api_key=api_key,
        temperature=0.2
    )

    content_md = res.get("content", "")
    note_title = title_override or f"{note_type.capitalize()} — {doc.title}"

    note = StudyNote(
        user_id=current_user.id,
        document_id=doc.id,
        note_type=note_type,
        title=note_title,
        content_markdown=content_md,
        tags_json=json.dumps([note_type, doc.title])
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {
        "id": note.id,
        "document_id": note.document_id,
        "note_type": note.note_type,
        "title": note.title,
        "content_markdown": note.content_markdown,
        "created_at": note.created_at
    }

@router.get("")
def get_notes(
    note_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(StudyNote).filter(StudyNote.user_id == current_user.id)
    if note_type:
        query = query.filter(StudyNote.note_type == note_type)
    return query.order_by(StudyNote.created_at.desc()).all()

@router.delete("/{note_id}")
def delete_note(note_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.query(StudyNote).filter(
        StudyNote.id == note_id,
        StudyNote.user_id == current_user.id
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}
