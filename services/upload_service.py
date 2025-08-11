import asyncio
import os
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from playwright.async_api import async_playwright

from db.models import UploadTask, YouTubeAccount
from services.youtube_service import YouTubeService
from utils.logger import get_logger

logger = get_logger(__name__)

class UploadService:
    def __init__(self):
        self.youtube_service = YouTubeService()
    
    @staticmethod
    def create_upload_task(
        db: Session,
        user_id: int,
        youtube_account_id: int,
        title: str,
        description: str,
        file_path: str,
        **kwargs
    ):
        task = UploadTask(
            user_id=user_id,
            youtube_account_id=youtube_account_id,
            title=title,
            description=description,
            file_path=file_path,
            tags=kwargs.get('tags', ''),
            category=kwargs.get('category', ''),
            privacy=kwargs.get('privacy', 'private'),
            scheduled_time=kwargs.get('scheduled_time')
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        logger.info(f"Upload task created: {title}")
        return task
    
    async def upload_video(self, db: Session, task_id: int):
        """Upload video using Playwright automation"""
        task = db.query(UploadTask).filter(UploadTask.id == task_id).first()
        if not task:
            logger.error(f"Task {task_id} not found")
            return
        
        # Update status
        task.status = "uploading"
        task.progress = 10
        db.commit()
        
        try:
            # Get YouTube account credentials
            account = db.query(YouTubeAccount).filter(
                YouTubeAccount.id == task.youtube_account_id
            ).first()
            
            if not account:
                raise Exception("YouTube account not found")
            
            credentials = self.youtube_service.get_account_credentials(account)
            if not credentials:
                raise Exception("Failed to decrypt account credentials")
            
            task.progress = 20
            db.commit()
            
            # Use Playwright to upload
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context()
                
                # Add cookies from credentials
                if 'cookies' in credentials:
                    await context.add_cookies(credentials['cookies'])
                
                page = await context.new_page()
                
                # Navigate to YouTube Studio
                await page.goto("https://studio.youtube.com")
                task.progress = 30
                db.commit()
                
                # Click Create button
                await page.click('[aria-label="Create"]')
                await page.click('text="Upload videos"')
                task.progress = 40
                db.commit()
                
                # Upload file
                file_input = await page.wait_for_selector('input[type="file"]')
                await file_input.set_input_files(task.file_path)
                task.progress = 60
                db.commit()
                
                # Fill video details
                await page.fill('[aria-label="Add a title"]', task.title)
                await page.fill('[aria-label="Add a description"]', task.description)
                task.progress = 80
                db.commit()
                
                # Set privacy
                await page.click('text="Unlisted"')  # Default to unlisted
                if task.privacy == "public":
                    await page.click('text="Public"')
                elif task.privacy == "private":
                    await page.click('text="Private"')
                
                task.progress = 90
                db.commit()
                
                # Publish
                await page.click('text="Publish"')
                
                # Wait for upload to complete
                await page.wait_for_selector('text="Video published"', timeout=300000)
                
                task.progress = 100
                task.status = "completed"
                task.completed_at = datetime.utcnow()
                db.commit()
                
                await browser.close()
                
                logger.info(f"Upload completed for task {task_id}")
                
        except Exception as e:
            task.status = "failed"
            task.error_message = str(e)
            db.commit()
            logger.error(f"Upload failed for task {task_id}: {str(e)}")
    
    async def process_upload_queue(self, db: Session):
        """Process pending upload tasks"""
        pending_tasks = db.query(UploadTask).filter(
            UploadTask.status == "pending"
        ).all()
        
        for task in pending_tasks:
            # Check if scheduled time has passed
            if task.scheduled_time and task.scheduled_time > datetime.utcnow():
                continue
                
            await self.upload_video(db, task.id)
            await asyncio.sleep(60)  # Wait between uploads