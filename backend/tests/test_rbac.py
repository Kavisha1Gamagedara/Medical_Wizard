from datetime import datetime, timedelta, timezone
from fastapi import status


def register_user(client, username, email, password, role="patient", full_name=None, specialization=None):
    payload = {
        "username": username,
        "email": email,
        "password": password,
        "role": role,
        "full_name": full_name or username.title(),
    }
    if specialization:
        payload["specialization"] = specialization
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == status.HTTP_201_CREATED, f"Failed registration for {username}: {res.text}"
    return res.json()


def get_auth_token(client, username, password):
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": username, "password": password},
    )
    assert res.status_code == status.HTTP_200_OK, f"Failed login for {username}: {res.text}"
    return res.json()["access_token"]


def test_admin_rbac_user_management(client):
    """Test that only admin users can access the user management endpoints."""
    # 1. Register an admin, a doctor, and a patient
    register_user(client, "admin_user", "admin@medicalwizard.com.au", "AdminPassword123!", role="admin")
    register_user(client, "doc_user", "doc@medicalwizard.com.au", "DoctorPassword123!", role="doctor", specialization="Neurosurgeon")
    register_user(client, "pat_user", "pat@medicalwizard.com.au", "PatientPassword123!", role="patient")

    admin_token = get_auth_token(client, "admin_user", "AdminPassword123!")
    doc_token = get_auth_token(client, "doc_user", "DoctorPassword123!")
    pat_token = get_auth_token(client, "pat_user", "PatientPassword123!")

    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_doc = {"Authorization": f"Bearer {doc_token}"}
    headers_pat = {"Authorization": f"Bearer {pat_token}"}

    # Admin lists users -> 200 OK
    res_admin = client.get("/api/v1/users", headers=headers_admin)
    assert res_admin.status_code == status.HTTP_200_OK
    users = res_admin.json()
    assert len(users) >= 3

    # Doctor accessing /api/v1/users -> 403 Forbidden
    res_doc = client.get("/api/v1/users", headers=headers_doc)
    assert res_doc.status_code == status.HTTP_403_FORBIDDEN
    assert "Administrative privileges required" in res_doc.json()["detail"]

    # Patient accessing /api/v1/users -> 403 Forbidden
    res_pat = client.get("/api/v1/users", headers=headers_pat)
    assert res_pat.status_code == status.HTTP_403_FORBIDDEN

    # Admin changes patient's role to staff
    target_user_id = next(u["id"] for u in users if u["username"] == "pat_user")
    res_role_change = client.put(f"/api/v1/users/{target_user_id}/role?new_role=staff", headers=headers_admin)
    assert res_role_change.status_code == status.HTTP_200_OK
    assert res_role_change.json()["role"] == "staff"


def test_doctor_cannot_delete_appointments(client):
    """Test that doctor role is forbidden from permanently deleting appointments."""
    register_user(client, "dr_sarah", "sarah@medicalwizard.com.au", "DoctorPassword123!", role="doctor", specialization="Cardiologist")
    doc_token = get_auth_token(client, "dr_sarah", "DoctorPassword123!")
    headers_doc = {"Authorization": f"Bearer {doc_token}"}

    # Create an appointment
    now = datetime.now(timezone.utc)
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Audit Test Patient",
            "doctor": "Dr. Sarah",
            "appointment_datetime": (now + timedelta(days=20)).isoformat(),
            "appointment_type": "Specialist Consultation",
            "status": "Scheduled",
        },
    )
    assert create_res.status_code == status.HTTP_201_CREATED
    apt_id = create_res.json()["id"]

    # Doctor tries to delete appointment -> 403 Forbidden
    del_res = client.delete(f"/api/v1/appointments/{apt_id}", headers=headers_doc)
    assert del_res.status_code == status.HTTP_403_FORBIDDEN
    assert "Doctors cannot permanently delete clinical appointment records" in del_res.json()["detail"]

    # Doctor CAN update status and clinical notes
    update_res = client.put(
        f"/api/v1/appointments/{apt_id}",
        json={"status": "Completed", "notes": "Dr. Sarah finished consultation."},
        headers=headers_doc,
    )
    assert update_res.status_code == status.HTTP_200_OK
    assert update_res.json()["status"] == "Completed"


def test_patient_privacy_and_cross_patient_protection(client):
    """Test that patients can only see and manage their own appointments."""
    register_user(client, "patient_alpha", "alpha@example.com", "Password123!", role="patient", full_name="Alpha Patient")
    register_user(client, "patient_beta", "beta@example.com", "Password123!", role="patient", full_name="Beta Patient")

    token_alpha = get_auth_token(client, "patient_alpha", "Password123!")
    token_beta = get_auth_token(client, "patient_beta", "Password123!")
    headers_alpha = {"Authorization": f"Bearer {token_alpha}"}
    headers_beta = {"Authorization": f"Bearer {token_beta}"}

    now = datetime.now(timezone.utc)

    # 1. Alpha books an appointment
    res_apt_alpha = client.post(
        "/api/v1/appointments",
        json={
            "doctor": "Dr. Sarah Smith",
            "appointment_datetime": (now + timedelta(days=25)).isoformat(),
            "appointment_type": "Specialist Consultation",
            "status": "Scheduled",
            "notes": "Alpha sensitive medical details",
        },
        headers=headers_alpha,
    )
    assert res_apt_alpha.status_code == status.HTTP_201_CREATED
    alpha_apt_id = res_apt_alpha.json()["id"]
    assert res_apt_alpha.json()["patient_name"] == "Alpha Patient"

    # 2. Beta books an appointment
    res_apt_beta = client.post(
        "/api/v1/appointments",
        json={
            "doctor": "Dr. Emily Jones",
            "appointment_datetime": (now + timedelta(days=26)).isoformat(),
            "appointment_type": "Dental Checkup",
            "status": "Scheduled",
            "notes": "Beta sensitive dental details",
        },
        headers=headers_beta,
    )
    assert res_apt_beta.status_code == status.HTTP_201_CREATED
    beta_apt_id = res_apt_beta.json()["id"]

    # 3. Patient Alpha lists appointments: Alpha MUST only see Alpha's appointments!
    list_alpha = client.get("/api/v1/appointments", headers=headers_alpha)
    assert list_alpha.status_code == status.HTTP_200_OK
    alpha_items = list_alpha.json()
    alpha_apt_ids = [a["id"] for a in alpha_items]
    assert alpha_apt_id in alpha_apt_ids
    assert beta_apt_id not in alpha_apt_ids

    # 4. Patient Beta tries to GET Alpha's appointment details -> 403 Forbidden!
    snoop_res = client.get(f"/api/v1/appointments/{alpha_apt_id}", headers=headers_beta)
    assert snoop_res.status_code == status.HTTP_403_FORBIDDEN
    assert "Access denied" in snoop_res.json()["detail"]

    # 5. Patient Beta tries to EDIT Alpha's appointment -> 403 Forbidden!
    edit_snoop = client.put(
        f"/api/v1/appointments/{alpha_apt_id}",
        json={"status": "Cancelled"},
        headers=headers_beta,
    )
    assert edit_snoop.status_code == status.HTTP_403_FORBIDDEN

    # 6. Patient Beta tries to DELETE Alpha's appointment -> 403 Forbidden!
    del_snoop = client.delete(f"/api/v1/appointments/{alpha_apt_id}", headers=headers_beta)
    assert del_snoop.status_code == status.HTTP_403_FORBIDDEN

    # 7. Patient Alpha CAN delete their own appointment
    del_own = client.delete(f"/api/v1/appointments/{alpha_apt_id}", headers=headers_alpha)
    assert del_own.status_code == status.HTTP_200_OK
    assert del_own.json()["success"] is True


def test_staff_and_admin_full_appointments_management(client):
    """Test that staff (reception) and admin can manage all appointments."""
    register_user(client, "staff_reception", "reception@example.com", "StaffPassword123!", role="staff")
    staff_token = get_auth_token(client, "staff_reception", "StaffPassword123!")
    headers_staff = {"Authorization": f"Bearer {staff_token}"}

    # Staff can see all appointments
    res_list = client.get("/api/v1/appointments", headers=headers_staff)
    assert res_list.status_code == status.HTTP_200_OK

    # Staff can create, edit, and delete appointments
    now = datetime.now(timezone.utc)
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Walk-in Patient",
            "doctor": "Dr. Sarah Smith",
            "appointment_datetime": (now + timedelta(days=30)).isoformat(),
            "appointment_type": "General Consultation",
            "status": "Scheduled",
            "notes": "Booked by front desk reception staff",
        },
        headers=headers_staff,
    )
    assert create_res.status_code == status.HTTP_201_CREATED
    apt_id = create_res.json()["id"]

    del_res = client.delete(f"/api/v1/appointments/{apt_id}", headers=headers_staff)
    assert del_res.status_code == status.HTTP_200_OK
    assert del_res.json()["success"] is True
