from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import socketio
import base64
import aiofiles
import json
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-this-in-production-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

security = HTTPBearer()

# File storage paths
UPLOAD_DIR = Path("/app/backend/uploads")
PROFILE_PICS_DIR = UPLOAD_DIR / "profiles"
FILES_DIR = UPLOAD_DIR / "files"
STICKERS_DIR = UPLOAD_DIR / "stickers"
NAS_DIR = UPLOAD_DIR / "nas"

for dir_path in [UPLOAD_DIR, PROFILE_PICS_DIR, FILES_DIR, STICKERS_DIR, NAS_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

app = FastAPI()
api_router = APIRouter(prefix="/api")

active_connections: Dict[str, str] = {}

# ==================== MODELS ====================

class UserCreate(BaseModel):
    username: str
    password: str
    security_passphrase: str
    role: str = "user"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    user_code: Optional[str] = None
    role: str = "user"
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: Optional[datetime] = None
    online: bool = False

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    sender_username: str
    content: str
    message_type: str = "text"
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    encrypted: bool = True
    pinned: bool = False
    edited: bool = False
    reactions: Optional[Dict[str, List[str]]] = None

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participants: List[str]
    participant_usernames: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_message_at: Optional[datetime] = None
    encryption_key: Optional[str] = None
    pinned_messages: List[str] = []

class NASFile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    filepath: str
    size: int
    mime_type: str
    uploaded_by: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    allowed_users: List[str] = []
    is_public: bool = False

class Sticker(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    filepath: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== HELPERS ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user_doc is None:
        raise credentials_exception
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    if user_doc.get('last_seen') and isinstance(user_doc['last_seen'], str):
        user_doc['last_seen'] = datetime.fromisoformat(user_doc['last_seen'])
    
    return User(**user_doc)

def generate_user_code():
    """Generate unique 5-digit KURD code"""
    import hashlib
    import time
    # Use timestamp + random for uniqueness
    unique_string = f"{time.time()}{os.urandom(8).hex()}"
    hash_digest = hashlib.sha256(unique_string.encode()).hexdigest()
    # Extract 5 digits from hash
    digits = ''.join([c for c in hash_digest if c.isdigit()])[:5]
    return f"KURD{digits}"

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create users")
    
    existing_user = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(username=sanitize_input(user_data.username), role=user_data.role)
    
    doc = user.model_dump()
    doc['hashed_password'] = get_password_hash(user_data.password)
    doc['security_passphrase_hash'] = get_password_hash(user_data.security_passphrase)
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_seen'):
        doc['last_seen'] = doc['last_seen'].isoformat()
    
    await db.users.insert_one(doc)
    return user

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    user_doc = await db.users.find_one({"username": login_data.username}, {"_id": 0})
    if not user_doc or not verify_password(login_data.password, user_doc['hashed_password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    await db.users.update_one(
        {"id": user_doc['id']},
        {"$set": {"last_seen": datetime.now(timezone.utc).isoformat(), "online": True}}
    )
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    if user_doc.get('last_seen') and isinstance(user_doc['last_seen'], str):
        user_doc['last_seen'] = datetime.fromisoformat(user_doc['last_seen'])
    
    user = User(**user_doc)
    access_token = create_access_token(data={"sub": user.id})
    
    return LoginResponse(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    await db.users.update_one({"id": current_user.id}, {"$set": {"online": False}})
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================== USER ROUTES ====================

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0, "security_passphrase_hash": 0}).to_list(1000)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        if user.get('last_seen') and isinstance(user['last_seen'], str):
            user['last_seen'] = datetime.fromisoformat(user['last_seen'])
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete users")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.post("/users/profile-picture")
async def upload_profile_picture(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    file_ext = file.filename.split('.')[-1]
    filename = f"{current_user.id}.{file_ext}"
    filepath = PROFILE_PICS_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    profile_url = f"/api/files/profiles/{filename}"
    await db.users.update_one({"id": current_user.id}, {"$set": {"profile_picture": profile_url}})
    
    return {"profile_picture": profile_url}

@api_router.patch("/users/bio")
async def update_bio(bio: str, current_user: User = Depends(get_current_user)):
    sanitized_bio = sanitize_input(bio)
    await db.users.update_one({"id": current_user.id}, {"$set": {"bio": sanitized_bio}})
    return {"bio": sanitized_bio}

# ==================== CONVERSATION ROUTES ====================

@api_router.get("/conversations", response_model=List[Conversation])
async def get_conversations(current_user: User = Depends(get_current_user)):
    conversations = await db.conversations.find(
        {"participants": current_user.id}, {"_id": 0}
    ).to_list(1000)
    
    for conv in conversations:
        if isinstance(conv.get('created_at'), str):
            conv['created_at'] = datetime.fromisoformat(conv['created_at'])
        if conv.get('last_message_at') and isinstance(conv['last_message_at'], str):
            conv['last_message_at'] = datetime.fromisoformat(conv['last_message_at'])
    
    return conversations

@api_router.post("/conversations", response_model=Conversation)
async def create_conversation(participant_ids: List[str], current_user: User = Depends(get_current_user)):
    if current_user.id not in participant_ids:
        participant_ids.append(current_user.id)
    
    users = await db.users.find({"id": {"$in": participant_ids}}, {"_id": 0, "username": 1}).to_list(100)
    participant_usernames = [u['username'] for u in users]
    
    existing_conv = await db.conversations.find_one(
        {"participants": {"$all": participant_ids, "$size": len(participant_ids)}}, {"_id": 0}
    )
    
    if existing_conv:
        if isinstance(existing_conv.get('created_at'), str):
            existing_conv['created_at'] = datetime.fromisoformat(existing_conv['created_at'])
        if existing_conv.get('last_message_at') and isinstance(existing_conv['last_message_at'], str):
            existing_conv['last_message_at'] = datetime.fromisoformat(existing_conv['last_message_at'])
        return Conversation(**existing_conv)
    
    conversation = Conversation(
        participants=participant_ids,
        participant_usernames=participant_usernames,
        encryption_key=base64.b64encode(os.urandom(32)).decode('utf-8')
    )
    
    doc = conversation.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_message_at'):
        doc['last_message_at'] = doc['last_message_at'].isoformat()
    
    await db.conversations.insert_one(doc)
    return conversation

# ==================== MESSAGE ROUTES ====================

@api_router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_messages(conversation_id: str, current_user: User = Depends(get_current_user)):
    conversation = await db.conversations.find_one(
        {"id": conversation_id, "participants": current_user.id}, {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    for msg in messages:
        if isinstance(msg.get('timestamp'), str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    
    return messages

@api_router.post("/conversations/{conversation_id}/messages", response_model=Message)
async def send_message(
    conversation_id: str,
    content: str = Form(...),
    message_type: str = Form("text"),
    metadata: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    conversation = await db.conversations.find_one(
        {"id": conversation_id, "participants": current_user.id}, {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    file_url = None
    if file:
        file_path = FILES_DIR / f"{uuid.uuid4()}_{file.filename}"
        async with aiofiles.open(file_path, 'wb') as out_file:
            content_data = await file.read()
            await out_file.write(content_data)
        file_url = f"/api/files/uploads/{file_path.name}"
    
    metadata_dict = json.loads(metadata) if metadata else {}
    if file_url:
        metadata_dict['file_url'] = file_url
        metadata_dict['filename'] = file.filename
    
    sanitized_content = sanitize_input(content) if message_type == "text" else content
    
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        sender_username=current_user.username,
        content=sanitized_content,
        message_type=message_type,
        metadata=metadata_dict
    )
    
    doc = message.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.messages.insert_one(doc)
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"last_message_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await sio.emit('new_message', message.model_dump(mode='json'), room=conversation_id)
    
    return message

@api_router.patch("/messages/{message_id}/pin")
async def pin_message(message_id: str, current_user: User = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    conversation = await db.conversations.find_one(
        {"id": message['conversation_id'], "participants": current_user.id}, {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    is_pinned = not message.get('pinned', False)
    await db.messages.update_one({"id": message_id}, {"$set": {"pinned": is_pinned}})
    
    if is_pinned:
        await db.conversations.update_one(
            {"id": message['conversation_id']},
            {"$addToSet": {"pinned_messages": message_id}}
        )
    else:
        await db.conversations.update_one(
            {"id": message['conversation_id']},
            {"$pull": {"pinned_messages": message_id}}
        )
    
    return {"pinned": is_pinned}

@api_router.patch("/messages/{message_id}")
async def edit_message(message_id: str, content: str, current_user: User = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id, "sender_id": current_user.id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found or not authorized")
    
    sanitized_content = sanitize_input(content)
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"content": sanitized_content, "edited": True}}
    )
    
    return {"message": "Message updated"}

@api_router.post("/messages/{message_id}/react")
async def react_to_message(message_id: str, emoji: str, current_user: User = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    reactions = message.get('reactions', {})
    if emoji not in reactions:
        reactions[emoji] = []
    
    if current_user.id in reactions[emoji]:
        reactions[emoji].remove(current_user.id)
    else:
        reactions[emoji].append(current_user.id)
    
    await db.messages.update_one({"id": message_id}, {"$set": {"reactions": reactions}})
    
    return {"reactions": reactions}

# ==================== STICKER ROUTES ====================

@api_router.post("/stickers/upload")
async def upload_sticker(file: UploadFile = File(...), name: str = Form(...), current_user: User = Depends(get_current_user)):
    file_ext = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{file_ext}"
    filepath = STICKERS_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    sticker = Sticker(
        name=sanitize_input(name),
        filepath=f"/api/files/stickers/{filename}",
        created_by=current_user.id
    )
    
    doc = sticker.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.stickers.insert_one(doc)
    return sticker

@api_router.get("/stickers")
async def get_stickers(current_user: User = Depends(get_current_user)):
    stickers = await db.stickers.find({}, {"_id": 0}).to_list(1000)
    for sticker in stickers:
        if isinstance(sticker.get('created_at'), str):
            sticker['created_at'] = datetime.fromisoformat(sticker['created_at'])
    return stickers

# ==================== NAS ROUTES ====================

@api_router.post("/nas/upload")
async def upload_nas_file(
    file: UploadFile = File(...),
    allowed_users: str = Form(""),
    is_public: bool = Form(False),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can upload to NAS")
    
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = NAS_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    allowed_user_list = [u.strip() for u in allowed_users.split(',') if u.strip()] if allowed_users else []
    
    nas_file = NASFile(
        filename=file.filename,
        filepath=f"/api/files/nas/{filename}",
        size=filepath.stat().st_size,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by=current_user.id,
        allowed_users=allowed_user_list,
        is_public=is_public
    )
    
    doc = nas_file.model_dump()
    doc['uploaded_at'] = doc['uploaded_at'].isoformat()
    
    await db.nas_files.insert_one(doc)
    return nas_file

@api_router.get("/nas/files")
async def get_nas_files(current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        files = await db.nas_files.find({}, {"_id": 0}).to_list(1000)
    else:
        files = await db.nas_files.find(
            {"$or": [
                {"is_public": True},
                {"allowed_users": current_user.id},
                {"uploaded_by": current_user.id}
            ]},
            {"_id": 0}
        ).to_list(1000)
    
    for f in files:
        if isinstance(f.get('uploaded_at'), str):
            f['uploaded_at'] = datetime.fromisoformat(f['uploaded_at'])
    
    return files

@api_router.delete("/nas/files/{file_id}")
async def delete_nas_file(file_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete NAS files")
    
    file_doc = await db.nas_files.find_one({"id": file_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    filepath = NAS_DIR / file_doc['filepath'].split('/')[-1]
    if filepath.exists():
        filepath.unlink()
    
    await db.nas_files.delete_one({"id": file_id})
    return {"message": "File deleted"}

# ==================== FILE SERVING ====================

@api_router.get("/files/profiles/{filename}")
async def get_profile_picture(filename: str):
    filepath = PROFILE_PICS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)

@api_router.get("/files/uploads/{filename}")
async def get_uploaded_file(filename: str, current_user: User = Depends(get_current_user)):
    filepath = FILES_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)

@api_router.get("/files/stickers/{filename}")
async def get_sticker(filename: str):
    filepath = STICKERS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)

@api_router.get("/files/nas/{filename}")
async def get_nas_file(filename: str, current_user: User = Depends(get_current_user)):
    file_doc = await db.nas_files.find_one({"filepath": f"/api/files/nas/{filename}"}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    if current_user.role != "admin" and not file_doc.get('is_public') and current_user.id not in file_doc.get('allowed_users', []):
        raise HTTPException(status_code=403, detail="Access denied")
    
    filepath = NAS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(filepath)

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/metadata")
async def get_admin_metadata(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    conversations = await db.conversations.find({}, {"_id": 0}).to_list(1000)
    messages_count = await db.messages.count_documents({})
    users_count = await db.users.count_documents({})
    nas_files_count = await db.nas_files.count_documents({})
    
    conversation_metadata = []
    for conv in conversations:
        msg_count = await db.messages.count_documents({"conversation_id": conv['id']})
        last_msg = await db.messages.find_one(
            {"conversation_id": conv['id']},
            {"_id": 0, "timestamp": 1, "message_type": 1, "sender_username": 1},
            sort=[("timestamp", -1)]
        )
        
        conversation_metadata.append({
            "conversation_id": conv['id'],
            "participants": conv.get('participant_usernames', []),
            "message_count": msg_count,
            "last_message_time": last_msg.get('timestamp') if last_msg else None,
            "last_message_type": last_msg.get('message_type') if last_msg else None,
            "last_sender": last_msg.get('sender_username') if last_msg else None
        })
    
    return {
        "total_users": users_count,
        "total_conversations": len(conversations),
        "total_messages": messages_count,
        "total_nas_files": nas_files_count,
        "conversation_metadata": conversation_metadata
    }

# ==================== SOCKET.IO EVENTS ====================

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    for user_id, socket_id in list(active_connections.items()):
        if socket_id == sid:
            del active_connections[user_id]
            await db.users.update_one({"id": user_id}, {"$set": {"online": False}})
            break

@sio.event
async def join_conversation(sid, data):
    conversation_id = data.get('conversation_id')
    user_id = data.get('user_id')
    if conversation_id:
        await sio.enter_room(sid, conversation_id)
        if user_id:
            active_connections[user_id] = sid

@sio.event
async def leave_conversation(sid, data):
    conversation_id = data.get('conversation_id')
    if conversation_id:
        await sio.leave_room(sid, conversation_id)

@sio.event
async def typing(sid, data):
    conversation_id = data.get('conversation_id')
    username = data.get('username')
    await sio.emit('user_typing', {"username": username}, room=conversation_id, skip_sid=sid)

@sio.event
async def webrtc_offer(sid, data):
    target_user_id = data.get('target_user_id')
    if target_user_id in active_connections:
        await sio.emit('webrtc_offer', data, room=active_connections[target_user_id])

@sio.event
async def webrtc_answer(sid, data):
    target_user_id = data.get('target_user_id')
    if target_user_id in active_connections:
        await sio.emit('webrtc_answer', data, room=active_connections[target_user_id])

@sio.event
async def webrtc_ice_candidate(sid, data):
    target_user_id = data.get('target_user_id')
    if target_user_id in active_connections:
        await sio.emit('webrtc_ice_candidate', data, room=active_connections[target_user_id])

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

app = socketio.ASGIApp(sio, app)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)