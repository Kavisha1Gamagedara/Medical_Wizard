from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Patient Notifications"])


@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get notifications with strict patient privacy:
    - Patients can ONLY see their own notifications (current_user.id).
    - Staff & Admins can optionally filter by patient_id or view notifications.
    - Other patients' notifications are strictly inaccessible.
    """
    query = db.query(Notification)

    if current_user.role == "patient":
        # Strict privacy enforcement: Patients can ONLY retrieve their own notifications
        query = query.filter(Notification.patient_id == current_user.id)
    elif current_user.role in ["admin", "staff"]:
        # Staff/Admin auditing: if patient_id is explicitly specified, filter to that patient
        if patient_id is not None:
            query = query.filter(Notification.patient_id == patient_id)
        else:
            query = query.filter(Notification.patient_id == current_user.id)
    elif current_user.role == "doctor":
        # Strict RBAC: Doctors ONLY receive notifications addressed directly to them (user ID match).
        # Patient-facing notifications (booking alerts, waitlist confirmations, slot reclaims)
        # belong exclusively to the patient and are never returned to doctor inboxes.
        query = query.filter(Notification.patient_id == current_user.id)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to view notifications.",
        )

    return query.order_by(Notification.created_at.desc()).limit(100).all()


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(
    notification_in: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a notification to a patient:
    - Admin, Staff, and Doctors can send notifications to patients.
    - Patients cannot forge notifications for other patients.
    """
    if current_user.role == "patient" and notification_in.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Patients cannot send notifications to other patients.",
        )

    # Verify patient exists
    target_patient = db.query(User).filter(User.id == notification_in.patient_id).first()
    if not target_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {notification_in.patient_id} does not exist.",
        )

    new_notif = Notification(
        patient_id=notification_in.patient_id,
        appointment_id=notification_in.appointment_id,
        title=notification_in.title,
        message=notification_in.message,
        doctor=notification_in.doctor,
        channel=notification_in.channel or "In-App Dashboard",
        timing=notification_in.timing or "immediate",
        is_read=False,
    )
    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)
    return new_notif


@router.put("/mark-all-read", response_model=dict)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark all unread notifications as read for the logged-in user.
    """
    db.query(Notification).filter(
        Notification.patient_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}
