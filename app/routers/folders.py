from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models.users import User
from app.models.folders import Folder, FolderAccess
from app.schemas.folder import FolderCreate, FolderResponse, FolderAccessCreate, FolderListResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/folders", tags=["Folders"])

@router.post("/", response_model=FolderResponse)
def create_folder(folder: FolderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if folder name exists for user (optional constraint)
    # Generate unique S3 prefix
    s3_prefix = f"{current_user.id}/{uuid.uuid4()}/"
    
    new_folder = Folder(name=folder.name, s3_prefix=s3_prefix, owner_id=current_user.id)
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder

@router.get("/", response_model=List[FolderListResponse])
def list_folders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Return folders owned by user OR shared with user
    owned_folders = db.query(Folder).filter(Folder.owner_id == current_user.id).all()
    shared_access = db.query(FolderAccess).filter(FolderAccess.user_id == current_user.id).all()
    shared_folders = [access.folder for access in shared_access]
    
    return owned_folders + shared_folders

@router.post("/share")
def share_folder(access: FolderAccessCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    folder = db.query(Folder).filter(Folder.id == access.folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if folder.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to share this folder")
    
    user_to_share = db.query(User).filter(User.email == access.user_email).first()
    if not user_to_share:
        raise HTTPException(status_code=404, detail="User email not found")
    
    if user_to_share.id == current_user.id:
         raise HTTPException(status_code=400, detail="Cannot share with yourself")

    # Check if already shared
    existing = db.query(FolderAccess).filter(FolderAccess.folder_id == folder.id, FolderAccess.user_id == user_to_share.id).first()
    if existing:
        return {"message": "Already shared"}

    new_access = FolderAccess(folder_id=folder.id, user_id=user_to_share.id)
    db.add(new_access)
    db.commit()
    return {"message": f"Folder shared with {access.user_email}"}
