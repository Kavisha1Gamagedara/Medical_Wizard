from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.schemas.user import UserCreate, UserLogin, UserProfileUpdate, UserResponse, Token
from app.services.auth_service import create_user, authenticate_user, update_user_profile
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Register a new user account.
    """
    user = create_user(db=db, user_in=user_in)
    return user


@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    """
    Login with username or email and password via JSON payload.
    Returns a JWT Bearer access token and user information.
    """
    user = authenticate_user(
        db=db,
        username_or_email=login_data.username_or_email,
        password=login_data.password,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "username": user.username},
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )


@router.post("/token", response_model=Token, include_in_schema=True)
def login_oauth2(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    OAuth2 compatible token login, used by FastAPI Swagger UI (/docs) Authorize button.
    """
    user = authenticate_user(
        db=db,
        username_or_email=form_data.username,
        password=form_data.password,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "username": user.username},
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )


@router.get("/me", response_model=UserResponse)
def read_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """
    Get profile information of the currently authenticated user.
    """
    return current_user


@router.put("/profile", response_model=UserResponse)
@router.put("/me", response_model=UserResponse)
def update_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update profile details for the currently authenticated user.
    Allows editing full name, phone number, bio, and medical specialization (for doctors).
    """
    updated_user = update_user_profile(db=db, user=current_user, profile_in=profile_in)
    return updated_user

