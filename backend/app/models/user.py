from sqlalchemy import Column, Integer, String, Boolean, DateTime, LargeBinary
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    unique_id = Column(String(50), unique=True, index=True, nullable=False)  # Enrollment / Employee ID
    full_name = Column(String(100), nullable=False, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=True, default="General")
    status = Column(String(20), default="active")  # active, inactive
    
    # Biometric Data (Encrypted/Binary float32 vector, NOT raw image)
    face_embedding = Column(LargeBinary, nullable=True)
    is_face_registered = Column(Boolean, default=False)
    
    # Biometric Privacy & Consent
    consent_given = Column(Boolean, default=False)
    consent_text = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    attendances = relationship("Attendance", back_populates="user", cascade="all, delete-orphan")
