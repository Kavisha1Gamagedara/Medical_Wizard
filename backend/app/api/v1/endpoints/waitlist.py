from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    doctor: Optional[str] = Query(None),
    preferred_date: Optional[str] = Query(None),
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
    Only patients can join the waitlist — staff/admins/doctors cannot.
    """
    if current_user.role not in ["patient"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can join a doctor's waiting list.",
        )

    # Validate preferred_date format (YYYY-MM-DD)
    try:
        target_date = datetime.strptime(waitlist_in.preferred_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD.",
        )

    # Cannot join waitlist for a past date
    if target_date < datetime.now(timezone.utc).date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot join waitlist for a past date. Please select an upcoming date.",
        )

    # Validate doctor name is not empty
    if not waitlist_in.doctor or not waitlist_in.doctor.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor name is required to join the waitlist.",
        )

    # Check if patient is already waiting for the same doctor on the same date
    existing = (
        db.query(Waitlist)
        .filter(
            Waitlist.patient_id == current_user.id,
            Waitlist.doctor.ilike(waitlist_in.doctor.strip()),
            Waitlist.preferred_date == waitlist_in.preferred_date,
            Waitlist.status.in_(["Waiting", "Notified"]),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are already on the priority waiting list for {waitlist_in.doctor} on {waitlist_in.preferred_date}. We will notify you when a slot opens.",
        )

    entry = Waitlist(
        patient_id=current_user.id,
        patient_name=current_user.full_name or current_user.username,
        patient_email=current_user.email,
        patient_phone=current_user.phone_number if hasattr(current_user, "phone_number") else None,
        doctor=waitlist_in.doctor.strip(),
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
        title=f"✅ Waitlist Confirmed: {waitlist_in.doctor}",
        message=(
            f"You have been added to the priority waitlist for {waitlist_in.doctor} on "
            f"{waitlist_in.preferred_date}. We will immediately alert you when a cancellation "
            f"opens a slot. You are #{db.query(Waitlist).filter(Waitlist.doctor.ilike(waitlist_in.doctor.strip()), Waitlist.preferred_date == waitlist_in.preferred_date, Waitlist.status == 'Waiting').count()} in the queue."
        ),
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
    Cancel / withdraw a waitlist request.
    Patients can only cancel their own entries.
    Staff/Admins can cancel any entry.
    """
    entry = db.query(Waitlist).filter(Waitlist.id == waitlist_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found.")

    if current_user.role == "patient" and entry.patient_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You can only cancel your own waitlist requests.")

    if entry.status == "Cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This waitlist request is already cancelled.")

    if entry.status == "Claimed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This waitlist slot has already been claimed and converted to an appointment.")

    entry.status = "Cancelled"
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/{waitlist_id}/claim", response_model=WaitlistResponse)
def claim_waitlist_slot(
    waitlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a waitlist slot as claimed (patient is booking the opened slot).
    Only the patient who was notified can claim their entry.
    """
    entry = db.query(Waitlist).filter(Waitlist.id == waitlist_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found.")

    if current_user.role == "patient" and entry.patient_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if entry.status == "Claimed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This slot has already been claimed.")

    if entry.status not in ["Waiting", "Notified"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot claim: waitlist entry is in '{entry.status}' status.",
        )

    # 30-Minute Priority Claim Window Validation:
    # If the patient was notified more than 30 minutes ago, their priority claim window has expired.
    if entry.status == "Notified" and entry.notified_at:
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        if (now_utc - entry.notified_at) > timedelta(minutes=30):
            entry.status = "Expired"
            db.commit()
            # Notify the next patient in line for this slot
            try:
                from app.services.appointment_service import notify_waitlist_on_cancellation
                target_dt = datetime.strptime(entry.preferred_date, "%Y-%m-%d")
                notify_waitlist_on_cancellation(db, entry.doctor, target_dt)
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Claim Window Expired: The 30-minute priority window to reclaim this slot has elapsed. The slot has been released to the next patient.",
            )

    entry.status = "Claimed"
    db.commit()
    db.refresh(entry)
    return entry
