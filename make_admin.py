"""
Admin User Management Script
Usage: python make_admin.py <email>

Promotes an existing user to admin role.
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.users import User, UserRole


def make_admin(email: str):
    """Promote a user to admin role."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ Error: User '{email}' not found in the database.")
            print("\nRegistered users:")
            users = db.query(User).all()
            for u in users:
                print(f"  - {u.email} (role: {u.role}, auth_type: {getattr(u, 'auth_type', 'local')})")
            return False

        if user.role == UserRole.ADMIN:
            print(f"ℹ️  User '{email}' is already an admin.")
            return True

        user.role = UserRole.ADMIN
        db.commit()
        print(f"✅ Success! User '{email}' has been promoted to admin.")
        print(f"   They can now access LDAP configuration in Settings.")
        return True

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        return False
    finally:
        db.close()


def list_users():
    """List all users and their roles."""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("No users registered yet.")
            return

        print("\n=== Registered Users ===")
        print(f"{'Email':<40} {'Role':<10} {'Auth Type':<10}")
        print("-" * 60)
        for u in users:
            auth_type = getattr(u, 'auth_type', 'local')
            print(f"{u.email:<40} {u.role:<10} {auth_type:<10}")
        print()
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Admin User Management")
        print("=" * 40)
        print()
        print("Usage:")
        print("  python make_admin.py <email>        Promote user to admin")
        print("  python make_admin.py --list          List all users")
        print()
        print("Example:")
        print("  python make_admin.py admin@company.local")
        print()
        list_users()
        sys.exit(1)

    if sys.argv[1] == "--list":
        list_users()
    else:
        email = sys.argv[1].lower().strip()
        success = make_admin(email)
        sys.exit(0 if success else 1)
