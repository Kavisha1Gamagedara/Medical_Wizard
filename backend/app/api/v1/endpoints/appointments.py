from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
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
):
    """
    List appointments with optional search and multi-criteria filters.
    """
    return appointment_service.list_appointments(
        db=db,
        search=search,
        status_filter=status,
        doctor_filter=doctor,
        appointment_type=type,
        patient_id=patient_id,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_in: AppointmentCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new clinical appointment.
    Includes automated schedule conflict detection for the selected doctor.
    """
    return appointment_service.create_appointment(db=db, appointment_in=appointment_in)


@router.get("/stats", response_model=Dict[str, int])
def get_appointment_statistics(
    db: Session = Depends(get_db),
):
    """
    Get aggregated metrics on appointments (total, scheduled, completed, cancelled).
    """
    return appointment_service.get_appointment_statistics(db=db)


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
):
    """
    Get appointment details by ID.
    """
    return appointment_service.get_appointment_by_id(db=db, appointment_id=appointment_id)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appointment_in: AppointmentUpdate,
    db: Session = Depends(get_db),
):
    """
    Edit and update an existing appointment.
    """
    return appointment_service.update_appointment(
        db=db,
        appointment_id=appointment_id,
        appointment_in=appointment_in,
    )


@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete an appointment by ID.
    """
    return appointment_service.delete_appointment(db=db, appointment_id=appointment_id)
