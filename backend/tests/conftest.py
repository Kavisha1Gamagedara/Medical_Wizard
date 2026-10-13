import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

import app.models  # Ensure models are loaded into Base metadata
from app.core.database import Base, get_db
from app.main import app as fastapi_app

# Create an in-memory SQLite database specifically for tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Create all tables in the in-memory test database
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Provides a transactional database session for each test that rolls back."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient that overrides get_db dependency with test session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def staff_headers(db_session):
    from app.models.user import User
    from app.core.security import get_password_hash, create_access_token

    staff_user = User(
        email="conftest_staff@medicalwizard.com.au",
        username="conftest_staff",
        hashed_password=get_password_hash("StaffPassword123!"),
        role="staff",
        full_name="Clinic Staff",
        is_active=True,
    )
    db_session.add(staff_user)
    db_session.commit()
    token = create_access_token(subject=staff_user.id, extra_claims={"role": "staff"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def patient_headers(db_session):
    from app.models.user import User
    from app.core.security import get_password_hash, create_access_token

    patient_user = User(
        email="conftest_patient@medicalwizard.com.au",
        username="conftest_patient",
        hashed_password=get_password_hash("PatientPassword123!"),
        role="patient",
        full_name="Patient User",
        is_active=True,
    )
    db_session.add(patient_user)
    db_session.commit()
    token = create_access_token(subject=patient_user.id, extra_claims={"role": "patient"})
    return {"Authorization": f"Bearer {token}"}
