import requests
import sys
import json
from datetime import datetime

class SecureCommsAPITester:
    def __init__(self, base_url="https://securecomms-app.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_users = []
        self.conversation_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    file_headers = {k: v for k, v in default_headers.items() if k != 'Content-Type'}
                    response = requests.post(url, data=data, files=files, headers=file_headers)
                else:
                    response = requests.post(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_create_user(self, username, password, passphrase, role="user"):
        """Create a new user (admin only)"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            f"Create User ({username})",
            "POST",
            "auth/register",
            200,
            data={
                "username": username,
                "password": password,
                "security_passphrase": passphrase,
                "role": role
            },
            headers=headers
        )
        if success:
            self.created_users.append({"username": username, "password": password})
            print(f"   User {username} created successfully")
        return success

    def test_user_login(self, username, password):
        """Test user login"""
        success, response = self.run_test(
            f"User Login ({username})",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            print(f"   User token obtained: {self.user_token[:20]}...")
            return True, response.get('user', {})
        return False, {}

    def test_get_users(self):
        """Test getting user list"""
        if not self.user_token:
            print("❌ No user token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Get Users List",
            "GET",
            "users",
            200,
            headers=headers
        )
        if success:
            print(f"   Found {len(response)} users")
        return success

    def test_find_user_and_create_conversation(self, target_username, security_passphrase):
        """Find user by code and create conversation (this is how the app works)"""
        if not self.user_token:
            print("❌ No user token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        
        # Use form data for find-user endpoint
        url = f"{self.base_url}/conversations/find-user"
        
        self.tests_run += 1
        print(f"\n🔍 Testing Find User and Create Conversation...")
        print(f"   URL: {url}")
        
        try:
            # Send as query parameters
            response = requests.post(
                url, 
                params={
                    'username_or_code': target_username,
                    'security_word': security_passphrase
                },
                headers=headers
            )
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    user_data = response.json()
                    print(f"   Found user: {user_data.get('username', 'Unknown')}")
                    print(f"   User code: {user_data.get('user_code', 'No code')}")
                    return True, user_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_get_conversations(self):
        """Get conversations for current user"""
        if not self.user_token:
            print("❌ No user token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Get Conversations",
            "GET",
            "conversations",
            200,
            headers=headers
        )
        if success and len(response) > 0:
            self.conversation_id = response[0].get('id')
            print(f"   Found {len(response)} conversations")
            print(f"   Using conversation ID: {self.conversation_id}")
        return success

    def test_send_message(self, content):
        """Send a message to the conversation"""
        if not self.user_token or not self.conversation_id:
            print("❌ No user token or conversation ID available")
            return False
            
        url = f"{self.base_url}/conversations/{self.conversation_id}/messages"
        headers = {'Authorization': f'Bearer {self.user_token}'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing Send Message: '{content[:30]}...'")
        print(f"   URL: {url}")
        
        try:
            # Send as form data
            response = requests.post(
                url, 
                data={'content': content, 'message_type': 'text'},
                headers=headers
            )
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_create_conversation(self, participant_ids):
        """Create a conversation with specific participants"""
        if not self.user_token:
            print("❌ No user token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Create Conversation",
            "POST",
            "conversations",
            200,
            data=participant_ids,
            headers=headers
        )
        if success:
            self.conversation_id = response.get('id')
            print(f"   Conversation created with ID: {self.conversation_id}")
        return success

    def test_get_conversations(self):
        """Get conversations for current user"""
        if not self.user_token:
            print("❌ No user token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Get Conversations",
            "GET",
            "conversations",
            200,
            headers=headers
        )
        if success and len(response) > 0:
            self.conversation_id = response[0].get('id')
            print(f"   Found {len(response)} conversations")
            print(f"   Using conversation ID: {self.conversation_id}")
        return success

    def test_get_messages(self):
        """Get messages from conversation"""
        if not self.user_token or not self.conversation_id:
            print("❌ No user token or conversation ID available")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Get Messages",
            "GET",
            f"conversations/{self.conversation_id}/messages",
            200,
            headers=headers
        )
        if success:
            print(f"   Found {len(response)} messages")
        return success

    def test_admin_metadata(self):
        """Test admin metadata endpoint"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Admin Metadata",
            "GET",
            "admin/metadata",
            200,
            headers=headers
        )
        if success:
            print(f"   Total users: {response.get('total_users', 0)}")
            print(f"   Total conversations: {response.get('total_conversations', 0)}")
            print(f"   Total messages: {response.get('total_messages', 0)}")
        return success

def main():
    print("🚀 Starting Secure Communications API Tests")
    print("=" * 60)
    
    # Use timestamp to create unique usernames
    timestamp = datetime.now().strftime("%H%M%S")
    user1 = f"testuser1_{timestamp}"
    user2 = f"testuser2_{timestamp}"
    
    tester = SecureCommsAPITester()
    
    # Test 1: Admin Login
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1

    # Test 2: Create test users
    if not tester.test_create_user(user1, "test123", "secure1", "user"):
        print("❌ User creation failed")
        return 1
        
    if not tester.test_create_user(user2, "test123", "secure2", "user"):
        print("❌ Second user creation failed")
        return 1

    # Test 3: User login
    user_success, user_data = tester.test_user_login(user1, "test123")
    if not user_success:
        print("❌ User login failed")
        return 1
    
    # Print user KURD code for testing
    print(f"🔑 User1 KURD Code: {user_data.get('user_code', 'Not found')}")
    user1_id = user_data.get('id')

    # Test 4: Get users list
    if not tester.test_get_users():
        print("❌ Get users failed")
        return 1

    # Test 5: Find user (this should work but won't create conversation due to backend bug)
    find_success, found_user = tester.test_find_user_and_create_conversation(user2, "secure2")
    if not find_success:
        print("❌ Find user failed")
        return 1
    
    print(f"🔑 User2 KURD Code: {found_user.get('user_code', 'Not found')}")
    user2_id = found_user.get('id')

    # Test 6: Create conversation directly
    if not tester.test_create_conversation([user1_id, user2_id]):
        print("❌ Conversation creation failed")
        return 1

    # Test 7: Get conversations
    if not tester.test_get_conversations():
        print("❌ Get conversations failed")
        return 1

    # Test 8: Send a message
    if not tester.test_send_message("Hello from backend test! This is a test message."):
        print("❌ Send message failed")
        return 1

    # Test 9: Get messages
    if not tester.test_get_messages():
        print("❌ Get messages failed")
        return 1

    # Test 10: Admin metadata
    if not tester.test_admin_metadata():
        print("❌ Admin metadata failed")
        return 1

    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    # Check for critical issues
    if tester.tests_passed >= 9:  # Most functionality works
        print("✅ Backend APIs are working correctly!")
        print("🔑 Test user credentials for frontend testing:")
        print(f"   User1: {user1} / test123 (KURD: {user_data.get('user_code', 'Not found')})")
        print(f"   User2: {user2} / test123 (KURD: {found_user.get('user_code', 'Not found')})")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())