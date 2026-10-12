"""
Seed script to create default test users for development & review.
"""
from app.core.database import SessionLocal, engine, Base
import app.models
from app.models.user import User
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
                "bio": "Senior Consultant Neurosurgeon specializing in cranial and spinal microsurgery.",
            },
            {
                "email": "dr.jones@medicalwizard.com.au",
                "username": "drjones",
                "password": "DoctorPassword123!",
                "full_name": "Dr. Emily Jones",
                "role": "doctor",
                "specialization": "Dentist",
                "phone_number": "+61 3 9876 5434",
                "bio": "General and Cosmetic Dentist specializing in restorative oral health.",
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
        print("Seeding completed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
