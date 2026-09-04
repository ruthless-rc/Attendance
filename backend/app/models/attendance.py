from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    time = Column(String(20), nullable=False)  # HH:MM:SS
    status = Column(String(20), default="present", nullable=False)  # present, late, excused
    confidence = Column(Float, nullable=True)
    liveness_passed = Column(Boolean, default=True)
    method = Column(String(50), default="face_recognition")  # face_recognition, manual
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="attendances")
