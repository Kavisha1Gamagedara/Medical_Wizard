from datetime import datetime, timedelta, timezone
from app.models.user import User
from app.models.waitlist import Waitlist
from app.models.notification import Notification
from app.core.security import get_password_hash, create_access_token


def test_waitlist_and_slot_reclaim_lifecycle(client, db_session):
    # 1. Create two test patients
    patient1 = User(
        username="testpatient_wl1",
        email="testwl1@citycare.com",
        role="patient",
        full_name="Waitlist Patient One",
        hashed_password=get_password_hash("patient123"),
        is_active=True,
    )
    db_session.add(patient1)

    patient2 = User(
        username="testpatient_wl2",
        email="testwl2@citycare.com",
        role="patient",
        full_name="Waitlist Patient Two",
        hashed_password=get_password_hash("patient123"),
        is_active=True,
    )
    db_session.add(patient2)
    db_session.commit()

    token1 = create_access_token(subject=patient1.id, extra_claims={"role": "patient"})
    token2 = create_access_token(subject=patient2.id, extra_claims={"role": "patient"})
    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    target_date = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
    target_dt_str = f"{target_date}T10:00:00"

    # 2. Patient 1 books an appointment
    apt_res = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Waitlist Patient One",
            "doctor": "Dr. Sarah Jenkins",
            "appointment_datetime": target_dt_str,
            "appointment_type": "Specialist Consultation",
            "notes": "Original booking"
        },
        headers=headers1,
    )
    assert apt_res.status_code == 201
    apt_id = apt_res.json()["id"]

    # 3. Patient 2 joins the Priority Waitlist for Dr. Sarah Jenkins on that target_date
    wl_res = client.post(
        "/api/v1/waitlist",
        json={
            "doctor": "Dr. Sarah Jenkins",
            "preferred_date": target_date,
            "preferred_time": "10:00",
            "notes": "Please let me know if any slot opens"
        },
        headers=headers2,
    )
    assert wl_res.status_code == 201
    wl_data = wl_res.json()
    assert wl_data["status"] == "Waiting"
    assert wl_data["doctor"] == "Dr. Sarah Jenkins"

    # Patient 2 checks waitlist entries: should only see their own
    my_wl = client.get("/api/v1/waitlist", headers=headers2)
    assert my_wl.status_code == 200
    assert len(my_wl.json()) >= 1
    assert all(w["patient_id"] == patient2.id for w in my_wl.json())

    # Patient 1 checks waitlist: should not see patient 2's entry (privacy)
    p1_wl = client.get("/api/v1/waitlist", headers=headers1)
    assert p1_wl.status_code == 200
    assert not any(w["patient_id"] == patient2.id for w in p1_wl.json())

    # 4. Patient 1 cancels their appointment -> Triggers Automatic Slot Reclaim Alert!
    cancel_res = client.put(
        f"/api/v1/appointments/{apt_id}",
        json={"status": "Cancelled"},
        headers=headers1,
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "Cancelled"

    # 5. Verify Patient 2 automatically received the Slot Reclaim notification!
    notifs_res = client.get("/api/v1/notifications", headers=headers2)
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    slot_alerts = [n for n in notifs if "Slot Reclaimed" in n["title"]]
    assert len(slot_alerts) >= 1
    alert = slot_alerts[0]
    assert "Dr. Sarah Jenkins" in alert["message"]
    assert target_date in alert["message"]

    # Verify Patient 2's waitlist entry status transitioned to 'Notified'
    updated_wl = client.get("/api/v1/waitlist", headers=headers2).json()
    my_entry = next(w for w in updated_wl if w["id"] == wl_data["id"])
    assert my_entry["status"] == "Notified"
