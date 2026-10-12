# Medical Wizard — Clinical Appointment Management Platform

A clinical appointment scheduling and management system developed for the **Medical Wizard AI Engineering Intern** practical assessment.

---

## 🛠️ Tech Stack

* **Backend:** Python 3.14, FastAPI, SQLAlchemy 2.0, Pydantic v2, PyJWT, Bcrypt, Pytest
* **Database:** SQLite (default zero-config relational database via SQLAlchemy, production-ready for PostgreSQL)
* **Frontend:** React (Vite), Vanilla CSS design system, Lucide Icons

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py             # Auth dependencies & RBAC helpers
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   └── auth.py     # Register, Login (JSON + OAuth2), /me endpoint
│   │   │       └── router.py
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic BaseSettings, JWT, CORS
│   │   │   ├── database.py         # SQLAlchemy engine, session maker, get_db
│   │   │   └── security.py         # Bcrypt hashing & PyJWT token utilities
│   │   ├── models/
│   │   │   ├── user.py             # User DB model with role support
│   │   │   └── appointment.py      # Appointment DB model
│   │   ├── schemas/
│   │   │   ├── user.py             # Auth & user schemas
│   │   │   └── appointment.py      # Appointment schemas
│   │   ├── services/
│   │   │   └── auth_service.py     # Authentication business logic
│   │   └── main.py                 # FastAPI application & CORS
│   ├── tests/
│   │   ├── conftest.py             # In-memory SQLite fixtures & TestClient
│   │   └── test_auth.py            # Automated test suite
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── seed_users.py               # Seeds default test users
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginCard.jsx       # Login/Register card with 1-click demo logins
│   │   │   └── DashboardPreview.jsx# Verified dashboard session view
│   │   ├── services/
│   │   │   └── api.js              # Fetch client with Bearer token injection
│   │   ├── styles/
│   │   │   └── index.css           # Glassmorphic clinical design system
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Getting Started

### 1. Backend Setup
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

# Seed test users
python seed_users.py

# Start backend server
uvicorn app.main:app --reload --port 8000
```
* **API Documentation (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Alternative ReDoc UI:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 2. Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
* Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Pre-Seeded Demo Credentials

For quick evaluation, click the demo buttons on the login screen or use:
* **Doctor:** `drsmith` / `DoctorPassword123!`
* **Admin:** `admin` / `AdminPassword123!`
* **Staff:** `reception` / `StaffPassword123!`

---

## 🧪 Automated Tests
Run the backend test suite:
```bash
cd backend
pytest -v
```
All tests run against an isolated in-memory SQLite database (`sqlite:///:memory:`).
