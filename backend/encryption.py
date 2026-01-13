"""
Encryption utilities for EncrypTalk
Provides end-to-end encryption for all sensitive data
"""

import os
import secrets
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import json
from typing import Any, Dict

# Master encryption key derived from SECRET_KEY
SECRET_KEY = os.environ.get("SECRET_KEY", secrets.token_urlsafe(64))
ENCRYPTION_SALT = b'secure_chat_encryption_2025'

kdf = PBKDF2HMAC(
    algorithm=hashes.SHA256(),
    length=32,
    salt=ENCRYPTION_SALT,
    iterations=480000,
)
ENCRYPTION_KEY = base64.urlsafe_b64encode(kdf.derive(SECRET_KEY.encode()))
cipher_suite = Fernet(ENCRYPTION_KEY)


def encrypt_string(text: str) -> str:
    """Encrypt a string and return base64-encoded ciphertext"""
    if not text:
        return ""
    ciphertext = cipher_suite.encrypt(text.encode())
    return base64.b64encode(ciphertext).decode()


def decrypt_string(encrypted_text: str) -> str:
    """Decrypt a base64-encoded ciphertext and return original string"""
    if not encrypted_text:
        return ""
    try:
        ciphertext = base64.b64decode(encrypted_text.encode())
        plaintext = cipher_suite.decrypt(ciphertext).decode()
        return plaintext
    except Exception as e:
        print(f"Decryption error: {e}")
        return ""


def encrypt_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Encrypt selected fields in a dictionary"""
    encrypted = data.copy()
    # Fields to encrypt
    sensitive_fields = [
        'bio', 'email', 'filename', 'title', 
        'description', 'content', 'message', 'primary_color', 
        'secondary_color', 'app_title', 'logo_url', 'banner_url',
        'uploaded_by_username', 'profile_picture'
    ]
    
    for field in sensitive_fields:
        if field in encrypted and encrypted[field]:
            if isinstance(encrypted[field], str):
                encrypted[field] = encrypt_string(encrypted[field])
            elif isinstance(encrypted[field], dict):
                encrypted[field] = encrypt_dict(encrypted[field])
            elif isinstance(encrypted[field], list):
                encrypted[field] = [
                    encrypt_string(item) if isinstance(item, str) else 
                    encrypt_dict(item) if isinstance(item, dict) else 
                    item
                    for item in encrypted[field]
                ]
    
    return encrypted


def decrypt_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Decrypt selected fields in a dictionary"""
    decrypted = data.copy()
    sensitive_fields = [
        'bio', 'email', 'filename', 'title',
        'description', 'content', 'message', 'primary_color',
        'secondary_color', 'app_title', 'logo_url', 'banner_url',
        'uploaded_by_username', 'profile_picture'
    ]
    
    for field in sensitive_fields:
        if field in decrypted and decrypted[field]:
            if isinstance(decrypted[field], str):
                decrypted[field] = decrypt_string(decrypted[field])
            elif isinstance(decrypted[field], dict):
                decrypted[field] = decrypt_dict(decrypted[field])
            elif isinstance(decrypted[field], list):
                decrypted[field] = [
                    decrypt_string(item) if isinstance(item, str) else 
                    decrypt_dict(item) if isinstance(item, dict) else 
                    item
                    for item in decrypted[field]
                ]
    
    return decrypted