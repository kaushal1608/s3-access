from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    s3_prefix = Column(String, unique=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="folders")
    files = relationship("File", back_populates="folder", cascade="all, delete-orphan")
    authorized_users = relationship("FolderAccess", back_populates="folder", cascade="all, delete-orphan")

class FolderAccess(Base):
    __tablename__ = "folder_access"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for password-only access
    access_password_hash = Column(String, nullable=True)  # Hashed password for access
    created_at = Column(DateTime, default=datetime.utcnow)

    folder = relationship("Folder", back_populates="authorized_users")
    user = relationship("User", back_populates="shared_folders")
