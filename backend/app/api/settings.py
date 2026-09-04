from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.models.admin import Admin
from app.models.settings import SystemSetting
from app.schemas.settings import SettingsResponse, SettingsUpdateRequest
from app.core.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULTS = {
    "recognition_threshold": str(settings.DEFAULT_RECOGNITION_THRESHOLD),
    "duplicate_interval_seconds": str(settings.DEFAULT_DUPLICATE_INTERVAL_SECONDS),
    "liveness_mode": settings.DEFAULT_LIVENESS_MODE,
    "late_cutoff_time": settings.DEFAULT_LATE_CUTOFF_TIME,
    "privacy_consent_text": settings.DEFAULT_PRIVACY_CONSENT_TEXT
}

def fetch_settings_dict(db: Session) -> dict:
    res = dict(DEFAULTS)
    db_items = db.query(SystemSetting).all()
    for item in db_items:
        res[item.key] = item.value
    return res

@router.get("", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    data = fetch_settings_dict(db)
    return SettingsResponse(
        recognition_threshold=float(data["recognition_threshold"]),
        duplicate_interval_seconds=int(data["duplicate_interval_seconds"]),
        liveness_mode=data["liveness_mode"],
        late_cutoff_time=data["late_cutoff_time"],
        privacy_consent_text=data["privacy_consent_text"]
    )

@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    """Public settings needed by Kiosk and Registration without admin credentials."""
    data = fetch_settings_dict(db)
    return {
        "liveness_mode": data["liveness_mode"],
        "privacy_consent_text": data["privacy_consent_text"]
    }

@router.put("", response_model=SettingsResponse)
def update_settings(
    update_req: SettingsUpdateRequest,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin)
):
    updates = update_req.model_dump(exclude_unset=True)

    for k, v in updates.items():
        if v is not None:
            setting_row = db.query(SystemSetting).filter(SystemSetting.key == k).first()
            if not setting_row:
                setting_row = SystemSetting(key=k, value=str(v))
                db.add(setting_row)
            else:
                setting_row.value = str(v)

    db.commit()
    data = fetch_settings_dict(db)
    return SettingsResponse(
        recognition_threshold=float(data["recognition_threshold"]),
        duplicate_interval_seconds=int(data["duplicate_interval_seconds"]),
        liveness_mode=data["liveness_mode"],
        late_cutoff_time=data["late_cutoff_time"],
        privacy_consent_text=data["privacy_consent_text"]
    )
