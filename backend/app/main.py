from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensures all models are registered with Base metadata
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: automatically create database tables
    Base.metadata.create_all(bind=engine)
    # Ensure SQLite columns exist for appointments verification
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            res = conn.execute(text("PRAGMA table_info(appointments)")).fetchall()
            if res:
                col_names = [r[1] for r in res]
                if "verification_code" not in col_names:
                    conn.execute(text("ALTER TABLE appointments ADD COLUMN verification_code VARCHAR(50)"))
                if "is_verified" not in col_names:
                    conn.execute(text("ALTER TABLE appointments ADD COLUMN is_verified BOOLEAN DEFAULT 0"))
                if "verified_at" not in col_names:
                    conn.execute(text("ALTER TABLE appointments ADD COLUMN verified_at DATETIME"))
                if "verified_by" not in col_names:
                    conn.execute(text("ALTER TABLE appointments ADD COLUMN verified_by VARCHAR(200)"))
                conn.commit()
    except Exception as e:
        print("Schema sync notice:", e)
    yield
    # Shutdown logic (if any)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Medical Wizard Appointment Management System (AI Engineering Intern Assessment)",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health Check"])
def health_check():
    return {
        "status": "ok",
        "database": "sqlite",
    }
