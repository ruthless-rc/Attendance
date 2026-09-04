from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import List, Optional
import numpy as np

from app.api.deps import get_db, get_current_admin
from app.models.admin import Admin
from app.models.user import User
from app.models.attendance import Attendance
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserWithStats
from app.schemas.recognition import FaceRegisterRequest, FaceRegisterResponse
from app.recognition.detector import face_detector, decode_base64_image
from app.recognition.recognizer import face_recognizer
from app.recognition.quality import face_quality_checker
from app.core.logging import logger

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    department: Optional[str] = None,
    is_face_registered: Optional[bool] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    query = db.query(User)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(s),
                User.unique_id.ilike(s),
                User.email.ilike(s)
            )
        )

    if department:
        query = query.filter(User.department == department)

    if is_face_registered is not None:
        query = query.filter(User.is_face_registered == is_face_registered)

    if status_filter:
        query = query.filter(User.status == status_filter)

    users = query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()
    return users

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    # Check duplicate unique_id
    if db.query(User).filter(User.unique_id == user_in.unique_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with Unique ID '{user_in.unique_id}' already exists."
        )

    # Check duplicate email
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{user_in.email}' already exists."
        )

    user = User(
        unique_id=user_in.unique_id,
        full_name=user_in.full_name,
        email=user_in.email,
        department=user_in.department or "General",
        status=user_in.status or "active",
        consent_given=user_in.consent_given,
        consent_text=user_in.consent_text
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"Created new user {user.unique_id} - {user.full_name}")
    return user

@router.get("/{user_id}", response_model=UserWithStats)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    total_att = db.query(Attendance).filter(Attendance.user_id == user.id).count()
    last_att = db.query(Attendance).filter(Attendance.user_id == user.id).order_by(desc(Attendance.date), desc(Attendance.time)).first()

    return UserWithStats(
        id=user.id,
        unique_id=user.unique_id,
        full_name=user.full_name,
        email=user.email,
        department=user.department,
        status=user.status,
        is_face_registered=user.is_face_registered,
        consent_given=user.consent_given,
        created_at=user.created_at,
        updated_at=user.updated_at,
        total_attendances=total_att,
        last_attendance=f"{last_att.date} {last_att.time}" if last_att else None
    )

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.email and user_in.email != user.email:
        if db.query(User).filter(User.email == user_in.email, User.id != user_id).first():
            raise HTTPException(status_code=400, detail="Email already used by another user.")
        user.email = user_in.email

    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.department is not None:
        user.department = user_in.department
    if user_in.status is not None:
        user.status = user_in.status

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    logger.info(f"Deleted user {user_id} and purged all associated biometric data.")
    return None

@router.post("/{user_id}/face/register", response_model=FaceRegisterResponse)
def register_face(
    user_id: int,
    request: FaceRegisterRequest,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not request.images:
        raise HTTPException(status_code=400, detail="At least one face image sample is required.")

    valid_embeddings = []
    reasons = []

    for idx, b64_img in enumerate(request.images):
        try:
            img = decode_base64_image(b64_img)
        except Exception as e:
            reasons.append(f"Sample #{idx + 1}: Invalid image encoding ({e})")
            continue

        detections = face_detector.detect(img)
        if len(detections) == 0:
            reasons.append(f"Sample #{idx + 1}: No face detected.")
            continue
        if len(detections) > 1:
            reasons.append(f"Sample #{idx + 1}: Multiple faces detected ({len(detections)}). Only 1 face allowed.")
            continue

        face_det = detections[0]
        # Quality check
        passed, quality_msg, _ = face_quality_checker.check_quality(img, face_det["bbox"])
        if not passed:
            reasons.append(f"Sample #{idx + 1}: {quality_msg}")
            continue

        # Extract 128D feature embedding
        try:
            emb = face_recognizer.extract_embedding(img, face_det["raw"])
            valid_embeddings.append(emb)
        except Exception as e:
            reasons.append(f"Sample #{idx + 1}: Feature extraction failed ({e})")

    if len(valid_embeddings) == 0:
        error_detail = "All captured face samples were rejected. Details: " + " | ".join(reasons[:3])
        raise HTTPException(status_code=400, detail=error_detail)

    # Multi-angle sample aggregation
    aggregated_emb = face_recognizer.aggregate_embeddings(valid_embeddings)

    # Duplicate Biometric Check across all other registered users
    other_users = db.query(User).filter(
        User.id != user.id,
        User.is_face_registered == True,
        User.face_embedding != None
    ).all()

    enrolled = []
    for other in other_users:
        if other.face_embedding:
            enrolled.append((other, face_recognizer.deserialize_embedding(other.face_embedding)))

    for other_user, other_emb in enrolled:
        sim = face_recognizer.compute_similarity(aggregated_emb, other_emb)
        if sim >= 0.50:  # High biometric match
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate face detected! This person is already registered as '{other_user.full_name}' (ID: {other_user.unique_id})."
            )

    # Securely store embedding in DB (no raw photos stored!)
    user.face_embedding = face_recognizer.serialize_embedding(aggregated_emb)
    user.is_face_registered = True
    db.commit()

    logger.info(f"Successfully registered facial biometrics for user {user.unique_id} ({len(valid_embeddings)} samples aggregated).")
    return FaceRegisterResponse(
        success=True,
        message=f"Registration successful. Your face has been registered ({len(valid_embeddings)} quality samples).",
        samples_captured=len(valid_embeddings),
        user_id=user.id
    )

@router.delete("/{user_id}/face", status_code=status.HTTP_200_OK)
def delete_user_face(
    user_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.face_embedding = None
    user.is_face_registered = False
    db.commit()

    logger.info(f"Permanently deleted facial biometric data for user {user.unique_id}.")
    return {"message": f"Biometric face data for {user.full_name} has been purged."}
