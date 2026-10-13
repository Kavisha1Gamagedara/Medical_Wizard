import pytest
from datetime import datetime, timedelta, timezone


def test_appointment_creation_generates_random_verification_code(client, patient_headers):
    """
    Verifies that when an appointment is booked, a random unique verification code (MW-XXXXXX)
    is automatically generated and initialized with is_verified=False and status='Scheduled'.
    """
    tomorrow = datetime.now(timezone.utc) + timedelta(days=2, hours=3)
    payload = {
        "appointment_datetime": tomorrow.isoformat(),
        "doctor": "Dr. Sarah Jenkins",
        "appointment_type": "Specialist Consultation",
        "notes": "Follow-up consultation for respiratory allergy",
    }

    res = client.post("/api/v1/appointments", json=payload, headers=patient_headers)
    assert res.status_code == 201, res.text
    data = res.json()

    assert "verification_code" in data
    assert data["verification_code"] is not None
    code = data["verification_code"]
    assert code.startswith("MW-")
    assert len(code) == 9  # 'MW-' + 6 chars
    assert data["is_verified"] is False
    assert data["verified_at"] is None
    assert data["verified_by"] is None
    assert data["status"] == "Scheduled"


def test_patient_can_lookup_their_own_code_and_rbac_protects_other_patients(client, patient_headers, staff_headers, db_session):
    from app.models.user import User
    from app.core.security import get_password_hash, create_access_token

    # Create appointment for patient 1
    tomorrow = datetime.now(timezone.utc) + timedelta(days=2, hours=4)
    payload = {
        "appointment_datetime": tomorrow.isoformat(),
        "doctor": "Dr. Sarah Jenkins",
        "appointment_type": "General Consultation",
    }
    create_res = client.post("/api/v1/appointments", json=payload, headers=patient_headers)
    assert create_res.status_code == 201
    apt_data = create_res.json()
    code = apt_data["verification_code"]

    # 1. Patient 1 can look up their own verification details
    lookup_res = client.get(f"/api/v1/appointments/verify/{code}", headers=patient_headers)
    assert lookup_res.status_code == 200
    assert lookup_res.json()["id"] == apt_data["id"]

    # 2. Staff can look up any patient's verification code
    staff_lookup = client.get(f"/api/v1/appointments/verify/{code}", headers=staff_headers)
    assert staff_lookup.status_code == 200
    assert staff_lookup.json()["verification_code"] == code

    # 3. Patient 2 cannot look up Patient 1's code (403 Forbidden)
    patient2 = User(
        email="patient2_verify_test@medicalwizard.com.au",
        username="patient2_verify_test",
        hashed_password=get_password_hash("Pass123!"),
        role="patient",
        full_name="Other Patient",
        is_active=True,
    )
    db_session.add(patient2)
    db_session.commit()
    token2 = create_access_token(subject=patient2.id, extra_claims={"role": "patient"})
    p2_headers = {"Authorization": f"Bearer {token2}"}

    p2_lookup = client.get(f"/api/v1/appointments/verify/{code}", headers=p2_headers)
    assert p2_lookup.status_code == 403


def test_staff_verify_patient_checkin_success(client, patient_headers, staff_headers):
    """
    Staff verifies the patient upon arrival at the hospital using the code.
    Updates appointment status to 'Checked In', records staff name and timestamp.
    """
    tomorrow = datetime.now(timezone.utc) + timedelta(days=3, hours=2)
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "appointment_datetime": tomorrow.isoformat(),
            "doctor": "Dr. Marcus Chen",
            "appointment_type": "Specialist Consultation",
        },
        headers=patient_headers,
    )
    assert create_res.status_code == 201
    code = create_res.json()["verification_code"]

    # Staff verifies arriving patient
    verify_res = client.post(
        "/api/v1/appointments/verify",
        json={"verification_code": code, "notes": "Patient arrived and waiting in room 2"},
        headers=staff_headers,
    )
    assert verify_res.status_code == 200, verify_res.text
    verify_data = verify_res.json()
    assert verify_data["success"] is True
    assert "verified and checked in successfully" in verify_data["message"]

    verified_apt = verify_data["appointment"]
    assert verified_apt["is_verified"] is True
    assert verified_apt["status"] == "Completed"
    assert verified_apt["verified_at"] is not None
    assert verified_apt["verified_by"] is not None
    assert "waiting in room 2" in (verified_apt["notes"] or "")


def test_verification_normalization_case_and_prefix_insensitive(client, patient_headers, staff_headers):
    """
    Staff enters the code in lowercase without 'MW-' prefix (e.g. '7x9b2k')
    System automatically normalizes and successfully verifies.
    """
    tomorrow = datetime.now(timezone.utc) + timedelta(days=3, hours=5)
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "appointment_datetime": tomorrow.isoformat(),
            "doctor": "Dr. Marcus Chen",
            "appointment_type": "General Consultation",
        },
        headers=patient_headers,
    )
    assert create_res.status_code == 201
    full_code = create_res.json()["verification_code"]
    raw_subcode = full_code.replace("MW-", "").lower()

    # Verify with lowercase subcode
    verify_res = client.post(
        "/api/v1/appointments/verify",
        json={"verification_code": raw_subcode},
        headers=staff_headers,
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["appointment"]["is_verified"] is True
    assert verify_res.json()["appointment"]["status"] == "Completed"


def test_non_staff_cannot_verify_checkin(client, patient_headers, db_session):
    from app.models.user import User
    from app.core.security import get_password_hash, create_access_token

    tomorrow = datetime.now(timezone.utc) + timedelta(days=4, hours=2)
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "appointment_datetime": tomorrow.isoformat(),
            "doctor": "Dr. Emily Taylor",
            "appointment_type": "Comprehensive Diagnostic",
        },
        headers=patient_headers,
    )
    code = create_res.json()["verification_code"]

    # 1. Patient cannot self-verify (403 Forbidden)
    patient_attempt = client.post(
        "/api/v1/appointments/verify",
        json={"verification_code": code},
        headers=patient_headers,
    )
    assert patient_attempt.status_code == 403

    # 2. Doctor cannot verify front-desk check-in (403 Forbidden)
    doc_user = User(
        email="doctor_checkin_test@medicalwizard.com.au",
        username="doctor_checkin_test",
        hashed_password=get_password_hash("DocPass123!"),
        role="doctor",
        full_name="Dr. Emily Taylor",
        is_active=True,
    )
    db_session.add(doc_user)
    db_session.commit()
    doc_token = create_access_token(subject=doc_user.id, extra_claims={"role": "doctor"})
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    doc_attempt = client.post(
        "/api/v1/appointments/verify",
        json={"verification_code": code},
        headers=doc_headers,
    )
    assert doc_attempt.status_code == 403

    # 3. Unauthenticated request (401 Unauthorized)
    anon_attempt = client.post("/api/v1/appointments/verify", json={"verification_code": code})
    assert anon_attempt.status_code == 401


def test_cannot_verify_cancelled_appointment_or_invalid_code(client, patient_headers, staff_headers):
    """
    Cancelling an appointment prevents check-in verification.
    Invalid code returns 404.
    """
    tomorrow = datetime.now(timezone.utc) + timedelta(days=5, hours=2)
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "appointment_datetime": tomorrow.isoformat(),
            "doctor": "Dr. Sarah Jenkins",
            "appointment_type": "Specialist Consultation",
        },
        headers=patient_headers,
    )
    apt = create_res.json()
    code = apt["verification_code"]

    # Cancel the appointment
    client.put(
        f"/api/v1/appointments/{apt['id']}",
        json={"status": "Cancelled"},
        headers=patient_headers,
    )

    # Attempt to verify cancelled appointment
    verify_cancelled = client.post(
        "/api/v1/appointments/verify",
        json={"verification_code": code},
        headers=staff_headers,
    )
    assert verify_cancelled.status_code == 400
    assert "Cancelled" in verify_cancelled.json()["detail"]

    # Attempt to verify non-existent code
    verify_fake = client.post(
        "/api/v1/appointments/verify",
        json={"verification_code": "MW-999999"},
        headers=staff_headers,
    )
    assert verify_fake.status_code == 404


def test_unattended_past_appointments_auto_expire(client, staff_headers, db_session):
    """
    Test that scheduled appointments in the past where patient did not attend
    are automatically marked as 'Expired'.
    """
    from app.models.appointment import Appointment

    past_time = datetime.now(timezone.utc) - timedelta(hours=3)
    apt = Appointment(
        patient_name="Expired Patient",
        doctor="Dr. Sarah Jenkins",
        appointment_datetime=past_time,
        appointment_type="General Consultation",
        status="Scheduled",
        is_verified=False,
        verification_code="MW-EXP001",
    )
    db_session.add(apt)
    db_session.commit()
    db_session.refresh(apt)

    # When querying appointments or stats, it should be marked as Expired
    res = client.get("/api/v1/appointments", headers=staff_headers)
    assert res.status_code == 200
    apts = res.json()
    matching = [a for a in apts if a["id"] == apt.id]
    assert len(matching) == 1
    assert matching[0]["status"] == "Expired"


def test_past_appointments_cannot_be_edited(client, staff_headers, db_session):
    """
    Test that past appointments cannot be edited.
    """
    from app.models.appointment import Appointment

    past_time = datetime.now(timezone.utc) - timedelta(hours=2)
    apt = Appointment(
        patient_name="Past Patient",
        doctor="Dr. Marcus Chen",
        appointment_datetime=past_time,
        appointment_type="General Consultation",
        status="Scheduled",
        is_verified=False,
        verification_code="MW-PAST01",
    )
    db_session.add(apt)
    db_session.commit()

    # Attempt to edit notes or status of past appointment
    res = client.put(
        f"/api/v1/appointments/{apt.id}",
        json={"notes": "Trying to edit past consultation"},
        headers=staff_headers,
    )
    assert res.status_code == 400
    assert "cannot be edited" in res.json()["detail"].lower()
