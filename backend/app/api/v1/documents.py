import os
import shutil
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.document import Document, DocumentChunk, Folder
from app.schemas.document import DocumentOut, DocumentRename, FolderCreate, FolderOut
from app.api.deps import get_current_user
from app.services.document_parser import DocumentParser
from app.services.chunker import Chunker
from app.services.rag_engine import RAGEngine

router = APIRouter()

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "pptx", "ppt", "txt", "md", "csv"}

@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filename = file.filename or "uploaded_file"
    ext = os.path.splitext(filename)[1].lower().strip(".")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Save file to user storage
    user_upload_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_upload_dir, exist_ok=True)
    clean_filename = f"{int(os.times().system * 1000)}_{filename}"
    file_path = os.path.join(user_upload_dir, clean_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # Create document record
    doc_record = Document(
        user_id=current_user.id,
        folder_id=folder_id,
        title=os.path.splitext(filename)[0].replace("_", " ").title(),
        filename=filename,
        file_type=ext,
        file_path=file_path,
        file_size_bytes=file_size,
        processing_status="processing"
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    try:
        # 1. Parse pages
        parsed = DocumentParser.parse_file(file_path, filename)
        doc_record.page_count = parsed.get("page_count", 1)
        pages = parsed.get("pages", [])

        # 2. Chunk pages preserving page anchors
        chunks_data = Chunker.chunk_pages(pages, chunk_size=400, chunk_overlap=60)

        # 3. Create chunks and embeddings
        for chunk in chunks_data:
            emb = RAGEngine.compute_local_embedding(chunk["content"])
            chunk_rec = DocumentChunk(
                document_id=doc_record.id,
                chunk_index=chunk["chunk_index"],
                page_number=chunk["page_number"],
                heading=chunk.get("heading"),
                content=chunk["content"],
                token_count=chunk.get("token_count", 0),
                embedding_json=json.dumps(emb)
            )
            db.add(chunk_rec)

        # 4. Summary preview
        if chunks_data:
            preview_text = chunks_data[0]["content"][:300]
            doc_record.summary = f"Summary: {preview_text}..."

        doc_record.processing_status = "completed"
        db.commit()
        db.refresh(doc_record)

    except Exception as e:
        doc_record.processing_status = "error"
        doc_record.error_message = str(e)
        db.commit()
        db.refresh(doc_record)

    return doc_record

@router.get("", response_model=List[DocumentOut])
def get_documents(
    folder_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(Document.user_id == current_user.id)
    if folder_id is not None:
        query = query.filter(Document.folder_id == folder_id)
    return query.order_by(Document.created_at.desc()).all()

@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("/{document_id}/pages")
def get_document_pages(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document_id
    ).order_by(DocumentChunk.page_number, DocumentChunk.chunk_index).all()

    # Group by page number
    pages_dict = {}
    for c in chunks:
        p = c.page_number
        if p not in pages_dict:
            pages_dict[p] = {"page_number": p, "heading": c.heading, "text": ""}
        pages_dict[p]["text"] += ("\n\n" + c.content if pages_dict[p]["text"] else c.content)

    return {
        "document_id": doc.id,
        "title": doc.title,
        "page_count": doc.page_count,
        "pages": list(pages_dict.values())
    }

@router.put("/{document_id}/rename", response_model=DocumentOut)
def rename_document(
    document_id: int,
    rename_data: DocumentRename,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.title = rename_data.title
    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove physical file
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully", "id": document_id}

@router.get("/folders/list", response_model=List[FolderOut])
def get_folders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Folder).filter(Folder.user_id == current_user.id).all()

@router.post("/folders/create", response_model=FolderOut)
def create_folder(
    folder_in: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    folder = Folder(
        user_id=current_user.id,
        name=folder_in.name,
        color=folder_in.color or "#6366f1"
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder
