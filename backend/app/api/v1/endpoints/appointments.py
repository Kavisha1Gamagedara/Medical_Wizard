from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_optional_current_user
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
)
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["Appointments Management"])


@router.get("", response_model=List[AppointmentResponse])
def get_appointments(
    search: Optional[str] = Query(None, description="Search across patient, doctor, and notes"),
    status: Optional[str] = Query(None, description="Filter by status (Scheduled, Completed, Cancelled, No Show)"),
    doctor: Optional[str] = Query(None, description="Filter by doctor name"),
    type: Optional[str] = Query(None, description="Filter by appointment type"),
    patient_id: Optional[int] = Query(None, description="Filter appointments by patient ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    List appointments with optional search and multi-criteria filters.
    Enforces RBAC:
    - Patients can ONLY view their own appointments (patient_id enforced to current_user.id).
    - Doctors, staff, and admins can view practice appointments.
    """
    effective_patient_id = patient_id

    # RBAC: Patient privacy boundary
    if current_user and current_user.role == "patient":
        effective_patient_id = current_user.id

    return appointment_service.list_appointments(
        db=db,
        search=search,
        status_filter=status,
        doctor_filter=doctor,
        appointment_type=type,
        patient_id=effective_patient_id,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_in: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Create a new clinical appointment.
    Includes automated schedule conflict detection for the selected doctor.
    Enforces RBAC:
    - If logged in as patient, appointment is tied directly to their patient account.
    """
    if current_user and current_user.role == "patient":
        appointment_in.patient_id = current_user.id
        if not appointment_in.patient_name:
            appointment_in.patient_name = current_user.full_name or current_user.username
    elif not appointment_in.patient_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient name is required.",
        )

    return appointment_service.create_appointment(db=db, appointment_in=appointment_in)


@router.get("/stats", response_model=Dict[str, int])
def get_appointment_statistics(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Get aggregated metrics on appointments.
    Enforces RBAC:
    - Patients receive aggregated metrics for their own consultations.
    - Staff/Admin/Doctor receive clinic-wide metrics.
    """
    patient_filter = None
    if current_user and current_user.role == "patient":
        patient_filter = current_user.id

    return appointment_service.get_appointment_statistics(db=db, patient_id=patient_filter)


@router.get("/check-availability", response_model=Dict[str, Any])
def check_doctor_availability(
    doctor: str = Query(..., description="Doctor name to check"),
    datetime_str: str = Query(..., alias="datetime", description="Target appointment datetime ISO string"),
    exclude_appointment_id: Optional[int] = Query(None, description="Exclude appointment ID during edit"),
    db: Session = Depends(get_db),
):
    """
    Check if a specific time slot is available for a doctor without schedule collisions.
    """
    try:
        clean_str = datetime_str.strip().replace("Z", "+00:00")
        if " " in clean_str and "T" in clean_str:
            parts = clean_str.rsplit(" ", 1)
            if len(parts) == 2 and ":" in parts[1]:
                clean_str = f"{parts[0]}+{parts[1]}"
        parsed_dt = datetime.fromisoformat(clean_str)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid datetime format. Expected ISO-8601 string (e.g. 2026-10-20T10:00:00).",
        )

    conflict = appointment_service.check_doctor_schedule_conflict(
        db=db,
        doctor=doctor,
        target_time=parsed_dt,
        exclude_appointment_id=exclude_appointment_id,
    )

    if conflict:
        formatted = conflict.appointment_datetime.strftime("%Y-%m-%d %I:%M %p")
        return {
            "available": False,
            "conflict_appointment_id": conflict.id,
            "conflict_doctor": conflict.doctor,
            "conflict_time": conflict.appointment_datetime.isoformat(),
            "message": f"Schedule Conflict: {conflict.doctor} already has an appointment scheduled at {formatted} (ref #{conflict.id}).",
        }

    return {
        "available": True,
        "message": f"{doctor} is available for booking at this time.",
    }


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Get appointment details by ID.
    Enforces RBAC:
    - Patients cannot view other patients' consultation details (403 Forbidden).
    """
    apt = appointment_service.get_appointment_by_id(db=db, appointment_id=appointment_id)
    if current_user and current_user.role == "patient":
        if apt.patient_id is not None and apt.patient_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view other patients' appointments.",
            )
    return apt


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appointment_in: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Edit and update an existing appointment.
    Enforces RBAC:
    - Patients can only update their own appointments, and cannot alter assigned doctor directly.
    - Doctors can update clinical status and notes for their consultations.
    - Staff and Admins have full editing rights.
    """
    apt = appointment_service.get_appointment_by_id(db=db, appointment_id=appointment_id)

    if current_user:
        if current_user.role == "patient":
            if apt.patient_id is not None and apt.patient_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to modify other patients' appointments.",
                )
            if appointment_in.doctor and appointment_in.doctor != apt.doctor:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Patients cannot reassign doctors. Please cancel and book a new consultation or contact reception.",
                )
        elif current_user.role == "doctor":
            pass

    return appointment_service.update_appointment(
        db=db,
        appointment_id=appointment_id,
        appointment_in=appointment_in,
    )


@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Delete an appointment by ID.
    Enforces RBAC:
    - Doctors CANNOT delete appointment records (must mark as Cancelled or No Show for medical audit trail).
    - Patients cannot delete other patients' appointments (403 Forbidden).
    - Staff and Admins can delete appointment records.
    """
    apt = appointment_service.get_appointment_by_id(db=db, appointment_id=appointment_id)

    if current_user:
        if current_user.role == "doctor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctors cannot permanently delete clinical appointment records. Please update status to Cancelled or No Show to preserve medical history.",
            )
        elif current_user.role == "patient":
            if apt.patient_id is not None and apt.patient_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You cannot delete another patient's appointment.",
                )

    return appointment_service.delete_appointment(db=db, appointment_id=appointment_id)
