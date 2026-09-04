from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.attendance import router as attendance_router
from app.api.recognition import router as recognition_router
from app.api.dashboard import router as dashboard_router
from app.api.settings import router as settings_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(attendance_router)
api_router.include_router(recognition_router)
api_router.include_router(dashboard_router)
api_router.include_router(settings_router)
