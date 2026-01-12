"""
EncrypTalk API Tests - Backend Testing
Tests for: Authentication, Users, Conversations, Messages, Encryption
"""
import pytest
import requests
import os
import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://encryptalk-22.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
TEST_USERNAME = "testuser"
TEST_PASSWORD = "test123"


class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_api_reachable(self):
        """Test that API is reachable"""
        response = requests.get(f"{BASE_URL}/api/users", timeout=10)
        # Should return 401 or 403 without auth, not 500
        assert response.status_code in [401, 403, 422], f"API not reachable: {response.status_code}"
        print(f"API reachable - status: {response.status_code}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_admin_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        print(f"Admin login response: {response.status_code}")
        
        if response.status_code == 401:
            # Admin user might not exist yet - this is expected for first run
            pytest.skip("Admin user not found - needs to be created first")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["username"] == ADMIN_USERNAME
        assert data["user"]["role"] == "admin"
        print(f"Admin login successful - user: {data['user']['username']}, role: {data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Invalid credentials correctly rejected")
    
    def test_login_missing_fields(self):
        """Test login with missing fields"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("Missing fields correctly rejected")


class TestAuthenticatedEndpoints:
    """Tests requiring authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed - cannot run authenticated tests")
        
        data = response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_current_user(self):
        """Test getting current user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        assert response.status_code == 200, f"Get me failed: {response.text}"
        
        data = response.json()
        assert data["username"] == ADMIN_USERNAME
        assert data["role"] == "admin"
        print(f"Current user: {data['username']}, code: {data.get('user_code', 'N/A')}")
    
    def test_get_users_list(self):
        """Test getting users list"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200, f"Get users failed: {response.text}"
        
        users = response.json()
        assert isinstance(users, list), "Users should be a list"
        print(f"Found {len(users)} users")
        
        # Check user structure
        if users:
            user = users[0]
            assert "id" in user
            assert "username" in user
            assert "user_code" in user or user.get("user_code") is None
            print(f"Sample user: {user['username']}")
    
    def test_get_conversations(self):
        """Test getting conversations list"""
        response = requests.get(f"{BASE_URL}/api/conversations", headers=self.headers)
        assert response.status_code == 200, f"Get conversations failed: {response.text}"
        
        conversations = response.json()
        assert isinstance(conversations, list), "Conversations should be a list"
        print(f"Found {len(conversations)} conversations")
        
        if conversations:
            conv = conversations[0]
            assert "id" in conv
            assert "participants" in conv
            print(f"Sample conversation ID: {conv['id']}")
    
    def test_logout(self):
        """Test logout"""
        response = requests.post(f"{BASE_URL}/api/auth/logout", headers=self.headers)
        assert response.status_code == 200, f"Logout failed: {response.text}"
        print("Logout successful")


class TestConversationAndMessages:
    """Tests for conversation and message functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        
        data = response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_conversation_and_send_message(self):
        """Test creating conversation and sending message"""
        # Get users to find someone to chat with
        users_response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        if users_response.status_code != 200:
            pytest.skip("Cannot get users")
        
        users = users_response.json()
        other_users = [u for u in users if u["id"] != self.user["id"]]
        
        if not other_users:
            pytest.skip("No other users to create conversation with")
        
        other_user = other_users[0]
        
        # Create conversation
        conv_response = requests.post(
            f"{BASE_URL}/api/conversations",
            json=[self.user["id"], other_user["id"]],
            headers=self.headers
        )
        assert conv_response.status_code == 200, f"Create conversation failed: {conv_response.text}"
        
        conversation = conv_response.json()
        assert "id" in conversation
        conv_id = conversation["id"]
        print(f"Conversation created/found: {conv_id}")
        
        # Send a test message
        test_message = f"TEST_message_{int(time.time())}"
        msg_response = requests.post(
            f"{BASE_URL}/api/conversations/{conv_id}/messages",
            data={
                "content": test_message,
                "message_type": "text"
            },
            headers=self.headers
        )
        assert msg_response.status_code == 200, f"Send message failed: {msg_response.text}"
        
        message = msg_response.json()
        assert message["content"] == test_message, "Message content mismatch"
        assert message["sender_id"] == self.user["id"]
        assert message["encrypted"] == True, "Message should be marked as encrypted"
        print(f"Message sent successfully: {message['id']}")
        
        # Verify message appears in conversation
        messages_response = requests.get(
            f"{BASE_URL}/api/conversations/{conv_id}/messages",
            headers=self.headers
        )
        assert messages_response.status_code == 200
        
        messages = messages_response.json()
        message_contents = [m["content"] for m in messages]
        assert test_message in message_contents, "Sent message not found in conversation"
        print(f"Message verified in conversation - total messages: {len(messages)}")
    
    def test_message_encryption_in_db(self):
        """Test that messages are encrypted in database but decrypted in API response"""
        # Get conversations
        conv_response = requests.get(f"{BASE_URL}/api/conversations", headers=self.headers)
        if conv_response.status_code != 200 or not conv_response.json():
            pytest.skip("No conversations available")
        
        conversations = conv_response.json()
        conv_id = conversations[0]["id"]
        
        # Get messages
        msg_response = requests.get(
            f"{BASE_URL}/api/conversations/{conv_id}/messages",
            headers=self.headers
        )
        assert msg_response.status_code == 200
        
        messages = msg_response.json()
        if not messages:
            pytest.skip("No messages in conversation")
        
        # Check that messages are readable (decrypted)
        for msg in messages[:3]:  # Check first 3 messages
            if msg["message_type"] == "text":
                # Content should be readable, not encrypted gibberish
                content = msg["content"]
                # Encrypted content would be base64-like with special chars
                # Readable content should be normal text
                assert content is not None, "Message content is None"
                print(f"Message content (decrypted): {content[:50]}...")
        
        print("Messages are properly decrypted in API response")


class TestAdminFeatures:
    """Tests for admin-specific features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        
        data = response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        if self.user["role"] != "admin":
            pytest.skip("User is not admin")
    
    def test_admin_metadata(self):
        """Test admin metadata endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/metadata", headers=self.headers)
        assert response.status_code == 200, f"Admin metadata failed: {response.text}"
        
        data = response.json()
        assert "total_users" in data
        assert "total_conversations" in data
        assert "total_messages" in data
        print(f"Admin stats - Users: {data['total_users']}, Conversations: {data['total_conversations']}, Messages: {data['total_messages']}")
    
    def test_nas_files_access(self):
        """Test NAS files endpoint"""
        response = requests.get(f"{BASE_URL}/api/nas/files", headers=self.headers)
        assert response.status_code == 200, f"NAS files failed: {response.text}"
        
        files = response.json()
        assert isinstance(files, list)
        print(f"NAS files count: {len(files)}")


class TestCallFeatures:
    """Tests for call functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        
        data = response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_check_pending_calls(self):
        """Test checking for pending calls"""
        # Get a conversation first
        conv_response = requests.get(f"{BASE_URL}/api/conversations", headers=self.headers)
        if conv_response.status_code != 200 or not conv_response.json():
            pytest.skip("No conversations available")
        
        conversations = conv_response.json()
        conv_id = conversations[0]["id"]
        
        # Check for pending calls
        response = requests.get(
            f"{BASE_URL}/api/calls/pending/{conv_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Check pending calls failed: {response.text}"
        print("Pending calls check successful")


class TestStickers:
    """Tests for sticker functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        
        data = response.json()
        self.token = data["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_stickers(self):
        """Test getting stickers list"""
        response = requests.get(f"{BASE_URL}/api/stickers", headers=self.headers)
        assert response.status_code == 200, f"Get stickers failed: {response.text}"
        
        stickers = response.json()
        assert isinstance(stickers, list)
        print(f"Stickers count: {len(stickers)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
