from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class WaitlistCreate(BaseModel):
    doctor: str
    preferred_date: str  # YYYY-MM-DD
    preferred_time: Optional[str] = None
    notes: Optional[str] = None


class WaitlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    patient_name: str
    patient_email: Optional[str] = None
    patient_phone: Optional[str] = None
    doctor: str
    preferred_date: str
    preferred_time: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    notified_at: Optional[datetime] = None
