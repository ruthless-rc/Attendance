from pydantic import BaseModel
from typing import Optional

class SettingsResponse(BaseModel):
    recognition_threshold: float
    duplicate_interval_seconds: int
    liveness_mode: str
    late_cutoff_time: str
    privacy_consent_text: str

class SettingsUpdateRequest(BaseModel):
    recognition_threshold: Optional[float] = None
    duplicate_interval_seconds: Optional[int] = None
    liveness_mode: Optional[str] = None
    late_cutoff_time: Optional[str] = None
    privacy_consent_text: Optional[str] = None
