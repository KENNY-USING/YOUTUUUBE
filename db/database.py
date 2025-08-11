# backend/db/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base # Base визначаємо тут ОДИН РАЗ
from sqlalchemy.orm import sessionmaker

from core.config import settings

# Створення двигуна бази даних
# settings.DATABASE_URL повинно бути, наприклад, "sqlite:///./sql_app.db"
engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)

# Створення об'єкта сесії бази даних
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовий клас для декларативного визначення моделей - ОДИН РАЗ У ВСЬОМУ ДОДАТКУ
Base = declarative_base()

def get_db():
    """
    Функція-генератор для отримання сесії бази даних.
    Використовується як залежність FastAPI.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """
    Створює всі таблиці бази даних, визначені за допомогою Base.
    Ця функція викликається при запуску додатка.
    """
    print("Створення/перевірка таблиць бази даних...")
    # Base.metadata автоматично знає про всі моделі, які успадковуються від Base
    # і були імпортовані десь в програмі (наприклад, в main.py або auth.py).
    # Тому 'from . import models' тут не потрібен і може викликати проблеми.
    Base.metadata.create_all(bind=engine)
    print("Таблиці бази даних створено (якщо вони не існували).")

