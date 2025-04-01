#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/backup"
NAS_BACKUP_DIR=${NAS_BACKUP_PATH:-/Volumes/FamilyFiles/postgres-backup}
POSTGRES_USER=${POSTGRES_USER:-kvd_user}
POSTGRES_DB=${POSTGRES_DB:-kvd_auctions}
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-devpassword123}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${POSTGRES_DB}_$TIMESTAMP.sql.gz"

# Ensure backup directory exists
mkdir -p $BACKUP_DIR
mkdir -p $NAS_BACKUP_DIR

echo "Backing up PostgreSQL database to $BACKUP_FILE..."
echo "Using database: $POSTGRES_DB on $POSTGRES_HOST:$POSTGRES_PORT"

# Export password as environment variable
export PGPASSWORD="$POSTGRES_PASSWORD"

# Create the backup
pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

# Verify backup file size
FILESIZE=$(stat -c%s "$BACKUP_FILE")
echo "Backup file size: $FILESIZE bytes"

if [ "$FILESIZE" -lt 1000 ]; then
    echo "WARNING: Backup file is suspiciously small ($FILESIZE bytes). Please check if it contains valid data."
fi

# Copy to NAS
echo "Copying backup to NAS at $NAS_BACKUP_DIR..."
cp "$BACKUP_FILE" "$NAS_BACKUP_DIR/"

# Clean up old backups (keep last 10)
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.sql.gz" -type f | sort -r | tail -n +11 | xargs rm -f 2>/dev/null || true
find "$NAS_BACKUP_DIR" -name "*.sql.gz" -type f | sort -r | tail -n +11 | xargs rm -f 2>/dev/null || true

echo "Backup completed successfully at $(date)!"