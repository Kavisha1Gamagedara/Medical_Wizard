from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func

from app.core.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, nullable=True, index=True)
    patient_name = Column(String(200), index=True, nullable=False)
    appointment_datetime = Column(DateTime(timezone=True), index=True, nullable=False)
    doctor = Column(String(200), index=True, nullable=False)
    appointment_type = Column(String(100), index=True, nullable=False)
    status = Column(String(50), default="Scheduled", index=True, nullable=False)
    notes = Column(Text, nullable=True)
    verification_code = Column(String(50), unique=True, index=True, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Appointment id={self.id} patient='{self.patient_name}' doctor='{self.doctor}' code='{self.verification_code}' status='{self.status}'>"
