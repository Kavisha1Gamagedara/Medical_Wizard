from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_notification_privacy_rbac(client):
    # 1. Register and login as Admin
    admin_reg = client.post("/api/v1/auth/register", json={
        "username": "admin_privacy_test",
        "email": "admin_privacy_test@example.com",
        "password": "Password123!",
        "role": "admin"
    })
    admin_login = client.post("/api/v1/auth/login", json={"username_or_email": "admin_privacy_test", "password": "Password123!"})
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Register and login as Patient 1 (Samantha)
    p1_reg = client.post("/api/v1/auth/register", json={
        "username": "samantha_privacy_test",
        "email": "samantha_privacy_test@example.com",
        "password": "Password123!",
        "role": "patient"
    })
    assert p1_reg.status_code == 201
    samantha_id = p1_reg.json()["id"]

    p1_login = client.post("/api/v1/auth/login", json={"username_or_email": "samantha_privacy_test", "password": "Password123!"})
    assert p1_login.status_code == 200
    samantha_token = p1_login.json()["access_token"]
    samantha_headers = {"Authorization": f"Bearer {samantha_token}"}

    # 3. Register and login as Patient 2 (Alex)
    p2_reg = client.post("/api/v1/auth/register", json={
        "username": "alex_privacy_test",
        "email": "alex_privacy_test@example.com",
        "password": "Password123!",
        "role": "patient"
    })
    assert p2_reg.status_code == 201
    p2_login = client.post("/api/v1/auth/login", json={"username_or_email": "alex_privacy_test", "password": "Password123!"})
    assert p2_login.status_code == 200
    alex_token = p2_login.json()["access_token"]
    alex_headers = {"Authorization": f"Bearer {alex_token}"}

    # 4. Admin sends a private notification specifically to Samantha
    create_notif_res = client.post(
        "/api/v1/notifications",
        json={
            "patient_id": samantha_id,
            "title": "Private Consultation Notice",
            "message": "Confidential prescription and arrival instructions for Samantha.",
            "doctor": "Dr. Sarah Smith",
            "channel": "In-App Dashboard"
        },
        headers=admin_headers
    )
    assert create_notif_res.status_code == 201
    notif_id = create_notif_res.json()["id"]

    # 5. Samantha retrieves notifications -> MUST see her private notification
    samantha_notifs = client.get("/api/v1/notifications", headers=samantha_headers)
    assert samantha_notifs.status_code == 200
    samantha_ids = [n["id"] for n in samantha_notifs.json()]
    assert notif_id in samantha_ids

    # 6. Alex retrieves notifications -> MUST NOT see Samantha's notification (Strict Privacy Enforced!)
    alex_notifs = client.get("/api/v1/notifications", headers=alex_headers)
    assert alex_notifs.status_code == 200
    alex_ids = [n["id"] for n in alex_notifs.json()]
    assert notif_id not in alex_ids, "Security breach: Patient was able to view another patient's notification!"
