import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from argon2 import PasswordHasher
import os
import sys
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_hasher = PasswordHasher()

async def create_admin():
    """Create default admin user if it doesn't exist"""
    try:
        # Check required environment variables
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME')
        
        if not mongo_url:
            print("❌ Error: MONGO_URL environment variable not set!")
            print("   Copy backend/.env.example to backend/.env and update with your MongoDB URL")
            return False
        
        if not db_name:
            print("❌ Error: DB_NAME environment variable not set!")
            return False
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Test connection
        await db.command("ping")
        print("✓ Connected to MongoDB")
        
        # Check if admin exists
        existing_admin = await db.users.find_one({"username": "admin"})
        if existing_admin:
            print("ℹ Admin user already exists!")
            return True
        
        # Create admin user with default credentials
        admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
        admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        admin_passphrase = os.environ.get('ADMIN_PASSPHRASE', 'secure123')
        
        admin_doc = {
            "id": "admin-001",
            "username": admin_username,
            "hashed_password": pwd_hasher.hash(admin_password),
            "security_passphrase_hash": pwd_hasher.hash(admin_passphrase),
            "user_code": "ADMIN0001",
            "role": "admin",
            "created_at": "2025-01-01T00:00:00+00:00",
            "online": False
        }
        
        await db.users.insert_one(admin_doc)
        print(f"✓ Admin user created successfully!")
        print(f"  Username: {admin_username}")
        print(f"  Password: {admin_password} (⚠️  CHANGE IN PRODUCTION!)")
        print(f"  Passphrase: {admin_passphrase}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ Error creating admin: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(create_admin())
    sys.exit(0 if success else 1)
