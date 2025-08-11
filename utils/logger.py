import logging
import os
from datetime import datetime
from sqlalchemy.orm import Session
from db.database import SessionLocal
from db.models import Log

def setup_logging():
    """Setup logging configuration"""
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(f"{log_dir}/app.log"),
            logging.StreamHandler()
        ]
    )

def get_logger(name: str):
    """Get logger with database handler"""
    logger = logging.getLogger(name)
    
    # Add database handler
    db_handler = DatabaseHandler()
    db_handler.setLevel(logging.INFO)
    logger.addHandler(db_handler)
    
    return logger

class DatabaseHandler(logging.Handler):
    """Custom logging handler that saves logs to database"""
    
    def emit(self, record):
        try:
            db = SessionLocal()
            log_entry = Log(
                level=record.levelname,
                message=record.getMessage(),
                module=record.name,
                created_at=datetime.utcnow()
            )
            db.add(log_entry)
            db.commit()
            db.close()
        except Exception:
            pass  # Avoid infinite recursion