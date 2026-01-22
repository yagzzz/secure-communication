#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT/backend"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate

echo "✅ Backend virtual environment aktif"

echo "Aktif shell: $SHELL"
exec "$SHELL"
