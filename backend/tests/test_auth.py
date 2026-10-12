import pytest
from fastapi import status


def test_root_and_health_endpoints(client):
    """Test public health check and root endpoints."""
    res = client.get("/")
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["status"] == "healthy"

    res_health = client.get("/health")
    assert res_health.status_code == status.HTTP_200_OK
    assert res_health.json()["status"] == "ok"


def test_user_registration_success(client):
    """Test successful user registration."""
    payload = {
        "email": "dr.smith@medicalwizard.com.au",
        "username": "drsmith",
        "password": "SecurePassword123!",
        "full_name": "Dr. Sarah Smith",
        "role": "doctor",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "dr.smith@medicalwizard.com.au"
    assert data["username"] == "drsmith"
    assert data["full_name"] == "Dr. Sarah Smith"
    assert data["role"] == "doctor"
    assert data["is_active"] is True
    assert "id" in data
    # Ensure hashed_password is never exposed in response
    assert "hashed_password" not in data
    assert "password" not in data


def test_user_registration_duplicate_email(client):
    """Test registering with an existing email fails with 400."""
    payload = {
        "email": "nurse.jane@medicalwizard.com.au",
        "username": "janenurse",
        "password": "Password123!",
        "full_name": "Jane Doe",
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == status.HTTP_201_CREATED

    # Attempt to register again with same email but different username
    payload2 = {
        "email": "nurse.jane@medicalwizard.com.au",
        "username": "anotherjane",
        "password": "Password123!",
    }
    res2 = client.post("/api/v1/auth/register", json=payload2)
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert "email address already exists" in res2.json()["detail"]


def test_user_registration_duplicate_username(client):
    """Test registering with an existing username fails with 400."""
    payload = {
        "email": "first@medicalwizard.com.au",
        "username": "uniquename",
        "password": "Password123!",
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == status.HTTP_201_CREATED

    payload2 = {
        "email": "second@medicalwizard.com.au",
        "username": "uniquename",
        "password": "Password123!",
    }
    res2 = client.post("/api/v1/auth/register", json=payload2)
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert "username already exists" in res2.json()["detail"]


def test_login_success_and_jwt_token(client):
    """Test login with credentials returns a valid JWT Bearer token."""
    # Register user first
    register_payload = {
        "email": "reception@medicalwizard.com.au",
        "username": "reception1",
        "password": "ReceptionPassword123!",
        "full_name": "Front Desk Reception",
        "role": "staff",
    }
    client.post("/api/v1/auth/register", json=register_payload)

    # Login with username
    login_payload = {
        "username_or_email": "reception1",
        "password": "ReceptionPassword123!",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "reception1"
    assert data["user"]["role"] == "staff"

    # Also test login with email
    login_with_email = {
        "username_or_email": "reception@medicalwizard.com.au",
        "password": "ReceptionPassword123!",
    }
    response_email = client.post("/api/v1/auth/login", json=login_with_email)
    assert response_email.status_code == status.HTTP_200_OK
    assert "access_token" in response_email.json()


def test_login_invalid_password(client):
    """Test login with incorrect password returns 401 Unauthorized."""
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "alex@medicalwizard.com.au",
            "username": "alexm",
            "password": "CorrectPassword123!",
        },
    )

    # Attempt login with wrong password
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username_or_email": "alexm",
            "password": "WrongPassword!",
        },
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect username/email or password" in response.json()["detail"]


def test_get_current_user_profile_protected(client):
    """Test access to protected /me endpoint with and without JWT Bearer token."""
    # Register and login to obtain token
    user_payload = {
        "email": "dr.watson@medicalwizard.com.au",
        "username": "watson",
        "password": "WatsonPassword123!",
        "full_name": "Dr. John Watson",
        "role": "doctor",
    }
    client.post("/api/v1/auth/register", json=user_payload)
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "watson", "password": "WatsonPassword123!"},
    )
    token = login_res.json()["access_token"]

    # 1. Unauthenticated request without token should fail with 401
    unauth_res = client.get("/api/v1/auth/me")
    assert unauth_res.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Authenticated request with Bearer token should succeed
    headers = {"Authorization": f"Bearer {token}"}
    auth_res = client.get("/api/v1/auth/me", headers=headers)
    assert auth_res.status_code == status.HTTP_200_OK
    data = auth_res.json()
    assert data["username"] == "watson"
    assert data["email"] == "dr.watson@medicalwizard.com.au"
    assert data["role"] == "doctor"

    # 3. Request with tampered/invalid token should fail with 401
    bad_headers = {"Authorization": "Bearer invalid.token.payload"}
    bad_res = client.get("/api/v1/auth/me", headers=bad_headers)
    assert bad_res.status_code == status.HTTP_401_UNAUTHORIZED


def test_update_doctor_profile_specialization(client):
    """Test doctor profile update specifically for medical specialization (Neurosurgeon, Dentist, etc.)."""
    # 1. Register a doctor
    doctor_payload = {
        "email": "dr.house@medicalwizard.com.au",
        "username": "drhouse",
        "password": "HousePassword123!",
        "full_name": "Dr. Gregory House",
        "role": "doctor",
    }
    client.post("/api/v1/auth/register", json=doctor_payload)
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "drhouse", "password": "HousePassword123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Update profile with specialization 'Neurosurgeon'
    update_payload = {
        "full_name": "Dr. Gregory House, MD",
        "specialization": "Neurosurgeon",
        "phone_number": "+61 412 345 678",
        "bio": "Specialist in neurological diagnostic challenges and microsurgery.",
    }
    update_res = client.put("/api/v1/auth/profile", json=update_payload, headers=headers)
    assert update_res.status_code == status.HTTP_200_OK
    updated_data = update_res.json()
    assert updated_data["specialization"] == "Neurosurgeon"
    assert updated_data["full_name"] == "Dr. Gregory House, MD"
    assert updated_data["phone_number"] == "+61 412 345 678"
    assert updated_data["bio"] == "Specialist in neurological diagnostic challenges and microsurgery."

    # 3. Verify changes persist by fetching /api/v1/auth/me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == status.HTTP_200_OK
    assert me_res.json()["specialization"] == "Neurosurgeon"

    # 4. Change specialization to 'Dentist'
    dentist_update = {"specialization": "Dentist"}
    dentist_res = client.put("/api/v1/auth/profile", json=dentist_update, headers=headers)
    assert dentist_res.status_code == status.HTTP_200_OK
    assert dentist_res.json()["specialization"] == "Dentist"


def test_update_staff_profile_contact(client):
    """Test updating profile for general staff/reception user."""
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "staff.amy@medicalwizard.com.au",
            "username": "amy_staff",
            "password": "Password123!",
            "role": "staff",
        },
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "amy_staff", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    update_payload = {
        "full_name": "Amy Farrah",
        "phone_number": "+61 3 8888 9999",
        "bio": "Appointment Scheduling Officer",
    }
    res = client.put("/api/v1/auth/profile", json=update_payload, headers=headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["full_name"] == "Amy Farrah"
    assert res.json()["phone_number"] == "+61 3 8888 9999"
    assert res.json()["specialization"] is None

