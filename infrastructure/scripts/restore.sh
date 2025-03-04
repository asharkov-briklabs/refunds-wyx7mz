#!/bin/bash
#
# Refunds Service Restore Script
# 
# This script performs restoration of Refunds Service components from backups
# in disaster recovery scenarios. It supports restoring MongoDB databases,
# configuration data, and other essential components with flexible options
# for different recovery scenarios.
#
# Usage:
#   ./restore.sh [OPTIONS]
#
# Options:
#   --full                Perform a full system restore
#   --db-only             Restore only the MongoDB databases
#   --config-only         Restore only the configuration data
#   --backup-id ID        Specify a backup ID to restore from
#   --timestamp TIME      Restore to a specific point in time (format: YYYY-MM-DDTHH:MM:SSZ)
#   --env ENVIRONMENT     Target environment (default: derived from config)
#   --dry-run             Validate the restore process without making changes
#   --help                Display this help message and exit
#
# Example:
#   ./restore.sh --full --backup-id backup-2023-05-15-12-00 --env production
#
# Author: Brik Engineering Team
# Version: 1.0.0
# Date: 2023-05-15

# Exit on any error
set -e

# Global variables
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
LOG_FILE="/var/log/refund-service/restore.log"
CONFIG_FILE="${SCRIPT_DIR}/../config/restore-config.json"
AWS_REGION="us-east-1"

# Default values
RESTORE_TYPE=""
BACKUP_ID=""
TIMESTAMP=""
TARGET_ENV=""
DRY_RUN=false

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

#
# Utility Functions
#

# Display help message
show_help() {
    echo "Refunds Service Restore Script"
    echo
    echo "Usage:"
    echo "  ./restore.sh [OPTIONS]"
    echo
    echo "Options:"
    echo "  --full                Perform a full system restore"
    echo "  --db-only             Restore only the MongoDB databases"
    echo "  --config-only         Restore only the configuration data"
    echo "  --backup-id ID        Specify a backup ID to restore from"
    echo "  --timestamp TIME      Restore to a specific point in time (format: YYYY-MM-DDTHH:MM:SSZ)"
    echo "  --env ENVIRONMENT     Target environment (default: derived from config)"
    echo "  --dry-run             Validate the restore process without making changes"
    echo "  --help                Display this help message and exit"
    echo
    echo "Example:"
    echo "  ./restore.sh --full --backup-id backup-2023-05-15-12-00 --env production"
}

# Log messages to both console and log file with timestamp
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local log_message="[$timestamp] [$level] $message"
    
    echo "$log_message"
    echo "$log_message" >> "$LOG_FILE"
}

# Checks if required tools and dependencies are installed
check_dependencies() {
    log "INFO" "Checking dependencies..."
    
    # Check for AWS CLI
    if ! command -v aws &> /dev/null; then
        log "ERROR" "AWS CLI not found. Please install it and try again."
        return 1
    fi
    
    # Check for MongoDB tools
    if ! command -v mongorestore &> /dev/null; then
        log "ERROR" "MongoDB tools not found. Please install mongodb-tools package and try again."
        return 1
    fi
    
    # Check for jq for JSON parsing
    if ! command -v jq &> /dev/null; then
        log "ERROR" "jq not found. Please install jq package and try again."
        return 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log "ERROR" "AWS credentials not configured or insufficient permissions."
        return 1
    fi
    
    log "INFO" "All dependencies are available."
    return 0
}

# Loads configuration from config file
load_config() {
    log "INFO" "Loading configuration from $CONFIG_FILE..."
    
    if [ ! -f "$CONFIG_FILE" ]; then
        log "ERROR" "Configuration file not found: $CONFIG_FILE"
        return 1
    fi
    
    # Read and parse configuration
    if ! config=$(jq -r '.' "$CONFIG_FILE"); then
        log "ERROR" "Failed to parse configuration file."
        return 1
    fi
    
    # Extract configuration values
    AWS_REGION=$(jq -r '.aws_region // "us-east-1"' <<< "$config")
    S3_BACKUP_BUCKET=$(jq -r '.s3_backup_bucket' <<< "$config")
    S3_CONFIG_BUCKET=$(jq -r '.s3_config_bucket' <<< "$config")
    MONGODB_HOST=$(jq -r '.mongodb.host' <<< "$config")
    MONGODB_PORT=$(jq -r '.mongodb.port' <<< "$config")
    MONGODB_USERNAME=$(jq -r '.mongodb.username' <<< "$config")
    MONGODB_PASSWORD=$(jq -r '.mongodb.password' <<< "$config")
    NOTIFICATION_EMAIL=$(jq -r '.notification_email' <<< "$config")
    SNS_TOPIC_ARN=$(jq -r '.sns_topic_arn' <<< "$config")
    
    # Validate required configuration
    if [ -z "$S3_BACKUP_BUCKET" ] || [ "$S3_BACKUP_BUCKET" == "null" ]; then
        log "ERROR" "S3 backup bucket not defined in configuration."
        return 1
    fi
    
    # Set default environment if not specified
    if [ -z "$TARGET_ENV" ]; then
        TARGET_ENV=$(jq -r '.default_environment // "development"' <<< "$config")
        log "INFO" "Using default environment: $TARGET_ENV"
    fi
    
    log "INFO" "Configuration loaded successfully."
    return 0
}

# Parses command line arguments
parse_arguments() {
    local args=("$@")
    
    # If no arguments provided, show help
    if [ ${#args[@]} -eq 0 ]; then
        show_help
        return 1
    fi
    
    # Parse arguments
    while [ "$#" -gt 0 ]; do
        case "$1" in
            --full)
                RESTORE_TYPE="full"
                ;;
            --db-only)
                RESTORE_TYPE="database"
                ;;
            --config-only)
                RESTORE_TYPE="config"
                ;;
            --backup-id)
                if [ -n "$2" ]; then
                    BACKUP_ID="$2"
                    shift
                else
                    log "ERROR" "Backup ID not provided with --backup-id option."
                    return 1
                fi
                ;;
            --timestamp)
                if [ -n "$2" ]; then
                    TIMESTAMP="$2"
                    shift
                else
                    log "ERROR" "Timestamp not provided with --timestamp option."
                    return 1
                fi
                ;;
            --env)
                if [ -n "$2" ]; then
                    TARGET_ENV="$2"
                    shift
                else
                    log "ERROR" "Environment not provided with --env option."
                    return 1
                fi
                ;;
            --dry-run)
                DRY_RUN=true
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                show_help
                return 1
                ;;
        esac
        shift
    done
    
    # Validate arguments
    if [ -z "$RESTORE_TYPE" ]; then
        log "ERROR" "Restore type not specified. Use --full, --db-only, or --config-only."
        return 1
    fi
    
    if [ -z "$BACKUP_ID" ] && [ -z "$TIMESTAMP" ]; then
        log "ERROR" "Either --backup-id or --timestamp must be specified."
        return 1
    fi
    
    if [ -n "$BACKUP_ID" ] && [ -n "$TIMESTAMP" ]; then
        log "WARNING" "Both backup ID and timestamp specified. Using backup ID: $BACKUP_ID"
    fi
    
    log "INFO" "Arguments parsed successfully."
    log "INFO" "Restore type: $RESTORE_TYPE"
    log "INFO" "Target environment: $TARGET_ENV"
    if [ -n "$BACKUP_ID" ]; then
        log "INFO" "Backup ID: $BACKUP_ID"
    fi
    if [ -n "$TIMESTAMP" ]; then
        log "INFO" "Timestamp: $TIMESTAMP"
    fi
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "Dry run mode enabled. No changes will be made."
    fi
    
    return 0
}

#
# Core Restoration Functions
#

# Restores MongoDB databases from backups
restore_mongodb() {
    local backup_id="$1"
    local target_instance="$2"
    
    log "INFO" "Starting MongoDB restoration from backup: $backup_id"
    
    # Validate inputs
    if [ -z "$backup_id" ]; then
        log "ERROR" "Backup ID not provided for MongoDB restoration."
        return 1
    fi
    
    if [ -z "$target_instance" ]; then
        target_instance="$MONGODB_HOST:$MONGODB_PORT"
        log "INFO" "Using target MongoDB instance from config: $target_instance"
    fi
    
    # Create temporary directory for restoration
    local temp_dir=$(mktemp -d)
    log "INFO" "Created temporary directory for restoration: $temp_dir"
    
    # Construct S3 path
    local s3_path="s3://$S3_BACKUP_BUCKET/$TARGET_ENV/mongodb/$backup_id/"
    
    # Check if backup exists
    if ! aws s3 ls "$s3_path" --region "$AWS_REGION" &> /dev/null; then
        log "ERROR" "MongoDB backup not found at: $s3_path"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Download backup
    log "INFO" "Downloading MongoDB backup from S3: $s3_path"
    
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "DRY RUN: Would download backup from $s3_path to $temp_dir"
    else
        if ! aws s3 cp "$s3_path" "$temp_dir" --recursive --region "$AWS_REGION"; then
            log "ERROR" "Failed to download MongoDB backup from S3."
            rm -rf "$temp_dir"
            return 1
        fi
        
        log "INFO" "Successfully downloaded MongoDB backup."
        
        # Restore databases
        log "INFO" "Restoring MongoDB databases to $target_instance..."
        
        # Prepare mongorestore command
        local mongorestore_cmd="mongorestore --host $MONGODB_HOST --port $MONGODB_PORT"
        
        # Add authentication if provided
        if [ -n "$MONGODB_USERNAME" ] && [ -n "$MONGODB_PASSWORD" ]; then
            mongorestore_cmd="$mongorestore_cmd --username $MONGODB_USERNAME --password $MONGODB_PASSWORD --authenticationDatabase admin"
        fi
        
        # Add additional options
        mongorestore_cmd="$mongorestore_cmd --drop --dir $temp_dir"
        
        # Execute restoration
        if ! eval "$mongorestore_cmd"; then
            log "ERROR" "Failed to restore MongoDB databases."
            rm -rf "$temp_dir"
            return 1
        fi
        
        log "INFO" "Successfully restored MongoDB databases."
    fi
    
    # Clean up temporary directory
    rm -rf "$temp_dir"
    
    log "INFO" "MongoDB restoration completed successfully."
    return 0
}

# Restores configuration data from backups
restore_configuration_data() {
    local backup_id="$1"
    local target_path="$2"
    
    log "INFO" "Starting configuration data restoration from backup: $backup_id"
    
    # Validate inputs
    if [ -z "$backup_id" ]; then
        log "ERROR" "Backup ID not provided for configuration restoration."
        return 1
    fi
    
    if [ -z "$target_path" ]; then
        target_path="/etc/refund-service"
        log "INFO" "Using default target path: $target_path"
    fi
    
    # Create temporary directory for restoration
    local temp_dir=$(mktemp -d)
    log "INFO" "Created temporary directory for restoration: $temp_dir"
    
    # Construct S3 path
    local s3_path="s3://$S3_CONFIG_BUCKET/$TARGET_ENV/config/$backup_id.tar.gz"
    
    # Check if backup exists
    if ! aws s3 ls "$s3_path" --region "$AWS_REGION" &> /dev/null; then
        log "ERROR" "Configuration backup not found at: $s3_path"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Download backup
    log "INFO" "Downloading configuration backup from S3: $s3_path"
    
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "DRY RUN: Would download configuration backup from $s3_path to $temp_dir"
        log "INFO" "DRY RUN: Would extract and apply configuration to $target_path"
    else
        if ! aws s3 cp "$s3_path" "$temp_dir/config-backup.tar.gz" --region "$AWS_REGION"; then
            log "ERROR" "Failed to download configuration backup from S3."
            rm -rf "$temp_dir"
            return 1
        fi
        
        log "INFO" "Successfully downloaded configuration backup."
        
        # Extract configuration files
        log "INFO" "Extracting configuration files..."
        if ! tar -xzf "$temp_dir/config-backup.tar.gz" -C "$temp_dir"; then
            log "ERROR" "Failed to extract configuration files."
            rm -rf "$temp_dir"
            return 1
        fi
        
        # Ensure target directory exists
        mkdir -p "$target_path"
        
        # Copy configuration files to target path
        log "INFO" "Applying configuration to $target_path..."
        if ! cp -r "$temp_dir"/* "$target_path"/; then
            log "ERROR" "Failed to apply configuration files."
            rm -rf "$temp_dir"
            return 1
        fi
        
        # Set appropriate permissions
        chmod -R 640 "$target_path"/*
        chown -R refund-service:refund-service "$target_path" 2>/dev/null || true
        
        log "INFO" "Successfully applied configuration files."
    fi
    
    # Clean up temporary directory
    rm -rf "$temp_dir"
    
    log "INFO" "Configuration data restoration completed successfully."
    return 0
}

# Restores transaction records from replication or backups
restore_transaction_records() {
    local timestamp="$1"
    local target_db="$2"
    
    log "INFO" "Starting transaction records restoration to timestamp: $timestamp"
    
    # Validate inputs
    if [ -z "$timestamp" ]; then
        log "ERROR" "Timestamp not provided for transaction records restoration."
        return 1
    fi
    
    if [ -z "$target_db" ]; then
        target_db="refunds"
        log "INFO" "Using default target database: $target_db"
    fi
    
    # Convert timestamp to MongoDB-compatible format
    local mongo_timestamp=$(date -d "$timestamp" "+%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)
    if [ $? -ne 0 ]; then
        log "ERROR" "Invalid timestamp format. Please use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)."
        return 1
    fi
    
    log "INFO" "Using MongoDB timestamp: $mongo_timestamp"
    
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "DRY RUN: Would restore transaction records to timestamp: $mongo_timestamp"
    else
        # Prepare MongoDB command for point-in-time recovery
        local mongo_cmd="mongo --host $MONGODB_HOST --port $MONGODB_PORT"
        
        # Add authentication if provided
        if [ -n "$MONGODB_USERNAME" ] && [ -n "$MONGODB_PASSWORD" ]; then
            mongo_cmd="$mongo_cmd --username $MONGODB_USERNAME --password $MONGODB_PASSWORD --authenticationDatabase admin"
        fi
        
        # Create MongoDB script for point-in-time recovery
        local mongo_script=$(cat <<EOF
use $target_db;
db.adminCommand({
  restoreFromRecoveryPoint: 1,
  recoveryPointId: ISODate("$mongo_timestamp")
});
EOF
)
        
        # Execute restoration
        log "INFO" "Executing transaction record restoration..."
        if ! echo "$mongo_script" | eval "$mongo_cmd"; then
            log "ERROR" "Failed to restore transaction records."
            return 1
        fi
        
        log "INFO" "Successfully restored transaction records."
    fi
    
    log "INFO" "Transaction records restoration completed successfully."
    return 0
}

# Restores audit logs from S3 archive
restore_audit_logs() {
    local start_date="$1"
    local end_date="$2"
    local target_path="$3"
    
    log "INFO" "Starting audit logs restoration from $start_date to $end_date"
    
    # Validate inputs
    if [ -z "$start_date" ] || [ -z "$end_date" ]; then
        log "ERROR" "Date range not provided for audit logs restoration."
        return 1
    fi
    
    if [ -z "$target_path" ]; then
        target_path="/var/log/refund-service/audit"
        log "INFO" "Using default target path: $target_path"
    fi
    
    # Validate date formats
    if ! date -d "$start_date" &>/dev/null || ! date -d "$end_date" &>/dev/null; then
        log "ERROR" "Invalid date format. Please use YYYY-MM-DD format."
        return 1
    fi
    
    # Create temporary directory for restoration
    local temp_dir=$(mktemp -d)
    log "INFO" "Created temporary directory for restoration: $temp_dir"
    
    # Construct S3 path prefix
    local s3_path_prefix="s3://$S3_BACKUP_BUCKET/$TARGET_ENV/audit-logs/"
    
    # Generate list of dates between start and end
    local current_date="$start_date"
    local date_list=()
    
    while [ "$(date -d "$current_date" +%s)" -le "$(date -d "$end_date" +%s)" ]; do
        date_list+=("$current_date")
        current_date=$(date -d "$current_date + 1 day" +%Y-%m-%d)
    done
    
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "DRY RUN: Would restore audit logs for ${#date_list[@]} days to $target_path"
    else
        # Ensure target directory exists
        mkdir -p "$target_path"
        
        # Download and extract logs for each day
        for log_date in "${date_list[@]}"; do
            local year=$(date -d "$log_date" +%Y)
            local month=$(date -d "$log_date" +%m)
            local day=$(date -d "$log_date" +%d)
            
            local s3_log_path="${s3_path_prefix}${year}/${month}/${day}/"
            
            log "INFO" "Checking for audit logs at: $s3_log_path"
            
            # Check if logs exist for this date
            if aws s3 ls "$s3_log_path" --region "$AWS_REGION" &> /dev/null; then
                log "INFO" "Downloading audit logs for $log_date..."
                
                # Download logs
                if ! aws s3 cp "$s3_log_path" "$temp_dir/$log_date/" --recursive --region "$AWS_REGION"; then
                    log "WARNING" "Failed to download some audit logs for $log_date."
                    continue
                fi
                
                # Copy logs to target path
                mkdir -p "$target_path/$year/$month"
                if ! cp -r "$temp_dir/$log_date"/* "$target_path/$year/$month/"; then
                    log "WARNING" "Failed to copy some audit logs for $log_date."
                    continue
                fi
                
                log "INFO" "Successfully restored audit logs for $log_date."
            else
                log "WARNING" "No audit logs found for $log_date."
            fi
        done
        
        # Set appropriate permissions
        chmod -R 640 "$target_path"/*
        chown -R refund-service:refund-service "$target_path" 2>/dev/null || true
    fi
    
    # Clean up temporary directory
    rm -rf "$temp_dir"
    
    log "INFO" "Audit logs restoration completed."
    return 0
}

#
# Validation and Notification Functions
#

# Check MongoDB connectivity
check_mongodb_connectivity() {
    local mongo_cmd="mongo --host $MONGODB_HOST --port $MONGODB_PORT --eval 'db.adminCommand({ ping: 1 })'"
    
    # Add authentication if provided
    if [ -n "$MONGODB_USERNAME" ] && [ -n "$MONGODB_PASSWORD" ]; then
        mongo_cmd="$mongo_cmd --username $MONGODB_USERNAME --password $MONGODB_PASSWORD --authenticationDatabase admin"
    fi
    
    # Execute ping command
    if ! eval "$mongo_cmd" | grep -q '"ok" : 1'; then
        log "ERROR" "Failed to connect to MongoDB."
        return 1
    fi
    
    return 0
}

# Check data integrity
check_data_integrity() {
    local mongo_cmd="mongo --host $MONGODB_HOST --port $MONGODB_PORT --eval 'db.getSiblingDB(\"refunds\").getCollectionNames().length'"
    
    # Add authentication if provided
    if [ -n "$MONGODB_USERNAME" ] && [ -n "$MONGODB_PASSWORD" ]; then
        mongo_cmd="$mongo_cmd --username $MONGODB_USERNAME --password $MONGODB_PASSWORD --authenticationDatabase admin"
    fi
    
    # Execute collection count command
    local collection_count=$(eval "$mongo_cmd" | grep -o '[0-9]\+')
    
    if [ -z "$collection_count" ] || [ "$collection_count" -eq 0 ]; then
        log "ERROR" "No collections found in the refunds database."
        return 1
    fi
    
    log "INFO" "Found $collection_count collections in the refunds database."
    return 0
}

# Check configuration integrity
check_configuration_integrity() {
    local config_path="/etc/refund-service"
    
    # Check essential configuration files
    local required_files=("refund-service.conf" "parameter-defaults.json" "gateway-config.json")
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$config_path/$file" ]; then
            log "ERROR" "Required configuration file not found: $file"
            return 1
        fi
    done
    
    # Validate JSON syntax of key files
    for file in $(find "$config_path" -name "*.json"); do
        if ! jq '.' "$file" &> /dev/null; then
            log "ERROR" "Invalid JSON syntax in configuration file: $file"
            return 1
        fi
    done
    
    return 0
}

# Check services status
check_services_status() {
    local services=("refund-api" "refund-worker" "refund-scheduler")
    local all_running=true
    
    for service in "${services[@]}"; do
        if ! systemctl is-active --quiet "$service"; then
            log "WARNING" "Service not running: $service"
            all_running=false
        fi
    done
    
    return $all_running
}

# Performs validation checks after restoration
perform_post_restore_validation() {
    local restore_type="$1"
    
    log "INFO" "Performing post-restore validation for $restore_type restoration..."
    
    local validation_success=true
    local validation_details=()
    
    # Different validation steps based on restore type
    case "$restore_type" in
        full)
            # Database connectivity
            log "INFO" "Validating database connectivity..."
            if check_mongodb_connectivity; then
                validation_details+=("Database connectivity: SUCCESS")
            else
                validation_details+=("Database connectivity: FAILED")
                validation_success=false
            fi
            
            # Configuration validation
            log "INFO" "Validating configuration files..."
            if check_configuration_integrity; then
                validation_details+=("Configuration integrity: SUCCESS")
            else
                validation_details+=("Configuration integrity: FAILED")
                validation_success=false
            fi
            
            # Service status
            log "INFO" "Validating service status..."
            if check_services_status; then
                validation_details+=("Services status: SUCCESS")
            else
                validation_details+=("Services status: FAILED")
                validation_success=false
            fi
            ;;
            
        database)
            # Database connectivity
            log "INFO" "Validating database connectivity..."
            if check_mongodb_connectivity; then
                validation_details+=("Database connectivity: SUCCESS")
            else
                validation_details+=("Database connectivity: FAILED")
                validation_success=false
            fi
            
            # Data integrity
            log "INFO" "Validating data integrity..."
            if check_data_integrity; then
                validation_details+=("Data integrity: SUCCESS")
            else
                validation_details+=("Data integrity: FAILED")
                validation_success=false
            fi
            ;;
            
        config)
            # Configuration validation
            log "INFO" "Validating configuration files..."
            if check_configuration_integrity; then
                validation_details+=("Configuration integrity: SUCCESS")
            else
                validation_details+=("Configuration integrity: FAILED")
                validation_success=false
            fi
            ;;
    esac
    
    # Generate validation report
    local validation_report=""
    for detail in "${validation_details[@]}"; do
        validation_report="${validation_report}${detail}\n"
    done
    
    if [ "$validation_success" = true ]; then
        log "INFO" "Post-restore validation completed successfully."
    else
        log "WARNING" "Post-restore validation completed with issues."
    fi
    
    # Return validation results
    echo "{"
    echo "  \"success\": $validation_success,"
    echo "  \"details\": \"$(echo -e "$validation_report" | sed 's/"/\\"/g')\""
    echo "}"
    
    return 0
}

# Sends notifications about restore completion
notify_restore_completion() {
    local restore_type="$1"
    local restore_results="$2"
    
    log "INFO" "Sending restore completion notifications..."
    
    # Parse restore results
    local success=$(echo "$restore_results" | jq -r '.success')
    local details=$(echo "$restore_results" | jq -r '.details')
    
    # Format notification message
    local subject="Refund Service Restore: ${restore_type^} - $([ "$success" == "true" ] && echo "SUCCESS" || echo "FAILURE")"
    local message="Refund Service Restore Completion Report\n\n"
    message="${message}Restore Type: ${restore_type^}\n"
    message="${message}Environment: $TARGET_ENV\n"
    message="${message}Status: $([ "$success" == "true" ] && echo "SUCCESS" || echo "FAILURE")\n"
    message="${message}Timestamp: $(date "+%Y-%m-%d %H:%M:%S")\n\n"
    message="${message}Validation Details:\n$details\n\n"
    
    if [ "$success" != "true" ]; then
        message="${message}ATTENTION: Some validation checks failed. Please review the logs for details.\n"
        message="${message}Log file: $LOG_FILE\n"
    fi
    
    # Send email notification if configured
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        log "INFO" "Sending email notification to $NOTIFICATION_EMAIL..."
        
        if [ "$DRY_RUN" = true ]; then
            log "INFO" "DRY RUN: Would send email notification to $NOTIFICATION_EMAIL"
        else
            echo -e "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL"
            local mail_status=$?
            
            if [ $mail_status -ne 0 ]; then
                log "WARNING" "Failed to send email notification."
            else
                log "INFO" "Email notification sent successfully."
            fi
        fi
    fi
    
    # Send SNS notification if configured
    if [ -n "$SNS_TOPIC_ARN" ]; then
        log "INFO" "Sending SNS notification to $SNS_TOPIC_ARN..."
        
        if [ "$DRY_RUN" = true ]; then
            log "INFO" "DRY RUN: Would send SNS notification to $SNS_TOPIC_ARN"
        else
            local formatted_message=$(echo -e "$message" | sed 's/"/\\"/g' | tr -d '\n')
            local sns_message="{\"subject\": \"$subject\", \"message\": \"$formatted_message\"}"
            
            if ! aws sns publish --topic-arn "$SNS_TOPIC_ARN" --message "$sns_message" --region "$AWS_REGION"; then
                log "WARNING" "Failed to send SNS notification."
            else
                log "INFO" "SNS notification sent successfully."
            fi
        fi
    fi
    
    log "INFO" "Notification process completed."
    return 0
}

#
# Orchestration Functions
#

# Orchestrates a full system restoration
full_system_restore() {
    local backup_id="$1"
    
    log "INFO" "Starting full system restoration from backup: $backup_id"
    
    # Validate backup ID
    if [ -z "$backup_id" ] && [ -z "$TIMESTAMP" ]; then
        log "ERROR" "Neither backup ID nor timestamp provided for full system restoration."
        return 1
    fi
    
    # Use timestamp to derive backup ID if not specified
    if [ -z "$backup_id" ] && [ -n "$TIMESTAMP" ]; then
        backup_id=$(date -d "$TIMESTAMP" "+backup-%Y-%m-%d")
        log "INFO" "Using derived backup ID from timestamp: $backup_id"
    fi
    
    # Perform pre-restore checks
    log "INFO" "Performing pre-restore checks..."
    
    # Check if services should be stopped
    local stop_services=false
    if [ "$DRY_RUN" = false ]; then
        read -p "Do you want to stop services during restoration? (y/n): " stop_services_input
        if [[ "$stop_services_input" =~ ^[Yy]$ ]]; then
            stop_services=true
        fi
    fi
    
    # Stop services if requested
    if [ "$stop_services" = true ]; then
        log "INFO" "Stopping refund services..."
        systemctl stop refund-api refund-worker refund-scheduler || log "WARNING" "Failed to stop some services."
    fi
    
    # Restore configuration data
    log "INFO" "Restoring configuration data..."
    if ! restore_configuration_data "$backup_id" "/etc/refund-service"; then
        log "ERROR" "Failed to restore configuration data."
        
        # Restart services if they were stopped
        if [ "$stop_services" = true ]; then
            log "INFO" "Restarting services after failure..."
            systemctl start refund-api refund-worker refund-scheduler || log "WARNING" "Failed to restart some services."
        fi
        
        return 1
    fi
    
    # Restore MongoDB databases
    log "INFO" "Restoring MongoDB databases..."
    if ! restore_mongodb "$backup_id" "$MONGODB_HOST:$MONGODB_PORT"; then
        log "ERROR" "Failed to restore MongoDB databases."
        
        # Restart services if they were stopped
        if [ "$stop_services" = true ]; then
            log "INFO" "Restarting services after failure..."
            systemctl start refund-api refund-worker refund-scheduler || log "WARNING" "Failed to restart some services."
        fi
        
        return 1
    fi
    
    # Restore transaction records if timestamp provided
    if [ -n "$TIMESTAMP" ]; then
        log "INFO" "Restoring transaction records to timestamp: $TIMESTAMP..."
        if ! restore_transaction_records "$TIMESTAMP" "refunds"; then
            log "WARNING" "Failed to restore transaction records. Continuing with restoration."
        fi
    fi
    
    # Restart services if they were stopped
    if [ "$stop_services" = true ]; then
        log "INFO" "Restarting services..."
        systemctl start refund-api refund-worker refund-scheduler || log "WARNING" "Failed to restart some services."
    fi
    
    # Perform post-restore validation
    log "INFO" "Performing post-restore validation..."
    local validation_results=$(perform_post_restore_validation "full")
    
    # Send completion notification
    notify_restore_completion "full" "$validation_results"
    
    # Check validation success
    local success=$(echo "$validation_results" | jq -r '.success')
    if [ "$success" != "true" ]; then
        log "WARNING" "Full system restoration completed with validation issues."
        return 1
    fi
    
    log "INFO" "Full system restoration completed successfully."
    return 0
}

# Performs database-only restoration
database_only_restore() {
    local backup_id="$1"
    local target_instance="$2"
    
    log "INFO" "Starting database-only restoration from backup: $backup_id"
    
    # Validate backup ID
    if [ -z "$backup_id" ] && [ -z "$TIMESTAMP" ]; then
        log "ERROR" "Neither backup ID nor timestamp provided for database restoration."
        return 1
    fi
    
    # Use timestamp to derive backup ID if not specified
    if [ -z "$backup_id" ] && [ -n "$TIMESTAMP" ]; then
        backup_id=$(date -d "$TIMESTAMP" "+backup-%Y-%m-%d")
        log "INFO" "Using derived backup ID from timestamp: $backup_id"
    fi
    
    # Set default target instance if not provided
    if [ -z "$target_instance" ]; then
        target_instance="$MONGODB_HOST:$MONGODB_PORT"
    fi
    
    # Perform pre-restore checks
    log "INFO" "Performing pre-restore checks..."
    
    # Restore MongoDB databases
    log "INFO" "Restoring MongoDB databases..."
    if ! restore_mongodb "$backup_id" "$target_instance"; then
        log "ERROR" "Failed to restore MongoDB databases."
        return 1
    fi
    
    # Restore transaction records if timestamp provided
    if [ -n "$TIMESTAMP" ]; then
        log "INFO" "Restoring transaction records to timestamp: $TIMESTAMP..."
        if ! restore_transaction_records "$TIMESTAMP" "refunds"; then
            log "WARNING" "Failed to restore transaction records. Continuing with validation."
        fi
    fi
    
    # Perform post-restore validation
    log "INFO" "Performing post-restore validation..."
    local validation_results=$(perform_post_restore_validation "database")
    
    # Send completion notification
    notify_restore_completion "database" "$validation_results"
    
    # Check validation success
    local success=$(echo "$validation_results" | jq -r '.success')
    if [ "$success" != "true" ]; then
        log "WARNING" "Database restoration completed with validation issues."
        return 1
    fi
    
    log "INFO" "Database restoration completed successfully."
    return 0
}

# Performs configuration-only restoration
configuration_only_restore() {
    local backup_id="$1"
    local target_path="$2"
    
    log "INFO" "Starting configuration-only restoration from backup: $backup_id"
    
    # Validate backup ID
    if [ -z "$backup_id" ]; then
        log "ERROR" "Backup ID not provided for configuration restoration."
        return 1
    fi
    
    # Set default target path if not provided
    if [ -z "$target_path" ]; then
        target_path="/etc/refund-service"
    fi
    
    # Perform pre-restore checks
    log "INFO" "Performing pre-restore checks..."
    
    # Restore configuration data
    log "INFO" "Restoring configuration data..."
    if ! restore_configuration_data "$backup_id" "$target_path"; then
        log "ERROR" "Failed to restore configuration data."
        return 1
    fi
    
    # Perform post-restore validation
    log "INFO" "Performing post-restore validation..."
    local validation_results=$(perform_post_restore_validation "config")
    
    # Send completion notification
    notify_restore_completion "config" "$validation_results"
    
    # Check validation success
    local success=$(echo "$validation_results" | jq -r '.success')
    if [ "$success" != "true" ]; then
        log "WARNING" "Configuration restoration completed with validation issues."
        return 1
    fi
    
    log "INFO" "Configuration restoration completed successfully."
    return 0
}

#
# Main Function
#

# Main function that orchestrates the restore process
main() {
    local args=("$@")
    
    # Log script start
    log "INFO" "Refunds Service Restore Script started."
    log "INFO" "Script version: 1.0.0"
    
    # Check dependencies
    if ! check_dependencies; then
        log "ERROR" "Dependency check failed. Please install required dependencies."
        return 1
    fi
    
    # Load configuration
    if ! load_config; then
        log "ERROR" "Failed to load configuration."
        return 1
    fi
    
    # Parse command line arguments
    if ! parse_arguments "$@"; then
        log "ERROR" "Failed to parse command line arguments."
        return 1
    fi
    
    # Execute appropriate restore function based on type
    case "$RESTORE_TYPE" in
        full)
            if ! full_system_restore "$BACKUP_ID"; then
                log "ERROR" "Full system restoration failed."
                return 1
            fi
            ;;
            
        database)
            if ! database_only_restore "$BACKUP_ID" "$MONGODB_HOST:$MONGODB_PORT"; then
                log "ERROR" "Database-only restoration failed."
                return 1
            fi
            ;;
            
        config)
            if ! configuration_only_restore "$BACKUP_ID" "/etc/refund-service"; then
                log "ERROR" "Configuration-only restoration failed."
                return 1
            fi
            ;;
            
        *)
            log "ERROR" "Unknown restore type: $RESTORE_TYPE"
            return 1
            ;;
    esac
    
    log "INFO" "Refunds Service Restore Script completed successfully."
    return 0
}

# Execute main function with all arguments
main "$@"
exit $?