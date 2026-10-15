# Medical Wizard — Clinical Appointment Management Platform

A clinical appointment scheduling and management system developed for the **Medical Wizard AI Engineering Intern** practical assessment.

---

## 🛠️ Tech Stack

* **Backend:** Python 3.14, FastAPI, SQLAlchemy 2.0, Pydantic v2, PyJWT, Passlib (Bcrypt), Pytest
* **Database:** SQLite (default zero-config relational database via SQLAlchemy, production-ready for PostgreSQL)
* **Frontend:** React (Vite), Vanilla CSS design system, Lucide Icons

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py               # Token verification & granular RBAC helpers
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── auth.py           # Register, Login (JSON + OAuth2), /me protected profile
│   │   │       │   ├── appointments.py   # Booking, collisions, status updates, check-in, receipts
│   │   │       │   ├── doctors.py        # Public doctor directory & availability schedules
│   │   │       │   ├── users.py          # Admin user management & patient directory search
│   │   │       │   ├── notifications.py  # Patient-isolated notification alerts
│   │   │       │   └── waitlist.py       # Priority waitlist & automated slot reclamation
│   │   │       └── router.py
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic BaseSettings, JWT, CORS
│   │   │   ├── database.py           # SQLAlchemy engine, session maker, get_db
│   │   │   └── security.py           # Bcrypt hashing & PyJWT token utilities
│   │   ├── models/                   # SQLAlchemy ORM models (User, Appointment, Waitlist, Availability, Notification)
│   │   ├── schemas/                  # Pydantic v2 request/response schemas
│   │   ├── services/                 # Business logic (auth, scheduling, collisions, waitlist)
│   │   └── main.py                   # FastAPI application & CORS
│   ├── tests/                        # 45 automated pytest test cases across 8 test suites
│   ├── .env.example                  # Environment configuration template
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── seed_users.py                 # Seeds initial administrator account
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/               # Modular UI components (Booking, Directory, Admin, Modals)
│   │   ├── services/
│   │   │   └── api.js                # Centralized fetch client with Bearer token injection
│   │   ├── App.jsx                   # Role-based dashboard view orchestrator
│   │   ├── index.css                 # Glassmorphic clinical design system
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Getting Started

### ⚡ Option A: 1-Click Startup (Recommended for Windows)
Simply double-click or run:
```cmd
start.bat
```
This script automatically:
1. Verifies/creates the Python virtual environment and installs backend dependencies.
2. Initializes the database and seeds the initial administrator account.
3. Installs frontend dependencies (if missing).
4. Launches FastAPI (port 8000) and React Vite (port 5173) in synchronized console windows.
5. Opens your default browser directly to `http://localhost:5173/`.

---

### 🛠️ Option B: Manual Startup

#### 1. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed initial admin account
python seed_users.py

# Start backend server
uvicorn app.main:app --reload --port 8000
```
* **Interactive API Documentation (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Alternative ReDoc UI:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Health Check Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)

#### 2. Frontend Setup
In a separate terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
* Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Initial Administrator Credentials

The application uses real database-persisted accounts with bcrypt password hashing (no hardcoded credentials or client-side bypasses). Log in with the pre-seeded administrator account to manage practice staff, register clinicians, or create patients:

* **Username:** `admin` *(or email: `admin@medicalwizard.com.au`)*
* **Password:** `AdminPassword123!`
* **Role:** `admin`

Once logged in, open the **Admin User Directory** to register doctors, reception staff, and patients with specific medical specializations.

---

## 🧪 Automated Tests

Run the complete backend test suite:
```bash
cd backend
pytest -v
```

All **45 tests** run against an isolated in-memory SQLite database (`sqlite:///:memory:`) with per-test transactional rollback:
* `test_auth.py` (9 tests): Registration, duplicate prevention, JWT login, profile updates.
* `test_rbac.py` (8 tests): Strict multi-role permission matrices and cross-patient confidentiality.
* `test_collision_prevention.py` (9 tests): 30-minute booking collision windows, cross-timezone consistency, past-date blocking.
* `test_doctor_availability.py` (5 tests): Working hours enforcement, mathematical slot capacity checks, daily appointment caps.
* `test_verification_and_checkin.py` (9 tests): Appointment verification codes, reception check-in, unattended slot expiry.
* `test_waitlist_and_reclaim.py` (1 test): Priority waitlist lifecycle and automated slot reclaim upon cancellation.
* `test_notification_privacy.py` (1 test): Patient-scoped notification isolation preventing clinician data leakage.
* `test_appointments_and_doctors.py` (3 tests): Doctor directory filtering and appointment querying.
