# C:\Monya\backend\main.py

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import uvicorn

# Імпорт ваших модулів
from core.config import settings
from db.database import create_tables
from api import auth, accounts, uploads, logs
from db.models import Base, User  # Змінено: Correct import path to models.py
from utils.logger import setup_logging

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Функція життєвого циклу додатку FastAPI.
    Виконується при запуску та зупинці додатку.
    """
    # Startup події
    print("Запуск додатку...")
    setup_logging() # Налаштування логування
    create_tables() # Створення таблиць бази даних при запуску
    print("Таблиці бази даних перевірено/створено.")
    yield # Додаток працює
    # Shutdown події
    print("Завершення роботи додатку...")
    pass

app = FastAPI(
    title="YouTube AutoUploader",
    version="1.0.0",
    lifespan=lifespan # Прив'язка функції життєвого циклу
)

# Налаштування CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Дозволяє запити з будь-якого джерела (для розробки)
    allow_credentials=True,
    allow_methods=["*"],  # Дозволяє всі HTTP методи (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Дозволяє всі заголовки
)

# Включення роутерів API
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["accounts"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Клієнт WebSocket підключено.")
    try:
        while True:
            data = await websocket.receive_text()
            print(f"Отримано повідомлення WebSocket: {data}")
            await websocket.send_text(f"Повідомлення отримано: {data}")
    except WebSocketDisconnect:
        print("Клієнт WebSocket відключено.")
    except Exception as e:
        print(f"Помилка WebSocket: {e}")

# Запуск Uvicorn сервера, якщо скрипт запускається напряму
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
