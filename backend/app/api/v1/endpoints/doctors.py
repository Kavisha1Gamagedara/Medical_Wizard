from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import DoctorResponse

router = APIRouter(prefix="/doctors", tags=["Doctors Directory"])


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
