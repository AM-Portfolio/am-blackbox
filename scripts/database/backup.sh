#!/bin/bash
# backup.sh - Backs up the AM Blackbox PostgreSQL database

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="am_blackbox_backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

echo "Starting database backup..."
docker exec -t am_blackbox_postgres pg_dump -U blackbox_user am_blackbox > "$BACKUP_DIR/$FILENAME"

echo "Backup complete: $BACKUP_DIR/$FILENAME"
