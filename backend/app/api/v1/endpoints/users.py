from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.api.deps import require_admin, get_optional_current_user
from app.models.user import User
from app.models.appointment import Appointment
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import create_user

router = APIRouter(prefix="/users", tags=["User Administration (Admin Only)"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def admin_register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Onboard and register a new clinical user (Staff, Doctor, Admin, or Patient).
    Restricted strictly to Administrator role.
    """
    return create_user(db=db, user_in=user_in)


@router.get("", response_model=List[UserResponse])
def list_system_users(
    role: Optional[str] = Query(None, description="Filter users by role (admin, doctor, staff, patient)"),
    search: Optional[str] = Query(None, description="Search across full name, username, and email"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    List all clinical users. Restricted strictly to Administrator role.
    """
    query = db.query(User)

    if role and role.lower() != "all":
        query = query.filter(User.role == role.lower().strip())

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.specialization.ilike(search_pattern),
            )
        )

    return query.order_by(User.id.asc()).all()


@router.get("/summary")
def get_admin_system_summary(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Comprehensive administrative telemetry summary:
    - User count breakdown (patients, doctors, staff, admin)
    - Booking count breakdown (scheduled, checked_in, completed, cancelled)
    - 7-day weekday appointment distribution trend
    - Doctor specialties & workloads
    """
    users = db.query(User).all()
    user_counts = {
        "total": len(users),
        "patients": sum(1 for u in users if u.role == "patient"),
        "doctors": sum(1 for u in users if u.role == "doctor"),
        "staff": sum(1 for u in users if u.role == "staff"),
        "admins": sum(1 for u in users if u.role == "admin"),
    }

    appointments = db.query(Appointment).all()
    booking_counts = {
        "total": len(appointments),
        "scheduled": sum(1 for a in appointments if a.status == "Scheduled"),
        "checked_in": sum(1 for a in appointments if a.status == "Checked In" or a.is_verified),
        "completed": sum(1 for a in appointments if a.status == "Completed"),
        "cancelled": sum(1 for a in appointments if a.status == "Cancelled"),
    }

    weekday_order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    py_to_day = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
    weekday_counts = {d: 0 for d in weekday_order}
    for apt in appointments:
        if apt.appointment_datetime:
            d_name = py_to_day.get(apt.appointment_datetime.weekday(), "Mon")
            weekday_counts[d_name] += 1

    specialties = {}
    for u in users:
        if u.role == "doctor":
            spec = u.specialization or "General Physician"
            specialties[spec] = specialties.get(spec, 0) + 1

    unique_patients = len(set(a.patient_name.lower().strip() for a in appointments if a.patient_name))

    return {
        "user_counts": user_counts,
        "booking_counts": booking_counts,
        "total_patients": max(user_counts["patients"], unique_patients),
        "doctors_count": user_counts["doctors"],
        "weekday_trend": weekday_counts,
        "specialties": specialties,
    }


@router.put("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    new_role: str = Query(..., pattern=r"^(admin|doctor|staff|patient)$"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Update a user's system role. Restricted strictly to Administrator role.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    target_user.role = new_role
    db.commit()
    db.refresh(target_user)
    return target_user


@router.put("/{user_id}/status", response_model=UserResponse)
def toggle_user_active_status(
    user_id: int,
    is_active: bool = Query(...),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Activate or deactivate user account access. Restricted strictly to Administrator role.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    if target_user.id == admin_user.id and not is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own administrator account.",
        )

    target_user.is_active = is_active
    db.commit()
    db.refresh(target_user)
    return target_user
