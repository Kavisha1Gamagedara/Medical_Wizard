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
            },
            {
                "email": "dr.smith@medicalwizard.com.au",
                "username": "drsmith",
                "password": "DoctorPassword123!",
                "full_name": "Dr. Sarah Smith",
                "role": "doctor",
            },
            {
                "email": "reception@medicalwizard.com.au",
                "username": "reception",
                "password": "StaffPassword123!",
                "full_name": "Front Desk Reception",
                "role": "staff",
            },
        ]

        print("Seeding initial users...")
        for u in users:
            existing = db.query(User).filter(User.username == u["username"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    username=u["username"],
                    hashed_password=get_password_hash(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    is_active=True,
                )
                db.add(user)
                print(f"Created user: {u['username']} ({u['role']})")
            else:
                print(f"User {u['username']} already exists.")
        db.commit()
        print("Seeding completed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
