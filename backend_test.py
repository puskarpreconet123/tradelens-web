#!/usr/bin/env python3
"""
EduFlash Backend API Test Suite
Tests all backend endpoints according to contracts.md and test_result.md
"""

import requests
import json
import random
import string
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
print(f"Testing backend at: {BASE_URL}\n")

# Test state
test_results = {
    'passed': 0,
    'failed': 0,
    'tests': []
}

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
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

def generate_random_email():
    """Generate a random email for testing"""
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"test_{random_str}_{int(datetime.now().timestamp())}@example.com"

# Test data
test_user = {
    'email': generate_random_email(),
    'password': 'SecurePass123!',
    'name': 'Test User'
}
test_token = None

print("="*80)
print("EDUFLASH BACKEND API TEST SUITE")
print("="*80)
print()

# ============================================================================
# TEST 1: Health Check
# ============================================================================
print("TEST 1: Health Check (GET /api/)")
print("-" * 80)
try:
    response = requests.get(f"{BASE_URL}/")
    if response.status_code == 200:
        data = response.json()
        if 'service' in data and data.get('status') == 'ok':
            log_test("Health check", True, f"Response: {data}")
        else:
            log_test("Health check", False, f"Unexpected response format: {data}")
    else:
        log_test("Health check", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("Health check", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 2: Plans Listing
# ============================================================================
print("TEST 2: Plans Listing (GET /api/plans)")
print("-" * 80)
try:
    response = requests.get(f"{BASE_URL}/plans")
    if response.status_code == 200:
        plans = response.json()
        if isinstance(plans, list) and len(plans) == 3:
            plan_names = [p.get('name') for p in plans]
            expected_names = ['Starter', 'Pro', 'Enterprise']
            if all(name in plan_names for name in expected_names):
                # Check structure
                valid_structure = all(
                    'id' in p and 'name' in p and 'options' in p and 'features' in p
                    for p in plans
                )
                if valid_structure:
                    log_test("Plans listing", True, f"Found 3 plans: {plan_names}")
                else:
                    log_test("Plans listing", False, "Plans missing required fields")
            else:
                log_test("Plans listing", False, f"Expected Starter/Pro/Enterprise, got {plan_names}")
        else:
            log_test("Plans listing", False, f"Expected 3 plans, got {len(plans) if isinstance(plans, list) else 'non-array'}")
    else:
        log_test("Plans listing", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("Plans listing", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 3: Demo Plan
# ============================================================================
print("TEST 3: Demo Plan (GET /api/plans/demo)")
print("-" * 80)
try:
    response = requests.get(f"{BASE_URL}/plans/demo")
    if response.status_code == 200:
        demo = response.json()
        if 'id' in demo and demo['id'] == 'demo':
            required_fields = ['name', 'price_usd', 'duration', 'limit', 'perks']
            if all(field in demo for field in required_fields):
                log_test("Demo plan", True, f"Demo plan: {demo.get('name')}, ${demo.get('price_usd')}")
            else:
                log_test("Demo plan", False, f"Missing required fields: {demo}")
        else:
            log_test("Demo plan", False, f"Invalid demo plan structure: {demo}")
    else:
        log_test("Demo plan", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("Demo plan", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 4: User Registration
# ============================================================================
print("TEST 4: User Registration (POST /api/auth/register)")
print("-" * 80)

# Test 4a: Successful registration
try:
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json=test_user
    )
    if response.status_code == 200:
        data = response.json()
        if 'token' in data and 'user' in data:
            test_token = data['token']
            user = data['user']
            if user.get('email') == test_user['email'].lower() and user.get('name') == test_user['name']:
                log_test("Registration - success", True, f"User created: {user.get('email')}")
            else:
                log_test("Registration - success", False, f"User data mismatch: {user}")
        else:
            log_test("Registration - success", False, f"Missing token or user in response: {data}")
    else:
        log_test("Registration - success", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("Registration - success", False, f"Exception: {str(e)}")

# Test 4b: Duplicate email
try:
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json=test_user
    )
    if response.status_code == 400:
        log_test("Registration - duplicate email", True, "Correctly rejected duplicate email")
    else:
        log_test("Registration - duplicate email", False, f"Expected 400, got {response.status_code}")
except Exception as e:
    log_test("Registration - duplicate email", False, f"Exception: {str(e)}")

# Test 4c: Short password
try:
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            'email': generate_random_email(),
            'password': '123',
            'name': 'Test'
        }
    )
    if response.status_code == 422:
        log_test("Registration - short password", True, "Correctly rejected short password")
    else:
        log_test("Registration - short password", False, f"Expected 422, got {response.status_code}")
except Exception as e:
    log_test("Registration - short password", False, f"Exception: {str(e)}")

# Test 4d: Missing fields
try:
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={'email': generate_random_email()}
    )
    if response.status_code == 422:
        log_test("Registration - missing fields", True, "Correctly rejected missing fields")
    else:
        log_test("Registration - missing fields", False, f"Expected 422, got {response.status_code}")
except Exception as e:
    log_test("Registration - missing fields", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 5: User Login
# ============================================================================
print("TEST 5: User Login (POST /api/auth/login)")
print("-" * 80)

# Test 5a: Successful login
try:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            'email': test_user['email'],
            'password': test_user['password']
        }
    )
    if response.status_code == 200:
        data = response.json()
        if 'token' in data and 'user' in data:
            test_token = data['token']
            log_test("Login - success", True, f"Login successful, token received")
        else:
            log_test("Login - success", False, f"Missing token or user: {data}")
    else:
        log_test("Login - success", False, f"Status {response.status_code}: {response.text}")
except Exception as e:
    log_test("Login - success", False, f"Exception: {str(e)}")

# Test 5b: Wrong password
try:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            'email': test_user['email'],
            'password': 'WrongPassword123!'
        }
    )
    if response.status_code == 401:
        log_test("Login - wrong password", True, "Correctly rejected wrong password")
    else:
        log_test("Login - wrong password", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    log_test("Login - wrong password", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 6: Get Current User
# ============================================================================
print("TEST 6: Get Current User (GET /api/auth/me)")
print("-" * 80)

# Test 6a: With valid token
if test_token:
    try:
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={'Authorization': f'Bearer {test_token}'}
        )
        if response.status_code == 200:
            user = response.json()
            if user.get('email') == test_user['email'].lower():
                log_test("Get user - valid token", True, f"User retrieved: {user.get('email')}")
            else:
                log_test("Get user - valid token", False, f"User mismatch: {user}")
        else:
            log_test("Get user - valid token", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Get user - valid token", False, f"Exception: {str(e)}")
else:
    log_test("Get user - valid token", False, "No token available from registration/login")

# Test 6b: Without token
try:
    response = requests.get(f"{BASE_URL}/auth/me")
    if response.status_code == 401:
        log_test("Get user - no token", True, "Correctly rejected request without token")
    else:
        log_test("Get user - no token", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    log_test("Get user - no token", False, f"Exception: {str(e)}")

# Test 6c: With garbage token
try:
    response = requests.get(
        f"{BASE_URL}/auth/me",
        headers={'Authorization': 'Bearer garbage_token_12345'}
    )
    if response.status_code == 401:
        log_test("Get user - garbage token", True, "Correctly rejected garbage token")
    else:
        log_test("Get user - garbage token", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    log_test("Get user - garbage token", False, f"Exception: {str(e)}")
print()

# ============================================================================
# TEST 7: Orders Listing
# ============================================================================
print("TEST 7: Orders Listing (GET /api/orders)")
print("-" * 80)
if test_token:
    try:
        response = requests.get(
            f"{BASE_URL}/orders",
            headers={'Authorization': f'Bearer {test_token}'}
        )
        if response.status_code == 200:
            orders = response.json()
            if isinstance(orders, list) and len(orders) == 0:
                log_test("Orders listing", True, "Empty orders array for new user")
            else:
                log_test("Orders listing", False, f"Expected empty array, got {orders}")
        else:
            log_test("Orders listing", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Orders listing", False, f"Exception: {str(e)}")
else:
    log_test("Orders listing", False, "No token available")
print()

# ============================================================================
# TEST 8: Licenses Listing
# ============================================================================
print("TEST 8: Licenses Listing (GET /api/licenses)")
print("-" * 80)
if test_token:
    try:
        response = requests.get(
            f"{BASE_URL}/licenses",
            headers={'Authorization': f'Bearer {test_token}'}
        )
        if response.status_code == 200:
            licenses = response.json()
            if isinstance(licenses, list) and len(licenses) == 0:
                log_test("Licenses listing", True, "Empty licenses array for new user")
            else:
                log_test("Licenses listing", False, f"Expected empty array, got {licenses}")
        else:
            log_test("Licenses listing", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Licenses listing", False, f"Exception: {str(e)}")
else:
    log_test("Licenses listing", False, "No token available")
print()

# ============================================================================
# TEST 9: Active License
# ============================================================================
print("TEST 9: Active License (GET /api/licenses/active)")
print("-" * 80)
if test_token:
    try:
        response = requests.get(
            f"{BASE_URL}/licenses/active",
            headers={'Authorization': f'Bearer {test_token}'}
        )
        if response.status_code == 200:
            license_data = response.json()
            if license_data is None:
                log_test("Active license", True, "Null active license for new user")
            else:
                log_test("Active license", False, f"Expected null, got {license_data}")
        else:
            log_test("Active license", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Active license", False, f"Exception: {str(e)}")
else:
    log_test("Active license", False, "No token available")
print()

# ============================================================================
# TEST 10: Create Order (Razorpay - expect 503)
# ============================================================================
print("TEST 10: Create Order (POST /api/payments/create-order)")
print("-" * 80)
if test_token:
    try:
        response = requests.post(
            f"{BASE_URL}/payments/create-order",
            headers={'Authorization': f'Bearer {test_token}'},
            json={'plan_id': 'starter', 'option_index': 0}
        )
        if response.status_code == 503:
            data = response.json()
            if 'detail' in data and 'Razorpay not configured' in data['detail']:
                log_test("Create order - Razorpay 503", True, f"Expected 503: {data['detail']}")
            else:
                log_test("Create order - Razorpay 503", True, f"Got 503 (keys not configured)")
        else:
            log_test("Create order - Razorpay 503", False, f"Expected 503, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Create order - Razorpay 503", False, f"Exception: {str(e)}")
else:
    log_test("Create order - Razorpay 503", False, "No token available")
print()

# ============================================================================
# TEST 11: Verify Payment (Razorpay - expect 503)
# ============================================================================
print("TEST 11: Verify Payment (POST /api/payments/verify)")
print("-" * 80)
if test_token:
    try:
        response = requests.post(
            f"{BASE_URL}/payments/verify",
            headers={'Authorization': f'Bearer {test_token}'},
            json={
                'razorpay_order_id': 'order_dummy123',
                'razorpay_payment_id': 'pay_dummy456',
                'razorpay_signature': 'sig_dummy789'
            }
        )
        if response.status_code == 503:
            data = response.json()
            if 'detail' in data and 'Razorpay not configured' in data['detail']:
                log_test("Verify payment - Razorpay 503", True, f"Expected 503: {data['detail']}")
            else:
                log_test("Verify payment - Razorpay 503", True, f"Got 503 (keys not configured)")
        else:
            log_test("Verify payment - Razorpay 503", False, f"Expected 503, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Verify payment - Razorpay 503", False, f"Exception: {str(e)}")
else:
    log_test("Verify payment - Razorpay 503", False, "No token available")
print()

# ============================================================================
# TEST 12: Backtest without License
# ============================================================================
print("TEST 12: Backtest without License (POST /api/backtest/run)")
print("-" * 80)

# Test 12a: Without auth
try:
    response = requests.post(
        f"{BASE_URL}/backtest/run",
        json={
            'strategy': 'momentum_rsi_14',
            'market': 'NASDAQ:AAPL',
            'capital': 100000
        }
    )
    if response.status_code == 401:
        log_test("Backtest - no auth", True, "Correctly rejected request without auth")
    else:
        log_test("Backtest - no auth", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    log_test("Backtest - no auth", False, f"Exception: {str(e)}")

# Test 12b: With auth but no license
if test_token:
    try:
        response = requests.post(
            f"{BASE_URL}/backtest/run",
            headers={'Authorization': f'Bearer {test_token}'},
            json={
                'strategy': 'momentum_rsi_14',
                'market': 'NASDAQ:AAPL',
                'capital': 100000
            }
        )
        if response.status_code == 403:
            data = response.json()
            if 'detail' in data and 'No active license' in data['detail']:
                log_test("Backtest - no license", True, f"Correctly gated: {data['detail']}")
            else:
                log_test("Backtest - no license", True, "Got 403 (no license)")
        else:
            log_test("Backtest - no license", False, f"Expected 403, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Backtest - no license", False, f"Exception: {str(e)}")
else:
    log_test("Backtest - no license", False, "No token available")
print()

# ============================================================================
# SUMMARY
# ============================================================================
print("="*80)
print("TEST SUMMARY")
print("="*80)
print(f"Total Tests: {test_results['passed'] + test_results['failed']}")
print(f"Passed: {test_results['passed']}")
print(f"Failed: {test_results['failed']}")
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
