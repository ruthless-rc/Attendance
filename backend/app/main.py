from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.security import hash_password
from app.database.session import engine, SessionLocal
from app.database.base import Base
import app.models  # Register all SQLAlchemy models
from app.models.admin import Admin
from app.models.settings import SystemSetting
from app.api import api_router
from app.recognition.model_loader import model_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup logging
    setup_logging()
    logger.info("Initializing Face Recognition Attendance System...")

    # Create DB tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created.")

    # Preload and verify face models
    try:
        model_manager.ensure_models_exist()
        logger.info("Face recognition models ready in memory.")
    except Exception as e:
        logger.error(f"Error loading face models: {e}")

    # Seed Default Admin if not present
    db = SessionLocal()
    try:
        existing_admin = db.query(Admin).filter(Admin.username == settings.ADMIN_DEFAULT_USERNAME).first()
        if not existing_admin:
            admin = Admin(
                username=settings.ADMIN_DEFAULT_USERNAME,
                email=settings.ADMIN_DEFAULT_EMAIL,
                hashed_password=hash_password(settings.ADMIN_DEFAULT_PASSWORD),
                is_active=True,
                is_superadmin=True
            )
            db.add(admin)
            db.commit()
            logger.info(f"Default admin created with username '{settings.ADMIN_DEFAULT_USERNAME}'.")
    finally:
        db.close()

    yield
    logger.info("Shutting down Face Recognition Attendance System.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "connected"
    }

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs_url": f"{settings.API_V1_STR}/docs"
    }
