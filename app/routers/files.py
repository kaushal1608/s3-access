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
from app.s3.service import generate_presigned_upload_url, generate_presigned_download_url, list_files

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
    
    # Pre-create DB record (optional, but good for tracking)
    # Note: Size is unknown until upload completion webhook or we just trust client? 
    # For now, we create the record AFTER upload or here with 0 size?
    # Better: Client uploads to S3, then calls another endpoint to confirm. 
    # OR: We just give URL here.
    # Requirement says "POST /upload".
    # Implementation: Return URL. S3 triggers lambda to update DB? Or client calls confirm?
    # Let's simple model: Return URL + Create Pending Entry or just URL.
    # To keep it simple without S3 triggers: We will create a DB record with size 0, and client should update it?
    # OR: we just return URL, and have a `POST /files` endpoint to register the file after upload?
    # Current req: "POST /upload".
    
    presigned_url = generate_presigned_upload_url(s3_key)
    
    # We will speculatively create the file entry to return an ID, but strictly it's not "there" yet.
    # Actually, better flow is: Client asks for URL -> Uploads -> Calls `confirm_upload` (not in reqs but needed for DB/File sync).
    # Since I must provide "POST /folders", "POST /upload", "GET /download".
    # I will assume POST /upload provides auth to upload, and also creates the file metadata entry.
    
    new_file = File(
        filename=file_info.filename,
        s3_key=s3_key,
        size=0, # Placeholder
        folder_id=folder.id,
        uploaded_by_id=current_user.id,
        content_type="application/octet-stream"
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    return {"upload_url": presigned_url['url'], "file_id": new_file.id, "s3_key": s3_key}

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

@router.get("/folders/{folder_id}/files", response_model=List[FileResponse])
def list_folder_files(folder_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Check access
    if folder.owner_id != current_user.id:
        access = db.query(FolderAccess).filter(FolderAccess.folder_id == folder.id, FolderAccess.user_id == current_user.id).first()
        if not access:
            raise HTTPException(status_code=403, detail="Access denied")

    files = db.query(File).filter(File.folder_id == folder_id).all()
    return files
