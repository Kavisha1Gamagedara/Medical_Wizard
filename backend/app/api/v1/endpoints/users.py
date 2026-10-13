from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.api.deps import require_admin
from app.models.user import User
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
