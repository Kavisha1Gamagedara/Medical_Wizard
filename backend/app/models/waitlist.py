from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Waitlist(Base):
    __tablename__ = "waitlist"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_name = Column(String(100), nullable=False)
    patient_email = Column(String(100), nullable=True)
    patient_phone = Column(String(50), nullable=True)
    doctor = Column(String(100), nullable=False, index=True)
    preferred_date = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    preferred_time = Column(String(20), nullable=True)  # HH:MM
    notes = Column(Text, nullable=True)
    status = Column(String(30), default="Waiting", nullable=False, index=True)  # 'Waiting', 'Notified', 'Claimed', 'Cancelled'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    notified_at = Column(DateTime, nullable=True)

    patient = relationship("User", backref="waitlist_entries")
