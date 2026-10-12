from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class DoctorAvailability(Base):
    __tablename__ = "doctor_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_name = Column(String(255), nullable=False, index=True)

    # Specific calendar date string (e.g. "2026-10-15") or recurring day of week ("Monday", "Tuesday", etc., or "ALL")
    specific_date = Column(String(20), nullable=True, index=True)
    day_of_week = Column(String(20), nullable=True)

    # Working hours for consultation appointments
    start_time = Column(String(10), default="09:00", nullable=False)  # HH:MM in 24hr format
    end_time = Column(String(10), default="17:00", nullable=False)    # HH:MM in 24hr format
    slot_duration_minutes = Column(Integer, default=30, nullable=False)

    # Max appointments doctor will accept for this date
    max_appointments = Column(Integer, default=10, nullable=False)

    is_available = Column(Boolean, default=True, nullable=False)
    notes = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<DoctorAvailability id={self.id} doctor='{self.doctor_name}' "
            f"date='{self.specific_date}' hours='{self.start_time}-{self.end_time}' "
            f"max_appointments={self.max_appointments}>"
        )
