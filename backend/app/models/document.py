from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(String(20), default="#6366f1")
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="folder")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # pdf, docx, pptx, txt, md, csv
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    page_count = Column(Integer, default=1)
    processing_status = Column(String(30), default="processing")  # pending, processing, completed, error
    error_message = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="documents")
    folder = relationship("Folder", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, default=1)
    heading = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0)
    embedding_json = Column(Text, nullable=True)  # vector representation as JSON array for SQLite/fallback

    document = relationship("Document", back_populates="chunks")
