import requests
import random
from typing import List, Optional
from utils.logger import get_logger

logger = get_logger(__name__)

class ProxyService:
    def __init__(self):
        self.proxies: List[dict] = []
        self.active_proxies: List[dict] = []
    
    def load_proxies(self, proxy_list: List[str]):
        """Load proxy list from configuration"""
        self.proxies = []
        for proxy in proxy_list:
            if ':' in proxy:
                host, port = proxy.split(':')
                self.proxies.append({
                    'http': f'http://{host}:{port}',
                    'https': f'http://{host}:{port}',
                    'host': host,
                    'port': port
                })
    
    async def check_proxy_health(self, proxy: dict) -> bool:
        """Check if proxy is working"""
        try:
            response = requests.get(
                'https://httpbin.org/ip',
                proxies=proxy,
                timeout=10
            )
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Proxy health check failed for {proxy['host']}: {str(e)}")
            return False
    
    async def refresh_proxy_list(self):
        """Check health of all proxies and update active list"""
        self.active_proxies = []
        for proxy in self.proxies:
            if await self.check_proxy_health(proxy):
                self.active_proxies.append(proxy)
                logger.info(f"Proxy {proxy['host']} is active")
            else:
                logger.warning(f"Proxy {proxy['host']} is inactive")
    
    def get_random_proxy(self) -> Optional[dict]:
        """Get a random active proxy"""
        if not self.active_proxies:
            return None
        return random.choice(self.active_proxies)