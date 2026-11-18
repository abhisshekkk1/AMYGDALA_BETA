from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, AISetting
from app.schemas.auth import UserRegister, UserLogin, Token, UserOut
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name or user_in.email.split("@")[0].capitalize(),
        theme_preference="dark"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize default AI setting for user
    default_ai = AISetting(
        user_id=user.id,
        provider="openai",
        model_name="gpt-4o-mini",
        temperature="0.3"
    )
    db.add(default_ai)
    db.commit()

    token = create_access_token(user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    token = create_access_token(user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserOut)
def update_profile(
    updates: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if "full_name" in updates:
        current_user.full_name = updates["full_name"]
    if "theme_preference" in updates and updates["theme_preference"] in ["dark", "light"]:
        current_user.theme_preference = updates["theme_preference"]
    
    db.commit()
    db.refresh(current_user)
    return current_user
