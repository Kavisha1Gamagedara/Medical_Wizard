from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    full_name: Optional[str] = Field(None, max_length=150)
    role: Optional[str] = Field("staff", pattern=r"^(admin|doctor|staff)$")
    specialization: Optional[str] = Field(None, max_length=100)  # E.g. Neurosurgeon, Dentist, Cardiologist
    phone_number: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=500)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    """Allows logging in with either username or email."""
    username_or_email: str
    password: str


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, max_length=50)
    specialization: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: str
    specialization: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    role: Optional[str] = None
