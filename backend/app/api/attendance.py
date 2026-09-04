from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import date, datetime

from app.api.deps import get_db, get_current_admin
from app.models.admin import Admin
from app.models.attendance import Attendance
from app.models.user import User
from app.schemas.attendance import AttendanceResponse, AttendanceManualCreate
from app.services.export_service import export_service

router = APIRouter(prefix="/attendance", tags=["Attendance"])

def apply_attendance_filters(
    query,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    user_id: Optional[int] = None,
    search: Optional[str] = None
):
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)
    if status_filter:
        query = query.filter(Attendance.status == status_filter)
    if user_id:
        query = query.filter(Attendance.user_id == user_id)
    if department:
        query = query.join(Attendance.user).filter(User.department == department)
    elif search:
        query = query.join(Attendance.user)

    if search:
        s = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(s)) | (User.unique_id.ilike(s))
        )
    return query

@router.get("", response_model=List[AttendanceResponse])
def get_attendance_records(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    user_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    query = db.query(Attendance).options(joinedload(Attendance.user))
    query = apply_attendance_filters(query, start_date, end_date, department, status_filter, user_id, search)
    records = query.order_by(desc(Attendance.date), desc(Attendance.time)).offset(skip).limit(limit).all()
    return records

@router.get("/today")
def get_today_attendance(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    today = date.today()
    records = db.query(Attendance).options(joinedload(Attendance.user)).filter(Attendance.date == today).order_by(desc(Attendance.time)).all()
    present_user_ids = {r.user_id for r in records}

    # Find absent users (active users who haven't marked attendance today)
    all_active_users = db.query(User).filter(User.status == "active").all()
    absent_users = [
        {
            "id": u.id,
            "unique_id": u.unique_id,
            "full_name": u.full_name,
            "department": u.department,
            "is_face_registered": u.is_face_registered
        }
        for u in all_active_users if u.id not in present_user_ids
    ]

    return {
        "date": str(today),
        "total_active_users": len(all_active_users),
        "present_count": len(records),
        "absent_count": len(absent_users),
        "present_records": records,
        "absent_users": absent_users
    }

@router.get("/user/{user_id}", response_model=List[AttendanceResponse])
def get_user_attendance_history(
    user_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    records = db.query(Attendance).options(joinedload(Attendance.user)).filter(
        Attendance.user_id == user_id
    ).order_by(desc(Attendance.date), desc(Attendance.time)).limit(limit).all()
    return records

@router.post("/manual", response_model=AttendanceResponse)
def create_manual_attendance(
    att_in: AttendanceManualCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == att_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if duplicate exists for this exact user and date
    existing = db.query(Attendance).filter(
        Attendance.user_id == user.id,
        Attendance.date == att_in.date
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Attendance already exists for {user.full_name} on {att_in.date} (Status: {existing.status})."
        )

    att = Attendance(
        user_id=user.id,
        date=att_in.date,
        time=att_in.time,
        status=att_in.status,
        confidence=1.0,
        liveness_passed=True,
        method="manual",
        notes=att_in.notes
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance_record(
    record_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    record = db.query(Attendance).filter(Attendance.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(record)
    db.commit()
    return None

@router.get("/export/csv")
def export_attendance_csv(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    query = db.query(Attendance).options(joinedload(Attendance.user))
    query = apply_attendance_filters(query, start_date, end_date, department, status_filter, None, search)
    records = query.order_by(desc(Attendance.date), desc(Attendance.time)).all()

    csv_buf = export_service.export_csv(records)
    filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_buf.read(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/excel")
def export_attendance_excel(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    query = db.query(Attendance).options(joinedload(Attendance.user))
    query = apply_attendance_filters(query, start_date, end_date, department, status_filter, None, search)
    records = query.order_by(desc(Attendance.date), desc(Attendance.time)).all()

    excel_buf = export_service.export_excel(records)
    filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=excel_buf.read(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/pdf")
def export_attendance_pdf(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    query = db.query(Attendance).options(joinedload(Attendance.user))
    query = apply_attendance_filters(query, start_date, end_date, department, status_filter, None, search)
    records = query.order_by(desc(Attendance.date), desc(Attendance.time)).all()

    pdf_buf = export_service.export_pdf(records, title="Organization Attendance Report")
    filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return Response(
        content=pdf_buf.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
