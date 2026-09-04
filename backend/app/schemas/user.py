from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    unique_id: str
    full_name: str
    email: EmailStr
    department: Optional[str] = "General"
    status: Optional[str] = "active"

class UserCreate(UserBase):
    consent_given: bool = True
    consent_text: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    status: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_face_registered: bool
    consent_given: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UserWithStats(UserResponse):
    total_attendances: int = 0
    last_attendance: Optional[str] = None
