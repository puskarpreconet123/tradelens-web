#!/usr/bin/env python3
"""
EduFlash PHP Backend API Test Suite
Tests the new PHP 8.2 + PDO + MariaDB backend with package request/approval workflow
"""

import requests
import json
import time
from datetime import datetime

# Read backend URL from frontend/.env
def get_backend_url():
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                url = line.split('=', 1)[1].strip()
                return f"{url}/api"
    raise Exception("REACT_APP_BACKEND_URL not found in /app/frontend/.env")

BASE_URL = get_backend_url()
print(f"Testing PHP backend at: {BASE_URL}\n")

# Test state
test_results = {
    'passed': 0,
    'failed': 0,
    'tests': []
}

# Test data
timestamp = int(time.time())
test_user = {
    'email': f'test_{timestamp}@eduflash.test',
    'password': 'Pass1234!',
    'name': 'Test User'
}
test_user2 = {
    'email': f'test2_{timestamp}@eduflash.test',
    'password': 'Pass1234!',
    'name': 'Test User 2'
}
admin_creds = {
    'email': 'admin@gmail.com',
    'password': 'admin123'
}

USER_TOKEN = None
USER2_TOKEN = None
ADMIN_TOKEN = None
REQUEST_ID = None
USER2_REQUEST_ID = None

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅" if passed else "❌"
    print(f"{status} {name}")
    if details:
        print(f"   {details}")
    test_results['tests'].append({
        'name': name,
        'passed': passed,
        'details': details
    })
    if passed:
        test_results['passed'] += 1
    else:
        test_results['failed'] += 1

print("="*80)
print("EDUFLASH PHP BACKEND TEST SUITE")
print("="*80)
print()

# ============================================================================
# TEST 1: Health Check
# ============================================================================
print("TEST 1: Health Check")
print("-" * 80)
try:
    response = requests.get(f"{BASE_URL}/")
    if response.status_code == 200:
        data = response.json()
        if data.get('service') == 'EduFlash PHP API' and data.get('status') == 'ok':
            log_test("1. Health check", True, f"Service: {data.get('service')}, Status: {data.get('status')}")
        else:
            log_test("1. Health check", False, f"Unexpected response: {data}")
    else:
        log_test("1. Health check", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("1. Health check", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 2: Plans (public, no auth)
# ============================================================================
print("TEST 2: Plans Listing")
print("-" * 80)
try:
    response = requests.get(f"{BASE_URL}/plans")
    if response.status_code == 200:
        plans = response.json()
        if isinstance(plans, list) and len(plans) == 3:
            # Check for required fields
            valid = True
            for plan in plans:
                if not all(k in plan for k in ['id', 'name', 'tag', 'popular', 'options', 'features']):
                    valid = False
                    break
                if not isinstance(plan['options'], list) or len(plan['options']) != 3:
                    valid = False
                    break
                for opt in plan['options']:
                    if not all(k in opt for k in ['period', 'price_usd', 'detail', 'days', 'backtests_limit']):
                        valid = False
                        break
            
            plan_names = [p['name'] for p in plans]
            if valid and set(plan_names) == {'Starter', 'Pro', 'Enterprise'}:
                log_test("2. Plans listing", True, f"3 plans with correct structure: {plan_names}")
            else:
                log_test("2. Plans listing", False, f"Invalid structure or names: {plan_names}")
        else:
            log_test("2. Plans listing", False, f"Expected 3 plans, got {len(plans) if isinstance(plans, list) else type(plans)}")
    else:
        log_test("2. Plans listing", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("2. Plans listing", False, f"Exception: {str(e)}")

# Test demo plan
try:
    response = requests.get(f"{BASE_URL}/plans/demo")
    if response.status_code == 200:
        demo = response.json()
        required = ['name', 'price_usd', 'duration', 'limit', 'perks']
        if all(k in demo for k in required) and isinstance(demo['perks'], list):
            log_test("2. Demo plan", True, f"Demo plan: {demo['name']}, ${demo['price_usd']}")
        else:
            log_test("2. Demo plan", False, f"Missing fields: {demo}")
    else:
        log_test("2. Demo plan", False, f"Status {response.status_code}")
except Exception as e:
    log_test("2. Demo plan", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 3: User Registration
# ============================================================================
print("TEST 3: User Registration")
print("-" * 80)

# Valid registration
try:
    response = requests.post(f"{BASE_URL}/auth/register", json=test_user)
    if response.status_code == 200:
        data = response.json()
        if 'token' in data and 'user' in data and data['user'].get('role') == 'user':
            USER_TOKEN = data['token']
            log_test("3a. Register valid user", True, f"User: {data['user'].get('email')}, role: {data['user'].get('role')}")
        else:
            log_test("3a. Register valid user", False, f"Invalid response: {data}")
    else:
        log_test("3a. Register valid user", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("3a. Register valid user", False, f"Exception: {str(e)}")

# Duplicate email
try:
    response = requests.post(f"{BASE_URL}/auth/register", json=test_user)
    if response.status_code == 400:
        data = response.json()
        if 'detail' in data and 'already registered' in data['detail'].lower():
            log_test("3b. Register duplicate email", True, f"Correctly rejected: {data['detail']}")
        else:
            log_test("3b. Register duplicate email", True, "Got 400 for duplicate")
    else:
        log_test("3b. Register duplicate email", False, f"Expected 400, got {response.status_code}")
except Exception as e:
    log_test("3b. Register duplicate email", False, f"Exception: {str(e)}")

# Short password
try:
    response = requests.post(f"{BASE_URL}/auth/register", json={
        'email': f'short_{timestamp}@test.com',
        'password': 'abc',
        'name': 'Test'
    })
    if response.status_code == 422:
        log_test("3c. Register short password", True, "Correctly rejected short password")
    else:
        log_test("3c. Register short password", False, f"Expected 422, got {response.status_code}")
except Exception as e:
    log_test("3c. Register short password", False, f"Exception: {str(e)}")

# Missing fields
try:
    response = requests.post(f"{BASE_URL}/auth/register", json={'email': f'missing_{timestamp}@test.com'})
    if response.status_code == 422:
        log_test("3d. Register missing fields", True, "Correctly rejected missing fields")
    else:
        log_test("3d. Register missing fields", False, f"Expected 422, got {response.status_code}")
except Exception as e:
    log_test("3d. Register missing fields", False, f"Exception: {str(e)}")

# Invalid email format
try:
    response = requests.post(f"{BASE_URL}/auth/register", json={
        'email': 'notanemail',
        'password': 'Pass1234!',
        'name': 'Test'
    })
    if response.status_code == 422:
        log_test("3e. Register invalid email", True, "Correctly rejected invalid email")
    else:
        log_test("3e. Register invalid email", False, f"Expected 422, got {response.status_code}")
except Exception as e:
    log_test("3e. Register invalid email", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 4: User Login
# ============================================================================
print("TEST 4: User Login")
print("-" * 80)

# Valid login
try:
    response = requests.post(f"{BASE_URL}/auth/login", json={
        'email': test_user['email'],
        'password': test_user['password']
    })
    if response.status_code == 200:
        data = response.json()
        if 'token' in data and 'user' in data:
            USER_TOKEN = data['token']
            log_test("4a. Login valid credentials", True, f"Token received")
        else:
            log_test("4a. Login valid credentials", False, f"Invalid response: {data}")
    else:
        log_test("4a. Login valid credentials", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("4a. Login valid credentials", False, f"Exception: {str(e)}")

# Wrong password
try:
    response = requests.post(f"{BASE_URL}/auth/login", json={
        'email': test_user['email'],
        'password': 'WrongPassword!'
    })
    if response.status_code == 401:
        data = response.json()
        if 'detail' in data and 'Invalid email or password' in data['detail']:
            log_test("4b. Login wrong password", True, f"Correctly rejected: {data['detail']}")
        else:
            log_test("4b. Login wrong password", True, "Got 401")
    else:
        log_test("4b. Login wrong password", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    log_test("4b. Login wrong password", False, f"Exception: {str(e)}")

# Non-existent email
try:
    response = requests.post(f"{BASE_URL}/auth/login", json={
        'email': f'nonexistent_{timestamp}@test.com',
        'password': 'Pass1234!'
    })
    if response.status_code == 401:
        log_test("4c. Login non-existent email", True, "Correctly rejected")
    else:
        log_test("4c. Login non-existent email", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    log_test("4c. Login non-existent email", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 5: GET /api/auth/me
# ============================================================================
print("TEST 5: Get Current User")
print("-" * 80)

# With valid token
if USER_TOKEN:
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers={'Authorization': f'Bearer {USER_TOKEN}'})
        if response.status_code == 200:
            user = response.json()
            if user.get('email') == test_user['email']:
                log_test("5a. Get user with valid token", True, f"User: {user.get('email')}")
            else:
                log_test("5a. Get user with valid token", False, f"User mismatch: {user}")
        else:
            log_test("5a. Get user with valid token", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("5a. Get user with valid token", False, f"Exception: {str(e)}")
else:
    log_test("5a. Get user with valid token", False, "No USER_TOKEN available")

# No auth
try:
    response = requests.get(f"{BASE_URL}/auth/me")
    if response.status_code == 401:
        log_test("5b. Get user no auth", True, "Correctly rejected")
    else:
        log_test("5b. Get user no auth", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    log_test("5b. Get user no auth", False, f"Exception: {str(e)}")

# Garbage token
try:
    response = requests.get(f"{BASE_URL}/auth/me", headers={'Authorization': 'Bearer garbage_token_xyz'})
    if response.status_code == 401:
        log_test("5c. Get user garbage token", True, "Correctly rejected")
    else:
        log_test("5c. Get user garbage token", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    log_test("5c. Get user garbage token", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 6: Admin Login
# ============================================================================
print("TEST 6: Admin Login")
print("-" * 80)

# Valid admin login
try:
    response = requests.post(f"{BASE_URL}/admin/login", json=admin_creds)
    if response.status_code == 200:
        data = response.json()
        if 'token' in data and 'user' in data and data['user'].get('role') == 'admin':
            ADMIN_TOKEN = data['token']
            log_test("6a. Admin login valid", True, f"Admin: {data['user'].get('email')}")
        else:
            log_test("6a. Admin login valid", False, f"Invalid response: {data}")
    else:
        log_test("6a. Admin login valid", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("6a. Admin login valid", False, f"Exception: {str(e)}")

# Wrong password
try:
    response = requests.post(f"{BASE_URL}/admin/login", json={
        'email': admin_creds['email'],
        'password': 'wrongpassword'
    })
    if response.status_code == 401:
        log_test("6b. Admin login wrong password", True, "Correctly rejected")
    else:
        log_test("6b. Admin login wrong password", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    log_test("6b. Admin login wrong password", False, f"Exception: {str(e)}")

# Regular user trying admin login
try:
    response = requests.post(f"{BASE_URL}/admin/login", json={
        'email': test_user['email'],
        'password': test_user['password']
    })
    if response.status_code == 403:
        data = response.json()
        if 'detail' in data and 'not an admin' in data['detail'].lower():
            log_test("6c. Regular user admin login", True, f"Correctly rejected: {data['detail']}")
        else:
            log_test("6c. Regular user admin login", True, "Got 403")
    else:
        log_test("6c. Regular user admin login", False, f"Expected 403, got {response.status_code}")
except Exception as e:
    log_test("6c. Regular user admin login", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 7: Admin Endpoints Reject Non-Admins
# ============================================================================
print("TEST 7: Admin Endpoints Reject Non-Admins")
print("-" * 80)

# User token on admin endpoint
if USER_TOKEN:
    try:
        response = requests.get(f"{BASE_URL}/admin/requests", headers={'Authorization': f'Bearer {USER_TOKEN}'})
        if response.status_code == 403:
            data = response.json()
            if 'detail' in data and 'admin' in data['detail'].lower():
                log_test("7a. Admin endpoint with user token", True, f"Correctly rejected: {data['detail']}")
            else:
                log_test("7a. Admin endpoint with user token", True, "Got 403")
        else:
            log_test("7a. Admin endpoint with user token", False, f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_test("7a. Admin endpoint with user token", False, f"Exception: {str(e)}")
else:
    log_test("7a. Admin endpoint with user token", False, "No USER_TOKEN")

# No auth on admin endpoint
try:
    response = requests.get(f"{BASE_URL}/admin/stats")
    if response.status_code == 401:
        log_test("7b. Admin endpoint no auth", True, "Correctly rejected")
    else:
        log_test("7b. Admin endpoint no auth", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    log_test("7b. Admin endpoint no auth", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 8: User Has No Licenses/Requests Initially
# ============================================================================
print("TEST 8: User Has No Licenses/Requests Initially")
print("-" * 80)

if USER_TOKEN:
    # Check requests
    try:
        response = requests.get(f"{BASE_URL}/requests", headers={'Authorization': f'Bearer {USER_TOKEN}'})
        if response.status_code == 200:
            requests_list = response.json()
            if isinstance(requests_list, list) and len(requests_list) == 0:
                log_test("8a. User requests empty", True, "Empty array")
            else:
                log_test("8a. User requests empty", False, f"Expected empty array, got {requests_list}")
        else:
            log_test("8a. User requests empty", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("8a. User requests empty", False, f"Exception: {str(e)}")
    
    # Check licenses
    try:
        response = requests.get(f"{BASE_URL}/licenses", headers={'Authorization': f'Bearer {USER_TOKEN}'})
        if response.status_code == 200:
            licenses_list = response.json()
            if isinstance(licenses_list, list) and len(licenses_list) == 0:
                log_test("8b. User licenses empty", True, "Empty array")
            else:
                log_test("8b. User licenses empty", False, f"Expected empty array, got {licenses_list}")
        else:
            log_test("8b. User licenses empty", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("8b. User licenses empty", False, f"Exception: {str(e)}")
    
    # Check active license
    try:
        response = requests.get(f"{BASE_URL}/licenses/active", headers={'Authorization': f'Bearer {USER_TOKEN}'})
        if response.status_code == 200:
            active = response.json()
            if active is None:
                log_test("8c. User active license null", True, "Null returned")
            else:
                log_test("8c. User active license null", False, f"Expected null, got {active}")
        else:
            log_test("8c. User active license null", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("8c. User active license null", False, f"Exception: {str(e)}")
    
    # Backtest without license
    try:
        response = requests.post(f"{BASE_URL}/backtest/run", 
            headers={'Authorization': f'Bearer {USER_TOKEN}'},
            json={'strategy': 'momentum', 'market': 'NASDAQ:AAPL', 'capital': 100000})
        if response.status_code == 403:
            data = response.json()
            if 'detail' in data and 'no active license' in data['detail'].lower():
                log_test("8d. Backtest without license", True, f"Correctly rejected: {data['detail']}")
            else:
                log_test("8d. Backtest without license", True, "Got 403")
        else:
            log_test("8d. Backtest without license", False, f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_test("8d. Backtest without license", False, f"Exception: {str(e)}")
else:
    log_test("8a-d. User initial state", False, "No USER_TOKEN")
print()

# ============================================================================
# TEST 9: Create Package Request
# ============================================================================
print("TEST 9: Create Package Request")
print("-" * 80)

if USER_TOKEN:
    # Valid request
    try:
        response = requests.post(f"{BASE_URL}/requests",
            headers={'Authorization': f'Bearer {USER_TOKEN}'},
            json={'plan_id': 'starter', 'option_index': 0})
        if response.status_code == 200:
            data = response.json()
            if 'id' in data and data.get('status') == 'pending':
                REQUEST_ID = data['id']
                log_test("9a. Create request valid", True, f"Request ID: {REQUEST_ID}, status: pending")
            else:
                log_test("9a. Create request valid", False, f"Invalid response: {data}")
        else:
            log_test("9a. Create request valid", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("9a. Create request valid", False, f"Exception: {str(e)}")
    
    # Duplicate pending request
    try:
        response = requests.post(f"{BASE_URL}/requests",
            headers={'Authorization': f'Bearer {USER_TOKEN}'},
            json={'plan_id': 'starter', 'option_index': 0})
        if response.status_code == 409:
            data = response.json()
            if 'detail' in data and 'already have a pending request' in data['detail'].lower():
                log_test("9b. Duplicate pending request", True, f"Correctly rejected: {data['detail']}")
            else:
                log_test("9b. Duplicate pending request", True, "Got 409")
        else:
            log_test("9b. Duplicate pending request", False, f"Expected 409, got {response.status_code}")
    except Exception as e:
        log_test("9b. Duplicate pending request", False, f"Exception: {str(e)}")
    
    # Invalid plan_id
    try:
        # First register a new user to avoid pending request conflict
        new_user = {
            'email': f'invalid_plan_{timestamp}@test.com',
            'password': 'Pass1234!',
            'name': 'Test'
        }
        reg_resp = requests.post(f"{BASE_URL}/auth/register", json=new_user)
        if reg_resp.status_code == 200:
            temp_token = reg_resp.json()['token']
            response = requests.post(f"{BASE_URL}/requests",
                headers={'Authorization': f'Bearer {temp_token}'},
                json={'plan_id': 'nonexistent', 'option_index': 0})
            if response.status_code == 404:
                log_test("9c. Invalid plan_id", True, "Correctly rejected")
            else:
                log_test("9c. Invalid plan_id", False, f"Expected 404, got {response.status_code}")
        else:
            log_test("9c. Invalid plan_id", False, "Could not create temp user")
    except Exception as e:
        log_test("9c. Invalid plan_id", False, f"Exception: {str(e)}")
    
    # Invalid option_index
    try:
        new_user2 = {
            'email': f'invalid_option_{timestamp}@test.com',
            'password': 'Pass1234!',
            'name': 'Test'
        }
        reg_resp = requests.post(f"{BASE_URL}/auth/register", json=new_user2)
        if reg_resp.status_code == 200:
            temp_token = reg_resp.json()['token']
            response = requests.post(f"{BASE_URL}/requests",
                headers={'Authorization': f'Bearer {temp_token}'},
                json={'plan_id': 'starter', 'option_index': 99})
            if response.status_code == 422:
                log_test("9d. Invalid option_index", True, "Correctly rejected")
            else:
                log_test("9d. Invalid option_index", False, f"Expected 422, got {response.status_code}")
        else:
            log_test("9d. Invalid option_index", False, "Could not create temp user")
    except Exception as e:
        log_test("9d. Invalid option_index", False, f"Exception: {str(e)}")
    
    # Verify request appears in user's list
    try:
        response = requests.get(f"{BASE_URL}/requests", headers={'Authorization': f'Bearer {USER_TOKEN}'})
        if response.status_code == 200:
            requests_list = response.json()
            if isinstance(requests_list, list) and len(requests_list) > 0:
                found = any(r.get('id') == REQUEST_ID for r in requests_list)
                if found:
                    log_test("9e. Request in user list", True, f"Found request {REQUEST_ID}")
                else:
                    log_test("9e. Request in user list", False, f"Request {REQUEST_ID} not found")
            else:
                log_test("9e. Request in user list", False, "Empty requests list")
        else:
            log_test("9e. Request in user list", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("9e. Request in user list", False, f"Exception: {str(e)}")
else:
    log_test("9a-e. Create request", False, "No USER_TOKEN")
print()

# ============================================================================
# TEST 10: Admin Reviews + Approves
# ============================================================================
print("TEST 10: Admin Reviews + Approves")
print("-" * 80)

if ADMIN_TOKEN and REQUEST_ID:
    # Get pending requests
    try:
        response = requests.get(f"{BASE_URL}/admin/requests?status=pending",
            headers={'Authorization': f'Bearer {ADMIN_TOKEN}'})
        if response.status_code == 200:
            requests_list = response.json()
            if isinstance(requests_list, list):
                found = any(r.get('id') == REQUEST_ID for r in requests_list)
                if found:
                    log_test("10a. Admin sees pending request", True, f"Found request {REQUEST_ID}")
                else:
                    log_test("10a. Admin sees pending request", False, f"Request {REQUEST_ID} not in list")
            else:
                log_test("10a. Admin sees pending request", False, "Invalid response")
        else:
            log_test("10a. Admin sees pending request", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("10a. Admin sees pending request", False, f"Exception: {str(e)}")
    
    # Get admin stats
    try:
        response = requests.get(f"{BASE_URL}/admin/stats",
            headers={'Authorization': f'Bearer {ADMIN_TOKEN}'})
        if response.status_code == 200:
            stats = response.json()
            if 'pending_requests' in stats and stats['pending_requests'] >= 1:
                log_test("10b. Admin stats pending >= 1", True, f"Pending: {stats['pending_requests']}")
            else:
                log_test("10b. Admin stats pending >= 1", False, f"Stats: {stats}")
        else:
            log_test("10b. Admin stats pending >= 1", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("10b. Admin stats pending >= 1", False, f"Exception: {str(e)}")
    
    # Approve request
    try:
        response = requests.post(f"{BASE_URL}/admin/requests/{REQUEST_ID}/approve",
            headers={'Authorization': f'Bearer {ADMIN_TOKEN}'})
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and 'license' in data:
                license_data = data['license']
                # Verify license structure
                required = ['license_key', 'api_key', 'status', 'expires_at']
                if all(k in license_data for k in required):
                    lk = license_data['license_key']
                    ak = license_data['api_key']
                    if lk.startswith('TL-') and ak.startswith('tl_live_') and license_data['status'] == 'active':
                        log_test("10c. Admin approve request", True, 
                            f"License issued: {lk[:15]}..., status: {license_data['status']}")
                    else:
                        log_test("10c. Admin approve request", False, f"Invalid license format: {license_data}")
                else:
                    log_test("10c. Admin approve request", False, f"Missing license fields: {license_data}")
            else:
                log_test("10c. Admin approve request", False, f"Invalid response: {data}")
        else:
            log_test("10c. Admin approve request", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("10c. Admin approve request", False, f"Exception: {str(e)}")
    
    # Try to approve again (should fail)
    try:
        response = requests.post(f"{BASE_URL}/admin/requests/{REQUEST_ID}/approve",
            headers={'Authorization': f'Bearer {ADMIN_TOKEN}'})
        if response.status_code == 409:
            data = response.json()
            if 'detail' in data and 'not pending' in data['detail'].lower():
                log_test("10d. Approve again fails", True, f"Correctly rejected: {data['detail']}")
            else:
                log_test("10d. Approve again fails", True, "Got 409")
        else:
            log_test("10d. Approve again fails", False, f"Expected 409, got {response.status_code}")
    except Exception as e:
        log_test("10d. Approve again fails", False, f"Exception: {str(e)}")
else:
    log_test("10a-d. Admin approve", False, "No ADMIN_TOKEN or REQUEST_ID")
print()

# ============================================================================
# TEST 11: User Now Has License
# ============================================================================
print("TEST 11: User Now Has License")
print("-" * 80)

if USER_TOKEN:
    # Get active license
    try:
        response = requests.get(f"{BASE_URL}/licenses/active",
            headers={'Authorization': f'Bearer {USER_TOKEN}'})
        if response.status_code == 200:
            license_data = response.json()
            if license_data is not None and 'license_key' in license_data:
                log_test("11a. User has active license", True, f"License: {license_data['license_key'][:15]}...")
            else:
                log_test("11a. User has active license", False, f"Expected license, got {license_data}")
        else:
            log_test("11a. User has active license", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("11a. User has active license", False, f"Exception: {str(e)}")
    
    # Get all licenses
    try:
        response = requests.get(f"{BASE_URL}/licenses",
            headers={'Authorization': f'Bearer {USER_TOKEN}'})
        if response.status_code == 200:
            licenses_list = response.json()
            if isinstance(licenses_list, list) and len(licenses_list) > 0:
                log_test("11b. User licenses list", True, f"Found {len(licenses_list)} license(s)")
            else:
                log_test("11b. User licenses list", False, "Expected non-empty array")
        else:
            log_test("11b. User licenses list", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("11b. User licenses list", False, f"Exception: {str(e)}")
    
    # Check request status
    try:
        response = requests.get(f"{BASE_URL}/requests",
            headers={'Authorization': f'Bearer {USER_TOKEN}'})
        if response.status_code == 200:
            requests_list = response.json()
            if isinstance(requests_list, list):
                req = next((r for r in requests_list if r.get('id') == REQUEST_ID), None)
                if req and req.get('status') == 'approved':
                    log_test("11c. Request status approved", True, f"Status: {req['status']}")
                else:
                    log_test("11c. Request status approved", False, f"Request: {req}")
            else:
                log_test("11c. Request status approved", False, "Invalid response")
        else:
            log_test("11c. Request status approved", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("11c. Request status approved", False, f"Exception: {str(e)}")
else:
    log_test("11a-c. User has license", False, "No USER_TOKEN")
print()

# ============================================================================
# TEST 12: Backtest Now Works
# ============================================================================
print("TEST 12: Backtest Now Works")
print("-" * 80)

if USER_TOKEN:
    try:
        response = requests.post(f"{BASE_URL}/backtest/run",
            headers={'Authorization': f'Bearer {USER_TOKEN}'},
            json={'strategy': 'momentum', 'market': 'NASDAQ:AAPL', 'capital': 100000})
        if response.status_code == 200:
            data = response.json()
            required = ['run_id', 'strategy', 'market', 'sharpe', 'max_drawdown', 'trades', 
                       'net_pnl', 'duration_ms', 'equity_curve', 'license_id']
            if all(k in data for k in required):
                if isinstance(data['equity_curve'], list) and len(data['equity_curve']) == 60:
                    log_test("12a. Backtest runs successfully", True, 
                        f"Sharpe: {data['sharpe']}, Trades: {data['trades']}, Equity curve: 60 points")
                else:
                    log_test("12a. Backtest runs successfully", False, 
                        f"Invalid equity_curve: {len(data.get('equity_curve', []))} points")
            else:
                log_test("12a. Backtest runs successfully", False, f"Missing fields: {data}")
        else:
            log_test("12a. Backtest runs successfully", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("12a. Backtest runs successfully", False, f"Exception: {str(e)}")
    
    # Check backtests_used incremented
    try:
        response = requests.get(f"{BASE_URL}/licenses",
            headers={'Authorization': f'Bearer {USER_TOKEN}'})
        if response.status_code == 200:
            licenses_list = response.json()
            if isinstance(licenses_list, list) and len(licenses_list) > 0:
                license_data = licenses_list[0]
                if license_data.get('backtests_used') == 1:
                    log_test("12b. Backtests used incremented", True, f"Used: {license_data['backtests_used']}")
                else:
                    log_test("12b. Backtests used incremented", False, 
                        f"Expected 1, got {license_data.get('backtests_used')}")
            else:
                log_test("12b. Backtests used incremented", False, "No licenses found")
        else:
            log_test("12b. Backtests used incremented", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("12b. Backtests used incremented", False, f"Exception: {str(e)}")
else:
    log_test("12a-b. Backtest works", False, "No USER_TOKEN")
print()

# ============================================================================
# TEST 13: Rejection Path
# ============================================================================
print("TEST 13: Rejection Path")
print("-" * 80)

# Register second user
try:
    response = requests.post(f"{BASE_URL}/auth/register", json=test_user2)
    if response.status_code == 200:
        data = response.json()
        USER2_TOKEN = data['token']
        log_test("13a. Register user2", True, f"User: {data['user'].get('email')}")
    else:
        log_test("13a. Register user2", False, f"Status {response.status_code}")
except Exception as e:
    log_test("13a. Register user2", False, f"Exception: {str(e)}")

# User2 creates request
if USER2_TOKEN:
    try:
        response = requests.post(f"{BASE_URL}/requests",
            headers={'Authorization': f'Bearer {USER2_TOKEN}'},
            json={'plan_id': 'pro', 'option_index': 1})
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'pending':
                USER2_REQUEST_ID = data['id']
                log_test("13b. User2 creates request", True, f"Request ID: {USER2_REQUEST_ID}")
            else:
                log_test("13b. User2 creates request", False, f"Invalid status: {data}")
        else:
            log_test("13b. User2 creates request", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("13b. User2 creates request", False, f"Exception: {str(e)}")
else:
    log_test("13b. User2 creates request", False, "No USER2_TOKEN")

# Admin sees user2's request
if ADMIN_TOKEN and USER2_REQUEST_ID:
    try:
        response = requests.get(f"{BASE_URL}/admin/requests?status=pending",
            headers={'Authorization': f'Bearer {ADMIN_TOKEN}'})
        if response.status_code == 200:
            requests_list = response.json()
            found = any(r.get('id') == USER2_REQUEST_ID for r in requests_list)
            if found:
                log_test("13c. Admin sees user2 request", True, f"Found request {USER2_REQUEST_ID}")
            else:
                log_test("13c. Admin sees user2 request", False, "Request not found")
        else:
            log_test("13c. Admin sees user2 request", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("13c. Admin sees user2 request", False, f"Exception: {str(e)}")
else:
    log_test("13c. Admin sees user2 request", False, "No ADMIN_TOKEN or USER2_REQUEST_ID")

# Admin rejects request
if ADMIN_TOKEN and USER2_REQUEST_ID:
    try:
        response = requests.post(f"{BASE_URL}/admin/requests/{USER2_REQUEST_ID}/reject",
            headers={'Authorization': f'Bearer {ADMIN_TOKEN}'},
            json={'reason': 'Need more details'})
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                log_test("13d. Admin rejects request", True, "Request rejected")
            else:
                log_test("13d. Admin rejects request", False, f"Invalid response: {data}")
        else:
            log_test("13d. Admin rejects request", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("13d. Admin rejects request", False, f"Exception: {str(e)}")
else:
    log_test("13d. Admin rejects request", False, "No ADMIN_TOKEN or USER2_REQUEST_ID")

# User2 sees rejection
if USER2_TOKEN:
    try:
        response = requests.get(f"{BASE_URL}/requests",
            headers={'Authorization': f'Bearer {USER2_TOKEN}'})
        if response.status_code == 200:
            requests_list = response.json()
            req = next((r for r in requests_list if r.get('id') == USER2_REQUEST_ID), None)
            if req and req.get('status') == 'rejected' and req.get('reject_reason') == 'Need more details':
                log_test("13e. User2 sees rejection", True, 
                    f"Status: {req['status']}, Reason: {req['reject_reason']}")
            else:
                log_test("13e. User2 sees rejection", False, f"Request: {req}")
        else:
            log_test("13e. User2 sees rejection", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("13e. User2 sees rejection", False, f"Exception: {str(e)}")
else:
    log_test("13e. User2 sees rejection", False, "No USER2_TOKEN")

# User2 has no active license
if USER2_TOKEN:
    try:
        response = requests.get(f"{BASE_URL}/licenses/active",
            headers={'Authorization': f'Bearer {USER2_TOKEN}'})
        if response.status_code == 200:
            license_data = response.json()
            if license_data is None:
                log_test("13f. User2 no active license", True, "Null returned")
            else:
                log_test("13f. User2 no active license", False, f"Expected null, got {license_data}")
        else:
            log_test("13f. User2 no active license", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("13f. User2 no active license", False, f"Exception: {str(e)}")
else:
    log_test("13f. User2 no active license", False, "No USER2_TOKEN")

# Admin cannot approve already-decided request
if ADMIN_TOKEN and USER2_REQUEST_ID:
    try:
        response = requests.post(f"{BASE_URL}/admin/requests/{USER2_REQUEST_ID}/approve",
            headers={'Authorization': f'Bearer {ADMIN_TOKEN}'})
        if response.status_code == 409:
            log_test("13g. Cannot approve rejected request", True, "Got 409")
        else:
            log_test("13g. Cannot approve rejected request", False, f"Expected 409, got {response.status_code}")
    except Exception as e:
        log_test("13g. Cannot approve rejected request", False, f"Exception: {str(e)}")
else:
    log_test("13g. Cannot approve rejected request", False, "No ADMIN_TOKEN or USER2_REQUEST_ID")
print()

# ============================================================================
# TEST 14: Demo Plan Flow
# ============================================================================
print("TEST 14: Demo Plan Flow")
print("-" * 80)

# Register demo user
demo_user = {
    'email': f'demo_{timestamp}@test.com',
    'password': 'Pass1234!',
    'name': 'Demo User'
}
DEMO_TOKEN = None
DEMO_REQUEST_ID = None

try:
    response = requests.post(f"{BASE_URL}/auth/register", json=demo_user)
    if response.status_code == 200:
        DEMO_TOKEN = response.json()['token']
        log_test("14a. Register demo user", True, f"User: {demo_user['email']}")
    else:
        log_test("14a. Register demo user", False, f"Status {response.status_code}")
except Exception as e:
    log_test("14a. Register demo user", False, f"Exception: {str(e)}")

# Create demo request
if DEMO_TOKEN:
    try:
        response = requests.post(f"{BASE_URL}/requests",
            headers={'Authorization': f'Bearer {DEMO_TOKEN}'},
            json={'demo': True})
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'pending':
                DEMO_REQUEST_ID = data['id']
                log_test("14b. Create demo request", True, f"Request ID: {DEMO_REQUEST_ID}")
            else:
                log_test("14b. Create demo request", False, f"Invalid status: {data}")
        else:
            log_test("14b. Create demo request", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("14b. Create demo request", False, f"Exception: {str(e)}")
else:
    log_test("14b. Create demo request", False, "No DEMO_TOKEN")

# Admin approves demo request
if ADMIN_TOKEN and DEMO_REQUEST_ID:
    try:
        response = requests.post(f"{BASE_URL}/admin/requests/{DEMO_REQUEST_ID}/approve",
            headers={'Authorization': f'Bearer {ADMIN_TOKEN}'})
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and 'license' in data:
                log_test("14c. Admin approves demo", True, "Demo license issued")
            else:
                log_test("14c. Admin approves demo", False, f"Invalid response: {data}")
        else:
            log_test("14c. Admin approves demo", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("14c. Admin approves demo", False, f"Exception: {str(e)}")
else:
    log_test("14c. Admin approves demo", False, "No ADMIN_TOKEN or DEMO_REQUEST_ID")

# Demo user has active license
if DEMO_TOKEN:
    try:
        response = requests.get(f"{BASE_URL}/licenses/active",
            headers={'Authorization': f'Bearer {DEMO_TOKEN}'})
        if response.status_code == 200:
            license_data = response.json()
            if license_data is not None and 'license_key' in license_data:
                log_test("14d. Demo user has license", True, f"License: {license_data['license_key'][:15]}...")
            else:
                log_test("14d. Demo user has license", False, f"Expected license, got {license_data}")
        else:
            log_test("14d. Demo user has license", False, f"Status {response.status_code}")
    except Exception as e:
        log_test("14d. Demo user has license", False, f"Exception: {str(e)}")
else:
    log_test("14d. Demo user has license", False, "No DEMO_TOKEN")
print()

# ============================================================================
# SUMMARY
# ============================================================================
print("="*80)
print("TEST SUMMARY")
print("="*80)
total = test_results['passed'] + test_results['failed']
print(f"Total Tests: {total}")
print(f"✅ Passed: {test_results['passed']}")
print(f"❌ Failed: {test_results['failed']}")
print()

if test_results['failed'] > 0:
    print("FAILED TESTS:")
    print("-" * 80)
    for test in test_results['tests']:
        if not test['passed']:
            print(f"❌ {test['name']}")
            if test['details']:
                print(f"   {test['details']}")
    print()

print("="*80)
exit(0 if test_results['failed'] == 0 else 1)
