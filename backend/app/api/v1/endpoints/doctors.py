from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import DoctorResponse
from app.schemas.doctor_availability import (
    DoctorAvailabilityCreate,
    DoctorAvailabilityResponse,
    DoctorDayScheduleResponse,
)
from app.services import availability_service
from app.api.deps import require_role

router = APIRouter(prefix="/doctors", tags=["Doctors Directory & Availability"])


@router.get("", response_model=List[DoctorResponse])
def get_doctors_directory(
    specialization: Optional[str] = Query(None, description="Filter by doctor specialization (e.g. Neurosurgeon, Dentist)"),
    search: Optional[str] = Query(None, description="Search by doctor name or bio"),
    db: Session = Depends(get_db),
):
    """
    Public directory of doctors that patients can browse to book appointments.
    """
    query = db.query(User).filter(User.role == "doctor", User.is_active.is_(True))

    if specialization and specialization.lower() != "all":
        query = query.filter(User.specialization.ilike(f"%{specialization}%"))

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.username.ilike(search_pattern),
                User.specialization.ilike(search_pattern),
                User.bio.ilike(search_pattern),
            )
        )

    doctors = query.order_by(User.full_name.asc()).all()
    return doctors


@router.get("/availabilities", response_model=List[DoctorAvailabilityResponse])
def list_all_availabilities(
    doctor: Optional[str] = Query(None, description="Filter by doctor ID or name"),
    db: Session = Depends(get_db),
):
    """
    List configured doctor availabilities across the practice.
    """
    return availability_service.list_doctor_availabilities(db=db, doctor_identifier=doctor)


@router.post("/availabilities", response_model=DoctorAvailabilityResponse, status_code=status.HTTP_201_CREATED)
def set_doctor_availability(
    availability_in: DoctorAvailabilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "admin", "staff"])),
):
    """
    Configure doctor available hours, specific date availability, and daily max appointments capacity.
    Doctors can configure their own schedules; admins and staff can configure on doctors' behalf.
    """
    return availability_service.save_doctor_availability(
        db=db, current_user=current_user, data=availability_in
    )


@router.delete("/availabilities/{availability_id}", response_model=Dict[str, Any])
def delete_doctor_availability(
    availability_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "admin", "staff"])),
):
    """
    Delete a configured availability rule.
    """
    return availability_service.delete_doctor_availability(
        db=db, current_user=current_user, availability_id=availability_id
    )


@router.get("/{doctor_identifier}/schedule", response_model=DoctorDayScheduleResponse)
def get_doctor_day_schedule(
    doctor_identifier: str,
    date: str = Query(..., description="Target date in YYYY-MM-DD format (e.g. 2026-10-15)"),
    db: Session = Depends(get_db),
):
    """
    Calculates working hours, daily appointment capacity, remaining slots,
    and interactive time slot availability for a doctor on a specific date.
    Used by patients during booking for effortless time slot selection.
    """
    return availability_service.get_doctor_day_schedule(
        db=db, doctor_identifier=doctor_identifier, target_date_str=date
    )


@router.get("/{doctor_identifier}/availabilities", response_model=List[DoctorAvailabilityResponse])
def get_doctor_availabilities(
    doctor_identifier: str,
    db: Session = Depends(get_db),
):
    """
    Get all configured schedule rules for a specific doctor.
    """
    return availability_service.list_doctor_availabilities(
        db=db, doctor_identifier=doctor_identifier
    )

