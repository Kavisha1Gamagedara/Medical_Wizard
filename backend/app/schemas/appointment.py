from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class AppointmentBase(BaseModel):
    patient_id: Optional[int] = None
    patient_name: str = Field(..., min_length=2, max_length=200)
    appointment_datetime: datetime
    doctor: str = Field(..., min_length=2, max_length=200)
    appointment_type: str = Field(..., min_length=2, max_length=100)
    status: str = Field("Scheduled", pattern=r"^(Scheduled|Checked In|Completed|Cancelled|No Show)$")
    notes: Optional[str] = None
    verification_code: Optional[str] = None
    is_verified: bool = False
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None


class AppointmentCreate(BaseModel):
    patient_id: Optional[int] = None
    patient_name: Optional[str] = Field(None, max_length=200)
    appointment_datetime: datetime
    doctor: str = Field(..., min_length=2, max_length=200)
    appointment_type: str = Field(..., min_length=2, max_length=100)
    status: str = Field("Scheduled", pattern=r"^(Scheduled|Checked In|Completed|Cancelled|No Show)$")
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    patient_name: Optional[str] = Field(None, min_length=2, max_length=200)
    appointment_datetime: Optional[datetime] = None
    doctor: Optional[str] = Field(None, min_length=2, max_length=200)
    appointment_type: Optional[str] = Field(None, min_length=2, max_length=100)
    status: Optional[str] = Field(None, pattern=r"^(Scheduled|Checked In|Completed|Cancelled|No Show)$")
    notes: Optional[str] = None
    is_verified: Optional[bool] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VerifyPatientRequest(BaseModel):
    verification_code: str = Field(..., min_length=3, max_length=50, description="Unique appointment verification code (e.g. MW-7X9B2K)")
    notes: Optional[str] = Field(None, max_length=500, description="Optional front-desk arrival notes")


class VerifyPatientResponse(BaseModel):
    success: bool
    message: str
    appointment: AppointmentResponse

