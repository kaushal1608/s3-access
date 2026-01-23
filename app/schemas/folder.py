from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class FolderBase(BaseModel):
    name: str

class FolderCreate(FolderBase):
    pass

class FolderResponse(FolderBase):
    id: int
    s3_prefix: str
    owner_id: int
    created_at: datetime
    
    model_config = {"from_attributes": True}

class FolderAccessCreate(BaseModel):
    folder_id: int
    access_password: str  # Password to access the shared folder

class FolderAccessVerify(BaseModel):
    folder_id: int
    access_password: str

class FolderListResponse(FolderResponse):
    is_shared: bool = False  # Flag to indicate if folder is shared with current user
