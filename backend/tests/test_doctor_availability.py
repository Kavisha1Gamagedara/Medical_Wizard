from datetime import datetime, timedelta, timezone
from fastapi import status


def register_and_login_doctor(client, username, full_name, specialization="Specialist"):
    register_payload = {
        "username": username,
        "email": f"{username}@medicalwizard.com.au",
        "password": "DoctorPassword123!",
        "role": "doctor",
        "full_name": full_name,
        "specialization": specialization,
    }
    client.post("/api/v1/auth/register", json=register_payload)

    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": username, "password": "DoctorPassword123!"},
    )
    assert login_res.status_code == status.HTTP_200_OK, login_res.text
    return login_res.json()["access_token"]


def test_doctor_configure_availability_and_capacity(client):
    """
    Test that a doctor can set their available working hours and max appointments capacity for a date.
    """
    doc_token = register_and_login_doctor(client, "drsmith", "Dr. Sarah Smith", "Neurosurgeon")
    headers = {"Authorization": f"Bearer {doc_token}"}

    target_date = "2026-11-28"

    # 1. Dr. Smith sets available hours 10:00 - 14:00, max 2 appointments on 2026-11-28
    payload = {
        "specific_date": target_date,
        "start_time": "10:00",
        "end_time": "14:00",
        "max_appointments": 2,
        "slot_duration_minutes": 30,
        "is_available": True,
        "notes": "Morning spinal consults only. Max 2 patients.",
    }
    res = client.post("/api/v1/doctors/availabilities", json=payload, headers=headers)
    assert res.status_code == status.HTTP_201_CREATED, res.text
    rule_data = res.json()
    assert rule_data["specific_date"] == target_date
    assert rule_data["start_time"] == "10:00"
    assert rule_data["end_time"] == "14:00"
    assert rule_data["max_appointments"] == 2

    # 2. Patient queries Dr. Smith's schedule for that date
    res_sched = client.get(f"/api/v1/doctors/drsmith/schedule?date={target_date}")
    assert res_sched.status_code == status.HTTP_200_OK, res_sched.text
    sched_data = res_sched.json()
    assert sched_data["max_appointments"] == 2
    assert sched_data["booked_count"] == 0
    assert sched_data["remaining_slots"] == 2
    assert sched_data["is_capacity_reached"] is False
    assert len(sched_data["time_slots"]) == 8  # 10:00 to 14:00 in 30min slots = 8 slots
    assert all(s["available"] is True for s in sched_data["time_slots"])


def test_doctor_daily_capacity_limit_enforcement(client, patient_headers):
    """
    Test that when a doctor's max appointments capacity for a date is reached,
    further bookings are rejected with 400 Bad Request.
    """
    doc_token = register_and_login_doctor(client, "drjones", "Dr. Emily Jones", "Dentist")
    headers = {"Authorization": f"Bearer {doc_token}"}

    target_date = "2026-12-05"

    # Dr. Jones sets max 2 appointments for 2026-12-05
    payload = {
        "specific_date": target_date,
        "start_time": "09:00",
        "end_time": "13:00",
        "max_appointments": 2,
        "is_available": True,
    }
    res_save = client.post("/api/v1/doctors/availabilities", json=payload, headers=headers)
    assert res_save.status_code == status.HTTP_201_CREATED, res_save.text

    # 1. Book first appointment (09:30)
    apt1 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Patient Alpha",
            "doctor": "Dr. Emily Jones",
            "appointment_datetime": f"{target_date}T09:30:00Z",
            "appointment_type": "Dental Checkup",
            "status": "Scheduled",
        },
        headers=patient_headers,
    )
    assert apt1.status_code == status.HTTP_201_CREATED, apt1.text

    # 2. Book second appointment (10:30)
    apt2 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Patient Beta",
            "doctor": "Dr. Emily Jones",
            "appointment_datetime": f"{target_date}T10:30:00Z",
            "appointment_type": "Dental Checkup",
            "status": "Scheduled",
        },
        headers=patient_headers,
    )
    assert apt2.status_code == status.HTTP_201_CREATED, apt2.text

    # Check schedule: capacity should now be reached!
    res_sched = client.get(f"/api/v1/doctors/drjones/schedule?date={target_date}")
    assert res_sched.status_code == status.HTTP_200_OK
    assert res_sched.json()["booked_count"] == 2
    assert res_sched.json()["remaining_slots"] == 0
    assert res_sched.json()["is_capacity_reached"] is True

    # 3. Attempt to book a THIRD appointment on the same date (11:30) -> MUST BE REJECTED!
    apt3 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Patient Gamma",
            "doctor": "Dr. Emily Jones",
            "appointment_datetime": f"{target_date}T11:30:00Z",
            "appointment_type": "Dental Checkup",
            "status": "Scheduled",
        },
        headers=patient_headers,
    )
    assert apt3.status_code == status.HTTP_400_BAD_REQUEST, apt3.text
    assert "limit of 2 appointments" in apt3.json()["detail"].lower()


def test_doctor_working_hours_enforcement(client, patient_headers):
    """
    Test that bookings outside a doctor's configured available working hours are rejected.
    """
    doc_token = register_and_login_doctor(client, "drray", "Dr. Lisa Ray", "Pediatrician")
    headers = {"Authorization": f"Bearer {doc_token}"}

    target_date = "2026-12-10"

    # Dr. Ray is available only 09:00 to 12:00
    payload = {
        "specific_date": target_date,
        "start_time": "09:00",
        "end_time": "12:00",
        "max_appointments": 5,
        "is_available": True,
    }
    client.post("/api/v1/doctors/availabilities", json=payload, headers=headers)

    # Attempt to book at 15:00 (outside working hours)
    res_outside = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Late Patient",
            "doctor": "Dr. Lisa Ray",
            "appointment_datetime": f"{target_date}T15:00:00Z",
            "appointment_type": "Specialist Consultation",
            "status": "Scheduled",
        },
        headers=patient_headers,
    )
    assert res_outside.status_code == status.HTTP_400_BAD_REQUEST
    assert "outside working hours" in res_outside.json()["detail"].lower()


def test_doctor_marked_off_blocks_bookings(client, patient_headers):
    """
    Test that when a doctor marks a date as unavailable (is_available = False), bookings are blocked.
    """
    doc_token = register_and_login_doctor(client, "drchen", "Dr. Robert Chen", "Cardiologist")
    headers = {"Authorization": f"Bearer {doc_token}"}

    target_date = "2026-12-18"

    payload = {
        "specific_date": target_date,
        "is_available": False,
        "notes": "Attending cardiology symposium abroad.",
    }
    client.post("/api/v1/doctors/availabilities", json=payload, headers=headers)

    res = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Cardio Patient",
            "doctor": "Dr. Robert Chen",
            "appointment_datetime": f"{target_date}T10:00:00Z",
            "appointment_type": "Specialist Consultation",
            "status": "Scheduled",
        },
        headers=patient_headers,
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "unavailable" in res.json()["detail"].lower()
