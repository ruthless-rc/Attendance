from datetime import datetime, date, time as dtime
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.attendance import Attendance
from app.models.user import User
from app.models.settings import SystemSetting
from app.core.config import settings
from app.core.logging import logger

class AttendanceService:
    @staticmethod
    def get_setting_value(db: Session, key: str, default: str) -> str:
        s = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        return s.value if s else default

    def mark_attendance(
        self,
        db: Session,
        user: User,
        confidence: Optional[float] = None,
        liveness_passed: bool = True,
        method: str = "face_recognition",
        notes: Optional[str] = None
    ) -> Tuple[bool, Optional[Attendance], str]:
        """
        Marks attendance with duplicate prevention and late arrival calculation.
        Returns (success, attendance_record, message).
        """
        now = datetime.now()
        today = now.date()
        current_time_str = now.strftime("%H:%M:%S")

        # 1. Retrieve Duplicate Interval & Late Cutoff configurations
        dup_interval_sec = int(self.get_setting_value(
            db, "duplicate_interval_seconds", str(settings.DEFAULT_DUPLICATE_INTERVAL_SECONDS)
        ))
        late_cutoff = self.get_setting_value(
            db, "late_cutoff_time", settings.DEFAULT_LATE_CUTOFF_TIME
        )

        # 2. Check for Duplicate Attendance
        if dup_interval_sec >= 86400:
            # Rule: One attendance entry per user per day
            existing = db.query(Attendance).filter(
                Attendance.user_id == user.id,
                Attendance.date == today
            ).first()
            if existing:
                return False, existing, f"Attendance already marked for today at {existing.time}."
        else:
            # Rule: Interval in seconds
            recent = db.query(Attendance).filter(
                Attendance.user_id == user.id
            ).order_by(desc(Attendance.created_at)).first()

            if recent:
                time_diff = (now - recent.created_at).total_seconds()
                if time_diff < dup_interval_sec:
                    remaining = int(dup_interval_sec - time_diff)
                    return False, recent, f"Attendance already marked at {recent.time}. Please wait {remaining}s."

        # 3. Calculate Attendance Status (Present vs Late)
        status = "present"
        try:
            cutoff_parts = [int(p) for p in late_cutoff.split(":")]
            cutoff_time = dtime(cutoff_parts[0], cutoff_parts[1])
            if now.time() > cutoff_time:
                status = "late"
        except Exception as e:
            logger.warning(f"Error parsing late cutoff time '{late_cutoff}': {e}")

        # 4. Create and Save Attendance Record
        attendance = Attendance(
            user_id=user.id,
            date=today,
            time=current_time_str,
            status=status,
            confidence=round(confidence, 4) if confidence else None,
            liveness_passed=liveness_passed,
            method=method,
            notes=notes,
            created_at=now
        )
        db.add(attendance)
        db.commit()
        db.refresh(attendance)

        logger.info(
            f"Attendance recorded for User {user.unique_id} ({user.full_name}) at {current_time_str} - Status: {status}"
        )
        return True, attendance, f"Attendance Marked Successfully for {user.full_name} ({user.unique_id}) at {current_time_str}."

attendance_service = AttendanceService()
