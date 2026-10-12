@echo off
title Medical Wizard - Startup Launcher
color 0b

echo ======================================================================
echo          Medical Wizard - Clinical Appointment Management
echo               FastAPI Backend + React Frontend Launcher
echo ======================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: 1. Verify Prerequisites
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not found in PATH! Please install Python 3.10+
    pause
    exit /b 1
)

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH! Please install Node.js 18+
    pause
    exit /b 1
)

:: 2. Check & Setup Backend Virtual Environment
if not exist "%ROOT_DIR%backend\venv\Scripts\python.exe" (
    echo [1/4] Creating Python virtual environment in backend\venv...
    python -m venv "%ROOT_DIR%backend\venv"
    echo [2/4] Installing backend dependencies...
    "%ROOT_DIR%backend\venv\Scripts\pip" install -r "%ROOT_DIR%backend\requirements.txt"
) else (
    echo [1/4] Backend virtual environment verified.
)

:: 3. Seed Database if Not Initialized
if not exist "%ROOT_DIR%backend\appointments.db" (
    echo [2/4] Initializing SQLite database and seeding default users...
    cd /d "%ROOT_DIR%backend"
    "%ROOT_DIR%backend\venv\Scripts\python.exe" seed_users.py
    cd /d "%ROOT_DIR%"
) else (
    echo [2/4] Database found at backend\appointments.db.
)

:: 4. Check Frontend Dependencies
if not exist "%ROOT_DIR%frontend\node_modules" (
    echo [3/4] Installing frontend npm packages...
    cd /d "%ROOT_DIR%frontend"
    call npm install
    cd /d "%ROOT_DIR%"
) else (
    echo [3/4] Frontend node_modules verified.
)

echo [4/4] Launching services...
echo.

:: 5. Start Backend Server (Uvicorn on Port 8000)
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Medical Wizard - Backend API (Port 8000)" cmd /k "cd /d "%ROOT_DIR%backend" && .\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload"

:: 6. Start Frontend Server (Vite on Port 5173)
echo Starting React Frontend on http://localhost:5173 ...
start "Medical Wizard - Frontend (Vite)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo.
echo ======================================================================
echo                       SERVICES RUNNING!
echo ======================================================================
echo  Frontend Web App:  http://localhost:5173
echo  Backend API Docs:  http://127.0.0.1:8000/docs
echo  Health Check:      http://127.0.0.1:8000/health
echo.
echo  Demo Credentials:
echo   - Doctor (Neurosurgeon): drsmith   / DoctorPassword123!
echo   - Doctor (Dentist):      drjones   / DoctorPassword123!
echo   - Administrator:         admin     / AdminPassword123!
echo   - Reception Staff:       reception / StaffPassword123!
echo ======================================================================
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173/

echo.
echo Keep the backend and frontend terminal windows open.
echo You can close this launcher window now.
pause
