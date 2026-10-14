"""
Seed script to create default test users and sample appointments for development & review.
"""
from datetime import datetime, timedelta, timezone
from app.core.database import SessionLocal, engine, Base
import app.models
from app.models.user import User
from app.models.appointment import Appointment
from app.core.security import get_password_hash


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        users = [
            {
                "email": "admin@medicalwizard.com.au",
                "username": "admin",
                "password": "AdminPassword123!",
                "full_name": "System Administrator",
                "role": "admin",
                "specialization": None,
                "phone_number": "+61 3 9876 5432",
                "bio": "Lead Clinical Systems Administrator overseeing practice compliance and access control.",
            },
        ]

        print("Seeding/updating users with profile specializations...")
        for u in users:
            existing = db.query(User).filter(User.username == u["username"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    username=u["username"],
                    hashed_password=get_password_hash(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    specialization=u.get("specialization"),
                    phone_number=u.get("phone_number"),
                    bio=u.get("bio"),
                    is_active=True,
                )
                db.add(user)
                print(f"Created user: {u['username']} ({u['role']}) - Spec: {u.get('specialization')}")
            else:
                existing.specialization = u.get("specialization")
                existing.phone_number = u.get("phone_number")
                existing.bio = u.get("bio")
                existing.full_name = u["full_name"]
                db.add(existing)
                print(f"Updated user profile: {u['username']} - Spec: {u.get('specialization')}")
        db.commit()

        # Seed sample appointments
        now = datetime.now(timezone.utc)
        sample_appointments = [
            {
                "patient_name": "John Doe",
                "doctor": "Dr. Sarah Smith",
                "appointment_datetime": now + timedelta(days=1, hours=2),
                "appointment_type": "Specialist Consultation",
                "status": "Scheduled",
                "notes": "Referred for recurring cervical spine pain assessment.",
            },
            {
                "patient_name": "Maria Garcia",
                "doctor": "Dr. Emily Jones",
                "appointment_datetime": now + timedelta(days=2, hours=4),
                "appointment_type": "Dental Checkup",
                "status": "Scheduled",
                "notes": "Bi-annual routine clean and filling evaluation.",
            },
            {
                "patient_name": "Michael Brown",
                "doctor": "Dr. Robert Chen",
                "appointment_datetime": now - timedelta(days=1, hours=3),
                "appointment_type": "Cardiac Follow-up",
                "status": "Completed",
                "notes": "Post-angioplasty medication adjustment; blood pressure stable.",
            },
            {
                "patient_name": "Emma Wilson",
                "doctor": "Dr. Lisa Ray",
                "appointment_datetime": now + timedelta(days=3, hours=1),
                "appointment_type": "Pediatric Wellness",
                "status": "Scheduled",
                "notes": "Annual child developmental milestone review.",
            },
        ]

        print("Checking sample appointments...")
        if db.query(Appointment).count() == 0:
            for apt_data in sample_appointments:
                apt = Appointment(**apt_data)
                db.add(apt)
            db.commit()
            print(f"Seeded {len(sample_appointments)} sample appointments.")
        else:
            print("Appointments already exist, skipping duplicate appointment creation.")

        # Seed sample doctor availability schedules & daily capacities
        from app.models.doctor_availability import DoctorAvailability
        print("Checking doctor availability schedules...")
        tomorrow_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        day_after_str = (now + timedelta(days=2)).strftime("%Y-%m-%d")
        
        doctor_users = db.query(User).filter(User.role == "doctor").all()
        for doc in doctor_users:
            existing_avail = db.query(DoctorAvailability).filter(DoctorAvailability.doctor_id == doc.id).first()
            if not existing_avail:
                # Add default recurring rule
                default_rule = DoctorAvailability(
                    doctor_id=doc.id,
                    doctor_name=doc.full_name or f"Dr. {doc.username}",
                    day_of_week="ALL",
                    start_time="09:00",
                    end_time="17:00",
                    slot_duration_minutes=30,
                    max_appointments=8,
                    is_available=True,
                    notes=f"Standard clinical consultation schedule for {doc.specialization or 'general practice'}.",
                )
                db.add(default_rule)
                # Add a date-specific custom rule for tomorrow
                tomorrow_rule = DoctorAvailability(
                    doctor_id=doc.id,
                    doctor_name=doc.full_name or f"Dr. {doc.username}",
                    specific_date=tomorrow_str,
                    start_time="09:00",
                    end_time="16:00",
                    slot_duration_minutes=30,
                    max_appointments=6,
                    is_available=True,
                    notes=f"Focused outpatient clinic ({doc.specialization}). Maximum 6 appointments accepted.",
                )
                db.add(tomorrow_rule)
                print(f"Seeded availability & capacity rules for {doc.full_name}")
        db.commit()

        print("Seeding completed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
