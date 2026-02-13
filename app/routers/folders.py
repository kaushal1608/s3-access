from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models.users import User
from app.models.folders import Folder, FolderAccess
from app.schemas.folder import FolderCreate, FolderResponse, FolderAccessCreate, FolderListResponse, FolderAccessVerify
from app.auth.dependencies import get_current_user
from app.auth.jwt_handler import get_password_hash, verify_password
from app.s3.service import delete_s3_object, list_files
from app.logger import logger

router = APIRouter(prefix="/folders", tags=["Folders"])

@router.post("/", response_model=FolderResponse)
def create_folder(folder: FolderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Generate unique S3 prefix
    s3_prefix = f"{current_user.id}/{uuid.uuid4()}/"
    
    new_folder = Folder(name=folder.name, s3_prefix=s3_prefix, owner_id=current_user.id)
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder

@router.get("/", response_model=List[FolderListResponse])
def list_folders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Return folders owned by user OR shared with user
    # Note: Complex pagination with unions is tricky, so we'll filter simply first.
    # For now, simplistic approach: Pagination applies to owned folders first?
    # Actually, proper pagination for mixed sources is hard without a UNION query.
    # Let's simplify and just paginate the owned folders for now, or fetch all and slice (not optimal for huge datasets but better than nothing for now).
    # Since we need to merge owned + shared, let's keep it simple: API limit applies to total.
    
    # Improved Query: Join or Union if possible. For simplicity in this demo, we'll fetch owned first.
    
    owned_folders = db.query(Folder).filter(Folder.owner_id == current_user.id).all()
    
    # Get shared folders (where user has access)
    shared_access = db.query(FolderAccess).filter(FolderAccess.user_id == current_user.id).all()
    shared_folders = [access.folder for access in shared_access if access.folder]
    
    all_folders = []
    
    # Mark shared folders
    for folder in owned_folders:
        folder_dict = FolderListResponse.model_validate(folder)
        folder_dict.is_shared = False
        all_folders.append(folder_dict)
    
    for folder in shared_folders:
        if folder and folder not in owned_folders:
            folder_dict = FolderListResponse.model_validate(folder)
            folder_dict.is_shared = True
            all_folders.append(folder_dict)
            
    # Apply pagination in memory (since we are merging two lists)
    # This is not "true" db pagination but API surface is now ready for it.
    # In a real production app, we would write a UNION query.
    start = skip
    end = skip + limit
    return all_folders[start:end]

@router.delete("/{folder_id}")
def delete_folder(folder_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a folder - only the owner can delete. Also removes all S3 objects."""
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Only owner can delete
    if folder.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this folder")
    
    # Delete all S3 objects under this folder's prefix
    try:
        s3_objects = list_files(folder.s3_prefix)
        for obj in s3_objects:
            try:
                delete_s3_object(obj['Key'])
                logger.info(f"Deleted S3 object: {obj['Key']}")
            except Exception as e:
                logger.warning(f"Failed to delete S3 object {obj['Key']}: {e}")
    except Exception as e:
        logger.warning(f"Failed to list S3 objects for prefix {folder.s3_prefix}: {e}")
    
    db.delete(folder)
    db.commit()
    logger.info(f"Folder {folder_id} deleted by user {current_user.id}")
    return {"message": "Folder deleted successfully"}

@router.post("/share")
def share_folder(access: FolderAccessCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Share a folder with a password - anyone with the password can access"""
    folder = db.query(Folder).filter(Folder.id == access.folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Only owner can share
    if folder.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can share this folder")
    
    # Hash the access password
    password_hash = get_password_hash(access.access_password)
    
    # Create password-based access (no specific user)
    new_access = FolderAccess(
        folder_id=folder.id, 
        user_id=None,  # No specific user - password based access
        access_password_hash=password_hash
    )
    db.add(new_access)
    db.commit()
    
    return {"message": "Folder shared successfully. Share the password with others to grant access."}

@router.post("/access")
def access_shared_folder(access: FolderAccessVerify, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Access a shared folder using password"""
    folder = db.query(Folder).filter(Folder.id == access.folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Check if user already has access
    existing_access = db.query(FolderAccess).filter(
        FolderAccess.folder_id == folder.id,
        FolderAccess.user_id == current_user.id
    ).first()
    
    if existing_access:
        return {"message": "You already have access to this folder"}
    
    # Check if this is the owner
    if folder.owner_id == current_user.id:
        return {"message": "You are the owner of this folder"}
    
    # Find password-based access entries for this folder
    password_accesses = db.query(FolderAccess).filter(
        FolderAccess.folder_id == folder.id,
        FolderAccess.access_password_hash.isnot(None)
    ).all()
    
    # Verify password against any of the password entries
    password_valid = False
    for pa in password_accesses:
        if verify_password(access.access_password, pa.access_password_hash):
            password_valid = True
            break
    
    if not password_valid:
        raise HTTPException(status_code=401, detail="Invalid access password")
    
    # Grant access to this user
    new_access = FolderAccess(
        folder_id=folder.id,
        user_id=current_user.id,
        access_password_hash=None  # User-based access, no password needed anymore
    )
    db.add(new_access)
    db.commit()
    
    return {"message": "Access granted successfully"}

@router.get("/shared")
def list_shared_folders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get folders shared with current user"""
    shared_access = db.query(FolderAccess).filter(FolderAccess.user_id == current_user.id).all()
    shared_folders = []
    
    for access in shared_access:
        if access.folder:
            folder_dict = FolderListResponse.model_validate(access.folder)
            folder_dict.is_shared = True
            shared_folders.append(folder_dict)
    
    return shared_folders
