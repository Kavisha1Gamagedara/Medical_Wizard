from datetime import datetime, date, time, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models.user import User
from app.models.appointment import Appointment
from app.models.doctor_availability import DoctorAvailability
from app.schemas.doctor_availability import (
    DoctorAvailabilityCreate,
    DoctorAvailabilityResponse,
    DoctorDayScheduleResponse,
    SlotInfo,
)
from app.services.appointment_service import normalize_doctor_name, normalize_to_utc_naive


def find_doctor_user(db: Session, doctor_identifier: str) -> Optional[User]:
    """Finds a doctor user by ID, username, or full name."""
    if not doctor_identifier:
        return None

    # Check if identifier is integer ID
    if isinstance(doctor_identifier, int) or (isinstance(doctor_identifier, str) and doctor_identifier.isdigit()):
        user = db.query(User).filter(User.id == int(doctor_identifier), User.role == "doctor").first()
        if user:
            return user

    clean = normalize_doctor_name(str(doctor_identifier))
    query = db.query(User).filter(User.role == "doctor")

    # Try full name or username exact / partial match
    doctor_match = query.filter(
        or_(
            User.full_name.ilike(f"%{clean}%"),
            User.username.ilike(clean),
            User.full_name.ilike(str(doctor_identifier).strip()),
        )
    ).first()
    return doctor_match


def get_doctor_availability_rule(
    db: Session, doctor_id: int, target_date: date
) -> Optional[DoctorAvailability]:
    """
    Looks up custom availability rule for doctor on target_date.
    Checks date-specific rule first, then weekday rule, then 'ALL' template.
    """
    date_str = target_date.strftime("%Y-%m-%d")
    weekday_str = target_date.strftime("%A")

    # 1. Exact specific date override
    specific = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.specific_date == date_str,
        )
        .first()
    )
    if specific:
        return specific

    # 2. Weekday rule (e.g. "Monday")
    weekday_rule = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.day_of_week.ilike(weekday_str),
            DoctorAvailability.specific_date.is_(None),
        )
        .first()
    )
    if weekday_rule:
        return weekday_rule

    # 3. Recurring 'ALL' rule
    all_rule = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.day_of_week.ilike("ALL"),
            DoctorAvailability.specific_date.is_(None),
        )
        .first()
    )
    return all_rule


def parse_time_str(time_str: str) -> time:
    """Parses '09:00' or '9:00' or '09:00:00' into a python time object."""
    parts = time_str.strip().split(":")
    hours = int(parts[0])
    minutes = int(parts[1]) if len(parts) > 1 else 0
    return time(hour=hours, minute=minutes)


def get_doctor_day_schedule(
    db: Session, doctor_identifier: str, target_date_str: str
) -> DoctorDayScheduleResponse:
    """
    Calculates working hours, daily appointment capacity, remaining slots,
    and interactive time slot availability for a doctor on a specific date.
    """
    try:
        target_date = datetime.strptime(target_date_str.strip(), "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format '{target_date_str}'. Expected YYYY-MM-DD.",
        )

    doctor_user = find_doctor_user(db, doctor_identifier)
    doctor_name = (
        doctor_user.full_name
        if doctor_user and doctor_user.full_name
        else (doctor_identifier if doctor_identifier.startswith("Dr.") else f"Dr. {doctor_identifier}")
    )
    doc_id = doctor_user.id if doctor_user else None

    # Retrieve custom availability rule or use standard default (09:00 - 17:00, max 10 appointments)
    rule = get_doctor_availability_rule(db, doc_id, target_date) if doc_id else None

    start_time_str = rule.start_time if rule else "09:00"
    end_time_str = rule.end_time if rule else "17:00"
    slot_minutes = rule.slot_duration_minutes if rule else 30
    max_appointments = rule.max_appointments if rule else 10
    is_available = rule.is_available if rule else True
    notes = rule.notes if rule else None

    # If doctor explicitly set is_available = False (day off)
    if not is_available:
        return DoctorDayScheduleResponse(
            doctor_id=doc_id,
            doctor_name=doctor_name,
            date=target_date_str,
            is_available=False,
            start_time=start_time_str,
            end_time=end_time_str,
            slot_duration_minutes=slot_minutes,
            max_appointments=max_appointments,
            booked_count=0,
            remaining_slots=0,
            is_capacity_reached=True,
            notes=notes or "Doctor is off-duty / unavailable on this date.",
            time_slots=[],
        )

    # Query existing booked appointments for doctor on target_date
    day_start = datetime.combine(target_date, time.min)
    day_end = datetime.combine(target_date, time.max)

    clean_name = normalize_doctor_name(doctor_name)
    doctor_filter_clause = or_(
        Appointment.doctor.ilike(doctor_name.strip()),
        Appointment.doctor.ilike(f"%{clean_name}%") if clean_name else Appointment.doctor.ilike(doctor_name.strip()),
    )

    day_appointments = (
        db.query(Appointment)
        .filter(
            doctor_filter_clause,
            Appointment.status != "Cancelled",
            Appointment.appointment_datetime >= day_start,
            Appointment.appointment_datetime <= day_end,
        )
        .all()
    )

    booked_count = len(day_appointments)
    remaining_slots = max(0, max_appointments - booked_count)
    is_capacity_reached = booked_count >= max_appointments

    # Generate time slots
    t_start = parse_time_str(start_time_str)
    t_end = parse_time_str(end_time_str)

    current_slot_dt = datetime.combine(target_date, t_start)
    end_dt = datetime.combine(target_date, t_end)

    # Reference current machine local time
    now_local = datetime.now()
    today_local = now_local.date()

    slots: List[SlotInfo] = []
    while current_slot_dt < end_dt:
        time_24 = current_slot_dt.strftime("%H:%M")
        time_label = current_slot_dt.strftime("%I:%M %p")

        # 1. Past slot check
        if target_date < today_local:
            is_past_slot = True
        elif target_date > today_local:
            is_past_slot = False
        else:
            is_past_slot = current_slot_dt.time() <= now_local.time()

        if is_past_slot:
            slots.append(SlotInfo(time=time_24, label=time_label, available=False, reason="past"))
        else:
            # 2. Collision check with booked appointments
            has_conflict = False
            for apt in day_appointments:
                apt_naive = normalize_to_utc_naive(apt.appointment_datetime)
                # Overlap within slot_minutes window
                if abs((apt_naive - current_slot_dt).total_seconds()) < (slot_minutes * 60):
                    has_conflict = True
                    break

            if has_conflict:
                slots.append(SlotInfo(time=time_24, label=time_label, available=False, reason="booked"))
            elif is_capacity_reached:
                slots.append(
                    SlotInfo(time=time_24, label=time_label, available=False, reason="capacity_reached")
                )
            else:
                slots.append(SlotInfo(time=time_24, label=time_label, available=True, reason=None))

        current_slot_dt += timedelta(minutes=slot_minutes)

    return DoctorDayScheduleResponse(
        doctor_id=doc_id,
        doctor_name=doctor_name,
        date=target_date_str,
        is_available=is_available,
        start_time=start_time_str,
        end_time=end_time_str,
        slot_duration_minutes=slot_minutes,
        max_appointments=max_appointments,
        booked_count=booked_count,
        remaining_slots=remaining_slots,
        is_capacity_reached=is_capacity_reached,
        notes=notes,
        time_slots=slots,
    )


def save_doctor_availability(
    db: Session, current_user: User, data: DoctorAvailabilityCreate
) -> DoctorAvailability:
    """
    Creates or updates doctor availability and daily appointment limit.
    Doctors can configure their own schedules; admins and staff can configure for any doctor.
    """
    # Authorize doctor
    target_doctor_id = data.doctor_id
    if current_user.role == "doctor":
        target_doctor_id = current_user.id
    elif not target_doctor_id:
        if data.doctor_name:
            doc_user = find_doctor_user(db, data.doctor_name)
            if doc_user:
                target_doctor_id = doc_user.id

    if not target_doctor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid doctor ID or doctor name is required.",
        )

    doc_user = db.query(User).filter(User.id == target_doctor_id).first()
    if not doc_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found.")

    doctor_full_name = doc_user.full_name or f"Dr. {doc_user.username}"

    # Check for existing rule to update (upsert)
    existing_query = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == target_doctor_id
    )
    if data.specific_date:
        existing = existing_query.filter(
            DoctorAvailability.specific_date == data.specific_date.strip()
        ).first()
    elif data.day_of_week:
        existing = existing_query.filter(
            DoctorAvailability.day_of_week.ilike(data.day_of_week.strip()),
            DoctorAvailability.specific_date.is_(None),
        ).first()
    else:
        existing = None

    if existing:
        existing.start_time = data.start_time
        existing.end_time = data.end_time
        existing.slot_duration_minutes = data.slot_duration_minutes
        existing.max_appointments = data.max_appointments
        existing.is_available = data.is_available
        existing.notes = data.notes
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    new_rule = DoctorAvailability(
        doctor_id=target_doctor_id,
        doctor_name=doctor_full_name,
        specific_date=data.specific_date.strip() if data.specific_date else None,
        day_of_week=data.day_of_week.strip() if data.day_of_week else None,
        start_time=data.start_time,
        end_time=data.end_time,
        slot_duration_minutes=data.slot_duration_minutes,
        max_appointments=data.max_appointments,
        is_available=data.is_available,
        notes=data.notes,
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule


def list_doctor_availabilities(
    db: Session, doctor_identifier: Optional[str] = None
) -> List[DoctorAvailability]:
    """Lists configured availability rules for a doctor or practice."""
    query = db.query(DoctorAvailability)
    if doctor_identifier:
        doc_user = find_doctor_user(db, doctor_identifier)
        if doc_user:
            query = query.filter(DoctorAvailability.doctor_id == doc_user.id)
        else:
            clean = normalize_doctor_name(doctor_identifier)
            query = query.filter(DoctorAvailability.doctor_name.ilike(f"%{clean}%"))

    return query.order_by(
        DoctorAvailability.specific_date.asc(),
        DoctorAvailability.day_of_week.asc(),
    ).all()


def delete_doctor_availability(db: Session, current_user: User, availability_id: int):
    """Deletes an availability rule."""
    rule = db.query(DoctorAvailability).filter(DoctorAvailability.id == availability_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Availability rule with ID {availability_id} not found.",
        )

    if current_user.role == "doctor" and rule.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own availability schedules.",
        )

    db.delete(rule)
    db.commit()
    return {"success": True, "deleted_id": availability_id, "message": "Availability rule removed."}
