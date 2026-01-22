#!/bin/bash

# ============================================================
# EncrypTalk First Boot Script (Idempotent)
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"

log_info "Doctor kontrolü çalıştırılıyor..."
"$REPO_ROOT/scripts/doctor.sh"

log_info "İlk kurulum için start.sh çalıştırılıyor..."
"$REPO_ROOT/start.sh" "$@"

log_success "İlk kurulum tamamlandı"
