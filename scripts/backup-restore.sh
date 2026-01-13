#!/bin/bash

# ============================================================
# EncrypTalk MongoDB Backup & Restore Script
# Version: 1.0
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/var/backups/encryptalk"
LOG_FILE="/var/log/encryptalk-backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/encryptalk-backup-${TIMESTAMP}.tar.gz"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"
}

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# ==================================================
# BACKUP FUNCTION
# ==================================================
backup_database() {
    log_info "Starting MongoDB backup..."
    
    # Get MongoDB URL from environment
    MONGO_URL="${MONGO_URL:-mongodb://localhost:27017/encryptalk}"
    DB_NAME="${DB_NAME:-encryptalk}"
    
    # Create temporary directory
    TEMP_BACKUP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_BACKUP_DIR" EXIT
    
    log_info "Dumping database to $TEMP_BACKUP_DIR"
    
    # Use mongodump to export database
    mongodump \
        --uri="$MONGO_URL" \
        --out="$TEMP_BACKUP_DIR" \
        --gzip \
        --archive="$TEMP_BACKUP_DIR/encryptalk.archive"
    
    if [ $? -ne 0 ]; then
        log_error "mongodump failed"
        exit 1
    fi
    
    log_success "Database dump completed"
    
    # Backup uploads directory
    log_info "Backing up uploads directory..."
    if [ -d "/opt/encryptalk/backend/uploads" ]; then
        tar -czf "$TEMP_BACKUP_DIR/uploads.tar.gz" \
            -C /opt/encryptalk/backend/uploads . \
            2>/dev/null || true
        log_success "Uploads backed up"
    fi
    
    # Backup .env files (encrypted)
    log_info "Backing up configuration..."
    mkdir -p "$TEMP_BACKUP_DIR/config"
    
    if [ -f "/opt/encryptalk/backend/.env" ]; then
        cp /opt/encryptalk/backend/.env "$TEMP_BACKUP_DIR/config/"
    fi
    
    if [ -f "/opt/encryptalk/frontend/.env" ]; then
        cp /opt/encryptalk/frontend/.env "$TEMP_BACKUP_DIR/config/"
    fi
    
    log_success "Configuration backed up"
    
    # Create final archive
    log_info "Creating final backup archive..."
    tar -czf "$BACKUP_FILE" -C "$TEMP_BACKUP_DIR" . 2>/dev/null
    
    if [ -f "$BACKUP_FILE" ]; then
        SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
        log_success "Backup completed: $BACKUP_FILE ($SIZE)"
        
        # Delete backups older than 7 days
        log_info "Cleaning old backups (keeping 7 days)..."
        find "$BACKUP_DIR" -name "encryptalk-backup-*.tar.gz" -mtime +7 -delete
        log_success "Old backups cleaned"
        
        # Calculate backup integrity checksum
        sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"
        log_success "Checksum saved: ${BACKUP_FILE}.sha256"
    else
        log_error "Backup archive creation failed"
        exit 1
    fi
}

# ==================================================
# RESTORE FUNCTION
# ==================================================
restore_database() {
    RESTORE_FILE="$1"
    
    if [ -z "$RESTORE_FILE" ]; then
        log_error "Restore file not specified"
        echo "Usage: $0 restore <backup-file>"
        exit 1
    fi
    
    if [ ! -f "$RESTORE_FILE" ]; then
        log_error "Restore file not found: $RESTORE_FILE"
        exit 1
    fi
    
    log_warn "WARNING: This will overwrite the current database!"
    read -p "Are you sure? Type 'yes' to confirm: " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    log_info "Starting restore from $RESTORE_FILE..."
    
    # Create temporary directory
    TEMP_RESTORE_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_RESTORE_DIR" EXIT
    
    # Extract backup
    log_info "Extracting backup archive..."
    tar -xzf "$RESTORE_FILE" -C "$TEMP_RESTORE_DIR"
    
    # Verify checksum if available
    if [ -f "${RESTORE_FILE}.sha256" ]; then
        log_info "Verifying backup integrity..."
        if sha256sum -c "${RESTORE_FILE}.sha256" > /dev/null 2>&1; then
            log_success "Backup integrity verified"
        else
            log_error "Backup integrity check failed!"
            exit 1
        fi
    fi
    
    # Stop backend service
    log_info "Stopping backend service..."
    sudo systemctl stop encryptalk-backend || true
    sleep 2
    
    # Restore MongoDB database
    log_info "Restoring MongoDB database..."
    MONGO_URL="${MONGO_URL:-mongodb://localhost:27017/encryptalk}"
    
    if [ -f "$TEMP_RESTORE_DIR/encryptalk.archive" ]; then
        mongorestore \
            --uri="$MONGO_URL" \
            --archive="$TEMP_RESTORE_DIR/encryptalk.archive" \
            --gzip \
            --drop
    else
        log_error "Database archive not found in backup"
        exit 1
    fi
    
    log_success "Database restored"
    
    # Restore uploads directory
    if [ -f "$TEMP_RESTORE_DIR/uploads.tar.gz" ]; then
        log_info "Restoring uploads directory..."
        mkdir -p /opt/encryptalk/backend/uploads
        tar -xzf "$TEMP_RESTORE_DIR/uploads.tar.gz" \
            -C /opt/encryptalk/backend/uploads
        chown -R encryptalk:encryptalk /opt/encryptalk/backend/uploads
        log_success "Uploads restored"
    fi
    
    # Restore configuration (optional)
    if [ -d "$TEMP_RESTORE_DIR/config" ]; then
        log_warn "Configuration files found in backup"
        log_info "WARNING: Not auto-restoring .env files (review manually)"
        ls -la "$TEMP_RESTORE_DIR/config/"
    fi
    
    # Start backend service
    log_info "Starting backend service..."
    sudo systemctl start encryptalk-backend
    sleep 2
    
    # Verify restore
    log_info "Verifying restore..."
    if curl -s http://127.0.0.1:8001/api/health | grep -q '"status":"healthy"'; then
        log_success "Restore completed successfully!"
    else
        log_warn "Restore completed but health check failed - check logs"
    fi
}

# ==================================================
# LIST BACKUPS FUNCTION
# ==================================================
list_backups() {
    log_info "Available backups:"
    if ls "$BACKUP_DIR"/encryptalk-backup-*.tar.gz 1> /dev/null 2>&1; then
        ls -lh "$BACKUP_DIR"/encryptalk-backup-*.tar.gz | awk '{print $9, "(" $5 ")"}'
    else
        log_warn "No backups found"
    fi
}

# ==================================================
# VERIFY BACKUP FUNCTION
# ==================================================
verify_backup() {
    BACKUP_FILE="$1"
    
    if [ -z "$BACKUP_FILE" ]; then
        BACKUP_FILE=$(ls -t "$BACKUP_DIR"/encryptalk-backup-*.tar.gz | head -1)
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    log_info "Verifying backup: $BACKUP_FILE"
    
    # Check file size
    SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    log_info "Backup size: $SIZE"
    
    # Check checksum
    if [ -f "${BACKUP_FILE}.sha256" ]; then
        if sha256sum -c "${BACKUP_FILE}.sha256" > /dev/null 2>&1; then
            log_success "Checksum verified ✓"
        else
            log_error "Checksum mismatch ✗"
            exit 1
        fi
    fi
    
    # List contents
    log_info "Backup contents:"
    tar -tzf "$BACKUP_FILE" | head -20
    
    # Check file integrity
    if tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
        log_success "Archive integrity verified ✓"
    else
        log_error "Archive is corrupted ✗"
        exit 1
    fi
    
    log_success "Backup verification completed"
}

# ==================================================
# SCHEDULE BACKUP (CRON)
# ==================================================
schedule_backup() {
    CRON_JOB="0 2 * * * /opt/encryptalk/scripts/backup-restore.sh backup >> /var/log/encryptalk-backup.log 2>&1"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "backup-restore.sh"; then
        log_warn "Backup cron job already scheduled"
    else
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        log_success "Backup scheduled daily at 2:00 AM"
    fi
}

# ==================================================
# CLOUD BACKUP (S3)
# ==================================================
backup_to_s3() {
    BACKUP_FILE="$1"
    S3_BUCKET="${S3_BUCKET:-encryptalk-backups}"
    
    if [ -z "$BACKUP_FILE" ]; then
        BACKUP_FILE=$(ls -t "$BACKUP_DIR"/encryptalk-backup-*.tar.gz | head -1)
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Install with: pip install awscli"
        exit 1
    fi
    
    log_info "Uploading to S3: s3://$S3_BUCKET/$(basename $BACKUP_FILE)"
    
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/" --storage-class STANDARD_IA
    
    if [ $? -eq 0 ]; then
        log_success "Backup uploaded to S3"
        # Keep only 30 days on S3
        aws s3 rm "s3://$S3_BUCKET/" --recursive --exclude "*" --include "encryptalk-backup-*" \
            --older-than 30 2>/dev/null || true
    else
        log_error "S3 upload failed"
        exit 1
    fi
}

# ==================================================
# MAIN
# ==================================================
case "${1:-backup}" in
    backup)
        backup_database
        ;;
    restore)
        restore_database "$2"
        ;;
    list)
        list_backups
        ;;
    verify)
        verify_backup "$2"
        ;;
    schedule)
        schedule_backup
        ;;
    s3)
        backup_to_s3 "$2"
        ;;
    *)
        cat << 'EOF'
EncrypTalk MongoDB Backup & Restore Tool

Usage:
  ./backup-restore.sh backup              Create database backup
  ./backup-restore.sh restore <file>     Restore from backup file
  ./backup-restore.sh list                List available backups
  ./backup-restore.sh verify [file]      Verify backup integrity
  ./backup-restore.sh schedule            Schedule daily backups via cron
  ./backup-restore.sh s3 [file]          Upload backup to S3

Examples:
  ./backup-restore.sh backup
  ./backup-restore.sh restore /var/backups/encryptalk/encryptalk-backup-20240115_120000.tar.gz
  ./backup-restore.sh verify
  ./backup-restore.sh s3

Environment Variables:
  MONGO_URL           MongoDB connection string (default: mongodb://localhost:27017/encryptalk)
  DB_NAME             Database name (default: encryptalk)
  S3_BUCKET           S3 bucket for cloud backups (default: encryptalk-backups)

EOF
        exit 1
        ;;
esac
