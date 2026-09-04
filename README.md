# Face Detection Attendance System

A production-ready, real-time face recognition attendance system built with **FastAPI** (Python 3.11) + **React** (Vite + Tailwind CSS). Register users by capturing their face from a webcam, then automatically mark attendance whenever their face appears in front of the camera kiosk.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Face Registration** | Capture 10 face samples with liveness prompts (blink / turn left / right) |
| **Real-time Recognition** | YuNet + SFace ONNX pipeline @ ~15 FPS; cosine similarity matching |
| **Anti-spoofing** | Head-pose estimation + eye-blink liveness challenge |
| **Attendance Kiosk** | Full-screen auto-scan mode — shows name + confetti on match |
| **Admin Dashboard** | Stats cards, 7-day trend chart, department breakdown, hourly distribution |
| **Attendance Records** | Filter by date/dept; manual entry; export CSV / Excel / PDF |
| **User Management** | Add, edit, delete users; re-register faces; view per-user attendance |
| **Settings** | Configurable recognition threshold, duplicate interval, late threshold |
| **Dark UI** | Responsive dark-mode interface with real-time overlay canvas |

---

## 🗂 Project Structure

```
Face_Detection_Attendance/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/                # Route handlers (auth, users, recognition, …)
│   │   ├── core/               # Config, security, logging
│   │   ├── database/           # SQLAlchemy session + base
│   │   ├── models/             # ORM models
│   │   ├── recognition/        # YuNet + SFace pipeline, liveness
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic (attendance, exports)
│   │   └── main.py             # FastAPI app entry point
│   ├── tests/                  # pytest test suite (22 tests)
│   ├── download_models.py      # Downloads ONNX model files
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── pages/              # Login, Dashboard, Users, RegisterUser, Kiosk, …
│   │   ├── components/         # Navbar, Sidebar, Modal, FaceOverlayCanvas, …
│   │   ├── services/api.js     # Axios client with JWT interceptor
│   │   ├── context/            # AuthContext
│   │   └── hooks/useCamera.js  # WebRTC camera hook
│   ├── nginx.conf              # Nginx SPA + API proxy config (Docker)
│   └── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

| Tool | Version |
|---|---|
| Python | **3.11** (not 3.12+) |
| Node.js | 18+ |
| npm | 9+ |
| Webcam | Required for face registration and kiosk |

> **Why Python 3.11?** OpenCV's `FaceDetectorYN` / `FaceRecognizerSF` APIs and MediaPipe require Python ≤ 3.11 at this time.

---

### 1. Backend Setup

```powershell
# Navigate into the backend directory
cd backend

# Install Python dependencies (use py -3.11 on Windows if 3.11 is not default)
py -3.11 -m pip install -r requirements.txt

# Download YuNet + SFace ONNX models (~39 MB total)
py -3.11 download_models.py

# Copy environment config and edit if needed
copy .env.example .env

# Start the API server
py -3.11 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at **http://127.0.0.1:8000**  
Interactive docs: **http://127.0.0.1:8000/docs**

---

### 2. Frontend Setup

Open a **new** terminal:

```powershell
cd frontend

# Install dependencies
npm install          # Windows: use npm.cmd install if npm is not on PATH

# Start dev server (proxies /api → http://127.0.0.1:8000)
npm run dev          # Windows: npm.cmd run dev
```

App available at **http://localhost:5173**

---

### 3. First Login

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

> Change the admin password in `backend/.env` (`ADMIN_PASSWORD`) before deploying to production.

---

## 📸 Using the System

### Register a New User

1. Go to **Users → Add User** — fill in name, ID, email, department.
2. Click **Register Face** on the user card.
3. Allow camera access. Follow the on-screen liveness prompts (blink, turn left, turn right).
4. The system captures 10 face samples, aggregates embeddings, and saves the biometric.

### Mark Attendance (Kiosk Mode)

1. Navigate to **http://localhost:5173/kiosk** (or click **Kiosk** in the sidebar).
2. The camera starts scanning automatically every ~450 ms.
3. When a registered face is detected above the confidence threshold, attendance is marked and a success animation plays.

### View / Export Attendance

1. Go to **Attendance** in the sidebar.
2. Filter by date range and department.
3. Click **Export CSV**, **Export Excel**, or **Export PDF**.

---

## ⚙️ Configuration (`.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./attendance.db` | SQLAlchemy database URL |
| `SECRET_KEY` | *(random 32 chars)* | JWT signing secret — **change in production** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | JWT lifetime |
| `ADMIN_USERNAME` | `admin` | Initial admin username |
| `ADMIN_PASSWORD` | `admin123` | Initial admin password |
| `RECOGNITION_THRESHOLD` | `0.35` | Cosine similarity threshold (0–1); lower = stricter |
| `DUPLICATE_INTERVAL_SECONDS` | `86400` | Minimum seconds between attendance records per user |
| `LATE_THRESHOLD_HOUR` | `9` | Hour (24h) after which attendance is flagged "late" |
| `MAX_FACE_SAMPLES` | `10` | Samples captured during registration |

---

## 🐳 Docker Deployment

> **Prerequisite:** Models must be downloaded first (they are bind-mounted into the container).

```powershell
# From the project root
py -3.11 backend/download_models.py

# Build and start all services
docker compose up --build

# Run in background
docker compose up --build -d
```

| Service | Port | URL |
|---|---|---|
| Frontend (Nginx) | 80 | http://localhost |
| Backend (FastAPI) | 8000 | http://localhost:8000/docs |

---

## 🧪 Running Tests

```powershell
# From the project root
py -3.11 -m pytest backend/tests/ -v
```

Expected: **22 passed**

---

## 🔌 API Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/login` | POST | ❌ | Obtain JWT token |
| `/api/auth/me` | GET | ✅ | Current admin info |
| `/api/users/` | GET/POST | ✅ | List / create users |
| `/api/users/{id}` | GET/PUT/DELETE | ✅ | User detail |
| `/api/users/{id}/face/register` | POST | ✅ | Register face (base64 frame array) |
| `/api/users/{id}/face/status` | GET | ✅ | Check registration status |
| `/api/attendance/` | GET/POST | ✅ | List / manual-create attendance |
| `/api/attendance/today` | GET | ✅ | Today's attendance roster |
| `/api/attendance/export/csv` | GET | ✅ | Download CSV |
| `/api/attendance/export/excel` | GET | ✅ | Download XLSX |
| `/api/attendance/export/pdf` | GET | ✅ | Download PDF |
| `/api/recognition/verify` | POST | ❌ | Identify face from base64 frame |
| `/api/recognition/liveness-challenge` | GET | ✅ | Get liveness prompt |
| `/api/recognition/liveness-verify` | POST | ✅ | Verify liveness response |
| `/api/dashboard/statistics` | GET | ✅ | Dashboard stats + charts data |
| `/api/settings` | GET/PUT | ✅ | Admin settings |
| `/api/settings/public` | GET | ❌ | Public settings (threshold etc.) |
| `/health` | GET | ❌ | Health check |

Full interactive docs at **http://localhost:8000/docs** (Swagger UI).

---

## 🏗 Technical Architecture

```
Browser (React + Vite)
       │
       │  WebRTC (getUserMedia)
       ▼
  useCamera hook ──► FaceOverlayCanvas (canvas reticle)
       │
       │  POST /api/recognition/verify (base64 JPEG frames)
       ▼
FastAPI Backend
  ├── YuNet FaceDetectorYN   — detect + 5-point landmarks
  ├── SFace FaceRecognizerSF — align + 128D L2 embedding
  ├── LivenessDetector       — head-pose ratio + eye Sobel gradient
  └── FaceRecognizer         — cosine similarity → best match
       │
       ▼
SQLite (attendance.db)
  ├── admins
  ├── users   (face_embedding: BLOB 512 bytes)
  ├── attendance_records
  └── settings
```

### Recognition Pipeline

1. **Frame decode** — base64 JPEG → OpenCV BGR array
2. **Face detection** — YuNet returns bounding box + 5 landmarks (eyes, nose, mouth corners)
3. **Quality check** — face size ≥ 80 px, brightness 40–250, Laplacian variance ≥ 20 (blur)
4. **Embedding extraction** — SFace aligns face using landmarks → 128-dim float32 vector → L2 normalize
5. **Similarity search** — cosine similarity against all registered embeddings → top match
6. **Threshold** — if similarity ≥ `RECOGNITION_THRESHOLD` → identity confirmed

### Liveness Detection

- **Blink** — Sobel gradient variance in eye region drops during a blink
- **Turn left / right** — Ratio of nose-to-eye landmark horizontal distances detects head rotation

---

## 🔐 Security Notes

- Passwords hashed with **bcrypt** (cost factor 12)
- JWT tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES`
- Only face **embeddings** are stored — no raw photos
- Change `SECRET_KEY` and `ADMIN_PASSWORD` before any deployment
- CORS is locked to `localhost` origins in development; update `ALLOWED_ORIGINS` in `.env` for production

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
