from datetime import datetime, timedelta, timezone
from fastapi import status


def test_exact_time_collision_prevention(client):
    """Test that two appointments cannot be created for the same doctor at the exact same minute."""
    target_dt = datetime(2026, 11, 15, 10, 0, 0, tzinfo=timezone.utc)

    # 1. Book first appointment with Dr. John Watson
    res1 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Sherlock Holmes",
            "doctor": "Dr. John Watson",
            "appointment_datetime": target_dt.isoformat(),
            "appointment_type": "Specialist Consultation",
            "status": "Scheduled",
            "notes": "First booking",
        },
    )
    assert res1.status_code == status.HTTP_201_CREATED, res1.text
    apt1_id = res1.json()["id"]

    # 2. Book second appointment for a DIFFERENT patient with the same doctor at the EXACT same time
    res2 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Mycroft Holmes",
            "doctor": "Dr. John Watson",
            "appointment_datetime": target_dt.isoformat(),
            "appointment_type": "General Consultation",
            "status": "Scheduled",
        },
    )
    assert res2.status_code == status.HTTP_409_CONFLICT
    assert "Schedule Conflict" in res2.json()["detail"]
    assert "Dr. John Watson" in res2.json()["detail"]
    assert str(apt1_id) in res2.json()["detail"]


def test_30_minute_slot_collision_window(client):
    """Test overlapping collision within 30 minutes (before & after) and success outside 30 minutes."""
    base_time = datetime(2026, 11, 20, 14, 0, 0, tzinfo=timezone.utc)

    # Base booking at 14:00
    res_base = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Patient One",
            "doctor": "Dr. Emily Jones",
            "appointment_datetime": base_time.isoformat(),
            "appointment_type": "Dental Checkup",
            "status": "Scheduled",
        },
    )
    assert res_base.status_code == status.HTTP_201_CREATED

    # 1. Attempt booking at 14:15 (+15 minutes, collision!)
    res_plus15 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Patient Two",
            "doctor": "Dr. Emily Jones",
            "appointment_datetime": (base_time + timedelta(minutes=15)).isoformat(),
            "appointment_type": "Dental Checkup",
            "status": "Scheduled",
        },
    )
    assert res_plus15.status_code == status.HTTP_409_CONFLICT

    # 2. Attempt booking at 13:45 (-15 minutes, collision!)
    res_minus15 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Patient Three",
            "doctor": "Dr. Emily Jones",
            "appointment_datetime": (base_time - timedelta(minutes=15)).isoformat(),
            "appointment_type": "Dental Checkup",
            "status": "Scheduled",
        },
    )
    assert res_minus15.status_code == status.HTTP_409_CONFLICT

    # 3. Attempt booking at 14:30 (+30 minutes, interval clear, success!)
    res_plus30 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Patient Four",
            "doctor": "Dr. Emily Jones",
            "appointment_datetime": (base_time + timedelta(minutes=30)).isoformat(),
            "appointment_type": "Dental Checkup",
            "status": "Scheduled",
        },
    )
    assert res_plus30.status_code == status.HTTP_201_CREATED


def test_cross_timezone_collision_detection(client):
    """Test collision detection when datetimes are submitted with different timezone offsets."""
    # UTC: 2026-12-01 10:00:00 UTC
    utc_time = datetime(2026, 12, 1, 10, 0, 0, tzinfo=timezone.utc)

    # Create first appointment using UTC ISO format
    res1 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Global Patient",
            "doctor": "Dr. Sarah Smith",
            "appointment_datetime": utc_time.isoformat(),
            "appointment_type": "Specialist Consultation",
            "status": "Scheduled",
        },
    )
    assert res1.status_code == status.HTTP_201_CREATED

    # Same physical instant in +05:30 local offset: 15:30:00+05:30
    local_offset = timezone(timedelta(hours=5, minutes=30))
    local_time = utc_time.astimezone(local_offset)

    # Collision MUST still be caught across timezones!
    res_coll = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Local Offset Patient",
            "doctor": "Dr. Sarah Smith",
            "appointment_datetime": local_time.isoformat(),
            "appointment_type": "Specialist Consultation",
            "status": "Scheduled",
        },
    )
    assert res_coll.status_code == status.HTTP_409_CONFLICT
    assert "Schedule Conflict" in res_coll.json()["detail"]


def test_doctor_prefix_variation_collision(client):
    """Test that 'Dr. Alice' and 'Alice' collide because they refer to the same doctor."""
    target_dt = datetime(2026, 12, 10, 11, 0, 0, tzinfo=timezone.utc)

    # Book with 'Dr. Alice Wonder'
    res1 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Patient A",
            "doctor": "Dr. Alice Wonder",
            "appointment_datetime": target_dt.isoformat(),
            "appointment_type": "General Consultation",
            "status": "Scheduled",
        },
    )
    assert res1.status_code == status.HTTP_201_CREATED

    # Attempt booking with 'Alice Wonder' (without Dr. prefix)
    res2 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Patient B",
            "doctor": "Alice Wonder",
            "appointment_datetime": target_dt.isoformat(),
            "appointment_type": "General Consultation",
            "status": "Scheduled",
        },
    )
    assert res2.status_code == status.HTTP_409_CONFLICT


def test_cancelled_appointment_does_not_block_slot(client):
    """Test that cancelling an appointment frees up the doctor's slot for new bookings."""
    target_dt = datetime(2026, 12, 15, 0, 0, 0, tzinfo=timezone.utc)

    # 1. Book appointment
    res1 = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Cancelling Patient",
            "doctor": "Dr. Gregory House",
            "appointment_datetime": target_dt.isoformat(),
            "appointment_type": "Specialist Consultation",
            "status": "Scheduled",
        },
    )
    assert res1.status_code == status.HTTP_201_CREATED
    apt_id = res1.json()["id"]

    # 2. Cancel the appointment
    res_cancel = client.put(
        f"/api/v1/appointments/{apt_id}",
        json={"status": "Cancelled"},
    )
    assert res_cancel.status_code == status.HTTP_200_OK

    # 3. New patient books the EXACT same slot with the same doctor -> MUST succeed!
    res_new = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Replacement Patient",
            "doctor": "Dr. Gregory House",
            "appointment_datetime": target_dt.isoformat(),
            "appointment_type": "Specialist Consultation",
            "status": "Scheduled",
        },
    )
    assert res_new.status_code == status.HTTP_201_CREATED
    assert res_new.json()["status"] == "Scheduled"


def test_check_availability_endpoint(client):
    """Test the /check-availability pre-check endpoint."""
    target_dt = datetime(2026, 12, 22, 16, 0, 0, tzinfo=timezone.utc)

    # Check available before booking
    res_avail = client.get(
        f"/api/v1/appointments/check-availability?doctor=Dr.%20Sarah%20Smith&datetime={target_dt.isoformat()}"
    )
    assert res_avail.status_code == status.HTTP_200_OK
    assert res_avail.json()["available"] is True

    # Book the slot
    client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Check Avail Patient",
            "doctor": "Dr. Sarah Smith",
            "appointment_datetime": target_dt.isoformat(),
            "appointment_type": "General Consultation",
            "status": "Scheduled",
        },
    )

    # Check available again -> available should be False!
    res_conflict = client.get(
        f"/api/v1/appointments/check-availability?doctor=Dr.%20Sarah%20Smith&datetime={target_dt.isoformat()}"
    )
    assert res_conflict.status_code == status.HTTP_200_OK
    assert res_conflict.json()["available"] is False
    assert "Schedule Conflict" in res_conflict.json()["message"]


def test_cannot_create_appointment_in_past(client):
    """Test that attempting to create an appointment for a past date or time is rejected with 400 Bad Request."""
    past_dt = datetime.now(timezone.utc) - timedelta(days=2)

    res = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Past Time Patient",
            "doctor": "Dr. Sarah Smith",
            "appointment_datetime": past_dt.isoformat(),
            "appointment_type": "Specialist Consultation",
            "status": "Scheduled",
            "notes": "Attempting to book in past",
        },
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "past date or time" in res.json()["detail"].lower()


def test_cannot_reschedule_appointment_to_past(client):
    """Test that updating an existing appointment to a past date or time is rejected with 400 Bad Request."""
    future_dt = datetime.now(timezone.utc) + timedelta(days=10)

    # 1. Create a valid future appointment
    create_res = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Future Reschedule Patient",
            "doctor": "Dr. Emily Jones",
            "appointment_datetime": future_dt.isoformat(),
            "appointment_type": "Dental Checkup",
            "status": "Scheduled",
        },
    )
    assert create_res.status_code == status.HTTP_201_CREATED
    apt_id = create_res.json()["id"]

    # 2. Try to reschedule to yesterday
    past_dt = datetime.now(timezone.utc) - timedelta(days=1)
    update_res = client.put(
        "/api/v1/appointments",
        json={
            "id": apt_id,
            "appointment_datetime": past_dt.isoformat(),
        },
    )
    # The endpoint is PUT /api/v1/appointments/{appointment_id}
    update_res = client.put(
        f"/api/v1/appointments/{apt_id}",
        json={
            "appointment_datetime": past_dt.isoformat(),
        },
    )
    assert update_res.status_code == status.HTTP_400_BAD_REQUEST
    assert "past date or time" in update_res.json()["detail"].lower()


def test_check_availability_flags_past_datetime(client):
    """Test that /check-availability flags past dates/times as unavailable."""
    past_dt = datetime.now(timezone.utc) - timedelta(hours=5)

    res = client.get(
        f"/api/v1/appointments/check-availability?doctor=Dr.%20Sarah%20Smith&datetime={past_dt.isoformat()}"
    )
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["available"] is False
    assert data.get("is_past") is True
    assert "in the past" in data["message"].lower()
