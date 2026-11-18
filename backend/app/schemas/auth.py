from typing import Optional
from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    theme_preference: str = "dark"
    is_active: bool = True

    class Config:
        from_attributes = True

Token.model_rebuild()
