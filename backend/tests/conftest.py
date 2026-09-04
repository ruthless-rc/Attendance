import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database.base import Base
from app.api.deps import get_db
from app.main import app
from app.models.admin import Admin
from app.models.user import User
from app.models.attendance import Attendance
from app.core.security import hash_password

TEST_DATABASE_URL = "sqlite:///./test_attendance.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_attendance.db"):
        try:
            os.remove("./test_attendance.db")
        except Exception:
            pass

@pytest.fixture
def db():
    session = TestingSessionLocal()
    # Ensure test admin is present
    if not session.query(Admin).filter(Admin.username == "testadmin").first():
        admin = Admin(
            username="testadmin",
            email="testadmin@example.com",
            hashed_password=hash_password("testpass123"),
            is_active=True,
            is_superadmin=True
        )
        session.add(admin)
        session.commit()

    yield session

    session.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers(client):
    login_resp = client.post("/api/auth/login-json", json={
        "username": "testadmin",
        "password": "testpass123"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
