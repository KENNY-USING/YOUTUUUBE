from cryptography.fernet import Fernet
from core.config import settings
import base64

def get_encryption_key():
    """Get or generate encryption key"""
    # In production, this should be stored securely
    key = base64.urlsafe_b64encode(settings.SECRET_KEY.encode()[:32].ljust(32, b'0'))
    return key

def encrypt_data(data: str) -> str:
    """Encrypt sensitive data"""
    key = get_encryption_key()
    f = Fernet(key)
    encrypted_data = f.encrypt(data.encode())
    return base64.urlsafe_b64encode(encrypted_data).decode()

def decrypt_data(encrypted_data: str) -> str:
    """Decrypt sensitive data"""
    key = get_encryption_key()
    f = Fernet(key)
    decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
    decrypted_data = f.decrypt(decoded_data)
    return decrypted_data.decode()