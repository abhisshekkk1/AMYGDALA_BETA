from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class MindMapGenerateRequest(BaseModel):
    document_id: int
    central_topic: Optional[str] = None

class MindMapOut(BaseModel):
    id: int
    document_id: Optional[int] = None
    title: str
    central_topic: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
