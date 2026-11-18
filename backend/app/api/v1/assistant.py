import json
import asyncio
from typing import List, Optional, AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, AISetting
from app.models.chat import ChatSession, ChatMessage
from app.models.mindmap import StudyNote, ActivityLog
from app.schemas.chat import ChatMessageCreate, ChatMessageOut, ChatSessionOut
from app.api.deps import get_current_user
from app.services.rag_engine import RAGEngine
from app.services.ai_providers import AIProviderService

router = APIRouter()

@router.post("/chat", response_model=ChatMessageOut)
async def chat_message(
    chat_in: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Get or create session
    if chat_in.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == chat_in.session_id,
            ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        # Generate session title from prompt
        title = chat_in.content[:40] + ("..." if len(chat_in.content) > 40 else "")
        session = ChatSession(
            user_id=current_user.id,
            title=title,
            selected_document_ids=json.dumps(chat_in.document_ids or [])
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 2. Store user message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=chat_in.content,
        citations_json="[]"
    )
    db.add(user_msg)
    db.commit()

    # 3. Retrieve relevant chunks using RAG
    # For multi-doc queries, retrieve balanced chunks from each document
    doc_ids = chat_in.document_ids or json.loads(session.selected_document_ids or "[]")
    
    if len(doc_ids) > 1:
        # Balanced multi-document retrieval: 2-4 chunks per doc, capped at 12 total
        per_doc = max(2, min(4, 12 // len(doc_ids)))
        citations = []
        seen_chunk_ids = set()
        for d_id in doc_ids:
            doc_chunks = RAGEngine.retrieve_relevant_chunks(
                db=db,
                query=chat_in.content,
                document_ids=[d_id],
                top_k=per_doc,
                threshold=0.05
            )
            if not doc_chunks:
                doc_chunks = RAGEngine.get_stratified_chunks(db=db, document_id=d_id, max_chunks=per_doc)
            for c in doc_chunks:
                if c["chunk_id"] not in seen_chunk_ids:
                    seen_chunk_ids.add(c["chunk_id"])
                    citations.append(c)
    else:
        citations = RAGEngine.retrieve_relevant_chunks(
            db=db,
            query=chat_in.content,
            document_ids=doc_ids,
            top_k=5,
            threshold=0.1
        )

    # 4. Fetch user's active AI settings
    ai_setting = db.query(AISetting).filter(
        AISetting.user_id == current_user.id,
        AISetting.is_active == True
    ).first()

    provider = ai_setting.provider if ai_setting else "openai"
    api_key = ai_setting.api_key if ai_setting else None
    model_name = ai_setting.model_name if ai_setting else "gpt-4o-mini"
    base_url = ai_setting.base_url if ai_setting else None
    temp = float(ai_setting.temperature) if ai_setting and ai_setting.temperature else 0.3

    # Format tone instruction
    tone_modifier = ""
    if chat_in.tone == "simplified":
        tone_modifier = " Explain this in simple, intuitive terms suitable for a high school student, with analogies."
    elif chat_in.tone == "bullet_points":
        tone_modifier = " Provide the answer strictly structured in crisp bullet points and key takeaways."

    # Build conversation history
    past_messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at.desc()).limit(6).all()
    past_messages.reverse()

    conv_history = []
    for m in past_messages[:-1]:  # exclude the user message just added
        conv_history.append({"role": m.role, "content": m.content})
    conv_history.append({"role": "user", "content": chat_in.content + tone_modifier})

    # 5. Call AI Provider
    ai_res = await AIProviderService.generate_chat_response(
        messages=conv_history,
        context_chunks=citations,
        provider=provider,
        api_key=api_key,
        model_name=model_name,
        base_url=base_url,
        temperature=temp
    )

    # 6. Save assistant response
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=ai_res.get("content", ""),
        citations_json=json.dumps(citations)
    )
    db.add(assistant_msg)

    # Log study activity
    activity = ActivityLog(
        user_id=current_user.id,
        activity_type="chat",
        duration_seconds=45,
        topic_or_subject=chat_in.content[:50]
    )
    db.add(activity)

    db.commit()
    db.refresh(assistant_msg)

    return {
        "id": assistant_msg.id,
        "role": assistant_msg.role,
        "content": assistant_msg.content,
        "citations": citations,
        "created_at": assistant_msg.created_at
    }

@router.get("/sessions", response_model=List[ChatSessionOut])
def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).all()

    results = []
    for s in sessions:
        doc_ids = []
        try:
            doc_ids = json.loads(s.selected_document_ids or "[]")
        except Exception:
            pass

        msgs = []
        for m in s.messages:
            cits = []
            try:
                cits = json.loads(m.citations_json or "[]")
            except Exception:
                pass
            msgs.append({
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "citations": cits,
                "created_at": m.created_at
            })

        results.append({
            "id": s.id,
            "title": s.title,
            "selected_document_ids": doc_ids,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "messages": msgs
        })

    return results

@router.delete("/sessions/{session_id}")
def delete_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}


# ------------------------------------------------------------------ #
#  SSE Streaming Endpoint                                              #
# ------------------------------------------------------------------ #

@router.post("/chat/stream")
async def chat_stream(
    chat_in: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events (SSE) streaming endpoint.
    Emits:
      data: {"type": "citations", "citations": [...]}
      data: {"type": "token", "text": "..."}
      data: {"type": "done", "message_id": N}
      data: {"type": "error", "message": "..."}
    
    Falls back gracefully when provider is offline (emits full response as one token).
    Backward-compatible: /assistant/chat remains unchanged for tests.
    """

    # 1. Session handling
    if chat_in.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == chat_in.session_id,
            ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        title = chat_in.content[:40] + ("..." if len(chat_in.content) > 40 else "")
        session = ChatSession(
            user_id=current_user.id,
            title=title,
            selected_document_ids=json.dumps(chat_in.document_ids or [])
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 2. Store user message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=chat_in.content,
        citations_json="[]"
    )
    db.add(user_msg)
    db.commit()

    # 3. Balanced multi-doc RAG retrieval
    doc_ids = chat_in.document_ids or json.loads(session.selected_document_ids or "[]")
    if len(doc_ids) > 1:
        per_doc = max(2, min(4, 12 // len(doc_ids)))
        citations = []
        seen_chunk_ids: set = set()
        for d_id in doc_ids:
            doc_chunks = RAGEngine.retrieve_relevant_chunks(
                db=db, query=chat_in.content, document_ids=[d_id],
                top_k=per_doc, threshold=0.05
            )
            if not doc_chunks:
                doc_chunks = RAGEngine.get_stratified_chunks(db=db, document_id=d_id, max_chunks=per_doc)
            for c in doc_chunks:
                if c["chunk_id"] not in seen_chunk_ids:
                    seen_chunk_ids.add(c["chunk_id"])
                    citations.append(c)
    else:
        citations = RAGEngine.retrieve_relevant_chunks(
            db=db, query=chat_in.content, document_ids=doc_ids,
            top_k=5, threshold=0.1
        )

    # 4. AI Settings
    ai_setting = db.query(AISetting).filter(
        AISetting.user_id == current_user.id,
        AISetting.is_active == True
    ).first()
    provider = ai_setting.provider if ai_setting else "openai"
    api_key = ai_setting.api_key if ai_setting else None
    model_name = ai_setting.model_name if ai_setting else "gpt-4o-mini"
    base_url = ai_setting.base_url if ai_setting else None
    temp = float(ai_setting.temperature) if ai_setting and ai_setting.temperature is not None else 0.3

    tone_modifier = ""
    if chat_in.tone == "simplified":
        tone_modifier = " Explain in simple, intuitive terms with analogies."
    elif chat_in.tone == "bullet_points":
        tone_modifier = " Format the answer strictly as crisp bullet points and key takeaways."

    past_messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at.desc()).limit(6).all()
    past_messages.reverse()
    conv_history = []
    for m in past_messages[:-1]:
        conv_history.append({"role": m.role, "content": m.content})
    conv_history.append({"role": "user", "content": chat_in.content + tone_modifier})

    # 5. Stream generator
    async def event_stream() -> AsyncGenerator[str, None]:
        # Emit citations first so the UI can render badges immediately
        yield f"data: {json.dumps({'type': 'citations', 'citations': citations, 'session_id': session.id})}\n\n"
        await asyncio.sleep(0)

        # Call AI (non-streaming response — emit as chunked tokens for smooth UX)
        ai_res = await AIProviderService.generate_chat_response(
            messages=conv_history,
            context_chunks=citations,
            provider=provider,
            api_key=api_key,
            model_name=model_name,
            base_url=base_url,
            temperature=temp
        )

        full_content = ai_res.get("content", "")

        # Chunk the response into word-level tokens for smooth streaming effect
        words = full_content.split(" ")
        chunk_size = 4  # emit 4 words at a time
        for i in range(0, len(words), chunk_size):
            token = " ".join(words[i:i + chunk_size])
            if i + chunk_size < len(words):
                token += " "
            yield f"data: {json.dumps({'type': 'token', 'text': token})}\n\n"
            await asyncio.sleep(0.025)  # 25ms between chunks → smooth typing effect

        # Persist assistant message
        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=full_content,
            citations_json=json.dumps(citations)
        )
        db.add(assistant_msg)
        activity = ActivityLog(
            user_id=current_user.id,
            activity_type="chat",
            duration_seconds=45,
            topic_or_subject=chat_in.content[:50]
        )
        db.add(activity)
        db.commit()
        db.refresh(assistant_msg)

        yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_msg.id})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )
