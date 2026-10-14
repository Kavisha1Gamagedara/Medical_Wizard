import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate


def generate_unique_verification_code(db: Session) -> str:
    """
    Generates a unique, user-friendly 8-character verification code (MW-XXXXXX).
    Excludes ambiguous alphanumeric characters (0, O, 1, I) to prevent reception entry confusion.
    """
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    for _ in range(25):
        code_body = "".join(secrets.choice(chars) for _ in range(6))
        code = f"MW-{code_body}"
        exists = db.query(Appointment).filter(Appointment.verification_code == code).first()
        if not exists:
            return code
    return f"MW-{int(datetime.now().timestamp() * 1000) % 1000000:06d}"


def normalize_verification_code(raw: str) -> str:
    """
    Normalizes a verification code input (e.g. '7k9a2f', 'mw-7k9a2f', 'MW 7K9A2F')
    into standard 'MW-XXXXXX' format.
    """
    if not raw:
        return ""
    clean = raw.strip().upper().replace(" ", "").replace("-", "")
    if clean.startswith("MW"):
        clean = clean[2:]
    return f"MW-{clean}" if clean else ""


def normalize_to_utc_naive(dt: datetime) -> datetime:
    """
    Normalizes a datetime to UTC naive format for consistent storage and interval comparison in SQLite.
    """
    if dt is None:
        return dt
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def normalize_doctor_name(doc: str) -> str:
    """
    Strips common prefixes ('Dr.', 'Dr ') and whitespace to ensure cross-format doctor matching.
    """
    if not doc:
        return ""
    cleaned = doc.strip()
    if cleaned.lower().startswith("dr."):
        cleaned = cleaned[3:].strip()
    elif cleaned.lower().startswith("dr "):
        cleaned = cleaned[3:].strip()
    return cleaned


def is_appointment_for_doctor(apt: Appointment, doctor_user: Any) -> bool:
    """
    Checks if a clinical appointment belongs to the specified doctor user.
    Uses robust normalization comparing full name, username, and doctor prefix variations.
    """
    if not apt or not doctor_user:
        return False
    doc_field = (apt.doctor or "").strip().lower()
    clean_doc = normalize_doctor_name(apt.doctor).strip().lower()

    candidates = set()
    if doctor_user.full_name:
        candidates.add(doctor_user.full_name.strip().lower())
        cf = normalize_doctor_name(doctor_user.full_name).strip().lower()
        if cf:
            candidates.add(cf)
    if doctor_user.username:
        candidates.add(doctor_user.username.strip().lower())
        cu = normalize_doctor_name(doctor_user.username).strip().lower()
        if cu:
            candidates.add(cu)

    for c in candidates:
        if not c:
            continue
        if c == doc_field or c == clean_doc:
            return True
        if len(c) >= 3 and (c in doc_field or c in clean_doc):
            return True
        if len(clean_doc) >= 3 and (clean_doc in c or doc_field in c):
            return True
    return False


def check_doctor_schedule_conflict(
    db: Session,
    doctor: str,
    target_time: datetime,
    exclude_appointment_id: Optional[int] = None,
    slot_minutes: int = 30,
) -> Optional[Appointment]:
    """
    Checks if a doctor has an overlapping scheduled appointment within slot_minutes.
    Excludes cancelled appointments and current appointment during updates.
    Converts target_time to UTC naive to guarantee reliable database interval comparisons.
    """
    target_utc_naive = normalize_to_utc_naive(target_time)
    start_window = target_utc_naive - timedelta(minutes=slot_minutes)
    end_window = target_utc_naive + timedelta(minutes=slot_minutes)

    clean_name = normalize_doctor_name(doctor)

    doctor_filter_clause = or_(
        Appointment.doctor.ilike(doctor.strip()),
        Appointment.doctor.ilike(f"%{clean_name}%") if clean_name else Appointment.doctor.ilike(doctor.strip()),
    )

    query = db.query(Appointment).filter(
        doctor_filter_clause,
        Appointment.status != "Cancelled",
        Appointment.appointment_datetime > start_window,
        Appointment.appointment_datetime < end_window,
    )

    if exclude_appointment_id:
        query = query.filter(Appointment.id != exclude_appointment_id)

    return query.first()


def create_appointment(db: Session, appointment_in: AppointmentCreate) -> Appointment:
    # Normalize datetime to UTC naive
    norm_datetime = normalize_to_utc_naive(appointment_in.appointment_datetime)

    # Validate that appointment is not scheduled for a past date or time
    now_ref = min(datetime.now(), datetime.now(timezone.utc).replace(tzinfo=None))
    # Allow 5 minutes grace period for clock skew / submission latency
    if norm_datetime < (now_ref - timedelta(minutes=5)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid appointment date: Appointments cannot be scheduled for a past date or time. Please choose an upcoming date and time.",
        )

    # Verify doctor daily appointment capacity and available working hours
    from app.services import availability_service
    target_date_str = norm_datetime.strftime("%Y-%m-%d")
    day_schedule = availability_service.get_doctor_day_schedule(
        db=db, doctor_identifier=appointment_in.doctor, target_date_str=target_date_str
    )

    if not day_schedule.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Doctor Unavailable: {day_schedule.doctor_name} is marked unavailable on {target_date_str}.",
        )

    if day_schedule.is_capacity_reached:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Booking Limit Reached: {day_schedule.doctor_name} has set a maximum limit of "
                f"{day_schedule.max_appointments} appointments for {target_date_str} and is fully booked."
            ),
        )

    # If doctor has custom working hours rule, enforce hours strictly
    doc_user = availability_service.find_doctor_user(db, appointment_in.doctor)
    if doc_user:
        custom_rule = availability_service.get_doctor_availability_rule(
            db=db, doctor_id=doc_user.id, target_date=norm_datetime.date()
        )
        if custom_rule:
            t_start = availability_service.parse_time_str(custom_rule.start_time)
            t_end = availability_service.parse_time_str(custom_rule.end_time)
            appt_time = norm_datetime.time()
            if appt_time < t_start or appt_time >= t_end:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Outside Working Hours: {custom_rule.doctor_name} is only available between "
                        f"{custom_rule.start_time} and {custom_rule.end_time} on {target_date_str}."
                    ),
                )
        else:
            # No custom rule, enforce default working hours 09:00-17:00
            default_start = availability_service.parse_time_str("09:00")
            default_end = availability_service.parse_time_str("17:00")
            appt_time = norm_datetime.time()
            if appt_time < default_start or appt_time >= default_end:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Outside Working Hours: Appointments must be scheduled between 09:00 and 17:00.",
                )
    # Strictly verify collision for the chosen doctor
    conflict = check_doctor_schedule_conflict(
        db=db,
        doctor=appointment_in.doctor,
        target_time=norm_datetime,
    )
    if conflict:
        formatted_conflict = conflict.appointment_datetime.strftime("%Y-%m-%d %I:%M %p")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Schedule Conflict: {conflict.doctor} already has a scheduled appointment at {formatted_conflict} "
                f"(booking ref #{conflict.id}). Appointments cannot collide — please choose a time slot at least 30 minutes apart."
            ),
        )

    # Generate unique random check-in verification code
    v_code = generate_unique_verification_code(db)

    db_appointment = Appointment(
        patient_id=appointment_in.patient_id,
        patient_name=appointment_in.patient_name.strip(),
        appointment_datetime=norm_datetime,
        doctor=appointment_in.doctor.strip(),
        appointment_type=appointment_in.appointment_type.strip(),
        status=appointment_in.status or "Scheduled",
        notes=appointment_in.notes,
        verification_code=v_code,
        is_verified=False,
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment


def auto_expire_past_appointments(db: Session) -> int:
    """
    Finds appointments scheduled in the past where patients haven't attended (status is still 'Scheduled' and not verified),
    and marks their status as 'Expired'.
    """
    now_utc = datetime.now(timezone.utc)
    expired_apts = (
        db.query(Appointment)
        .filter(
            Appointment.status == "Scheduled",
            Appointment.is_verified == False,
            Appointment.appointment_datetime < now_utc,
        )
        .all()
    )
    if expired_apts:
        for item in expired_apts:
            item.status = "Expired"
            db.add(item)
        db.commit()
    return len(expired_apts)


def list_appointments(
    db: Session,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    doctor_filter: Optional[str] = None,
    doctor_user: Optional[Any] = None,
    appointment_type: Optional[str] = None,
    patient_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Appointment]:
    auto_expire_past_appointments(db)
    query = db.query(Appointment)

    # 1. Patient RBAC: strictly filter by patient_id
    if patient_id is not None:
        query = query.filter(Appointment.patient_id == patient_id)

    # 2. Doctor RBAC: if doctor_user is provided, strictly limit query to their assigned appointments
    if doctor_user is not None:
        conditions = []
        if doctor_user.full_name:
            conditions.append(Appointment.doctor.ilike(f"%{doctor_user.full_name.strip()}%"))
            cf = normalize_doctor_name(doctor_user.full_name)
            if cf and len(cf) >= 3:
                conditions.append(Appointment.doctor.ilike(f"%{cf}%"))
        if doctor_user.username:
            conditions.append(Appointment.doctor.ilike(f"%{doctor_user.username.strip()}%"))
            cu = normalize_doctor_name(doctor_user.username)
            if cu and len(cu) >= 3:
                conditions.append(Appointment.doctor.ilike(f"%{cu}%"))
        if conditions:
            query = query.filter(or_(*conditions))
    elif doctor_filter and doctor_filter.lower() != "all":
        query = query.filter(Appointment.doctor.ilike(f"%{doctor_filter.strip()}%"))

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Appointment.patient_name.ilike(pattern),
                Appointment.doctor.ilike(pattern),
                Appointment.notes.ilike(pattern),
                Appointment.verification_code.ilike(pattern),
            )
        )

    if status_filter and status_filter.lower() != "all":
        query = query.filter(Appointment.status.ilike(status_filter.strip()))

    if appointment_type and appointment_type.lower() != "all":
        query = query.filter(Appointment.appointment_type.ilike(appointment_type.strip()))

    results = (
        query.order_by(Appointment.appointment_datetime.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Auto-backfill verification_code for any legacy records
    for item in results:
        if not item.verification_code:
            item.verification_code = generate_unique_verification_code(db)
            db.add(item)
    db.commit()

    return results


def get_appointment_by_id(db: Session, appointment_id: int) -> Appointment:
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment with ID {appointment_id} was not found.",
        )
    if not apt.verification_code:
        apt.verification_code = generate_unique_verification_code(db)
        db.add(apt)
        db.commit()
        db.refresh(apt)
    return apt


def get_appointment_by_verification_code(db: Session, code: str) -> Optional[Appointment]:
    """
    Looks up an appointment by its random verification code.
    Supports raw input or normalized MW-XXXXXX prefix.
    """
    if not code:
        return None
    raw_clean = code.strip().upper()
    norm_code = normalize_verification_code(code)

    apt = db.query(Appointment).filter(
        or_(
            Appointment.verification_code.ilike(raw_clean),
            Appointment.verification_code.ilike(norm_code),
            Appointment.verification_code.ilike(f"%{raw_clean}%") if len(raw_clean) >= 4 else False,
        )
    ).first()

    if apt:
        now_utc = datetime.now(timezone.utc)
        apt_dt_utc = apt.appointment_datetime if apt.appointment_datetime.tzinfo else apt.appointment_datetime.replace(tzinfo=timezone.utc)
        if apt.status == "Scheduled" and not apt.is_verified and apt_dt_utc < now_utc:
            apt.status = "Expired"
            db.add(apt)
            db.commit()
            db.refresh(apt)

    return apt


def verify_patient_checkin(
    db: Session,
    code: str,
    verified_by_user: Any,
    notes: Optional[str] = None,
) -> Appointment:
    """
    Verifies an arriving patient using their generated verification code.
    Marks is_verified = True, updates status to 'Completed', records timestamps and staff identifier.
    """
    apt = get_appointment_by_verification_code(db, code)
    if not apt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verification Failed: No appointment found matching verification code '{code}'. Please verify the code or search the directory.",
        )

    now_utc = datetime.now(timezone.utc)
    apt_dt_utc = apt.appointment_datetime if apt.appointment_datetime.tzinfo else apt.appointment_datetime.replace(tzinfo=timezone.utc)
    if apt.status == "Expired" or (apt.status == "Scheduled" and not apt.is_verified and apt_dt_utc < now_utc):
        if apt.status != "Expired":
            apt.status = "Expired"
            db.add(apt)
            db.commit()
            db.refresh(apt)
        formatted_dt = apt.appointment_datetime.strftime("%Y-%m-%d %I:%M %p")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification Failed: Appointment #{apt.id} has Expired. The scheduled consultation time ({formatted_dt}) has passed without attendance and cannot be verified.",
        )

    if apt.status == "Cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot Check In: Appointment #{apt.id} was Cancelled and cannot be verified for consultation.",
        )

    verifier_name = getattr(verified_by_user, "full_name", None) or getattr(verified_by_user, "username", "Front Desk Staff")
    apt.is_verified = True
    apt.verified_at = datetime.now(timezone.utc)
    apt.verified_by = verifier_name
    apt.status = "Completed"

    if notes and notes.strip():
        checkin_note = f"[Reception Check-in by {verifier_name}]: {notes.strip()}"
        apt.notes = f"{apt.notes}\n{checkin_note}" if apt.notes else checkin_note

    db.add(apt)
    db.commit()
    db.refresh(apt)
    return apt


def update_appointment(
    db: Session, appointment_id: int, appointment_in: AppointmentUpdate
) -> Appointment:
    apt = get_appointment_by_id(db, appointment_id)

    # Check if existing appointment is in the past - past or concluded appointments cannot be edited
    now_utc_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    apt_dt_naive = normalize_to_utc_naive(apt.appointment_datetime)
    if apt_dt_naive < (now_utc_naive - timedelta(minutes=5)) or apt.status in ("Expired", "Completed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Past or concluded appointments cannot be edited. Only upcoming consultations can be modified.",
        )

    # If updating datetime or doctor, check conflict
    new_doc = appointment_in.doctor or apt.doctor
    new_dt = (
        normalize_to_utc_naive(appointment_in.appointment_datetime)
        if appointment_in.appointment_datetime is not None
        else apt.appointment_datetime
    )
    
    # If updating datetime, verify it is not in the past (unless cancelling)
    if appointment_in.appointment_datetime is not None and (
        appointment_in.status != "Cancelled" and apt.status != "Cancelled"
    ):
        if new_dt < (now_utc_naive - timedelta(minutes=2)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid appointment date: Appointments cannot be rescheduled to a past date or time. Please choose an upcoming date and time.",
            )

    if (appointment_in.doctor or appointment_in.appointment_datetime) and (
        appointment_in.status != "Cancelled" and apt.status != "Cancelled"
    ):
        conflict = check_doctor_schedule_conflict(
            db=db,
            doctor=new_doc,
            target_time=new_dt,
            exclude_appointment_id=appointment_id,
        )
        if conflict:
            formatted_conflict = conflict.appointment_datetime.strftime("%Y-%m-%d %I:%M %p")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Schedule Conflict: {new_doc} already has an appointment at {formatted_conflict}. Please choose another time.",
            )

    update_data = appointment_in.model_dump(exclude_unset=True)
    previous_status = apt.status
    for field, value in update_data.items():
        if value is not None:
            if field == "appointment_datetime":
                value = normalize_to_utc_naive(value)
            setattr(apt, field, value)

    db.add(apt)
    db.commit()
    db.refresh(apt)

    # Automatic Slot Reclaim: If appointment was newly cancelled, alert the next waitlisted patient
    if apt.status == "Cancelled" and previous_status != "Cancelled":
        notify_waitlist_on_cancellation(db, apt.doctor, apt.appointment_datetime)

    return apt


def notify_waitlist_on_cancellation(db: Session, doctor_name: str, apt_datetime: datetime):
    """
    Automatic Slot Reclaim:
    When an appointment is cancelled or freed up, search for the next patient in the Priority Waitlist
    for this doctor and date, and dispatch an automated notification alert.
    """
    try:
        from app.models.waitlist import Waitlist
        from app.models.notification import Notification

        date_str = apt_datetime.strftime("%Y-%m-%d")
        clean_doc = normalize_doctor_name(doctor_name)

        query = db.query(Waitlist).filter(
            Waitlist.status == "Waiting",
            Waitlist.preferred_date == date_str,
        )

        # Match doctor by exact or partial name
        waitlist_entries = query.order_by(Waitlist.created_at.asc()).all()
        matched_entry = None
        for entry in waitlist_entries:
            if entry.doctor.strip().lower() == doctor_name.strip().lower() or (
                clean_doc and clean_doc in normalize_doctor_name(entry.doctor)
            ):
                matched_entry = entry
                break

        if matched_entry:
            time_formatted = apt_datetime.strftime("%I:%M %p")
            matched_entry.status = "Notified"
            matched_entry.notified_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.add(matched_entry)

            # Create priority alert notification
            slot_alert = Notification(
                patient_id=matched_entry.patient_id,
                title="⚡ Slot Reclaimed: Appointment Available!",
                message=(
                    f"Great news! A consultation slot opened up with Dr. {doctor_name} on {date_str} at {time_formatted} "
                    f"due to a cancellation. You are at the top of the priority waitlist. Please book or confirm immediately!"
                ),
                doctor=doctor_name,
                channel="In-App Dashboard",
                timing="immediate",
                is_read=False,
            )
            db.add(slot_alert)
            db.commit()
    except Exception as e:
        # Don't fail the cancellation if waitlist notification fails
        import logging
        logging.getLogger(__name__).error(f"Error notifying waitlist on slot cancellation: {e}")


def delete_appointment(db: Session, appointment_id: int) -> Dict[str, Any]:
    apt = get_appointment_by_id(db, appointment_id)
    doc_name = apt.doctor
    apt_dt = apt.appointment_datetime
    prev_status = apt.status

    db.delete(apt)
    db.commit()

    if prev_status == "Scheduled":
        notify_waitlist_on_cancellation(db, doc_name, apt_dt)

    return {"success": True, "deleted_id": appointment_id, "message": "Appointment deleted successfully."}


def get_appointment_statistics(
    db: Session,
    patient_id: Optional[int] = None,
    doctor_user: Optional[Any] = None,
) -> Dict[str, int]:
    auto_expire_past_appointments(db)
    base_query = db.query(Appointment)
    if patient_id is not None:
        base_query = base_query.filter(Appointment.patient_id == patient_id)
    elif doctor_user is not None:
        conditions = []
        if doctor_user.full_name:
            conditions.append(Appointment.doctor.ilike(f"%{doctor_user.full_name.strip()}%"))
            cf = normalize_doctor_name(doctor_user.full_name)
            if cf and len(cf) >= 3:
                conditions.append(Appointment.doctor.ilike(f"%{cf}%"))
        if doctor_user.username:
            conditions.append(Appointment.doctor.ilike(f"%{doctor_user.username.strip()}%"))
            cu = normalize_doctor_name(doctor_user.username)
            if cu and len(cu) >= 3:
                conditions.append(Appointment.doctor.ilike(f"%{cu}%"))
        if conditions:
            base_query = base_query.filter(or_(*conditions))

    total = base_query.count()
    scheduled = base_query.filter(Appointment.status == "Scheduled").count()
    checked_in = base_query.filter(Appointment.status == "Checked In").count()
    completed = base_query.filter(Appointment.status == "Completed").count()
    cancelled = base_query.filter(Appointment.status == "Cancelled").count()
    expired = base_query.filter(Appointment.status == "Expired").count()
    return {
        "total": total,
        "scheduled": scheduled,
        "checked_in": checked_in,
        "completed": completed,
        "cancelled": cancelled,
        "expired": expired,
    }
