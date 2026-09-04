from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    username: Optional[str] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_superadmin: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
