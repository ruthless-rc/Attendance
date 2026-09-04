from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime
from app.schemas.user import UserResponse

class AttendanceCreate(BaseModel):
    user_id: int
    confidence: Optional[float] = None
    liveness_passed: bool = True
    method: str = "face_recognition"
    notes: Optional[str] = None

class AttendanceManualCreate(BaseModel):
    user_id: int
    date: date
    time: str
    status: str = "present"
    notes: Optional[str] = "Manual entry by admin"

class AttendanceResponse(BaseModel):
    id: int
    user_id: int
    date: date
    time: str
    status: str
    confidence: Optional[float] = None
    liveness_passed: bool
    method: str
    notes: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class AttendanceFilter(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    department: Optional[str] = None
    status: Optional[str] = None
    user_id: Optional[int] = None
    search: Optional[str] = None
