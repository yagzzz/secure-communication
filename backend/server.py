from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import aiofiles
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()

# Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Connection manager for WebSocket
active_connections: Dict[str, WebSocket] = {}

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
    role: str = "user"
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
    message_type: str = "text"  # text, image, video, file, location, audio
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    encrypted: bool = True

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participants: List[str]
    participant_usernames: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_message_at: Optional[datetime] = None
    encryption_key: Optional[str] = None

class CallLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    participants: List[str]
    call_type: str  # audio, video
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    duration: Optional[int] = None

# ==================== HELPERS ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
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

def generate_encryption_key():
    return base64.b64encode(os.urandom(32)).decode('utf-8')

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    # Only admin can create users
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create users")
    
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        role=user_data.role
    )
    
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
    
    # Update last seen
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
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@api_router.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"online": False}}
    )
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

# ==================== CONVERSATION ROUTES ====================

@api_router.get("/conversations", response_model=List[Conversation])
async def get_conversations(current_user: User = Depends(get_current_user)):
    conversations = await db.conversations.find(
        {"participants": current_user.id},
        {"_id": 0}
    ).to_list(1000)
    
    for conv in conversations:
        if isinstance(conv.get('created_at'), str):
            conv['created_at'] = datetime.fromisoformat(conv['created_at'])
        if conv.get('last_message_at') and isinstance(conv['last_message_at'], str):
            conv['last_message_at'] = datetime.fromisoformat(conv['last_message_at'])
    
    return conversations

@api_router.post("/conversations", response_model=Conversation)
async def create_conversation(
    participant_ids: List[str],
    current_user: User = Depends(get_current_user)
):
    # Add current user to participants if not present
    if current_user.id not in participant_ids:
        participant_ids.append(current_user.id)
    
    # Get participant usernames
    users = await db.users.find({"id": {"$in": participant_ids}}, {"_id": 0, "username": 1}).to_list(100)
    participant_usernames = [u['username'] for u in users]
    
    # Check if conversation already exists
    existing_conv = await db.conversations.find_one(
        {"participants": {"$all": participant_ids, "$size": len(participant_ids)}},
        {"_id": 0}
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
        encryption_key=generate_encryption_key()
    )
    
    doc = conversation.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_message_at'):
        doc['last_message_at'] = doc['last_message_at'].isoformat()
    
    await db.conversations.insert_one(doc)
    return conversation

# ==================== MESSAGE ROUTES ====================

@api_router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    # Verify user is participant
    conversation = await db.conversations.find_one(
        {"id": conversation_id, "participants": current_user.id},
        {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
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
    # Verify conversation exists and user is participant
    conversation = await db.conversations.find_one(
        {"id": conversation_id, "participants": current_user.id},
        {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Handle file upload if present
    file_url = None
    if file:
        # Save file (simplified - in production use cloud storage)
        file_path = f"/app/backend/uploads/{uuid.uuid4()}_{file.filename}"
        os.makedirs("/app/backend/uploads", exist_ok=True)
        async with aiofiles.open(file_path, 'wb') as out_file:
            content_data = await file.read()
            await out_file.write(content_data)
        file_url = file_path
    
    metadata_dict = json.loads(metadata) if metadata else {}
    if file_url:
        metadata_dict['file_url'] = file_url
        metadata_dict['filename'] = file.filename
    
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        sender_username=current_user.username,
        content=content,
        message_type=message_type,
        metadata=metadata_dict
    )
    
    doc = message.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.messages.insert_one(doc)
    
    # Update conversation last_message_at
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"last_message_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Emit to socket
    await sio.emit('new_message', message.model_dump(mode='json'), room=conversation_id)
    
    return message

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/metadata")
async def get_admin_metadata(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get conversation metadata (without message content)
    conversations = await db.conversations.find({}, {"_id": 0}).to_list(1000)
    messages_count = await db.messages.count_documents({})
    users_count = await db.users.count_documents({})
    
    # Get message metadata per conversation
    conversation_metadata = []
    for conv in conversations:
        msg_count = await db.messages.count_documents({"conversation_id": conv['id']})
        last_msg = await db.messages.find_one(
            {"conversation_id": conv['id']},
            {"_id": 0, "timestamp": 1, "message_type": 1, "sender_username": 1}
        , sort=[("timestamp", -1)])
        
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
        "conversation_metadata": conversation_metadata
    }

# ==================== CALL ROUTES ====================

@api_router.post("/calls/start", response_model=CallLog)
async def start_call(
    conversation_id: str,
    call_type: str,
    current_user: User = Depends(get_current_user)
):
    conversation = await db.conversations.find_one(
        {"id": conversation_id, "participants": current_user.id},
        {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    call_log = CallLog(
        conversation_id=conversation_id,
        participants=conversation['participants'],
        call_type=call_type
    )
    
    doc = call_log.model_dump()
    doc['started_at'] = doc['started_at'].isoformat()
    if doc.get('ended_at'):
        doc['ended_at'] = doc['ended_at'].isoformat()
    
    await db.call_logs.insert_one(doc)
    
    # Emit to socket
    await sio.emit('call_start', {
        "call_id": call_log.id,
        "caller_id": current_user.id,
        "caller_username": current_user.username,
        "call_type": call_type
    }, room=conversation_id)
    
    return call_log

@api_router.post("/calls/{call_id}/end")
async def end_call(call_id: str, current_user: User = Depends(get_current_user)):
    call_log = await db.call_logs.find_one({"id": call_id}, {"_id": 0})
    if not call_log:
        raise HTTPException(status_code=404, detail="Call not found")
    
    ended_at = datetime.now(timezone.utc)
    started_at = datetime.fromisoformat(call_log['started_at'])
    duration = int((ended_at - started_at).total_seconds())
    
    await db.call_logs.update_one(
        {"id": call_id},
        {"$set": {"ended_at": ended_at.isoformat(), "duration": duration}}
    )
    
    return {"message": "Call ended", "duration": duration}

# ==================== SOCKET.IO EVENTS ====================

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    # Remove from active connections
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()