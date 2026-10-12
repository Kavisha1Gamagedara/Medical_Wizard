from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate


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

    db_appointment = Appointment(
        patient_id=appointment_in.patient_id,
        patient_name=appointment_in.patient_name.strip(),
        appointment_datetime=norm_datetime,
        doctor=appointment_in.doctor.strip(),
        appointment_type=appointment_in.appointment_type.strip(),
        status=appointment_in.status or "Scheduled",
        notes=appointment_in.notes,
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment


def list_appointments(
    db: Session,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    doctor_filter: Optional[str] = None,
    appointment_type: Optional[str] = None,
    patient_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Appointment]:
    query = db.query(Appointment)

    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Appointment.patient_name.ilike(pattern),
                Appointment.doctor.ilike(pattern),
                Appointment.notes.ilike(pattern),
            )
        )

    if status_filter and status_filter.lower() != "all":
        query = query.filter(Appointment.status.ilike(status_filter.strip()))

    if doctor_filter and doctor_filter.lower() != "all":
        query = query.filter(Appointment.doctor.ilike(f"%{doctor_filter.strip()}%"))

    if appointment_type and appointment_type.lower() != "all":
        query = query.filter(Appointment.appointment_type.ilike(appointment_type.strip()))

    return (
        query.order_by(Appointment.appointment_datetime.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_appointment_by_id(db: Session, appointment_id: int) -> Appointment:
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment with ID {appointment_id} was not found.",
        )
    return apt


def update_appointment(
    db: Session, appointment_id: int, appointment_in: AppointmentUpdate
) -> Appointment:
    apt = get_appointment_by_id(db, appointment_id)

    # If updating datetime or doctor, check conflict
    new_doc = appointment_in.doctor or apt.doctor
    new_dt = (
        normalize_to_utc_naive(appointment_in.appointment_datetime)
        if appointment_in.appointment_datetime is not None
        else apt.appointment_datetime
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
    for field, value in update_data.items():
        if value is not None:
            if field == "appointment_datetime":
                value = normalize_to_utc_naive(value)
            setattr(apt, field, value)

    db.add(apt)
    db.commit()
    db.refresh(apt)
    return apt


def delete_appointment(db: Session, appointment_id: int) -> Dict[str, Any]:
    apt = get_appointment_by_id(db, appointment_id)
    db.delete(apt)
    db.commit()
    return {"success": True, "deleted_id": appointment_id, "message": "Appointment deleted successfully."}


def get_appointment_statistics(db: Session, patient_id: Optional[int] = None) -> Dict[str, int]:
    base_query = db.query(Appointment)
    if patient_id is not None:
        base_query = base_query.filter(Appointment.patient_id == patient_id)

    total = base_query.count()
    scheduled = base_query.filter(Appointment.status == "Scheduled").count()
    completed = base_query.filter(Appointment.status == "Completed").count()
    cancelled = base_query.filter(Appointment.status == "Cancelled").count()
    return {
        "total": total,
        "scheduled": scheduled,
        "completed": completed,
        "cancelled": cancelled,
    }
