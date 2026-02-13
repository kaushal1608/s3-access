from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    s3_key = Column(String, unique=True, nullable=False)
    size = Column(BigInteger, nullable=False)
    content_type = Column(String)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    folder = relationship("Folder", back_populates="files")
    uploader = relationship("User", back_populates="files")
