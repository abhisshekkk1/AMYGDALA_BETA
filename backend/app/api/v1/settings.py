import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, AISetting
from app.schemas.settings import AISettingsUpdate, AISettingsOut
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/ai", response_model=AISettingsOut)
def get_ai_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    setting = db.query(AISetting).filter(
        AISetting.user_id == current_user.id,
        AISetting.is_active == True
    ).first()

    has_key = False
    if setting and setting.api_key:
        has_key = True
    elif os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY"):
        has_key = True

    provider = setting.provider if setting else "openai"
    model = setting.model_name if setting else "gpt-4o-mini"
    base_url = setting.base_url if setting else None
    temp = setting.temperature if setting else "0.3"

    return {
        "provider": provider,
        "has_api_key": has_key,
        "model_name": model,
        "base_url": base_url,
        "temperature": temp,
        "is_active": True
    }

@router.put("/ai", response_model=AISettingsOut)
def update_ai_settings(
    update_data: AISettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    setting = db.query(AISetting).filter(
        AISetting.user_id == current_user.id
    ).first()

    if not setting:
        setting = AISetting(user_id=current_user.id)
        db.add(setting)

    setting.provider = update_data.provider
    if update_data.api_key:
        # Update user's API key (stored securely in DB)
        setting.api_key = update_data.api_key
    if update_data.model_name:
        setting.model_name = update_data.model_name
    if update_data.base_url is not None:
        setting.base_url = update_data.base_url
    if update_data.temperature:
        setting.temperature = update_data.temperature

    setting.is_active = True
    db.commit()
    db.refresh(setting)

    return {
        "provider": setting.provider,
        "has_api_key": bool(setting.api_key) or bool(os.getenv("OPENAI_API_KEY")),
        "model_name": setting.model_name,
        "base_url": setting.base_url,
        "temperature": setting.temperature,
        "is_active": setting.is_active
    }
