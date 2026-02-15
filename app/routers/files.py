from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models.users import User
from app.models.folders import Folder, FolderAccess
from app.models.files import File
from app.schemas.file import FileResponse, FileUploadURL, FileDownloadURL, FileBase
from app.auth.dependencies import get_current_user
from app.s3.service import generate_presigned_upload_url, generate_presigned_download_url, delete_s3_object
from app.logger import logger

router = APIRouter(tags=["Files"])

@router.post("/upload/{folder_id}", response_model=FileUploadURL)
def get_upload_url(folder_id: int, file_info: FileBase, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Only owner can upload
    if folder.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can upload files")
    
    # Generate S3 Key
    s3_key = f"{folder.s3_prefix}{uuid.uuid4()}-{file_info.filename}"
    
    # Use the content_type from the frontend so the presigned URL signature
    # matches the Content-Type header the browser will send during upload.
    upload_content_type = file_info.content_type or "application/octet-stream"
    presigned_url = generate_presigned_upload_url(s3_key, content_type=upload_content_type)
    
    # CR-04: Create file entry with "pending" status — confirmed after upload succeeds
    new_file = File(
        filename=file_info.filename,
        s3_key=s3_key,
        size=0,  # Updated on confirm
        folder_id=folder.id,
        uploaded_by_id=current_user.id,
        content_type=upload_content_type,
        upload_status="pending"
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    # presigned_url is a string (the URL), not a dictionary
    return {"upload_url": presigned_url, "file_id": new_file.id, "s3_key": s3_key}


# CR-04: Confirm upload endpoint — frontend calls this after S3 upload succeeds
@router.patch("/files/{file_id}/confirm")
def confirm_upload(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mark a file upload as completed. Call this after the S3 upload succeeds."""
    file_record = db.query(File).filter(File.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    folder = file_record.folder
    if folder.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the folder owner can confirm uploads")
    
    if file_record.upload_status == "completed":
        return {"message": "Upload already confirmed"}
    
    file_record.upload_status = "completed"
    db.commit()
    logger.info(f"Upload confirmed for file_id={file_id}")
    return {"message": "Upload confirmed", "file_id": file_id}


@router.get("/download/{file_id}", response_model=FileDownloadURL)
def get_download_url(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file_record = db.query(File).filter(File.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    folder = file_record.folder
    
    # Check access: Owner OR Shared
    has_access = False
    if folder.owner_id == current_user.id:
        has_access = True
    else:
        access = db.query(FolderAccess).filter(FolderAccess.folder_id == folder.id, FolderAccess.user_id == current_user.id).first()
        if access:
            has_access = True
            
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
        
    url = generate_presigned_download_url(file_record.s3_key)
    return {"download_url": url}

@router.delete("/files/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a file - only the folder owner can delete"""
    file_record = db.query(File).filter(File.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    folder = file_record.folder
    
    # Only folder owner can delete files
    if folder.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the folder owner can delete files")
    
    # Try to delete from S3 (ignore errors if S3 not configured)
    try:
        delete_s3_object(file_record.s3_key)
    except Exception as e:
        logger.warning(f"Could not delete S3 object {file_record.s3_key}: {e}")
    
    # Delete from database
    db.delete(file_record)
    db.commit()
    
    return {"message": "File deleted successfully"}

@router.get("/folders/{folder_id}/files", response_model=List[FileResponse])
def list_folder_files(
    folder_id: int, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Check access
    if folder.owner_id != current_user.id:
        access = db.query(FolderAccess).filter(FolderAccess.folder_id == folder.id, FolderAccess.user_id == current_user.id).first()
        if not access:
            raise HTTPException(status_code=403, detail="Access denied")

    # CR-04: Only show completed uploads (hide pending/failed ghost records)
    files = db.query(File).filter(
        File.folder_id == folder_id,
        File.upload_status == "completed"
    ).offset(skip).limit(limit).all()
    return files
