from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import shutil

from db.database import get_db
from db.models import User, UploadTask, YouTubeAccount
from core.dependencies import get_current_user
from services.upload_service import UploadService

router = APIRouter()
upload_service = UploadService()

class UploadTaskCreate(BaseModel):
    youtube_account_id: int
    title: str
    description: str = ""
    tags: str = ""
    category: str = "22"  # People & Blogs
    privacy: str = "private"
    scheduled_time: Optional[datetime] = None

class UploadTaskResponse(BaseModel):
    id: int
    title: str
    status: str
    progress: float
    youtube_account: dict
    created_at: str
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[UploadTaskResponse])
def get_upload_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tasks = db.query(UploadTask).filter(
        UploadTask.user_id == current_user.id
    ).order_by(UploadTask.created_at.desc()).all()
    
    # Format response with account info
    result = []
    for task in tasks:
        account = db.query(YouTubeAccount).filter(
            YouTubeAccount.id == task.youtube_account_id
        ).first()
        
        result.append({
            "id": task.id,
            "title": task.title,
            "status": task.status,
            "progress": task.progress,
            "youtube_account": {
                "id": account.id if account else None,
                "channel_name": account.channel_name if account else "Unknown"
            },
            "created_at": task.created_at.isoformat(),
            "error_message": task.error_message
        })
    
    return result

@router.post("/", response_model=UploadTaskResponse)
async def create_upload_task(
    youtube_account_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(""),
    tags: str = Form(""),
    privacy: str = Form("private"),
    video_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify account ownership
    account = db.query(YouTubeAccount).filter(
        YouTubeAccount.id == youtube_account_id,
        YouTubeAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="YouTube account not found")
    
    # Save uploaded file
    upload_dir = f"uploads/{current_user.id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = f"{upload_dir}/{video_file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video_file.file, buffer)
    
    # Create upload task
    task = UploadService.create_upload_task(
        db=db,
        user_id=current_user.id,
        youtube_account_id=youtube_account_id,
        title=title,
        description=description,
        file_path=file_path,
        tags=tags,
        privacy=privacy
    )
    
    # Start upload process (background task)
    import asyncio
    asyncio.create_task(upload_service.upload_video(db, task.id))
    
    return {
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "progress": task.progress,
        "youtube_account": {
            "id": account.id,
            "channel_name": account.channel_name
        },
        "created_at": task.created_at.isoformat(),
        "error_message": task.error_message
    }

@router.delete("/{task_id}")
def delete_upload_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(UploadTask).filter(
        UploadTask.id == task_id,
        UploadTask.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Upload task not found")
    
    # Delete file if exists
    if os.path.exists(task.file_path):
        os.remove(task.file_path)
    
    db.delete(task)
    db.commit()
    return {"message": "Upload task deleted successfully"}

@router.post("/{task_id}/retry")
async def retry_upload(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(UploadTask).filter(
        UploadTask.id == task_id,
        UploadTask.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Upload task not found")
    
    # Reset task status
    task.status = "pending"
    task.progress = 0
    task.error_message = None
    db.commit()
    
    # Restart upload
    import asyncio
    asyncio.create_task(upload_service.upload_video(db, task.id))
    
    return {"message": "Upload task restarted"}