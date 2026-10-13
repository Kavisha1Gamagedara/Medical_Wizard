import pytest
from datetime import datetime, timedelta, timezone
from fastapi import status


@pytest.fixture(autouse=True)
def authenticate_as_staff(client, staff_headers):
    client.headers.update(staff_headers)


def test_get_doctors_directory(client):
    """Test retrieving the public directory of doctors with specialization filtering."""
    # Register two doctors with different specialties
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "doc.neuro@medicalwizard.com.au",
            "username": "doc_neuro",
            "password": "Password123!",
            "full_name": "Dr. Sarah Neuro",
            "role": "doctor",
            "specialization": "Neurosurgeon",
        },
    )
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "doc.dentist@medicalwizard.com.au",
            "username": "doc_dentist",
            "password": "Password123!",
            "full_name": "Dr. Emily Dentist",
            "role": "doctor",
            "specialization": "Dentist",
        },
    )

    # 1. Fetch all doctors
    res = client.get("/api/v1/doctors")
    assert res.status_code == status.HTTP_200_OK
    doctors = res.json()
    assert len(doctors) >= 2
    doc_usernames = [d["username"] for d in doctors]
    assert "doc_neuro" in doc_usernames
    assert "doc_dentist" in doc_usernames

    # 2. Filter by specialization 'Dentist'
    res_dentist = client.get("/api/v1/doctors?specialization=Dentist")
    assert res_dentist.status_code == status.HTTP_200_OK
    dentist_list = res_dentist.json()
    for d in dentist_list:
        assert d["specialization"] == "Dentist"

    # 3. Search by name
    res_search = client.get("/api/v1/doctors?search=Sarah")
    assert res_search.status_code == status.HTTP_200_OK
    assert len(res_search.json()) >= 1
    assert "Sarah" in res_search.json()[0]["full_name"]


def test_create_appointment_and_conflict_detection(client):
    """Test booking an appointment and verify scheduling collision conflict detection."""
    now = datetime.now(timezone.utc)
    target_time = (now + timedelta(days=5)).replace(microsecond=0)

    # 1. Book first appointment with Dr. Sarah Neuro
    payload1 = {
        "patient_name": "Alice Cooper",
        "doctor": "Dr. Sarah Neuro",
        "appointment_datetime": target_time.isoformat(),
        "appointment_type": "Specialist Consultation",
        "status": "Scheduled",
        "notes": "Initial migraine review",
    }
    res1 = client.post("/api/v1/appointments", json=payload1)
    assert res1.status_code == status.HTTP_201_CREATED
    data1 = res1.json()
    assert data1["patient_name"] == "Alice Cooper"
    assert data1["doctor"] == "Dr. Sarah Neuro"
    assert data1["status"] == "Scheduled"
    appointment_id = data1["id"]

    # 2. Attempt to book another patient with same doctor 10 minutes later (Conflict!)
    conflicting_time = target_time + timedelta(minutes=10)
    payload_conflict = {
        "patient_name": "Bob Marley",
        "doctor": "Dr. Sarah Neuro",
        "appointment_datetime": conflicting_time.isoformat(),
        "appointment_type": "General Consultation",
        "status": "Scheduled",
    }
    res_conflict = client.post("/api/v1/appointments", json=payload_conflict)
    assert res_conflict.status_code == status.HTTP_409_CONFLICT
    assert "already has a scheduled appointment" in res_conflict.json()["detail"]

    # 3. Booking with a DIFFERENT doctor at the same time should succeed
    payload_diff_doc = {
        "patient_name": "Bob Marley",
        "doctor": "Dr. Emily Dentist",
        "appointment_datetime": target_time.isoformat(),
        "appointment_type": "Dental Checkup",
        "status": "Scheduled",
    }
    res_diff = client.post("/api/v1/appointments", json=payload_diff_doc)
    assert res_diff.status_code == status.HTTP_201_CREATED

    # 4. Read appointment details
    res_get = client.get(f"/api/v1/appointments/{appointment_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == appointment_id

    # 5. Edit appointment (e.g. mark Completed and update notes)
    update_payload = {
        "status": "Completed",
        "notes": "Consultation completed; prescription issued.",
    }
    res_update = client.put(f"/api/v1/appointments/{appointment_id}", json=update_payload)
    assert res_update.status_code == status.HTTP_200_OK
    assert res_update.json()["status"] == "Completed"
    assert res_update.json()["notes"] == "Consultation completed; prescription issued."

    # 6. Delete appointment
    res_del = client.delete(f"/api/v1/appointments/{appointment_id}")
    assert res_del.status_code == status.HTTP_200_OK
    assert res_del.json()["success"] is True

    # 7. Verify 404 after deletion
    res_not_found = client.get(f"/api/v1/appointments/{appointment_id}")
    assert res_not_found.status_code == status.HTTP_404_NOT_FOUND


def test_list_appointments_search_and_stats(client):
    """Test appointments query filters, fuzzy search, and stats."""
    now = datetime.now(timezone.utc)
    # Create two test appointments
    client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Samantha Jenkins",
            "doctor": "Dr. Sarah Neuro",
            "appointment_datetime": (now + timedelta(days=7)).isoformat(),
            "appointment_type": "Specialist Consultation",
            "status": "Scheduled",
        },
    )
    client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "David Miller",
            "doctor": "Dr. Emily Dentist",
            "appointment_datetime": (now + timedelta(days=8)).isoformat(),
            "appointment_type": "Dental Cleaning",
            "status": "Completed",
        },
    )

    # Search for Samantha
    res_search = client.get("/api/v1/appointments?search=Samantha")
    assert res_search.status_code == status.HTTP_200_OK
    assert len(res_search.json()) >= 1
    assert "Samantha" in res_search.json()[0]["patient_name"]

    # Filter by status 'Completed'
    res_completed = client.get("/api/v1/appointments?status=Completed")
    assert res_completed.status_code == status.HTTP_200_OK
    for apt in res_completed.json():
        assert apt["status"] == "Completed"

    # Fetch stats
    res_stats = client.get("/api/v1/appointments/stats")
    assert res_stats.status_code == status.HTTP_200_OK
    stats_data = res_stats.json()
    assert "total" in stats_data
    assert "scheduled" in stats_data
    assert "completed" in stats_data
    assert stats_data["total"] >= 2


def test_patient_role_and_my_appointments(client):
    """Test patient user registration, login, and filtering for their own appointments."""
    # 1. Register a user with patient role
    reg_payload = {
        "email": "charlie.patient@example.com",
        "username": "charlie_p",
        "password": "PatientPassword123!",
        "full_name": "Charlie Brown",
        "role": "patient",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == status.HTTP_201_CREATED
    patient_data = reg_res.json()
    assert patient_data["role"] == "patient"
    patient_id = patient_data["id"]

    # 2. Login as patient
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "charlie_p", "password": "PatientPassword123!"},
    )
    assert login_res.status_code == status.HTTP_200_OK
    assert login_res.json()["user"]["role"] == "patient"

    # 3. Patient books an appointment
    now = datetime.now(timezone.utc)
    apt_payload = {
        "patient_id": patient_id,
        "patient_name": "Charlie Brown",
        "doctor": "Dr. Sarah Neuro",
        "appointment_datetime": (now + timedelta(days=12)).isoformat(),
        "appointment_type": "General Consultation",
        "status": "Scheduled",
        "notes": "Patient booked via patient portal.",
    }
    create_res = client.post("/api/v1/appointments", json=apt_payload)
    assert create_res.status_code == status.HTTP_201_CREATED
    assert create_res.json()["patient_id"] == patient_id

    # 4. Fetch appointments specifically for this patient
    my_apts = client.get(f"/api/v1/appointments?patient_id={patient_id}")
    assert my_apts.status_code == status.HTTP_200_OK
    results = my_apts.json()
    assert len(results) == 1
    assert results[0]["patient_name"] == "Charlie Brown"
    assert results[0]["patient_id"] == patient_id

