from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.waitlist import Waitlist
from app.models.notification import Notification
from app.schemas.waitlist import WaitlistCreate, WaitlistResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/waitlist", tags=["Waiting List & Slot Reclaim"])


@router.get("", response_model=List[WaitlistResponse])
def get_waitlist_entries(
    doctor: Optional[str] = None,
    preferred_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List waitlist entries with RBAC:
    - Patients only see their own waitlist requests.
    - Staff & Admins can see all entries and filter by doctor/date.
    - Doctors can see entries waiting for them.
    """
    query = db.query(Waitlist)

    if current_user.role == "patient":
        query = query.filter(Waitlist.patient_id == current_user.id)
    elif current_user.role == "doctor":
        doc_name = current_user.full_name or current_user.username
        query = query.filter(Waitlist.doctor.ilike(f"%{doc_name}%"))
    elif current_user.role in ["admin", "staff"]:
        if doctor:
            query = query.filter(Waitlist.doctor.ilike(f"%{doctor}%"))
        if preferred_date:
            query = query.filter(Waitlist.preferred_date == preferred_date)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    return query.order_by(Waitlist.created_at.desc()).all()


@router.post("", response_model=WaitlistResponse, status_code=status.HTTP_201_CREATED)
def join_waitlist(
    waitlist_in: WaitlistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Allow a patient to join the priority waiting list when a doctor is fully booked on a date.
    """
    # Check if patient is already waiting for the same doctor on the same date
    existing = (
        db.query(Waitlist)
        .filter(
            Waitlist.patient_id == current_user.id,
            Waitlist.doctor == waitlist_in.doctor,
            Waitlist.preferred_date == waitlist_in.preferred_date,
            Waitlist.status.in_(["Waiting", "Notified"]),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already on the priority waiting list for this doctor and date.",
        )

    entry = Waitlist(
        patient_id=current_user.id,
        patient_name=current_user.full_name or current_user.username,
        patient_email=current_user.email,
        patient_phone=current_user.phone_number if hasattr(current_user, "phone_number") else None,
        doctor=waitlist_in.doctor,
        preferred_date=waitlist_in.preferred_date,
        preferred_time=waitlist_in.preferred_time,
        notes=waitlist_in.notes,
        status="Waiting",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Automatically notify patient of confirmed waitlist spot
    notif = Notification(
        patient_id=current_user.id,
        title=f"Waitlist Confirmed: Dr. {waitlist_in.doctor}",
        message=f"You have joined the priority waitlist for Dr. {waitlist_in.doctor} on {waitlist_in.preferred_date}. If any patient cancels, we will immediately alert you to claim the opened slot!",
        doctor=waitlist_in.doctor,
        channel="In-App Dashboard",
        timing="immediate",
        is_read=False,
    )
    db.add(notif)
    db.commit()

    return entry


@router.post("/{waitlist_id}/cancel", response_model=WaitlistResponse)
def cancel_waitlist_entry(
    waitlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cancel a waitlist request.
    """
    entry = db.query(Waitlist).filter(Waitlist.id == waitlist_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found.")

    if current_user.role == "patient" and entry.patient_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    entry.status = "Cancelled"
    db.commit()
    db.refresh(entry)
    return entry
