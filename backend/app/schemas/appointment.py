from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class AppointmentBase(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=200)
    appointment_datetime: datetime
    doctor: str = Field(..., min_length=2, max_length=200)
    appointment_type: str = Field(..., min_length=2, max_length=100)
    status: str = Field("Scheduled", pattern=r"^(Scheduled|Completed|Cancelled|No Show)$")
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    patient_name: Optional[str] = Field(None, min_length=2, max_length=200)
    appointment_datetime: Optional[datetime] = None
    doctor: Optional[str] = Field(None, min_length=2, max_length=200)
    appointment_type: Optional[str] = Field(None, min_length=2, max_length=100)
    status: Optional[str] = Field(None, pattern=r"^(Scheduled|Completed|Cancelled|No Show)$")
    notes: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
