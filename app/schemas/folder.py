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
    user_email: str
    folder_id: int

class FolderListResponse(FolderResponse):
    pass
