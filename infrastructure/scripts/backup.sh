#!/bin/bash
# backup.sh - Backup script for Refunds Service
# 
# Performs backups for the Refunds Service, including MongoDB database snapshots,
# configuration data backups, and log and audit data archiving.
#
# Usage: ./backup.sh [--full] [--mongodb-only] [--config-only] [--logs-only] [--local-only] [--help]

# Exit on error
set -e

# Default configuration
BACKUP_DIR="/opt/brik/refunds/backups"
S3_BUCKET="brik-refunds-backups"
MONGO_URI="mongodb://localhost:27017"
MONGO_DB="refunds"
MONGO_RETENTION_DAYS=30
CONFIG_RETENTION_DAYS=90
LOGS_RETENTION_DAYS=2555  # 7 years
NOTIFICATION_EMAIL="ops@brik.com"
SNS_TOPIC_ARN="arn:aws:sns:us-east-1:123456789012:RefundsBackupNotifications"

# Configuration file
CONFIG_FILE="/etc/brik/refunds/backup-config.sh"

# Load configuration file if exists
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Override with environment variables if set
[ -n "$BRIK_BACKUP_DIR" ] && BACKUP_DIR="$BRIK_BACKUP_DIR"
[ -n "$BRIK_S3_BUCKET" ] && S3_BUCKET="$BRIK_S3_BUCKET"
[ -n "$BRIK_MONGO_URI" ] && MONGO_URI="$BRIK_MONGO_URI"
[ -n "$BRIK_MONGO_DB" ] && MONGO_DB="$BRIK_MONGO_DB"
[ -n "$BRIK_MONGO_RETENTION_DAYS" ] && MONGO_RETENTION_DAYS="$BRIK_MONGO_RETENTION_DAYS"
[ -n "$BRIK_CONFIG_RETENTION_DAYS" ] && CONFIG_RETENTION_DAYS="$BRIK_CONFIG_RETENTION_DAYS"
[ -n "$BRIK_LOGS_RETENTION_DAYS" ] && LOGS_RETENTION_DAYS="$BRIK_LOGS_RETENTION_DAYS"
[ -n "$BRIK_NOTIFICATION_EMAIL" ] && NOTIFICATION_EMAIL="$BRIK_NOTIFICATION_EMAIL"
[ -n "$BRIK_SNS_TOPIC_ARN" ] && SNS_TOPIC_ARN="$BRIK_SNS_TOPIC_ARN"

# Date format for backup directories
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${DATE}"
LOG_FILE="${BACKUP_DIR}/backup_${DATE}.log"

# Start logging to file
exec > >(tee -a "$LOG_FILE") 2>&1

# Log function
log() {
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1"
}

# Progress indicator
progress() {
    local pid=$1
    local message=$2
    local spin='-\|/'
    local i=0
    
    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) % 4 ))
        printf "\r[%c] %s..." "${spin:$i:1}" "$message"
        sleep 0.5
    done
    printf "\r[✓] %s... Done\n" "$message"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    # Send error notification
    send_notification "ERROR: Refunds Service Backup Failed" "The backup script encountered an error: $1\n\nCheck the log file for details: $LOG_FILE"
    exit 1
}

# Verify AWS CLI is installed
verify_aws_cli() {
    if [ "$SKIP_S3" = true ]; then
        return 0
    fi
    
    if ! command -v aws &> /dev/null; then
        error_exit "AWS CLI is not installed. Please install it to proceed or use --local-only option."
    fi
}

# Verify MongoDB tools are installed
verify_mongodb_tools() {
    if ! command -v mongodump &> /dev/null; then
        error_exit "MongoDB tools are not installed. Please install mongodump to proceed."
    fi
    
    # Check for mongosh or mongo
    if command -v mongosh &> /dev/null; then
        MONGO_SHELL="mongosh"
    elif command -v mongo &> /dev/null; then
        MONGO_SHELL="mongo"
    else
        log "Warning: Neither mongosh nor mongo shell is installed. Connection testing will be skipped."
        MONGO_SHELL=""
    fi
}

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR" || error_exit "Failed to create base backup directory: $BACKUP_DIR"
    fi
    
    if [ ! -d "$BACKUP_PATH" ]; then
        mkdir -p "$BACKUP_PATH" || error_exit "Failed to create backup directory: $BACKUP_PATH"
    fi
    log "Created backup directory: $BACKUP_PATH"
}

# Verify backup
verify_backup_file() {
    local backup_file=$1
    
    # Check if file exists
    if [ ! -f "$backup_file" ]; then
        error_exit "Backup file does not exist: $backup_file"
    fi
    
    # Check if file is not empty
    if [ ! -s "$backup_file" ]; then
        error_exit "Backup file is empty: $backup_file"
    fi
    
    # Additional verification for tar.gz files
    if [[ "$backup_file" == *.tar.gz ]]; then
        if ! tar -tzf "$backup_file" &> /dev/null; then
            error_exit "Backup file is not a valid tar.gz archive: $backup_file"
        fi
    fi
    
    log "Verified backup file: $backup_file"
}

# Check disk space
check_disk_space() {
    local required_space=$1  # in MB
    local directory=$2
    
    # Get available space in MB
    local available=$(df -m "$directory" | awk 'NR==2 {print $4}')
    
    if [ "$available" -lt "$required_space" ]; then
        error_exit "Not enough disk space. Required: ${required_space}MB, Available: ${available}MB in $directory"
    fi
    
    log "Disk space check passed. Available: ${available}MB in $directory"
}

# MongoDB backup function
backup_mongodb() {
    log "Starting MongoDB backup..."
    verify_mongodb_tools
    
    # Estimate space needed - rough estimate of 2x the database size
    # Get database size in MB if mongosh/mongo is available
    local db_size=500  # Default assumption: 500MB
    if [ -n "$MONGO_SHELL" ]; then
        if [ "$MONGO_SHELL" = "mongosh" ]; then
            db_size=$($MONGO_SHELL --quiet --eval "Math.ceil(db.stats().dataSize / 1024 / 1024)" "$MONGO_URI/$MONGO_DB" 2>/dev/null || echo 500)
        else
            db_size=$($MONGO_SHELL --quiet --eval "Math.ceil(db.stats().dataSize / 1024 / 1024)" "$MONGO_URI/$MONGO_DB" 2>/dev/null || echo 500)
        fi
    fi
    local required_space=$((db_size * 2))
    check_disk_space $required_space "$BACKUP_DIR"
    
    MONGO_BACKUP_PATH="${BACKUP_PATH}/mongodb"
    mkdir -p "$MONGO_BACKUP_PATH" || error_exit "Failed to create MongoDB backup directory"
    
    # Test MongoDB connection if shell is available
    if [ -n "$MONGO_SHELL" ]; then
        log "Testing MongoDB connection..."
        if [ "$MONGO_SHELL" = "mongosh" ]; then
            if ! mongosh --quiet --eval "db.adminCommand('ping')" "$MONGO_URI/$MONGO_DB" &> /dev/null; then
                error_exit "Failed to connect to MongoDB at $MONGO_URI/$MONGO_DB"
            fi
        else
            if ! mongo --quiet --eval "db.adminCommand('ping')" "$MONGO_URI/$MONGO_DB" &> /dev/null; then
                error_exit "Failed to connect to MongoDB at $MONGO_URI/$MONGO_DB"
            fi
        fi
    fi
    
    # Use mongodump for backup with progress indicator
    log "Running mongodump..."
    mongodump --uri="$MONGO_URI" --db="$MONGO_DB" --out="$MONGO_BACKUP_PATH" > /tmp/mongodump.log 2>&1 &
    MONGODUMP_PID=$!
    progress $MONGODUMP_PID "Backing up MongoDB"
    
    if ! wait $MONGODUMP_PID; then
        cat /tmp/mongodump.log
        error_exit "MongoDB backup failed"
    fi
    
    # Compress the backup
    log "Compressing MongoDB backup..."
    tar -czf "${MONGO_BACKUP_PATH}.tar.gz" -C "$MONGO_BACKUP_PATH" . > /dev/null 2>&1 &
    TAR_PID=$!
    progress $TAR_PID "Compressing MongoDB backup"
    
    if ! wait $TAR_PID; then
        error_exit "Failed to compress MongoDB backup"
    fi
    
    # Verify the backup
    verify_backup_file "${MONGO_BACKUP_PATH}.tar.gz"
    
    # Calculate size
    local backup_size=$(du -h "${MONGO_BACKUP_PATH}.tar.gz" | cut -f1)
    
    # Remove the uncompressed directory
    rm -rf "$MONGO_BACKUP_PATH"
    
    # Upload to S3 if not skip_s3
    if [ "$SKIP_S3" != true ]; then
        log "Uploading MongoDB backup to S3 (size: $backup_size)..."
        verify_aws_cli
        aws s3 cp "${MONGO_BACKUP_PATH}.tar.gz" "s3://${S3_BUCKET}/mongodb/${DATE}_mongodb.tar.gz" > /dev/null 2>&1 &
        S3_PID=$!
        progress $S3_PID "Uploading MongoDB backup to S3"
        
        if ! wait $S3_PID; then
            error_exit "Failed to upload MongoDB backup to S3"
        fi
    else
        log "Skipping S3 upload (--local-only was specified)"
    fi
    
    log "MongoDB backup completed successfully (size: $backup_size)"
    
    # Clean up old backups
    cleanup_old_backups "mongodb" $MONGO_RETENTION_DAYS
}

# Configuration backup function
backup_config() {
    log "Starting configuration backup..."
    CONFIG_BACKUP_PATH="${BACKUP_PATH}/config"
    mkdir -p "$CONFIG_BACKUP_PATH" || error_exit "Failed to create config backup directory"
    
    # Check if config directory exists
    if [ ! -d "/etc/brik/refunds" ]; then
        error_exit "Configuration directory does not exist: /etc/brik/refunds"
    fi
    
    # Estimate space needed
    local config_size=$(du -sm "/etc/brik/refunds" | cut -f1)
    local required_space=$((config_size * 2))
    check_disk_space $required_space "$BACKUP_DIR"
    
    # Backup configuration files
    log "Copying configuration files..."
    cp -r /etc/brik/refunds/* "$CONFIG_BACKUP_PATH/" || error_exit "Failed to copy configuration files"
    
    # Compress the backup
    log "Compressing configuration backup..."
    tar -czf "${CONFIG_BACKUP_PATH}.tar.gz" -C "$CONFIG_BACKUP_PATH" . > /dev/null 2>&1 &
    TAR_PID=$!
    progress $TAR_PID "Compressing configuration backup"
    
    if ! wait $TAR_PID; then
        error_exit "Failed to compress config backup"
    fi
    
    # Verify the backup
    verify_backup_file "${CONFIG_BACKUP_PATH}.tar.gz"
    
    # Calculate size
    local backup_size=$(du -h "${CONFIG_BACKUP_PATH}.tar.gz" | cut -f1)
    
    # Remove the uncompressed directory
    rm -rf "$CONFIG_BACKUP_PATH"
    
    # Upload to S3 if not skip_s3
    if [ "$SKIP_S3" != true ]; then
        log "Uploading configuration backup to S3 (size: $backup_size)..."
        verify_aws_cli
        aws s3 cp "${CONFIG_BACKUP_PATH}.tar.gz" "s3://${S3_BUCKET}/config/${DATE}_config.tar.gz" > /dev/null 2>&1 &
        S3_PID=$!
        progress $S3_PID "Uploading configuration backup to S3"
        
        if ! wait $S3_PID; then
            error_exit "Failed to upload config backup to S3"
        fi
    else
        log "Skipping S3 upload (--local-only was specified)"
    fi
    
    log "Configuration backup completed successfully (size: $backup_size)"
    
    # Clean up old backups
    cleanup_old_backups "config" $CONFIG_RETENTION_DAYS
}

# Logs backup function
backup_logs() {
    log "Starting logs backup..."
    LOGS_BACKUP_PATH="${BACKUP_PATH}/logs"
    mkdir -p "$LOGS_BACKUP_PATH" || error_exit "Failed to create logs backup directory"
    
    # Check if logs directory exists
    if [ ! -d "/var/log/brik/refunds" ]; then
        error_exit "Logs directory does not exist: /var/log/brik/refunds"
    fi
    
    # Estimate space needed
    local logs_size=$(du -sm "/var/log/brik/refunds" | cut -f1)
    local required_space=$((logs_size * 2))
    check_disk_space $required_space "$BACKUP_DIR"
    
    # Backup log files
    log "Copying log files..."
    cp -r /var/log/brik/refunds/* "$LOGS_BACKUP_PATH/" || error_exit "Failed to copy log files"
    
    # Compress the backup
    log "Compressing logs backup..."
    tar -czf "${LOGS_BACKUP_PATH}.tar.gz" -C "$LOGS_BACKUP_PATH" . > /dev/null 2>&1 &
    TAR_PID=$!
    progress $TAR_PID "Compressing logs backup"
    
    if ! wait $TAR_PID; then
        error_exit "Failed to compress logs backup"
    fi
    
    # Verify the backup
    verify_backup_file "${LOGS_BACKUP_PATH}.tar.gz"
    
    # Calculate size
    local backup_size=$(du -h "${LOGS_BACKUP_PATH}.tar.gz" | cut -f1)
    
    # Remove the uncompressed directory
    rm -rf "$LOGS_BACKUP_PATH"
    
    # Upload to S3 if not skip_s3
    if [ "$SKIP_S3" != true ]; then
        log "Uploading logs backup to S3 (size: $backup_size)..."
        verify_aws_cli
        aws s3 cp "${LOGS_BACKUP_PATH}.tar.gz" "s3://${S3_BUCKET}/logs/${DATE}_logs.tar.gz" > /dev/null 2>&1 &
        S3_PID=$!
        progress $S3_PID "Uploading logs backup to S3"
        
        if ! wait $S3_PID; then
            error_exit "Failed to upload logs backup to S3"
        fi
    else
        log "Skipping S3 upload (--local-only was specified)"
    fi
    
    log "Logs backup completed successfully (size: $backup_size)"
    
    # Clean up old backups
    cleanup_old_backups "logs" $LOGS_RETENTION_DAYS
}

# Full backup function
backup_full() {
    log "Starting full backup..."
    backup_mongodb
    backup_config
    backup_logs
    log "Full backup completed successfully"
}

# Clean up old backups
cleanup_old_backups() {
    local backup_type=$1
    local retention_days=$2
    
    log "Cleaning up old $backup_type backups (retention: $retention_days days)..."
    
    # Calculate the cutoff date in seconds
    local cutoff_date=$(date -d "$retention_days days ago" +%s)
    
    # Clean up local backups
    log "Cleaning up local backups..."
    find "$BACKUP_DIR" -name "*_${backup_type}.tar.gz" -type f -mtime +$retention_days -exec rm -f {} \; || log "Warning: Failed to clean up local backup files"
    
    # Delete old backups from S3 if not skip_s3
    if [ "$SKIP_S3" != true ]; then
        verify_aws_cli
        log "Listing S3 backups for cleanup..."
        aws s3 ls "s3://${S3_BUCKET}/${backup_type}/" | while read -r line; do
            # Example line: 2023-05-01 12:00:01 123456 20230501_120000_${backup_type}.tar.gz
            backup_file=$(echo "$line" | awk '{print $4}')
            backup_date=$(echo "$line" | awk '{print $1}')
            
            # Extract date from filename if date format is not standard
            if [ -z "$backup_date" ] || [[ ! "$backup_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
                # Try to extract from filename pattern YYYYMMDD_HHMMSS
                if [[ "$backup_file" =~ ([0-9]{8})_([0-9]{6}) ]]; then
                    year=${BASH_REMATCH[1]:0:4}
                    month=${BASH_REMATCH[1]:4:2}
                    day=${BASH_REMATCH[1]:6:2}
                    backup_date="${year}-${month}-${day}"
                else
                    log "Warning: Could not parse date from: $line, skipping"
                    continue
                fi
            fi
            
            # Convert to seconds since epoch
            backup_seconds=$(date -d "$backup_date" +%s 2>/dev/null)
            if [ $? -ne 0 ]; then
                log "Warning: Invalid date format: $backup_date, skipping"
                continue
            fi
            
            if [ $backup_seconds -lt $cutoff_date ]; then
                log "Deleting old backup: $backup_file (date: $backup_date, older than $retention_days days)"
                aws s3 rm "s3://${S3_BUCKET}/${backup_type}/${backup_file}" || log "Warning: Failed to delete old backup: $backup_file"
            fi
        done
    fi
    
    log "Cleanup of old $backup_type backups completed"
}

# Send notification
send_notification() {
    local subject=$1
    local message=$2
    
    log "Sending notification: $subject"
    
    # Send email notification if mail command is available
    if command -v mail &> /dev/null; then
        echo -e "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL" || log "Warning: Failed to send email notification"
    else
        log "Warning: 'mail' command not found, skipping email notification"
    fi
    
    # Send SNS notification if not skip_s3
    if [ "$SKIP_S3" != true ] && [ -n "$SNS_TOPIC_ARN" ]; then
        verify_aws_cli
        aws sns publish --topic-arn "$SNS_TOPIC_ARN" --subject "$subject" --message "$message" || log "Warning: Failed to send SNS notification"
    fi
    
    log "Notification sent"
}

# Verify S3 bucket exists
verify_s3_bucket() {
    if [ "$SKIP_S3" = true ]; then
        return 0
    fi
    
    verify_aws_cli
    log "Verifying S3 bucket: $S3_BUCKET"
    
    if ! aws s3 ls "s3://${S3_BUCKET}" &> /dev/null; then
        log "S3 bucket does not exist, attempting to create..."
        aws s3 mb "s3://${S3_BUCKET}" || error_exit "Failed to create S3 bucket: $S3_BUCKET"
        
        # Enable versioning for added protection
        aws s3api put-bucket-versioning --bucket "$S3_BUCKET" --versioning-configuration Status=Enabled || log "Warning: Failed to enable versioning on S3 bucket"
        
        # Set lifecycle policy for old versions
        aws s3api put-bucket-lifecycle-configuration --bucket "$S3_BUCKET" --lifecycle-configuration '{
            "Rules": [
                {
                    "ID": "Delete old versions",
                    "Status": "Enabled",
                    "NoncurrentVersionExpiration": {
                        "NoncurrentDays": 90
                    }
                }
            ]
        }' || log "Warning: Failed to set lifecycle policy on S3 bucket"
    fi
    
    log "S3 bucket verified"
}

# Show backup status
show_backup_status() {
    local status=$1
    local start_time=$2
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Format duration as hours:minutes:seconds
    local hours=$((duration / 3600))
    local minutes=$(( (duration % 3600) / 60 ))
    local seconds=$((duration % 60))
    local formatted_duration=$(printf "%02d:%02d:%02d" $hours $minutes $seconds)
    
    log "========================================================"
    log "Backup Status: $status"
    log "Duration: $formatted_duration (H:M:S)"
    log "Backup Path: $BACKUP_PATH"
    log "Log File: $LOG_FILE"
    
    # Calculate total backup size
    local total_size=0
    if [ -d "$BACKUP_PATH" ]; then
        total_size=$(du -sh "$BACKUP_PATH" 2>/dev/null | cut -f1)
    fi
    log "Total Size: $total_size"
    
    log "========================================================"
}

# Show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Performs backups for the Refunds Service, including MongoDB database snapshots,"
    echo "configuration data backups, and log and audit data archiving."
    echo ""
    echo "Options:"
    echo "  --full           Perform full backup (MongoDB, config, logs)"
    echo "                   This is the default if no options are provided."
    echo "  --mongodb-only   Backup only MongoDB database"
    echo "  --config-only    Backup only configuration files"
    echo "  --logs-only      Backup only log files"
    echo "  --local-only     Skip uploading to S3, keep backups only locally"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Configuration:"
    echo "  The script uses these default locations:"
    echo "    - Backup directory: $BACKUP_DIR"
    echo "    - MongoDB connection: $MONGO_URI/$MONGO_DB"
    echo "    - Config files: /etc/brik/refunds/"
    echo "    - Log files: /var/log/brik/refunds/"
    echo ""
    echo "  Configuration can be overridden using:"
    echo "    - Configuration file: $CONFIG_FILE"
    echo "    - Environment variables (BRIK_BACKUP_DIR, BRIK_S3_BUCKET, etc.)"
    echo ""
    echo "Retention periods:"
    echo "  - MongoDB backups: $MONGO_RETENTION_DAYS days"
    echo "  - Configuration backups: $CONFIG_RETENTION_DAYS days"
    echo "  - Log backups: $LOGS_RETENTION_DAYS days (approx. 7 years)"
    echo ""
    echo "Examples:"
    echo "  $0                  # Perform full backup"
    echo "  $0 --mongodb-only   # Only backup MongoDB"
    echo "  $0 --local-only     # Perform full backup but don't upload to S3"
    echo ""
}

# Main function
main() {
    # Record start time
    local start_time=$(date +%s)
    
    log "========================================================"
    log "Starting Refunds Service Backup Script"
    log "Date: $(date)"
    log "========================================================"
    
    # Parse command-line arguments
    local do_mongodb=false
    local do_config=false
    local do_logs=false
    local do_full=false
    SKIP_S3=false
    
    if [ $# -eq 0 ]; then
        # Default to full backup if no arguments provided
        do_full=true
    else
        while [ $# -gt 0 ]; do
            case "$1" in
                --full)
                    do_full=true
                    ;;
                --mongodb-only)
                    do_mongodb=true
                    ;;
                --config-only)
                    do_config=true
                    ;;
                --logs-only)
                    do_logs=true
                    ;;
                --local-only)
                    SKIP_S3=true
                    ;;
                -h|--help)
                    show_help
                    exit 0
                    ;;
                *)
                    error_exit "Unknown option: $1. Use -h or --help for usage information."
                    ;;
            esac
            shift
        done
    fi
    
    # Verify prerequisites
    if [ "$SKIP_S3" != true ]; then
        verify_aws_cli
        verify_s3_bucket
    fi
    
    # Create backup directory
    create_backup_dir
    
    # Set trap for cleanup on exit
    trap 'log "Script interrupted or errored"; show_backup_status "FAILED" "$start_time"; exit 1' ERR INT TERM
    
    # Perform backups based on arguments
    if [ "$do_full" = true ]; then
        backup_full
    else
        [ "$do_mongodb" = true ] && backup_mongodb
        [ "$do_config" = true ] && backup_config
        [ "$do_logs" = true ] && backup_logs
    fi
    
    # Show backup status
    show_backup_status "SUCCESS" "$start_time"
    
    # Send success notification
    local message="The backup script completed all requested backup operations successfully.\n\nBackup Path: $BACKUP_PATH\nBackup Date: $(date)\nLog File: $LOG_FILE"
    if [ "$SKIP_S3" = true ]; then
        message="$message\n\nNote: Backups were stored locally only (--local-only was specified)."
    else
        message="$message\n\nBackups were uploaded to S3 bucket: $S3_BUCKET"
    fi
    
    send_notification "Refunds Service Backup Completed Successfully" "$message"
    
    log "Backup script completed successfully"
}

# Run the main function
main "$@"