from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FileBase(BaseModel):
    filename: str

class FileResponse(FileBase):
    id: int
    folder_id: int
    size: int
    uploaded_by_id: int
    created_at: datetime
    content_type: Optional[str] = None

    model_config = {"from_attributes": True}

class FileUploadURL(BaseModel):
    upload_url: str
    file_id: Optional[int] = None # In case we create DB entry before upload
    s3_key: str

class FileDownloadURL(BaseModel):
    download_url: str
