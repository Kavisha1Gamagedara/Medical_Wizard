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
    register_user(client, "admin_for_del", "admin_del@medicalwizard.com.au", "AdminPassword123!", role="admin")
    doc_token = get_auth_token(client, "dr_sarah", "DoctorPassword123!")
    admin_token = get_auth_token(client, "admin_for_del", "AdminPassword123!")
    headers_doc = {"Authorization": f"Bearer {doc_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # Create an appointment as admin
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
        headers=headers_admin,
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


def test_appointment_creation_restricted_to_patient_and_staff(client):
    """
    Test that ONLY logged-in patients and staff can create appointments.
    - Unauthenticated visitors get 401 Unauthorized.
    - Clinicians (doctors) get 403 Forbidden.
    - Logged-in patients get 201 Created.
    - Logged-in staff get 201 Created.
    """
    now = datetime.now(timezone.utc)
    target_time = (now + timedelta(days=12)).isoformat()

    # 1. Anonymous visitor attempts to book -> 401 Unauthorized
    res_anon = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Anonymous Person",
            "doctor": "Dr. Sarah Smith",
            "appointment_datetime": target_time,
            "appointment_type": "General Consultation",
            "status": "Scheduled",
        },
    )
    assert res_anon.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Doctor attempts to book -> 403 Forbidden
    register_user(client, "dr_booking_test", "dr_book@test.com", "DoctorPassword123!", role="doctor")
    doc_token = get_auth_token(client, "dr_booking_test", "DoctorPassword123!")
    res_doc = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Doctor Booking",
            "doctor": "Dr. Sarah Smith",
            "appointment_datetime": target_time,
            "appointment_type": "General Consultation",
            "status": "Scheduled",
        },
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert res_doc.status_code == status.HTTP_403_FORBIDDEN
    assert "patients and staff" in res_doc.json()["detail"].lower()

    # 3. Logged-in Patient books -> 201 Created
    register_user(client, "patient_valid", "pat_valid@test.com", "PatientPassword123!", role="patient", full_name="Valid Patient")
    pat_token = get_auth_token(client, "patient_valid", "PatientPassword123!")
    res_pat = client.post(
        "/api/v1/appointments",
        json={
            "doctor": "Dr. Sarah Smith",
            "appointment_datetime": target_time,
            "appointment_type": "General Consultation",
            "status": "Scheduled",
        },
        headers={"Authorization": f"Bearer {pat_token}"},
    )
    assert res_pat.status_code == status.HTTP_201_CREATED
    assert res_pat.json()["patient_name"] == "Valid Patient"

    # 4. Logged-in Staff books on behalf of a patient -> 201 Created
    another_time = (now + timedelta(days=13)).isoformat()
    register_user(client, "staff_valid", "staff_valid@test.com", "StaffPassword123!", role="staff")
    staff_token = get_auth_token(client, "staff_valid", "StaffPassword123!")
    res_staff = client.post(
        "/api/v1/appointments",
        json={
            "patient_name": "Walk-in Guest",
            "doctor": "Dr. Sarah Smith",
            "appointment_datetime": another_time,
            "appointment_type": "General Consultation",
            "status": "Scheduled",
        },
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert res_staff.status_code == status.HTTP_201_CREATED
    assert res_staff.json()["patient_name"] == "Walk-in Guest"


def test_appointment_visibility_rbac_matrix(client):
    """
    Test that:
    1. Only logged-in staff and admin can see all appointments.
    2. Doctors can ONLY see the appointments that they got (assigned to them).
    3. Patients can ONLY see the appointments that they booked.
    4. Unauthenticated users cannot see any appointments (401 Unauthorized).
    """
    now = datetime.now(timezone.utc)

    # Register Doctors
    register_user(client, "dr_adams", "adams@clinic.com", "Password123!", role="doctor", full_name="Dr. Adams", specialization="Cardiologist")
    register_user(client, "dr_baker", "baker@clinic.com", "Password123!", role="doctor", full_name="Dr. Baker", specialization="Dentist")
    doc_adams_token = get_auth_token(client, "dr_adams", "Password123!")
    doc_baker_token = get_auth_token(client, "dr_baker", "Password123!")
    headers_adams = {"Authorization": f"Bearer {doc_adams_token}"}
    headers_baker = {"Authorization": f"Bearer {doc_baker_token}"}

    # Register Patients
    register_user(client, "patient_john", "john@mail.com", "Password123!", role="patient", full_name="John Doe")
    register_user(client, "patient_jane", "jane@mail.com", "Password123!", role="patient", full_name="Jane Roe")
    pat_john_token = get_auth_token(client, "patient_john", "Password123!")
    pat_jane_token = get_auth_token(client, "patient_jane", "Password123!")
    headers_john = {"Authorization": f"Bearer {pat_john_token}"}
    headers_jane = {"Authorization": f"Bearer {pat_jane_token}"}

    # Register Staff and Admin
    register_user(client, "staff_officer", "staff_off@clinic.com", "Password123!", role="staff")
    register_user(client, "admin_chief", "admin_chief@clinic.com", "Password123!", role="admin")
    staff_token = get_auth_token(client, "staff_officer", "Password123!")
    admin_token = get_auth_token(client, "admin_chief", "Password123!")
    headers_staff = {"Authorization": f"Bearer {staff_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # Create 3 Appointments:
    # 1. John with Dr. Adams
    res_1 = client.post(
        "/api/v1/appointments",
        json={
            "doctor": "Dr. Adams",
            "appointment_datetime": (now + timedelta(days=31)).isoformat(),
            "appointment_type": "Cardiology Consultation",
            "status": "Scheduled",
            "notes": "John heart review",
        },
        headers=headers_john,
    )
    assert res_1.status_code == status.HTTP_201_CREATED
    apt_1_id = res_1.json()["id"]

    # 2. Jane with Dr. Baker
    res_2 = client.post(
        "/api/v1/appointments",
        json={
            "doctor": "Dr. Baker",
            "appointment_datetime": (now + timedelta(days=32)).isoformat(),
            "appointment_type": "Dental Checkup",
            "status": "Scheduled",
            "notes": "Jane tooth cleaning",
        },
        headers=headers_jane,
    )
    assert res_2.status_code == status.HTTP_201_CREATED
    apt_2_id = res_2.json()["id"]

    # 3. John with Dr. Baker
    res_3 = client.post(
        "/api/v1/appointments",
        json={
            "doctor": "Dr. Baker",
            "appointment_datetime": (now + timedelta(days=33)).isoformat(),
            "appointment_type": "Dental Checkup",
            "status": "Scheduled",
            "notes": "John dental checkup",
        },
        headers=headers_john,
    )
    assert res_3.status_code == status.HTTP_201_CREATED
    apt_3_id = res_3.json()["id"]

    # A. Anonymous cannot view appointments -> 401 Unauthorized
    anon_res = client.get("/api/v1/appointments")
    assert anon_res.status_code == status.HTTP_401_UNAUTHORIZED

    # B. Staff sees ALL 3 appointments
    staff_res = client.get("/api/v1/appointments", headers=headers_staff)
    assert staff_res.status_code == status.HTTP_200_OK
    staff_ids = [a["id"] for a in staff_res.json()]
    assert apt_1_id in staff_ids
    assert apt_2_id in staff_ids
    assert apt_3_id in staff_ids

    # C. Admin sees ALL 3 appointments
    admin_res = client.get("/api/v1/appointments", headers=headers_admin)
    assert admin_res.status_code == status.HTTP_200_OK
    admin_ids = [a["id"] for a in admin_res.json()]
    assert apt_1_id in admin_ids
    assert apt_2_id in admin_ids
    assert apt_3_id in admin_ids

    # D. Dr. Adams sees ONLY Appointment 1 (assigned to Adams)
    adams_res = client.get("/api/v1/appointments", headers=headers_adams)
    assert adams_res.status_code == status.HTTP_200_OK
    adams_ids = [a["id"] for a in adams_res.json()]
    assert apt_1_id in adams_ids
    assert apt_2_id not in adams_ids
    assert apt_3_id not in adams_ids
    # Dr. Adams cannot snoop on Baker's appointments by ID
    assert client.get(f"/api/v1/appointments/{apt_2_id}", headers=headers_adams).status_code == status.HTTP_403_FORBIDDEN

    # E. Dr. Baker sees ONLY Appointment 2 and Appointment 3 (assigned to Baker)
    baker_res = client.get("/api/v1/appointments", headers=headers_baker)
    assert baker_res.status_code == status.HTTP_200_OK
    baker_ids = [a["id"] for a in baker_res.json()]
    assert apt_1_id not in baker_ids
    assert apt_2_id in baker_ids
    assert apt_3_id in baker_ids
    # Dr. Baker cannot snoop on Adams' appointment by ID
    assert client.get(f"/api/v1/appointments/{apt_1_id}", headers=headers_baker).status_code == status.HTTP_403_FORBIDDEN

    # F. Patient John sees ONLY Appointment 1 and Appointment 3 (booked by John)
    john_res = client.get("/api/v1/appointments", headers=headers_john)
    assert john_res.status_code == status.HTTP_200_OK
    john_ids = [a["id"] for a in john_res.json()]
    assert apt_1_id in john_ids
    assert apt_2_id not in john_ids
    assert apt_3_id in john_ids
    # John cannot snoop on Jane's appointment by ID
    assert client.get(f"/api/v1/appointments/{apt_2_id}", headers=headers_john).status_code == status.HTTP_403_FORBIDDEN

    # G. Patient Jane sees ONLY Appointment 2 (booked by Jane)
    jane_res = client.get("/api/v1/appointments", headers=headers_jane)
    assert jane_res.status_code == status.HTTP_200_OK
    jane_ids = [a["id"] for a in jane_res.json()]
    assert apt_1_id not in jane_ids
    assert apt_2_id in jane_ids
    assert apt_3_id not in jane_ids
    # Jane cannot snoop on John's appointments by ID
    assert client.get(f"/api/v1/appointments/{apt_1_id}", headers=headers_jane).status_code == status.HTTP_403_FORBIDDEN


def test_admin_register_staff_and_doctors(client):
    """
    Test that an administrator can directly register staff and doctors via POST /api/v1/users.
    - Admin registering staff succeeds (201).
    - Admin registering doctor with specialization succeeds (201).
    - Registered doctor is queryable in /api/v1/doctors.
    - Staff/Doctor/Patient attempting POST /api/v1/users receives 403 Forbidden.
    - Unauthenticated visitor receives 401 Unauthorized.
    """
    # 1. Setup admin
    register_user(client, "admin_recruiter", "recruiter@clinic.com", "AdminPass123!", role="admin")
    admin_token = get_auth_token(client, "admin_recruiter", "AdminPass123!")
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 2. Admin registers a new staff member
    staff_payload = {
        "username": "nurse_clara",
        "email": "clara@clinic.com",
        "password": "StaffPassword123!",
        "full_name": "Nurse Clara Barton",
        "role": "staff",
        "phone_number": "+61 2 9111 2222",
    }
    res_staff = client.post("/api/v1/users", json=staff_payload, headers=headers_admin)
    assert res_staff.status_code == status.HTTP_201_CREATED
    staff_data = res_staff.json()
    assert staff_data["username"] == "nurse_clara"
    assert staff_data["role"] == "staff"
    assert staff_data["full_name"] == "Nurse Clara Barton"

    # 3. Admin registers a new doctor with specialization
    doc_payload = {
        "username": "dr_marcus",
        "email": "marcus@clinic.com",
        "password": "DoctorPassword123!",
        "full_name": "Dr. Marcus Welby",
        "role": "doctor",
        "specialization": "Cardiologist",
        "phone_number": "+61 2 9333 4444",
        "bio": "Consultant Cardiologist with 15 years experience.",
    }
    res_doc = client.post("/api/v1/users", json=doc_payload, headers=headers_admin)
    assert res_doc.status_code == status.HTTP_201_CREATED
    doc_data = res_doc.json()
    assert doc_data["username"] == "dr_marcus"
    assert doc_data["role"] == "doctor"
    assert doc_data["specialization"] == "Cardiologist"

    # 4. Verify doctor appears in doctors directory
    res_dir = client.get("/api/v1/doctors?specialization=Cardiologist")
    assert res_dir.status_code == status.HTTP_200_OK
    doc_names = [d["full_name"] for d in res_dir.json()]
    assert "Dr. Marcus Welby" in doc_names

    # 5. Non-admin (staff) cannot register users via /api/v1/users -> 403 Forbidden
    staff_token = get_auth_token(client, "nurse_clara", "StaffPassword123!")
    res_forbidden = client.post(
        "/api/v1/users",
        json={"username": "imposter", "email": "imposter@test.com", "password": "Password123!", "role": "staff"},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert res_forbidden.status_code == status.HTTP_403_FORBIDDEN

    # 6. Unauthenticated visitor receives 401 Unauthorized
    res_anon = client.post(
        "/api/v1/users",
        json={"username": "anon", "email": "anon@test.com", "password": "Password123!", "role": "doctor"},
    )
    assert res_anon.status_code == status.HTTP_401_UNAUTHORIZED


def test_staff_search_existing_patients_and_book_appointment(client):
    """
    Verify staff and admin can search registered patients by name/email,
    and book an appointment linking the existing patient's patient_id.
    Verify patient and doctor cannot access the /patients endpoint.
    """
    # 1. Register staff member, doctor, and patient
    staff_user = register_user(
        client, "reception_amy", "reception_amy@clinic.com", "Password123!", role="staff", full_name="Amy Receptionist"
    )
    patient_user = register_user(
        client, "patient_oliver", "oliver.twist@example.com", "Password123!", role="patient", full_name="Oliver Twist"
    )
    doc_user = register_user(
        client, "dr_watson", "watson@clinic.com", "Password123!", role="doctor", full_name="Dr. John Watson", specialization="General Physician"
    )

    staff_token = get_auth_token(client, "reception_amy", "Password123!")
    patient_token = get_auth_token(client, "patient_oliver", "Password123!")
    doctor_token = get_auth_token(client, "dr_watson", "Password123!")

    headers_staff = {"Authorization": f"Bearer {staff_token}"}
    headers_patient = {"Authorization": f"Bearer {patient_token}"}
    headers_doctor = {"Authorization": f"Bearer {doctor_token}"}

    # 2. Staff searches patients by partial name
    res_search_name = client.get("/api/v1/users/patients?search=Oliver", headers=headers_staff)
    assert res_search_name.status_code == status.HTTP_200_OK
    results = res_search_name.json()
    assert len(results) >= 1
    found = next((p for p in results if p["username"] == "patient_oliver"), None)
    assert found is not None
    assert found["email"] == "oliver.twist@example.com"

    # 3. Staff searches patients by partial email
    res_search_email = client.get("/api/v1/users/patients?search=oliver.twist", headers=headers_staff)
    assert res_search_email.status_code == status.HTTP_200_OK
    assert any(p["username"] == "patient_oliver" for p in res_search_email.json())

    # 4. Patient and Doctor attempting to access /api/v1/users/patients are rejected with 403 Forbidden
    res_pat_forbidden = client.get("/api/v1/users/patients", headers=headers_patient)
    assert res_pat_forbidden.status_code == status.HTTP_403_FORBIDDEN

    res_doc_forbidden = client.get("/api/v1/users/patients", headers=headers_doctor)
    assert res_doc_forbidden.status_code == status.HTTP_403_FORBIDDEN

    # 5. Staff books an appointment for the existing patient, linking their patient_id
    future_dt = (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()
    res_book = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_user["id"],
            "patient_name": patient_user["full_name"],
            "doctor": "Dr. John Watson",
            "appointment_datetime": future_dt,
            "appointment_type": "General Consultation",
            "notes": "Booked by front desk for existing patient Oliver",
        },
        headers=headers_staff,
    )
    assert res_book.status_code == status.HTTP_201_CREATED
    apt_data = res_book.json()
    assert apt_data["patient_id"] == patient_user["id"]
    assert apt_data["patient_name"] == "Oliver Twist"
    assert apt_data["doctor"] == "Dr. John Watson"

    # 6. Patient logs in and can see this appointment in their appointments list
    res_pat_list = client.get("/api/v1/appointments", headers=headers_patient)
    assert res_pat_list.status_code == status.HTTP_200_OK
    pat_apts = res_pat_list.json()
    assert any(a["id"] == apt_data["id"] for a in pat_apts)



