from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class FolderCreate(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"

class FolderOut(BaseModel):
    id: int
    name: str
    color: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentChunkOut(BaseModel):
    id: int
    chunk_index: int
    page_number: int
    heading: Optional[str] = None
    content: str
    token_count: int

    model_config = ConfigDict(from_attributes=True)

class DocumentOut(BaseModel):
    id: int
    title: str
    filename: str
    file_type: str
    file_size_bytes: int
    page_count: int
    processing_status: str
    error_message: Optional[str] = None
    summary: Optional[str] = None
    folder_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentRename(BaseModel):
    title: str
