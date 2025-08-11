# backend/db/models.py
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base # Цей рядок був зайвий, його видалено
from sqlalchemy.orm import relationship
from datetime import datetime

# ВАЖЛИВО: Імпортуємо Base з database.py, щоб усі моделі успадковувалися від ОДНІЄЇ Base
from .database import Base 

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    youtube_accounts = relationship("YouTubeAccount", back_populates="user")
    upload_tasks = relationship("UploadTask", back_populates="user")

class YouTubeAccount(Base):
    __tablename__ = "youtube_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    channel_name = Column(String)
    channel_id = Column(String)
    email = Column(String)
    encrypted_credentials = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="youtube_accounts")
    upload_tasks = relationship("UploadTask", back_populates="youtube_account")

class UploadTask(Base):
    __tablename__ = "upload_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    youtube_account_id = Column(Integer, ForeignKey("youtube_accounts.id"))
    title = Column(String)
    description = Column(Text)
    file_path = Column(String)
    thumbnail_path = Column(String, nullable=True)
    tags = Column(String)
    category = Column(String)
    privacy = Column(String, default="private")
    status = Column(String, default="pending")  # pending, uploading, completed, failed
    progress = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    scheduled_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates="upload_tasks")
    youtube_account = relationship("YouTubeAccount", back_populates="upload_tasks")

class Log(Base):
    __tablename__ = "logs"
    
    id = Column(Integer, primary_key=True, index=True)
    level = Column(String)  # INFO, WARNING, ERROR, DEBUG
    message = Column(Text)
    module = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True)
    value = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow)
