from datetime import date, datetime
from app.services.attendance_service import attendance_service
from app.models.user import User
from app.models.attendance import Attendance

def test_mark_attendance_and_duplicate_prevention(client, db, auth_headers):
    # Create an enrolled user
    user = User(
        unique_id="STU_ATT_1",
        full_name="Mark Attendant",
        email="mark@example.com",
        department="Engineering",
        status="active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 1. First attendance attempt - should succeed
    success, att, msg = attendance_service.mark_attendance(
        db=db,
        user=user,
        confidence=0.89,
        liveness_passed=True,
        method="face_recognition"
    )
    assert success is True
    assert att is not None
    assert att.user_id == user.id
    assert att.status in ["present", "late"]
    assert "Attendance Marked Successfully" in msg

    # 2. Immediate second attendance attempt - should be blocked by duplicate protection!
    success2, att2, msg2 = attendance_service.mark_attendance(
        db=db,
        user=user,
        confidence=0.92,
        liveness_passed=True,
        method="face_recognition"
    )
    assert success2 is False
    assert "already marked" in msg2.lower()

def test_today_attendance_endpoint(client, db, auth_headers):
    resp = client.get("/api/attendance/today", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_active_users" in data
    assert "present_count" in data
    assert "absent_count" in data
    assert "present_records" in data
    assert "absent_users" in data

def test_export_csv(client, auth_headers):
    resp = client.get("/api/attendance/export/csv", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/csv; charset=utf-8"
    assert "Record ID,User ID,Full Name" in resp.text

def test_export_excel(client, auth_headers):
    resp = client.get("/api/attendance/export/excel", headers=auth_headers)
    assert resp.status_code == 200
    assert "openxmlformats" in resp.headers["content-type"]
    assert len(resp.content) > 1000  # Valid binary Excel workbook
