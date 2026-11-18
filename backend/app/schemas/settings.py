from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class AISettingsUpdate(BaseModel):
    provider: str  # openai, gemini, ollama, custom
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    base_url: Optional[str] = None
    temperature: float = Field(default=0.3, ge=0.0, le=1.0)

class AISettingsOut(BaseModel):
    provider: str
    has_api_key: bool
    model_name: str
    base_url: Optional[str] = None
    temperature: float
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
