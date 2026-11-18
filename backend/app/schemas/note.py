from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class NoteGenerateRequest(BaseModel):
    document_id: int
    note_type: str = "summary"  # summary, revision, definitions, formulas, custom
    title: Optional[str] = None

class StudyNoteOut(BaseModel):
    id: int
    document_id: Optional[int] = None
    note_type: str
    title: str
    content_markdown: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
