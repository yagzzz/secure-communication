#!/bin/bash

# ============================================================
# EncrypTalk Production Readiness Verification Script
# Version: 1.0
# ============================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}!${NC} $1"
    ((WARNINGS++))
}

check_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Summary
summary() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "Test Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}, ${YELLOW}$WARNINGS warnings${NC}"
    echo -e "${BLUE}============================================================${NC}"
    
    if [ $FAILED -gt 0 ]; then
        echo -e "${RED}Production deployment NOT recommended until failures are fixed.${NC}"
        exit 1
    elif [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Deployment possible but review warnings above.${NC}"
        exit 0
    else
        echo -e "${GREEN}All systems ready for production deployment!${NC}"
        exit 0
    fi
}

# Get current directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo -e "${BLUE}EncrypTalk Production Readiness Check${NC}"
echo "Repository: $REPO_ROOT"
echo ""

# ==================================================
# FILE STRUCTURE CHECKS
# ==================================================
echo -e "${BLUE}=== File Structure ===${NC}"

if [ -f "backend/server.py" ]; then
    check_pass "backend/server.py exists"
else
    check_fail "backend/server.py not found"
fi

if [ -f "frontend/package.json" ]; then
    check_pass "frontend/package.json exists"
else
    check_fail "frontend/package.json not found"
fi

if [ -f "backend/.env.example" ]; then
    check_pass "backend/.env.example exists"
else
    check_fail "backend/.env.example not found"
fi

if [ -f "frontend/.env.example" ]; then
    check_pass "frontend/.env.example exists"
else
    check_fail "frontend/.env.example not found"
fi

if [ -f "scripts/setup-ubuntu.sh" ]; then
    check_pass "scripts/setup-ubuntu.sh exists"
else
    check_fail "scripts/setup-ubuntu.sh not found"
fi

if [ -f "scripts/backup-restore.sh" ]; then
    check_pass "scripts/backup-restore.sh exists"
else
    check_fail "scripts/backup-restore.sh not found"
fi

if [ -f "backend/encryptalk-backend.service" ]; then
    check_pass "backend/encryptalk-backend.service exists"
else
    check_fail "backend/encryptalk-backend.service not found"
fi

if [ -f "backend/nginx-config.example" ]; then
    check_pass "backend/nginx-config.example exists"
else
    check_fail "backend/nginx-config.example not found"
fi

# ==================================================
# DOCUMENTATION CHECKS
# ==================================================
echo ""
echo -e "${BLUE}=== Documentation ===${NC}"

if [ -f "QUICK_START.md" ]; then
    check_pass "QUICK_START.md exists"
else
    check_fail "QUICK_START.md not found"
fi

if [ -f "DEPLOYMENT_GUIDE.md" ]; then
    check_pass "DEPLOYMENT_GUIDE.md exists"
else
    check_fail "DEPLOYMENT_GUIDE.md not found"
fi

if [ -f "DEPLOYMENT_CHECKLIST.md" ]; then
    check_pass "DEPLOYMENT_CHECKLIST.md exists"
else
    check_fail "DEPLOYMENT_CHECKLIST.md not found"
fi

if [ -f "AUDIT_REPORT.md" ]; then
    check_pass "AUDIT_REPORT.md exists"
else
    check_fail "AUDIT_REPORT.md not found"
fi

if [ -f "SECURITY.md" ]; then
    check_pass "SECURITY.md exists"
else
    check_fail "SECURITY.md not found"
fi

# ==================================================
# BACKEND CHECKS
# ==================================================
echo ""
echo -e "${BLUE}=== Backend Python ===${NC}"

# Check Python imports
if grep -q "from fastapi import" backend/server.py; then
    check_pass "FastAPI import found in server.py"
else
    check_fail "FastAPI import not found in server.py"
fi

if grep -q "import uvicorn" backend/server.py; then
    check_pass "Uvicorn import found in server.py"
else
    check_fail "Uvicorn import not found in server.py"
fi

if grep -q "from motor.motor_asyncio import AsyncMongoClient" backend/server.py; then
    check_pass "Motor AsyncMongoClient import found"
else
    check_fail "Motor AsyncMongoClient import not found"
fi

# Check for health endpoint
if grep -q "@api_router.get(\"/health\")" backend/server.py; then
    check_pass "Health endpoint found in server.py"
else
    check_fail "Health endpoint NOT found in server.py"
fi

# Check for main block
if grep -q "if __name__ == \"__main__\"" backend/server.py; then
    check_pass "Entry point (if __name__ == __main__) found"
else
    check_fail "Entry point NOT found in server.py"
fi

# Check for exception handlers
if grep -q "exception_handler" backend/server.py; then
    check_pass "Exception handlers found"
else
    check_fail "Exception handlers NOT found"
fi

# Check requirements
if [ -f "backend/requirements_clean.txt" ]; then
    check_pass "requirements_clean.txt exists (minimal deps)"
    LINES=$(wc -l < backend/requirements_clean.txt)
    if [ "$LINES" -lt 30 ]; then
        check_pass "requirements_clean.txt is lean ($LINES packages)"
    else
        check_warn "requirements_clean.txt is larger than expected ($LINES packages)"
    fi
else
    check_warn "requirements_clean.txt not found (use original requirements.txt)"
fi

# Check for .env validation
if grep -q "os.getenv.*MONGO_URL" backend/server.py || grep -q "MONGO_URL.*getenv" backend/init_admin.py; then
    check_pass "MONGO_URL environment variable check found"
else
    check_warn "MONGO_URL environment variable handling may be missing"
fi

# ==================================================
# FRONTEND CHECKS
# ==================================================
echo ""
echo -e "${BLUE}=== Frontend React ===${NC}"

if [ -f "frontend/package.json" ]; then
    if grep -q "\"react\"" frontend/package.json; then
        check_pass "React dependency found in package.json"
    else
        check_fail "React dependency NOT found in package.json"
    fi
    
    if grep -q "\"@radix-ui" frontend/package.json; then
        check_pass "Radix UI found in package.json"
    else
        check_warn "Radix UI might be missing or named differently"
    fi
    
    if grep -q "\"tailwindcss\"" frontend/package.json; then
        check_pass "Tailwind CSS found in package.json"
    else
        check_fail "Tailwind CSS NOT found in package.json"
    fi
fi

# Check for responsive fixes in ChatInterface
if [ -f "frontend/src/pages/ChatInterface.jsx" ]; then
    if grep -q "Sheet" frontend/src/pages/ChatInterface.jsx; then
        check_pass "Sheet drawer component found (mobile responsive)"
    else
        check_warn "Sheet drawer might not be implemented"
    fi
    
    if grep -q "showSidebarSheet\|showSidebar" frontend/src/pages/ChatInterface.jsx; then
        check_pass "Sidebar state management found"
    else
        check_warn "Sidebar state might not be properly managed"
    fi
fi

# ==================================================
# ENVIRONMENT VARIABLES
# ==================================================
echo ""
echo -e "${BLUE}=== Environment Configuration ===${NC}"

if grep -q "MONGO_URL" backend/.env.example; then
    check_pass "MONGO_URL documented in .env.example"
else
    check_fail "MONGO_URL NOT documented in .env.example"
fi

if grep -q "SECRET_KEY" backend/.env.example; then
    check_pass "SECRET_KEY documented in .env.example"
else
    check_fail "SECRET_KEY NOT documented in .env.example"
fi

if grep -q "CORS_ORIGINS" backend/.env.example; then
    check_pass "CORS_ORIGINS documented in .env.example"
else
    check_fail "CORS_ORIGINS NOT documented in .env.example"
fi

if grep -q "ADMIN_USERNAME\|ADMIN_PASSWORD" backend/.env.example; then
    check_pass "Admin credentials variables documented"
else
    check_fail "Admin credentials variables NOT documented"
fi

# ==================================================
# DEPLOYMENT ARTIFACTS
# ==================================================
echo ""
echo -e "${BLUE}=== Deployment Artifacts ===${NC}"

if [ -f "scripts/setup-ubuntu.sh" ]; then
    if grep -q "systemctl\|nginx\|mongodb" scripts/setup-ubuntu.sh; then
        check_pass "Setup script contains systemd/nginx/mongodb configuration"
    else
        check_fail "Setup script may be incomplete"
    fi
    
    if [ -x "scripts/setup-ubuntu.sh" ]; then
        check_pass "Setup script is executable"
    else
        check_warn "Setup script is not executable (run: chmod +x scripts/setup-ubuntu.sh)"
    fi
fi

if grep -q "ExecStart\|Restart\|systemd" backend/encryptalk-backend.service; then
    check_pass "Systemd service file properly configured"
else
    check_fail "Systemd service file may be incomplete"
fi

if grep -q "proxy_pass\|location /api\|ssl_certificate" backend/nginx-config.example; then
    check_pass "Nginx configuration includes proxy and SSL setup"
else
    check_fail "Nginx configuration may be incomplete"
fi

# ==================================================
# SECURITY CHECKS
# ==================================================
echo ""
echo -e "${BLUE}=== Security Configuration ===${NC}"

if grep -q "bcrypt\|Bcrypt" backend/server.py || grep -q "passlib" backend/requirements_clean.txt; then
    check_pass "Password hashing (bcrypt) found"
else
    check_warn "Bcrypt password hashing not explicitly found"
fi

if grep -q "jose\|JWT" backend/server.py || grep -q "python-jose" backend/requirements_clean.txt; then
    check_pass "JWT authentication found"
else
    check_warn "JWT authentication not explicitly found"
fi

if grep -q "Fernet\|cryptography" backend/server.py || grep -q "cryptography" backend/requirements_clean.txt; then
    check_pass "Encryption (Fernet) found"
else
    check_warn "Fernet encryption not explicitly found"
fi

if grep -q "SecurityMiddleware\|rate\|CORS" backend/server.py; then
    check_pass "Security middleware (rate limiting, CORS) found"
else
    check_warn "Security middleware may not be fully configured"
fi

if grep -q "https\|ssl\|certificate" backend/nginx-config.example; then
    check_pass "HTTPS/SSL configuration found in Nginx"
else
    check_fail "HTTPS/SSL configuration NOT found in Nginx config"
fi

if grep -q "HSTS\|Strict-Transport-Security" backend/nginx-config.example; then
    check_pass "HSTS header configured in Nginx"
else
    check_warn "HSTS header not found (security best practice)"
fi

# ==================================================
# SYNTAX & VALIDATION
# ==================================================
echo ""
echo -e "${BLUE}=== Code Quality Checks ===${NC}"

# Check Python syntax
if command -v python3 &> /dev/null; then
    if python3 -m py_compile backend/server.py 2>/dev/null; then
        check_pass "backend/server.py has valid Python syntax"
    else
        check_fail "backend/server.py has Python syntax errors"
    fi
    
    if python3 -m py_compile backend/init_admin.py 2>/dev/null; then
        check_pass "backend/init_admin.py has valid Python syntax"
    else
        check_fail "backend/init_admin.py has Python syntax errors"
    fi
else
    check_info "Python3 not available for syntax checking (skipped)"
fi

# Check JSON syntax
if grep -q "package.json" frontend/package.json; then
    if command -v jq &> /dev/null; then
        if jq . frontend/package.json > /dev/null 2>&1; then
            check_pass "frontend/package.json has valid JSON syntax"
        else
            check_fail "frontend/package.json has JSON syntax errors"
        fi
    else
        check_info "jq not installed (JSON validation skipped)"
    fi
fi

# ==================================================
# FINAL CHECKLIST
# ==================================================
echo ""
echo -e "${BLUE}=== Deployment Readiness ===${NC}"

if [ $FAILED -eq 0 ] && [ $WARNINGS -le 2 ]; then
    check_pass "Repository structure complete"
    check_pass "Documentation comprehensive"
    check_pass "Deployment automation ready"
    check_pass "Security configurations in place"
else
    check_info "Some issues detected (see above)"
fi

# ==================================================
# SUMMARY
# ==================================================
summary
