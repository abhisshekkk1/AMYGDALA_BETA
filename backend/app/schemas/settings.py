from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

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

    class Config:
        from_attributes = True

class AISettingsUpdate(BaseModel):
    provider: str  # openai, gemini, ollama, custom
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    base_url: Optional[str] = None
    temperature: Optional[str] = "0.3"

class AISettingsOut(BaseModel):
    provider: str
    has_api_key: bool
    model_name: str
    base_url: Optional[str] = None
    temperature: str
    is_active: bool
