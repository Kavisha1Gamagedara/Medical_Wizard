# Medical Wizard — Appointment Management Backend

Backend service built with **Python 3.14**, **FastAPI**, **SQLAlchemy 2.0**, **Pydantic v2**, and **SQLite**.

---

## 📁 Architecture Overview

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py               # Token verification, get_current_user, granular role checker (require_roles)
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py           # Register, Login (JSON + OAuth2), /me protected profile
│   │       │   ├── appointments.py   # Consultation booking, 30-min collision check, check-in, receipts
│   │       │   ├── doctors.py        # Public doctor directory, schedule & slot generation
│   │       │   ├── users.py          # Admin user management & patient search
│   │       │   ├── notifications.py  # Patient-isolated notification alerts
│   │       │   └── waitlist.py       # Priority waitlist & automated slot reclamation
│   │       └── router.py         # API v1 aggregator
│   ├── core/
│   │   ├── config.py             # Pydantic BaseSettings, JWT configurations, CORS
│   │   ├── database.py           # SQLAlchemy engine, session management, get_db dependency
│   │   └── security.py           # Bcrypt password hashing & PyJWT encoding/decoding
│   ├── models/
│   │   ├── user.py               # User model with role support (admin, doctor, staff, patient)
│   │   ├── appointment.py        # Appointment model with verification codes & audit tracking
│   │   ├── doctor_availability.py# Doctor working hours & daily appointment capacity rules
│   │   ├── waitlist.py           # Priority queue for cancelled slot reclaim
│   │   └── notification.py       # Patient-scoped persistent notification records
│   ├── schemas/
│   │   ├── user.py               # Pydantic schemas for auth & user profiles
│   │   ├── appointment.py        # Pydantic schemas for appointments & check-in
│   │   ├── doctor_availability.py# Pydantic schemas for doctor schedules
│   │   ├── waitlist.py           # Pydantic schemas for waitlist entries
│   │   └── notification.py       # Pydantic schemas for notifications
│   ├── services/
│   │   ├── auth_service.py       # Authentication business logic & password verification
│   │   ├── appointment_service.py# Booking rules, collision prevention & check-in lifecycle
│   │   └── availability_service.py# Shift scheduling, capacity limits & mathematical slot validation
│   └── main.py                   # FastAPI application entry point & CORS
├── tests/                        # 45 automated pytest test cases across 8 test suites
│   ├── conftest.py               # In-memory SQLite fixtures & TestClient
│   ├── test_auth.py              # Auth & registration tests
│   ├── test_rbac.py              # Role-based access control tests
│   ├── test_collision_prevention.py # Booking collision & timezone tests
│   ├── test_doctor_availability.py  # Capacity, hours & mathematical slot duration tests
│   ├── test_verification_and_checkin.py # Check-in codes & expiry tests
│   ├── test_waitlist_and_reclaim.py # Waitlist auto-reclaim tests
│   ├── test_notification_privacy.py # Patient notification isolation tests
│   └── test_appointments_and_doctors.py # Directory & search tests
├── appointments.db               # SQLite local database
├── requirements.txt              # Production and test dependencies
├── pytest.ini                    # Test runner configuration
├── .env.example                  # Environment configuration template
└── seed_users.py                 # Seeds initial administrator account
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

### 2. Seed Initial Admin Account
```bash
python seed_users.py
```

This creates the initial database-persisted administrator account:
* **Username**: `admin` *(or `admin@medicalwizard.com.au`)*
* **Password**: `AdminPassword123!`
* **Role**: `admin`

Additional clinicians, front-desk staff, and patients can be created via the Admin Dashboard.

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
All **45 tests** run against an isolated in-memory SQLite database (`sqlite:///:memory:`) with per-test transactional rollback.
