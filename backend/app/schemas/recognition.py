from pydantic import BaseModel
from typing import List, Optional

class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int

class FaceDetection(BaseModel):
    bbox: BoundingBox
    score: float
    landmarks: Optional[List[List[float]]] = None

class FaceRegisterRequest(BaseModel):
    images: List[str]  # Base64 encoded images from multiple angles

class FaceRegisterResponse(BaseModel):
    success: bool
    message: str
    samples_captured: int
    user_id: int

class FaceVerifyRequest(BaseModel):
    image: str  # Base64 encoded image frame
    liveness_token: Optional[str] = None
    liveness_action_done: Optional[bool] = True

class RecognizedPerson(BaseModel):
    bbox: BoundingBox
    recognized: bool
    user_id: Optional[int] = None
    unique_id: Optional[str] = None
    name: Optional[str] = None
    department: Optional[str] = None
    confidence: float
    status: str  # "recognized", "unknown", "already_marked", "liveness_required"
    message: str
    attendance_marked: bool = False
    attendance_time: Optional[str] = None

class FaceVerifyResponse(BaseModel):
    faces_detected: int
    results: List[RecognizedPerson]

class LivenessChallenge(BaseModel):
    challenge_id: str
    action: str  # "turn_left", "turn_right", "blink"
    instruction: str
    expires_in_seconds: int = 15

class LivenessVerifyRequest(BaseModel):
    challenge_id: str
    image: str
