#!/bin/bash

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
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

if ! command -v node >/dev/null 2>&1; then
  log_error "Node.js bulunamadı. Node 20+ gereklidir."
  exit 1
fi

NODE_VERSION_RAW="$(node -v)"
NODE_VERSION_MAJOR="${NODE_VERSION_RAW#v}"
NODE_VERSION_MAJOR="${NODE_VERSION_MAJOR%%.*}"

if [ "$NODE_VERSION_MAJOR" -lt 20 ]; then
  log_error "Node sürümü yetersiz: $NODE_VERSION_RAW (>=20 gerekli)"
  exit 1
fi
log_success "Node sürümü uygun: $NODE_VERSION_RAW"

if ! command -v yarn >/dev/null 2>&1; then
  log_error "Yarn bulunamadı. Çözüm: npm i -g yarn"
  exit 1
fi

YARN_VERSION="$(yarn -v 2>/dev/null || true)"
if echo "$YARN_VERSION" | grep -qi "cmdtest" || echo "$YARN_VERSION" | grep -Eqi '^0\.32\+git'; then
  log_error "Bu Yarn değil (cmdtest). Çözüm: npm i -g yarn"
  exit 1
fi
log_success "Yarn çalışıyor: $YARN_VERSION"

if [ ! -f "$REPO_ROOT/frontend/package.json" ]; then
  log_error "frontend/package.json bulunamadı"
  exit 1
fi
log_success "frontend/package.json bulundu"

if ! command -v git >/dev/null 2>&1; then
  log_warn "git bulunamadı (opsiyonel)"
else
  log_success "git mevcut"
fi

if ! command -v curl >/dev/null 2>&1; then
  log_warn "curl bulunamadı (opsiyonel)"
else
  log_success "curl mevcut"
fi

log_success "✅ Ready"
