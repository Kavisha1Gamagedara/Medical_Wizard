# Medical Wizard — Appointment Management Backend

Backend service built with **Python 3.14**, **FastAPI**, **SQLAlchemy 2.0**, and **SQLite**.

---

## 📁 Architecture Overview

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py               # Token verification, get_current_user, role-based access checker
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   └── auth.py       # Register, Login (JSON + OAuth2), /me protected profile
│   │       └── router.py         # API v1 aggregator
│   ├── core/
│   │   ├── config.py             # Pydantic BaseSettings, JWT configurations, CORS
│   │   ├── database.py           # SQLAlchemy engine, session management, get_db dependency
│   │   └── security.py           # Bcrypt password hashing & PyJWT encoding/decoding
│   ├── models/
│   │   ├── user.py               # User model with role field for RBAC
│   │   └── appointment.py        # Appointment model based on assessment specifications
│   ├── schemas/
│   │   ├── user.py               # Pydantic schemas for auth & user profiles
│   │   └── appointment.py        # Pydantic schemas for appointments
│   ├── services/
│   │   └── auth_service.py       # Authentication business logic & validations
│   └── main.py                   # FastAPI application entry point & CORS
├── tests/
│   ├── conftest.py               # In-memory SQLite fixtures & TestClient
│   └── test_auth.py              # Automated test suite (Registration, Login, JWT, /me)
├── appointments.db               # SQLite local database
├── requirements.txt              # Production and test dependencies
├── pytest.ini                    # Test runner configuration
└── seed_users.py                 # Seed script for development accounts
```

---

## 🚀 Quick Start

### 1. Setup Virtual Environment & Install Dependencies
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Seed Default Test Accounts
```bash
python seed_users.py
```

This creates 3 pre-configured users:
- **Admin**: `username: admin` | `password: AdminPassword123!` | Role: `admin`
- **Doctor**: `username: drsmith` | `password: DoctorPassword123!` | Role: `doctor`
- **Staff**: `username: reception` | `password: StaffPassword123!` | Role: `staff`

### 3. Run the Development Server
```bash
uvicorn app.main:app --reload --port 8000
```

- **Interactive API Documentation (Swagger)**: http://localhost:8000/docs
- **Alternative ReDoc UI**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

---

## 🧪 Running Automated Tests
Run the test suite using `pytest`:
```bash
pytest -v
```
All tests run against an isolated in-memory SQLite database (`sqlite:///:memory:`).
