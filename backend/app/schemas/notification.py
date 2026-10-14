from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    title: str
    message: str
    doctor: Optional[str] = None
    channel: Optional[str] = "In-App Dashboard"
    timing: Optional[str] = "immediate"


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    appointment_id: Optional[int] = None
    title: str
    message: str
    doctor: Optional[str] = None
    channel: str
    timing: str
    is_read: bool
    created_at: datetime
