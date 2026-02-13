from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    OWNER = "owner"
    USER = "user"
    ADMIN = "admin"

class AuthType(str, enum.Enum):
    LOCAL = "local"
    LDAP = "ldap"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)  # Nullable for LDAP users (no local password)
    role = Column(String, default=UserRole.USER)
    auth_type = Column(String, default=AuthType.LOCAL)  # "local" or "ldap"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    folders = relationship("Folder", back_populates="owner")
    shared_folders = relationship("FolderAccess", back_populates="user")
    files = relationship("File", back_populates="uploader")
