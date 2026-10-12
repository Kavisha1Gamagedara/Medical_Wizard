from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class DoctorAvailabilityBase(BaseModel):
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    specific_date: Optional[str] = Field(None, description="Calendar date YYYY-MM-DD")
    day_of_week: Optional[str] = Field(None, description="Monday, Tuesday, ..., or ALL")
    start_time: str = Field("09:00", description="Start time in HH:MM (24-hr)")
    end_time: str = Field("17:00", description="End time in HH:MM (24-hr)")
    slot_duration_minutes: int = Field(30, ge=10, le=120)
    max_appointments: int = Field(10, ge=1, le=100, description="Max appointments doctor accepts on this date")
    is_available: bool = True
    notes: Optional[str] = None


class DoctorAvailabilityCreate(DoctorAvailabilityBase):
    pass


class DoctorAvailabilityUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_duration_minutes: Optional[int] = None
    max_appointments: Optional[int] = Field(None, ge=1, le=100)
    is_available: Optional[bool] = None
    notes: Optional[str] = None


class DoctorAvailabilityResponse(DoctorAvailabilityBase):
    id: int
    doctor_id: int
    doctor_name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SlotInfo(BaseModel):
    time: str  # "09:00"
    label: str  # "09:00 AM"
    available: bool
    reason: Optional[str] = None  # "booked", "past", "capacity_reached"


class DoctorDayScheduleResponse(BaseModel):
    doctor_id: Optional[int] = None
    doctor_name: str
    date: str  # YYYY-MM-DD
    is_available: bool
    start_time: str
    end_time: str
    slot_duration_minutes: int
    max_appointments: int
    booked_count: int
    remaining_slots: int
    is_capacity_reached: bool
    notes: Optional[str] = None
    time_slots: List[SlotInfo]
