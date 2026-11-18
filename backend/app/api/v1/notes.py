import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, AISetting
from app.models.document import Document
from app.models.mindmap import StudyNote
from app.schemas.note import NoteGenerateRequest, StudyNoteOut
from app.api.deps import get_current_user
from app.services.rag_engine import RAGEngine
from app.services.ai_providers import AIProviderService

router = APIRouter()

@router.post("/generate", response_model=StudyNoteOut)
async def generate_note(
    req: NoteGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(
        Document.id == req.document_id,
        Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Use stratified chunks spanning the whole document rather than top-k slicing
    chunks = RAGEngine.get_stratified_chunks(
        db=db,
        document_id=req.document_id,
        max_chunks=16
    )

    ai_setting = db.query(AISetting).filter(
        AISetting.user_id == current_user.id,
        AISetting.is_active == True
    ).first()

    provider = ai_setting.provider if ai_setting else "openai"
    api_key = ai_setting.api_key if ai_setting else None
    temp = float(ai_setting.temperature) if ai_setting and ai_setting.temperature is not None else 0.2

    type_instructions = {
        "summary": "Create a comprehensive, beautifully structured chapter summary with an executive overview, core sections, key arguments, and takeaway conclusions. Include [Page X] citations for every major claim.",
        "revision": "Create a high-density 'Last-Minute Revision Sheet' with bullet points, high-yield exam points, and quick memory anchors with [Page X] citations.",
        "definitions": "Extract an exhaustive glossary of all essential technical definitions and terminology, formatted with term names in bold, exact definitions, and [Page X] page citations.",
        "formulas": "Extract all mathematical formulas, theorems, rules, and quantitative relationships with variable definitions, units, and [Page X] citations.",
        "custom": "Create detailed academic study notes covering the full document with [Page X] citations."
    }

    instruction = type_instructions.get(req.note_type, type_instructions["custom"])

    context_str = "\n\n".join([f"--- [Page {c['page_number']}] ({c['heading']}) ---\n{c['content']}" for c in chunks])

    prompt = (
        f"{instruction} Base your response exclusively on the uploaded document text provided below.\n"
        f"You MUST include [Page X] citations corresponding to where each concept or fact is derived.\n\n"
        f"Format with markdown headings (##, ###), bullet lists, and tables where appropriate.\n\n"
        f"FULL DOCUMENT STRATIFIED EXCERPTS:\n{context_str}"
    )

    res = await AIProviderService.generate_chat_response(
        messages=[{"role": "user", "content": prompt}],
        context_chunks=chunks,
        provider=provider,
        api_key=api_key,
        temperature=temp
    )

    content_md = res.get("content", "")
    note_title = req.title or f"{req.note_type.capitalize()} — {doc.title}"

    note = StudyNote(
        user_id=current_user.id,
        document_id=doc.id,
        note_type=req.note_type,
        title=note_title,
        content_markdown=content_md,
        tags_json=json.dumps([req.note_type, doc.title])
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return note

@router.get("", response_model=List[StudyNoteOut])
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
    return {"message": "Note deleted successfully", "id": note_id}
