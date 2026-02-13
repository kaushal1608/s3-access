from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime
import re

class FolderBase(BaseModel):
    name: str

    @field_validator('name')
    @classmethod
    def validate_folder_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Folder name cannot be empty')
        if len(v) > 100:
            raise ValueError('Folder name must be 100 characters or less')
        if not re.match(r'^[a-zA-Z0-9 _.\-]+$', v):
            raise ValueError('Folder name can only contain letters, numbers, spaces, underscores, dots, and hyphens')
        return v

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
