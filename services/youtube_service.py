import json
from typing import Optional
from sqlalchemy.orm import Session
from playwright.async_api import async_playwright
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

from db.models import YouTubeAccount
from utils.encryption import encrypt_data, decrypt_data
from utils.logger import get_logger

logger = get_logger(__name__)

class YouTubeService:
    def __init__(self):
        self.youtube = None
        if hasattr(self, 'api_key') and self.api_key:
            self.youtube = build('youtube', 'v3', developerKey=self.api_key)
    
    @staticmethod
    def add_account(db: Session, user_id: int, channel_name: str, email: str, credentials: dict):
        encrypted_creds = encrypt_data(json.dumps(credentials))
        account = YouTubeAccount(
            user_id=user_id,
            channel_name=channel_name,
            email=email,
            encrypted_credentials=encrypted_creds
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        logger.info(f"YouTube account added: {channel_name}")
        return account
    
    @staticmethod
    def get_account_credentials(account: YouTubeAccount):
        try:
            decrypted_creds = decrypt_data(account.encrypted_credentials)
            return json.loads(decrypted_creds)
        except Exception as e:
            logger.error(f"Failed to decrypt credentials for account {account.id}: {str(e)}")
            return None
    
    async def authenticate_with_playwright(self, email: str, password: str):
        """Authenticate using Playwright automation"""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=False)
                page = await browser.new_page()
                
                # Navigate to YouTube
                await page.goto("https://accounts.google.com/signin")
                
                # Fill email
                await page.fill('input[type="email"]', email)
                await page.click('#identifierNext')
                
                # Wait for password field and fill
                await page.wait_for_selector('input[type="password"]')
                await page.fill('input[type="password"]', password)
                await page.click('#passwordNext')
                
                # Wait for successful login
                await page.wait_for_url("**/myaccount.google.com/**", timeout=30000)
                
                # Get cookies
                cookies = await page.context.cookies()
                
                await browser.close()
                
                return {
                    "success": True,
                    "cookies": cookies,
                    "message": "Authentication successful"
                }
                
        except Exception as e:
            logger.error(f"Playwright authentication failed: {str(e)}")
            return {
                "success": False,
                "message": f"Authentication failed: {str(e)}"
            }
    
    def get_channel_info(self, credentials: dict):
        """Get channel information using YouTube Data API"""
        try:
            # This would use the YouTube Data API to get channel info
            # For now, return mock data
            return {
                "channel_id": "UC123456789",
                "channel_name": "Test Channel",
                "subscriber_count": 1000
            }
        except Exception as e:
            logger.error(f"Failed to get channel info: {str(e)}")
            return None