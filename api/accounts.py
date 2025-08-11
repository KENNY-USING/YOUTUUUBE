from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from db.database import get_db
from db.models import User, YouTubeAccount
from core.dependencies import get_current_user
from services.youtube_service import YouTubeService

router = APIRouter()
youtube_service = YouTubeService()

class AccountCreate(BaseModel):
    channel_name: str
    email: str
    password: str

class AccountResponse(BaseModel):
    id: int
    channel_name: str
    email: str
    is_active: bool
    created_at: str
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[AccountResponse])
def get_accounts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.query(YouTubeAccount).filter(
        YouTubeAccount.user_id == current_user.id
    ).all()
    return accounts

@router.post("/", response_model=AccountResponse)
async def add_account(
    account_data: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Authenticate with YouTube
    auth_result = await youtube_service.authenticate_with_playwright(
        account_data.email, account_data.password
    )
    
    if not auth_result["success"]:
        raise HTTPException(status_code=400, detail=auth_result["message"])
    
    # Add account to database
    account = YouTubeService.add_account(
        db=db,
        user_id=current_user.id,
        channel_name=account_data.channel_name,
        email=account_data.email,
        credentials=auth_result
    )
    
    return account

@router.delete("/{account_id}")
def delete_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(YouTubeAccount).filter(
        YouTubeAccount.id == account_id,
        YouTubeAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    db.delete(account)
    db.commit()
    return {"message": "Account deleted successfully"}