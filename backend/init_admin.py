import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check if admin exists
    existing_admin = await db.users.find_one({"username": "admin"})
    if existing_admin:
        print("Admin user already exists!")
        return
    
    # Create admin user
    admin_doc = {
        "id": "admin-001",
        "username": "admin",
        "hashed_password": pwd_context.hash("admin123"),
        "security_passphrase_hash": pwd_context.hash("secure123"),
        "role": "admin",
        "created_at": "2025-01-01T00:00:00+00:00",
        "online": False
    }
    
    await db.users.insert_one(admin_doc)
    print("Admin user created successfully!")
    print("Username: admin")
    print("Password: admin123")
    print("Security Passphrase: secure123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
