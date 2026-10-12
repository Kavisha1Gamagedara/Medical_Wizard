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
            {
                "email": "dr.smith@medicalwizard.com.au",
                "username": "drsmith",
                "password": "DoctorPassword123!",
                "full_name": "Dr. Sarah Smith",
                "role": "doctor",
                "specialization": "Neurosurgeon",
                "phone_number": "+61 3 9876 5433",
                "bio": "Senior Consultant Neurosurgeon specializing in cranial surgery, spinal reconstruction, and neuro-oncology.",
            },
            {
                "email": "dr.jones@medicalwizard.com.au",
                "username": "drjones",
                "password": "DoctorPassword123!",
                "full_name": "Dr. Emily Jones",
                "role": "doctor",
                "specialization": "Dentist",
                "phone_number": "+61 3 9876 5434",
                "bio": "Dental Surgeon with expertise in restorative dentistry, cosmetic veneers, and oral hygiene rehabilitation.",
            },
            {
                "email": "dr.chen@medicalwizard.com.au",
                "username": "drchen",
                "password": "DoctorPassword123!",
                "full_name": "Dr. Robert Chen",
                "role": "doctor",
                "specialization": "Cardiologist",
                "phone_number": "+61 3 9876 5435",
                "bio": "Consultant Interventional Cardiologist specializing in hypertension, preventative cardiology, and coronary angioplasty.",
            },
            {
                "email": "dr.ray@medicalwizard.com.au",
                "username": "drray",
                "password": "DoctorPassword123!",
                "full_name": "Dr. Lisa Ray",
                "role": "doctor",
                "specialization": "Pediatrician",
                "phone_number": "+61 3 9876 5436",
                "bio": "Specialist Pediatrician committed to adolescent health, developmental assessments, and child wellness.",
            },
            {
                "email": "reception@medicalwizard.com.au",
                "username": "reception",
                "password": "StaffPassword123!",
                "full_name": "Front Desk Reception",
                "role": "staff",
                "specialization": None,
                "phone_number": "+61 3 9876 5430",
                "bio": "Central Reception and appointment intake coordination team.",
            },
            {
                "email": "alice.patient@example.com",
                "username": "patient",
                "password": "PatientPassword123!",
                "full_name": "Alice Walker",
                "role": "patient",
                "specialization": None,
                "phone_number": "+61 411 222 333",
                "bio": "Registered clinical patient with ongoing care plan.",
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

        print("Seeding completed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
