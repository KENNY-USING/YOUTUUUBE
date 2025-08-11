import requests
import time
from typing import Optional
from core.config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

class CaptchaService:
    def __init__(self):
        self.api_key = settings.TWOCAPTCHA_API_KEY
        self.base_url = "http://2captcha.com"
    
    def solve_recaptcha(self, site_key: str, page_url: str) -> Optional[str]:
        """Solve reCAPTCHA using 2Captcha service"""
        if not self.api_key:
            logger.warning("2Captcha API key not configured")
            return None
        
        try:
            # Submit captcha
            submit_data = {
                'key': self.api_key,
                'method': 'userrecaptcha',
                'googlekey': site_key,
                'pageurl': page_url,
                'json': 1
            }
            
            response = requests.post(f"{self.base_url}/in.php", data=submit_data)
            result = response.json()
            
            if result['status'] != 1:
                logger.error(f"Failed to submit captcha: {result.get('error_text')}")
                return None
            
            captcha_id = result['request']
            logger.info(f"Captcha submitted with ID: {captcha_id}")
            
            # Poll for result
            for _ in range(30):  # Wait up to 5 minutes
                time.sleep(10)
                
                response = requests.get(
                    f"{self.base_url}/res.php?key={self.api_key}&action=get&id={captcha_id}&json=1"
                )
                result = response.json()
                
                if result['status'] == 1:
                    logger.info("Captcha solved successfully")
                    return result['request']
                elif result['error_text'] != 'CAPCHA_NOT_READY':
                    logger.error(f"Captcha solving failed: {result.get('error_text')}")
                    return None
            
            logger.error("Captcha solving timeout")
            return None
            
        except Exception as e:
            logger.error(f"Captcha solving error: {str(e)}")
            return None