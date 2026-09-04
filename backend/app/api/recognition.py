from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Tuple
import numpy as np

from app.api.deps import get_db
from app.models.user import User
from app.models.settings import SystemSetting
from app.schemas.recognition import (
    FaceVerifyRequest,
    FaceVerifyResponse,
    RecognizedPerson,
    BoundingBox,
    LivenessChallenge,
    LivenessVerifyRequest
)
from app.recognition.detector import face_detector, decode_base64_image
from app.recognition.recognizer import face_recognizer
from app.recognition.liveness import liveness_detector
from app.services.attendance_service import attendance_service
from app.core.config import settings
from app.core.logging import logger

router = APIRouter(prefix="/recognition", tags=["Recognition"])

def get_system_setting(db: Session, key: str, default: str) -> str:
    s = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return s.value if s else default

@router.get("/liveness-challenge", response_model=LivenessChallenge)
def get_liveness_challenge():
    """Obtain a random challenge for anti-spoofing verification."""
    challenge = liveness_detector.create_challenge()
    return LivenessChallenge(**challenge)

@router.post("/liveness-verify")
def verify_liveness(request: LivenessVerifyRequest):
    """Verify webcam image against the issued challenge."""
    try:
        img = decode_base64_image(request.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    detections = face_detector.detect(img)
    if not detections:
        return {"passed": False, "message": "No face detected in frame."}

    landmarks = detections[0]["landmarks"]
    passed, msg = liveness_detector.verify_action(request.challenge_id, img, landmarks)
    return {"passed": passed, "message": msg}

@router.post("/verify", response_model=FaceVerifyResponse)
def verify_faces_and_mark_attendance(
    request: FaceVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Continuous recognition endpoint for attendance kiosk.
    Detects all visible faces, identifies matching users, checks liveness & duplicates,
    and automatically marks attendance.
    """
    try:
        img = decode_base64_image(request.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image decoding failed: {e}")

    detections = face_detector.detect(img)
    if not detections:
        return FaceVerifyResponse(faces_detected=0, results=[])

    # Fetch configuration
    threshold = float(get_system_setting(
        db, "recognition_threshold", str(settings.DEFAULT_RECOGNITION_THRESHOLD)
    ))
    liveness_mode = get_system_setting(
        db, "liveness_mode", settings.DEFAULT_LIVENESS_MODE
    )

    # Fetch all active enrolled users
    enrolled_users = db.query(User).filter(
        User.status == "active",
        User.is_face_registered == True,
        User.face_embedding != None
    ).all()

    enrolled_pairs: List[Tuple[int, np.ndarray]] = []
    user_map = {}
    for u in enrolled_users:
        user_map[u.id] = u
        emb = face_recognizer.deserialize_embedding(u.face_embedding)
        enrolled_pairs.append((u.id, emb))

    results = []

    for det in detections:
        bbox_raw = det["bbox"]
        bbox = BoundingBox(x=bbox_raw[0], y=bbox_raw[1], w=bbox_raw[2], h=bbox_raw[3])
        face_crop_raw = det["raw"]

        # Extract 128D query embedding
        try:
            query_emb = face_recognizer.extract_embedding(img, face_crop_raw)
        except Exception as e:
            logger.error(f"Error extracting embedding for face: {e}")
            continue

        matched_user_id, confidence = face_recognizer.find_best_match(
            query_emb, enrolled_pairs, threshold=threshold
        )

        if matched_user_id is not None:
            user = user_map[matched_user_id]

            # Optional Liveness check verification
            liveness_ok = True
            if liveness_mode == "active" and not request.liveness_action_done:
                results.append(RecognizedPerson(
                    bbox=bbox,
                    recognized=True,
                    user_id=user.id,
                    unique_id=user.unique_id,
                    name=user.full_name,
                    department=user.department,
                    confidence=round(confidence, 4),
                    status="liveness_required",
                    message="Liveness challenge required",
                    attendance_marked=False
                ))
                continue

            # Check duplicate and record attendance
            success, att_rec, att_msg = attendance_service.mark_attendance(
                db=db,
                user=user,
                confidence=confidence,
                liveness_passed=liveness_ok,
                method="face_recognition"
            )

            results.append(RecognizedPerson(
                bbox=bbox,
                recognized=True,
                user_id=user.id,
                unique_id=user.unique_id,
                name=user.full_name,
                department=user.department,
                confidence=round(confidence, 4),
                status="recognized" if success else "already_marked",
                message=att_msg,
                attendance_marked=success,
                attendance_time=att_rec.time if att_rec else None
            ))
        else:
            results.append(RecognizedPerson(
                bbox=bbox,
                recognized=False,
                confidence=round(confidence, 4) if confidence > 0 else 0.0,
                status="unknown",
                message="Unknown person" if confidence < 0.25 else "Face not recognized. Please try again.",
                attendance_marked=False
            ))

    return FaceVerifyResponse(
        faces_detected=len(detections),
        results=results
    )
