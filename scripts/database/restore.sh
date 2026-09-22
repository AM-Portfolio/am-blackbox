#!/bin/bash
# restore.sh - Restores the AM Blackbox PostgreSQL database from a backup

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_backup_file.sql>"
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File $BACKUP_FILE not found."
  exit 1
fi

echo "WARNING: This will overwrite the current database. Proceed? (y/n)"
read -r response
if [ "$response" != "y" ]; then
  echo "Restore aborted."
  exit 0
fi

echo "Starting database restore from $BACKUP_FILE..."
cat "$BACKUP_FILE" | docker exec -i am_blackbox_postgres psql -U blackbox_user -d am_blackbox

echo "Restore complete."
