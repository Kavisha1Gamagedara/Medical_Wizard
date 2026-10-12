from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, verify_password


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email_or_username(db: Session, identifier: str) -> Optional[User]:
    return db.query(User).filter(
        or_(User.email == identifier.lower(), User.username == identifier)
    ).first()


def create_user(db: Session, user_in: UserCreate) -> User:
    # Check if email exists
    existing_email = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Check if username exists
    existing_username = db.query(User).filter(User.username == user_in.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists.",
        )

    # Hash the password and create the user
    hashed_pwd = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email.lower(),
        username=user_in.username,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        role=user_in.role or "staff",
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(
    db: Session, username_or_email: str, password: str
) -> Optional[User]:
    user = get_user_by_email_or_username(db, username_or_email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def update_user_profile(
    db: Session, user: User, profile_in
) -> User:
    """Updates user profile attributes including specialization, phone, and bio."""
    if profile_in.email is not None and profile_in.email.lower() != user.email:
        existing = db.query(User).filter(User.email == profile_in.email.lower()).first()
        if existing and existing.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists.",
            )
        user.email = profile_in.email.lower()

    if profile_in.full_name is not None:
        user.full_name = profile_in.full_name
    if profile_in.phone_number is not None:
        user.phone_number = profile_in.phone_number
    if profile_in.specialization is not None:
        if user.role in ["doctor", "admin"]:
            user.specialization = profile_in.specialization
    if profile_in.bio is not None:
        user.bio = profile_in.bio

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

