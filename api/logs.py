from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from db.database import get_db
from db.models import User, Log
from core.dependencies import get_current_user

router = APIRouter()

class LogResponse(BaseModel):
    id: int
    level: str
    message: str
    module: str
    created_at: str
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[LogResponse])
def get_logs(
    level: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Log)
    
    # Filter by level if provided
    if level:
        query = query.filter(Log.level == level.upper())
    
    # Filter by module if provided
    if module:
        query = query.filter(Log.module.like(f"%{module}%"))
    
    logs = query.order_by(Log.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "level": log.level,
            "message": log.message,
            "module": log.module,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]

@router.delete("/")
def clear_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Log).delete()
    db.commit()
    return {"message": "Logs cleared successfully"}