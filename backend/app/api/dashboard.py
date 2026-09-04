from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from datetime import date, timedelta
from typing import Dict, List

from app.api.deps import get_db, get_current_admin
from app.models.admin import Admin
from app.models.attendance import Attendance
from app.models.user import User
from app.schemas.dashboard import (
    DashboardStatsResponse,
    StatSummary,
    DailyTrend,
    DepartmentBreakdown,
    HourlyDistribution,
    RecentAttendanceItem
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/statistics", response_model=DashboardStatsResponse)
def get_dashboard_statistics(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    today = date.today()

    # 1. Total active and enrolled users
    total_users = db.query(User).filter(User.status == "active").count()

    # 2. Today's attendance records
    today_records = db.query(Attendance).filter(Attendance.date == today).all()
    present_today = len(today_records)
    late_today = sum(1 for r in today_records if r.status == "late")
    absent_today = max(0, total_users - present_today)
    att_rate = round((present_today / total_users * 100.0), 1) if total_users > 0 else 0.0

    summary = StatSummary(
        total_users=total_users,
        present_today=present_today,
        absent_today=absent_today,
        late_today=late_today,
        attendance_rate=att_rate
    )

    # 3. 7-Day Trend
    daily_trends: List[DailyTrend] = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_records = db.query(Attendance).filter(Attendance.date == day).all()
        p = len(day_records)
        l = sum(1 for r in day_records if r.status == "late")
        a = max(0, total_users - p)
        daily_trends.append(DailyTrend(
            date=day.strftime("%b %d"),
            present=p,
            late=l,
            absent=a
        ))

    # 4. Department Breakdown
    dept_map: Dict[str, Dict[str, int]] = {}
    all_users = db.query(User).filter(User.status == "active").all()
    for u in all_users:
        dept = u.department or "General"
        if dept not in dept_map:
            dept_map[dept] = {"total": 0, "present": 0}
        dept_map[dept]["total"] += 1

    present_user_ids = {r.user_id for r in today_records}
    for u in all_users:
        dept = u.department or "General"
        if u.id in present_user_ids:
            dept_map[dept]["present"] += 1

    department_breakdowns: List[DepartmentBreakdown] = []
    for dept, val in dept_map.items():
        pct = round((val["present"] / val["total"] * 100.0), 1) if val["total"] > 0 else 0.0
        department_breakdowns.append(DepartmentBreakdown(
            department=dept,
            total_users=val["total"],
            present=val["present"],
            percentage=pct
        ))

    # 5. Hourly Distribution for Today
    hour_counts: Dict[str, int] = {f"{h:02d}:00": 0 for h in range(7, 19)}
    for r in today_records:
        try:
            hour_str = f"{int(r.time.split(':')[0]):02d}:00"
            if hour_str in hour_counts:
                hour_counts[hour_str] += 1
        except Exception:
            pass

    hourly_distributions = [
        HourlyDistribution(hour=h, count=c) for h, c in hour_counts.items()
    ]

    # 6. Recent Attendances (last 10)
    recent_db = db.query(Attendance).options(joinedload(Attendance.user)).order_by(
        desc(Attendance.created_at)
    ).limit(10).all()

    recent_attendances = [
        RecentAttendanceItem(
            id=r.id,
            user_id=r.user_id,
            name=r.user.full_name if r.user else "Unknown",
            unique_id=r.user.unique_id if r.user else "N/A",
            department=r.user.department if r.user else "N/A",
            time=r.time,
            status=r.status,
            confidence=r.confidence,
            liveness_passed=r.liveness_passed
        )
        for r in recent_db
    ]

    return DashboardStatsResponse(
        summary=summary,
        daily_trends=daily_trends,
        department_breakdowns=department_breakdowns,
        hourly_distributions=hourly_distributions,
        recent_attendances=recent_attendances
    )
