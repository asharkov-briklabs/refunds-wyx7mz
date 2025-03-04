#!/usr/bin/env bash
#
# Refunds Service Deployment Script
# Version: 1.0.0
#
# This script automates the deployment of the Refunds Service to different environments
# (development, staging, production) with proper validation, verification, and rollback capabilities.
# It supports blue/green deployment with gradual traffic shifting and automatic rollback on failure.
#
# Dependencies:
# - aws-cli v2.0.0+
# - jq v1.6+
# - terraform v1.5+
#

set -eo pipefail

# Global variables
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
REPO_ROOT=$(git rev-parse --show-toplevel)
LOG_FILE="/tmp/refund-service-deployment-$(date +%Y%m%d-%H%M%S).log"
DEFAULT_ENVIRONMENT="dev"
DEFAULT_REGION="us-east-1"
SERVICES="refund-api refund-workers refund-web"
TERRAFORM_DIR="${REPO_ROOT}/infrastructure/terraform"

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage information
print_usage() {
    echo -e "${BLUE}Refunds Service Deployment Script${NC}"
    echo -e "Deploys the Refunds Service to specified environment with validation and rollback capabilities"
    echo
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  ${0} [options]"
    echo
    echo -e "${YELLOW}Options:${NC}"
    echo -e "  -e, --environment ENV   Environment to deploy to (dev, staging, prod) [default: ${DEFAULT_ENVIRONMENT}]"
    echo -e "  -s, --service SERVICE   Specific service to deploy (refund-api, refund-workers, refund-web) [default: all]"
    echo -e "  -t, --tag TAG           Container image tag to deploy [required]"
    echo -e "  -c, --canary            Use canary deployment with gradual traffic shifting"
    echo -e "  -r, --rollback          Perform rollback of the latest deployment"
    echo -e "  -i, --infra             Deploy infrastructure changes"
    echo -e "  -h, --help              Show this help message"
    echo
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  # Deploy all services with tag v1.2.3 to development"
    echo -e "  ${0} --tag v1.2.3"
    echo
    echo -e "  # Deploy refund-api with tag v1.2.3 to staging with canary deployment"
    echo -e "  ${0} --environment staging --service refund-api --tag v1.2.3 --canary"
    echo
    echo -e "  # Roll back latest deployment of refund-api in production"
    echo -e "  ${0} --environment prod --service refund-api --rollback"
}

# Function to log messages to console and log file
log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    # Ensure log directory exists
    mkdir -p "$(dirname "${LOG_FILE}")"
    
    # Format based on log level
    case "${level}" in
        "INFO")
            echo -e "${GREEN}[${timestamp}] [INFO]${NC} ${message}"
            ;;
        "WARN")
            echo -e "${YELLOW}[${timestamp}] [WARN]${NC} ${message}"
            ;;
        "ERROR")
            echo -e "${RED}[${timestamp}] [ERROR]${NC} ${message}"
            ;;
        *)
            echo -e "${BLUE}[${timestamp}] [${level}]${NC} ${message}"
            ;;
    esac
    
    # Also log to file without color codes
    echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
}

# Function to parse and validate command line arguments
parse_arguments() {
    # Default values
    ENVIRONMENT=${DEFAULT_ENVIRONMENT}
    SERVICE=""
    IMAGE_TAG=""
    CANARY_DEPLOYMENT=false
    ROLLBACK=false
    DEPLOY_INFRA=false
    
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -s|--service)
                SERVICE="$2"
                shift 2
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -c|--canary)
                CANARY_DEPLOYMENT=true
                shift
                ;;
            -r|--rollback)
                ROLLBACK=true
                shift
                ;;
            -i|--infra)
                DEPLOY_INFRA=true
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
    
    # Validate environment
    if [[ ! "${ENVIRONMENT}" =~ ^(dev|staging|prod)$ ]]; then
        log "ERROR" "Invalid environment: ${ENVIRONMENT}. Must be one of: dev, staging, prod"
        exit 1
    fi
    
    # If service is specified, validate it
    if [[ -n "${SERVICE}" ]] && [[ ! " ${SERVICES} " =~ " ${SERVICE} " ]]; then
        log "ERROR" "Invalid service: ${SERVICE}. Must be one of: ${SERVICES}"
        exit 1
    fi
    
    # Ensure tag is provided unless we're rolling back
    if [[ -z "${IMAGE_TAG}" ]] && [[ "${ROLLBACK}" == false ]]; then
        log "ERROR" "Image tag (-t, --tag) is required for deployment"
        exit 1
    fi
    
    # Log selected options
    log "INFO" "Deployment configuration:"
    log "INFO" "  Environment: ${ENVIRONMENT}"
    log "INFO" "  Services: ${SERVICE:-all services}"
    [[ -n "${IMAGE_TAG}" ]] && log "INFO" "  Image Tag: ${IMAGE_TAG}"
    [[ "${CANARY_DEPLOYMENT}" == true ]] && log "INFO" "  Deployment Type: Canary (gradual traffic shifting)"
    [[ "${ROLLBACK}" == true ]] && log "INFO" "  Mode: Rollback"
    [[ "${DEPLOY_INFRA}" == true ]] && log "INFO" "  Infrastructure: Will be updated"
    
    # Export for other functions to use
    export ENVIRONMENT SERVICE IMAGE_TAG CANARY_DEPLOYMENT ROLLBACK DEPLOY_INFRA
}

# Function to validate environment and prerequisites
validate_environment() {
    local environment="$1"
    log "INFO" "Validating environment and prerequisites..."
    
    # Check AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log "ERROR" "AWS CLI is not installed or not in PATH"
        return 1
    fi
    
    # Check jq is installed
    if ! command -v jq &> /dev/null; then
        log "ERROR" "jq is not installed or not in PATH"
        return 1
    fi
    
    # Check terraform is installed
    if ! command -v terraform &> /dev/null; then
        log "ERROR" "terraform is not installed or not in PATH"
        return 1
    fi
    
    # Verify AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log "ERROR" "AWS credentials not configured or insufficient permissions"
        return 1
    fi
    
    # Additional environment-specific validations
    case "${environment}" in
        prod)
            # Production requires stricter validation
            log "INFO" "Performing additional production validation..."
            
            # Check if we're on the main branch for production deployments
            local current_branch
            current_branch=$(git rev-parse --abbrev-ref HEAD)
            if [[ "${current_branch}" != "main" ]] && [[ "${ROLLBACK}" == false ]]; then
                log "ERROR" "Production deployments must be from the main branch (current: ${current_branch})"
                return 1
            fi
            
            # Verify we have production deployment permissions
            if ! aws iam get-user | grep -q "DeploymentRole"; then
                log "WARN" "Current user may not have sufficient permissions for production deployment"
                read -p "Continue anyway? (y/N) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log "INFO" "Deployment cancelled by user"
                    return 1
                fi
            fi
            ;;
            
        staging)
            # Staging validation
            log "INFO" "Validating staging environment..."
            ;;
            
        dev)
            # Development validation
            log "INFO" "Validating development environment..."
            ;;
    esac
    
    # Check environment configuration exists
    if [[ ! -d "${TERRAFORM_DIR}/${environment}" ]]; then
        log "ERROR" "Terraform configuration for '${environment}' not found at ${TERRAFORM_DIR}/${environment}"
        return 1
    fi
    
    log "INFO" "Environment and prerequisites validation successful"
    return 0
}

# Function to deploy infrastructure using Terraform
deploy_infrastructure() {
    local environment="$1"
    log "INFO" "Deploying infrastructure for ${environment} environment..."
    
    # Navigate to the correct Terraform directory
    cd "${TERRAFORM_DIR}/${environment}"
    
    # Initialize Terraform
    log "INFO" "Initializing Terraform..."
    if ! terraform init; then
        log "ERROR" "Terraform initialization failed"
        return 1
    fi
    
    # Create Terraform plan
    log "INFO" "Creating Terraform plan..."
    if ! terraform plan -out=tfplan; then
        log "ERROR" "Terraform plan creation failed"
        return 1
    fi
    
    # Apply Terraform changes
    log "INFO" "Applying Terraform changes..."
    if ! terraform apply -auto-approve tfplan; then
        log "ERROR" "Terraform apply failed"
        return 1
    fi
    
    # Save Terraform outputs to a file for later use
    log "INFO" "Saving Terraform outputs..."
    terraform output -json > "${REPO_ROOT}/infrastructure/terraform/${environment}/outputs.json"
    
    log "INFO" "Infrastructure deployment completed successfully"
    return 0
}

# Function to update ECS task definition with new container image
update_task_definition() {
    local service="$1"
    local image_tag="$2"
    local environment="$3"
    
    log "INFO" "Updating task definition for ${service} with image tag ${image_tag}..."
    
    # Get AWS account ID
    local account_id
    account_id=$(aws sts get-caller-identity --query Account --output text)
    
    # Set region based on environment or use default
    local region=${DEFAULT_REGION}
    if [[ "${environment}" == "prod" ]]; then
        # Production might use a different region
        region="us-east-1"
    fi
    
    # Get the current task definition
    local current_task_def_arn
    current_task_def_arn=$(aws ecs describe-services \
        --cluster "refund-service-${environment}" \
        --services "${service}" \
        --region "${region}" \
        --query "services[0].taskDefinition" \
        --output text)
    
    if [[ -z "${current_task_def_arn}" ]]; then
        log "ERROR" "Could not retrieve current task definition for ${service}"
        return 1
    fi
    
    log "INFO" "Current task definition: ${current_task_def_arn}"
    
    # Get the current task definition JSON
    local current_task_def_json
    current_task_def_json=$(aws ecs describe-task-definition \
        --task-definition "${current_task_def_arn}" \
        --region "${region}" \
        --query "taskDefinition" \
        --output json)
    
    # Update the container image in the task definition
    local new_task_def_json
    new_task_def_json=$(echo "${current_task_def_json}" | jq --arg IMAGE "${account_id}.dkr.ecr.${region}.amazonaws.com/${service}:${image_tag}" \
        '.containerDefinitions[0].image = $IMAGE')
    
    # Environment-specific configurations
    case "${environment}" in
        prod)
            # Production-specific settings
            new_task_def_json=$(echo "${new_task_def_json}" | jq '.containerDefinitions[0].environment += [{"name": "LOG_LEVEL", "value": "INFO"}]')
            ;;
        staging)
            # Staging-specific settings
            new_task_def_json=$(echo "${new_task_def_json}" | jq '.containerDefinitions[0].environment += [{"name": "LOG_LEVEL", "value": "INFO"}]')
            ;;
        dev)
            # Development-specific settings
            new_task_def_json=$(echo "${new_task_def_json}" | jq '.containerDefinitions[0].environment += [{"name": "LOG_LEVEL", "value": "DEBUG"}]')
            ;;
    esac
    
    # Remove fields that cannot be specified during task definition registration
    local cleaned_task_def_json
    cleaned_task_def_json=$(echo "${new_task_def_json}" | jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')
    
    # Create temporary file for task definition
    local temp_task_def_file
    temp_task_def_file=$(mktemp)
    echo "${cleaned_task_def_json}" > "${temp_task_def_file}"
    
    # Register the new task definition
    log "INFO" "Registering new task definition..."
    local new_task_def_arn
    new_task_def_arn=$(aws ecs register-task-definition \
        --cli-input-json "file://${temp_task_def_file}" \
        --region "${region}" \
        --query "taskDefinition.taskDefinitionArn" \
        --output text)
    
    # Remove temporary file
    rm "${temp_task_def_file}"
    
    if [[ -z "${new_task_def_arn}" ]]; then
        log "ERROR" "Failed to register new task definition"
        return 1
    fi
    
    log "INFO" "New task definition registered: ${new_task_def_arn}"
    echo "${new_task_def_arn}"
    return 0
}

# Function to perform a standard deployment
standard_deployment() {
    local service="$1"
    local task_definition="$2"
    local environment="$3"
    
    log "INFO" "Performing standard deployment for ${service} in ${environment}..."
    
    # Set region based on environment or use default
    local region=${DEFAULT_REGION}
    if [[ "${environment}" == "prod" ]]; then
        # Production might use a different region
        region="us-east-1"
    fi
    
    # Get cluster name
    local cluster_name="refund-service-${environment}"
    
    # Update the service with the new task definition
    log "INFO" "Updating ECS service with new task definition..."
    if ! aws ecs update-service \
        --cluster "${cluster_name}" \
        --service "${service}" \
        --task-definition "${task_definition}" \
        --region "${region}" \
        --force-new-deployment > /dev/null; then
        log "ERROR" "Failed to update ECS service"
        return 1
    fi
    
    # Monitor deployment
    log "INFO" "Monitoring deployment progress..."
    if ! monitor_deployment "${service}" "${environment}" 1800; then
        log "ERROR" "Deployment failed or timed out"
        return 1
    fi
    
    log "INFO" "Standard deployment completed successfully"
    return 0
}

# Function to perform a canary deployment with gradual traffic shifting
canary_deployment() {
    local service="$1"
    local task_definition="$2"
    local environment="$3"
    
    log "INFO" "Performing canary deployment for ${service} in ${environment}..."
    
    # Set region based on environment or use default
    local region=${DEFAULT_REGION}
    if [[ "${environment}" == "prod" ]]; then
        # Production might use a different region
        region="us-east-1"
    fi
    
    # Get cluster name and CodeDeploy application name
    local cluster_name="refund-service-${environment}"
    local app_name="refund-service-${environment}-deploy"
    local deployment_group="refund-service-${environment}-${service}-dg"
    
    # Check if CodeDeploy application and deployment group exist
    if ! aws deploy get-deployment-group \
        --application-name "${app_name}" \
        --deployment-group-name "${deployment_group}" \
        --region "${region}" &> /dev/null; then
        log "ERROR" "CodeDeploy application or deployment group not found. Check if Blue/Green deployment is properly set up."
        return 1
    fi
    
    # Get the current task definition ARN for the service
    local current_task_def_arn
    current_task_def_arn=$(aws ecs describe-services \
        --cluster "${cluster_name}" \
        --services "${service}" \
        --region "${region}" \
        --query "services[0].taskDefinition" \
        --output text)
    
    # Create the appspec.yml file for CodeDeploy
    local temp_appspec_file
    temp_appspec_file=$(mktemp)
    
    cat > "${temp_appspec_file}" << EOF
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: "${task_definition}"
        LoadBalancerInfo:
          ContainerName: "${service}"
          ContainerPort: 80
Hooks:
  - BeforeAllowTraffic: "LambdaFunctionToValidateBeforeTrafficShift"
  - AfterAllowTraffic: "LambdaFunctionToValidateAfterTrafficShift"
EOF
    
    # Create the deployment
    log "INFO" "Creating CodeDeploy deployment with traffic shifting..."
    local deployment_id
    deployment_id=$(aws deploy create-deployment \
        --application-name "${app_name}" \
        --deployment-group-name "${deployment_group}" \
        --revision revisionType=AppSpecContent,appSpecContent="{content='$(cat ${temp_appspec_file})'}" \
        --deployment-config-name CodeDeployDefault.ECSLinear10PercentEvery5Minutes \
        --description "Canary deployment for ${service} to ${task_definition}" \
        --region "${region}" \
        --query "deploymentId" \
        --output text)
    
    # Remove temporary file
    rm "${temp_appspec_file}"
    
    if [[ -z "${deployment_id}" ]]; then
        log "ERROR" "Failed to create CodeDeploy deployment"
        return 1
    fi
    
    log "INFO" "CodeDeploy deployment created: ${deployment_id}"
    
    # Monitor the CodeDeploy deployment
    log "INFO" "Monitoring CodeDeploy deployment..."
    local deployment_status
    local timeout=7200  # 2 hours (enough time for 10 steps of 5 minutes each plus buffer)
    local start_time
    start_time=$(date +%s)
    local current_time
    
    while true; do
        current_time=$(date +%s)
        if (( current_time - start_time > timeout )); then
            log "ERROR" "Deployment timed out after ${timeout} seconds"
            return 1
        fi
        
        deployment_status=$(aws deploy get-deployment \
            --deployment-id "${deployment_id}" \
            --region "${region}" \
            --query "deploymentInfo.status" \
            --output text)
        
        case "${deployment_status}" in
            "Succeeded")
                log "INFO" "Deployment succeeded"
                break
                ;;
            "Failed"|"Stopped"|"Stopped")
                log "ERROR" "Deployment failed with status: ${deployment_status}"
                return 1
                ;;
            *)
                local progress
                progress=$(aws deploy get-deployment \
                    --deployment-id "${deployment_id}" \
                    --region "${region}" \
                    --query "deploymentInfo.deploymentOverview" \
                    --output json 2>/dev/null || echo '{"pending":0,"inProgress":0,"succeeded":0,"failed":0,"skipped":0}')
                
                log "INFO" "Deployment in progress. Status: ${deployment_status}. Progress: $(echo "${progress}" | jq -c)"
                sleep 30
                ;;
        esac
    done
    
    log "INFO" "Canary deployment completed successfully"
    return 0
}

# Function to monitor ECS deployment progress
monitor_deployment() {
    local service="$1"
    local environment="$2"
    local timeout="${3:-900}"  # Default timeout of 15 minutes
    
    log "INFO" "Monitoring deployment for ${service} in ${environment}..."
    
    # Set region based on environment or use default
    local region=${DEFAULT_REGION}
    if [[ "${environment}" == "prod" ]]; then
        # Production might use a different region
        region="us-east-1"
    fi
    
    # Get cluster name
    local cluster_name="refund-service-${environment}"
    
    # Get the current deployment ID
    local deployment_id
    deployment_id=$(aws ecs describe-services \
        --cluster "${cluster_name}" \
        --services "${service}" \
        --region "${region}" \
        --query "services[0].deployments[?status=='PRIMARY'].id | [0]" \
        --output text)
    
    if [[ -z "${deployment_id}" ]]; then
        log "ERROR" "Could not retrieve deployment ID"
        return 1
    fi
    
    log "INFO" "Monitoring deployment ID: ${deployment_id}"
    
    # Monitor deployment progress
    local start_time
    start_time=$(date +%s)
    local current_time
    local deployment_done=false
    local deployment_success=false
    
    while [[ "${deployment_done}" == false ]]; do
        current_time=$(date +%s)
        if (( current_time - start_time > timeout )); then
            log "ERROR" "Deployment monitoring timed out after ${timeout} seconds"
            return 1
        fi
        
        # Get the current deployment status
        local deployment_info
        deployment_info=$(aws ecs describe-services \
            --cluster "${cluster_name}" \
            --services "${service}" \
            --region "${region}" \
            --query "services[0].deployments" \
            --output json)
        
        # Check if primary deployment ID has changed (indicates a new deployment started)
        local current_primary_id
        current_primary_id=$(echo "${deployment_info}" | jq -r '[.[] | select(.status=="PRIMARY")][0].id')
        
        if [[ "${current_primary_id}" != "${deployment_id}" ]]; then
            log "WARN" "Detected a new deployment in progress. Original deployment may have been superseded."
            deployment_id="${current_primary_id}"
            log "INFO" "Now monitoring deployment ID: ${deployment_id}"
        fi
        
        # Check if primary deployment is in steady state
        local running_count
        local desired_count
        local pending_count
        local failed_tasks
        
        running_count=$(echo "${deployment_info}" | jq -r "[.[] | select(.id==\"${deployment_id}\")][0].runningCount")
        desired_count=$(echo "${deployment_info}" | jq -r "[.[] | select(.id==\"${deployment_id}\")][0].desiredCount")
        pending_count=$(echo "${deployment_info}" | jq -r "[.[] | select(.id==\"${deployment_id}\")][0].pendingCount")
        failed_tasks=$(echo "${deployment_info}" | jq -r "[.[] | select(.id==\"${deployment_id}\")][0].failedTasks")
        
        log "INFO" "Deployment status: Running: ${running_count}/${desired_count}, Pending: ${pending_count}, Failed: ${failed_tasks}"
        
        # Check service events for potential issues
        local recent_events
        recent_events=$(aws ecs describe-services \
            --cluster "${cluster_name}" \
            --services "${service}" \
            --region "${region}" \
            --query "services[0].events[0:5]" \
            --output json)
        
        # Look for error events
        local error_events
        error_events=$(echo "${recent_events}" | jq -r '[.[] | select(.message | test("unable|error|failed|unhealthy"; "i"))]')
        
        if [[ "${error_events}" != "[]" ]]; then
            log "WARN" "Detected potential issues in service events:"
            echo "${error_events}" | jq -r '.[].message' | while read -r event_message; do
                log "WARN" "  ${event_message}"
            done
        fi
        
        # Check if deployment is complete
        if [[ "${running_count}" == "${desired_count}" ]] && [[ "${pending_count}" == "0" ]]; then
            # Additional verification - check if service is stable
            local service_status
            service_status=$(aws ecs describe-services \
                --cluster "${cluster_name}" \
                --services "${service}" \
                --region "${region}" \
                --query "services[0].status" \
                --output text)
            
            if [[ "${service_status}" == "ACTIVE" ]]; then
                log "INFO" "Deployment completed successfully"
                deployment_done=true
                deployment_success=true
            fi
        elif [[ "${failed_tasks}" -gt "2" ]]; then
            # Multiple failed tasks indicates a problem with the deployment
            log "ERROR" "Deployment failed with multiple task failures"
            deployment_done=true
            deployment_success=false
        fi
        
        if [[ "${deployment_done}" == false ]]; then
            # Sleep before checking again
            sleep 15
        fi
    done
    
    return $([[ "${deployment_success}" == true ]] && echo 0 || echo 1)
}

# Function to execute smoke tests against the deployed service
run_smoke_tests() {
    local service="$1"
    local environment="$2"
    
    log "INFO" "Running smoke tests for ${service} in ${environment}..."
    
    # Determine the appropriate test directory
    local test_dir="${REPO_ROOT}/tests/smoke/${service}"
    
    if [[ ! -d "${test_dir}" ]]; then
        log "WARN" "Smoke test directory not found: ${test_dir}"
        log "WARN" "Skipping smoke tests, assuming success"
        return 0
    fi
    
    # Get the service endpoint from Terraform outputs
    local endpoint
    if [[ -f "${REPO_ROOT}/infrastructure/terraform/${environment}/outputs.json" ]]; then
        endpoint=$(jq -r ".${service}_endpoint.value // empty" "${REPO_ROOT}/infrastructure/terraform/${environment}/outputs.json")
    fi
    
    if [[ -z "${endpoint}" ]]; then
        log "WARN" "Could not determine service endpoint for smoke tests"
        log "WARN" "Falling back to default endpoint pattern"
        
        # Fallback to standard endpoint patterns
        case "${environment}" in
            prod)
                endpoint="https://${service}.api.refunds.example.com"
                ;;
            staging)
                endpoint="https://${service}.api.staging.refunds.example.com"
                ;;
            dev)
                endpoint="https://${service}.api.dev.refunds.example.com"
                ;;
        esac
    fi
    
    # Export the endpoint for the tests to use
    export SERVICE_ENDPOINT="${endpoint}"
    
    # Run the smoke tests
    log "INFO" "Running smoke tests against endpoint: ${endpoint}"
    if cd "${test_dir}" && python -m pytest -v; then
        log "INFO" "Smoke tests passed successfully"
        return 0
    else
        log "ERROR" "Smoke tests failed"
        return 1
    fi
}

# Function to roll back a failed deployment
perform_rollback() {
    local service="$1"
    local environment="$2"
    
    log "INFO" "Performing rollback for ${service} in ${environment}..."
    
    # Set region based on environment or use default
    local region=${DEFAULT_REGION}
    if [[ "${environment}" == "prod" ]]; then
        # Production might use a different region
        region="us-east-1"
    fi
    
    # Get cluster name
    local cluster_name="refund-service-${environment}"
    
    # Get the current active task definition
    local current_task_def_arn
    current_task_def_arn=$(aws ecs describe-services \
        --cluster "${cluster_name}" \
        --services "${service}" \
        --region "${region}" \
        --query "services[0].taskDefinition" \
        --output text)
    
    if [[ -z "${current_task_def_arn}" ]]; then
        log "ERROR" "Could not retrieve current task definition for rollback"
        return 1
    fi
    
    # Get the current task definition revision number
    local current_revision
    current_revision=$(echo "${current_task_def_arn}" | sed -n 's/.*:\([0-9]\+\)$/\1/p')
    
    if [[ -z "${current_revision}" ]] || [[ "${current_revision}" -le 1 ]]; then
        log "ERROR" "Could not determine previous revision for rollback"
        return 1
    fi
    
    # Calculate the previous revision
    local previous_revision=$((current_revision - 1))
    local previous_task_def_arn
    previous_task_def_arn=$(echo "${current_task_def_arn}" | sed "s/:${current_revision}$/:${previous_revision}/")
    
    log "INFO" "Rolling back from ${current_task_def_arn} to ${previous_task_def_arn}"
    
    # Check if the previous task definition exists
    if ! aws ecs describe-task-definition \
        --task-definition "${previous_task_def_arn}" \
        --region "${region}" &> /dev/null; then
        log "ERROR" "Previous task definition not found: ${previous_task_def_arn}"
        return 1
    fi
    
    # Determine if we need to use standard or canary rollback
    local deployment_controller
    deployment_controller=$(aws ecs describe-services \
        --cluster "${cluster_name}" \
        --services "${service}" \
        --region "${region}" \
        --query "services[0].deploymentController.type" \
        --output text)
    
    if [[ "${deployment_controller}" == "CODE_DEPLOY" ]]; then
        log "INFO" "Service uses CodeDeploy for deployments, performing canary rollback..."
        
        # Get CodeDeploy application and deployment group
        local app_name="refund-service-${environment}-deploy"
        local deployment_group="refund-service-${environment}-${service}-dg"
        
        # Create rollback deployment
        log "INFO" "Creating CodeDeploy rollback deployment..."
        local deployment_id
        deployment_id=$(aws deploy create-deployment \
            --application-name "${app_name}" \
            --deployment-group-name "${deployment_group}" \
            --revision revisionType=AppSpecContent,appSpecContent="{content='{\"version\":0.0,\"Resources\":[{\"TargetService\":{\"Type\":\"AWS::ECS::Service\",\"Properties\":{\"TaskDefinition\":\"${previous_task_def_arn}\",\"LoadBalancerInfo\":{\"ContainerName\":\"${service}\",\"ContainerPort\":80}}}}]}'}" \
            --deployment-config-name CodeDeployDefault.ECSAllAtOnce \
            --description "Rollback deployment for ${service} to ${previous_task_def_arn}" \
            --region "${region}" \
            --query "deploymentId" \
            --output text)
        
        if [[ -z "${deployment_id}" ]]; then
            log "ERROR" "Failed to create CodeDeploy rollback deployment"
            return 1
        fi
        
        log "INFO" "CodeDeploy rollback deployment created: ${deployment_id}"
        
        # Monitor the CodeDeploy deployment
        log "INFO" "Monitoring CodeDeploy rollback deployment..."
        local deployment_status
        local timeout=1800  # 30 minutes
        local start_time
        start_time=$(date +%s)
        local current_time
        
        while true; do
            current_time=$(date +%s)
            if (( current_time - start_time > timeout )); then
                log "ERROR" "Rollback deployment timed out after ${timeout} seconds"
                return 1
            fi
            
            deployment_status=$(aws deploy get-deployment \
                --deployment-id "${deployment_id}" \
                --region "${region}" \
                --query "deploymentInfo.status" \
                --output text)
            
            case "${deployment_status}" in
                "Succeeded")
                    log "INFO" "Rollback deployment succeeded"
                    break
                    ;;
                "Failed"|"Stopped"|"Stopped")
                    log "ERROR" "Rollback deployment failed with status: ${deployment_status}"
                    return 1
                    ;;
                *)
                    log "INFO" "Rollback deployment in progress. Status: ${deployment_status}"
                    sleep 30
                    ;;
            esac
        done
    else
        # Standard ECS rollback
        log "INFO" "Service uses ECS for deployments, performing standard rollback..."
        
        # Update the service to use the previous task definition
        if ! aws ecs update-service \
            --cluster "${cluster_name}" \
            --service "${service}" \
            --task-definition "${previous_task_def_arn}" \
            --region "${region}" \
            --force-new-deployment > /dev/null; then
            log "ERROR" "Failed to update ECS service for rollback"
            return 1
        fi
        
        # Monitor rollback deployment
        log "INFO" "Monitoring rollback deployment progress..."
        if ! monitor_deployment "${service}" "${environment}" 900; then
            log "ERROR" "Rollback deployment failed or timed out"
            return 1
        fi
    fi
    
    log "INFO" "Rollback completed successfully"
    return 0
}

# Function to send notification about deployment status
send_deployment_notification() {
    local service="$1"
    local environment="$2"
    local status="$3"
    local details="$4"
    
    log "INFO" "Sending deployment notification for ${service} in ${environment} with status: ${status}"
    
    # Set region based on environment or use default
    local region=${DEFAULT_REGION}
    if [[ "${environment}" == "prod" ]]; then
        # Production might use a different region
        region="us-east-1"
    fi
    
    # Build the notification message
    local message
    read -r -d '' message << EOF
Deployment Status: ${status}
Service: ${service}
Environment: ${environment}
Date: $(date)
Details: ${details}
EOF
    
    # Determine the SNS topic based on environment and status
    local sns_topic
    
    case "${environment}" in
        prod)
            if [[ "${status}" == "SUCCESS" ]]; then
                sns_topic="arn:aws:sns:${region}:123456789012:refund-service-prod-deployments"
            else
                sns_topic="arn:aws:sns:${region}:123456789012:refund-service-prod-alerts"
            fi
            ;;
        staging)
            sns_topic="arn:aws:sns:${region}:123456789012:refund-service-staging-deployments"
            ;;
        dev)
            sns_topic="arn:aws:sns:${region}:123456789012:refund-service-dev-deployments"
            ;;
    esac
    
    # Check if the SNS topic exists
    if aws sns get-topic-attributes --topic-arn "${sns_topic}" --region "${region}" &> /dev/null; then
        # Send the notification
        aws sns publish \
            --topic-arn "${sns_topic}" \
            --subject "[${environment}] ${service} deployment ${status}" \
            --message "${message}" \
            --region "${region}" > /dev/null
        
        log "INFO" "Deployment notification sent to SNS topic: ${sns_topic}"
    else
        log "WARN" "SNS topic not found: ${sns_topic}. Notification not sent."
    fi
    
    # For error statuses in production, also send to PagerDuty if available
    if [[ "${environment}" == "prod" ]] && [[ "${status}" != "SUCCESS" ]]; then
        log "INFO" "Production deployment failure - would trigger PagerDuty alert here"
        # Actual PagerDuty integration would be implemented here
    fi
}

# Function to verify deployed service is functioning correctly
verify_deployment() {
    local service="$1"
    local environment="$2"
    
    log "INFO" "Verifying deployment of ${service} in ${environment}..."
    
    # Get the service endpoint from Terraform outputs
    local endpoint
    if [[ -f "${REPO_ROOT}/infrastructure/terraform/${environment}/outputs.json" ]]; then
        endpoint=$(jq -r ".${service}_endpoint.value // empty" "${REPO_ROOT}/infrastructure/terraform/${environment}/outputs.json")
    fi
    
    if [[ -z "${endpoint}" ]]; then
        log "WARN" "Could not determine service endpoint for verification"
        log "WARN" "Falling back to default endpoint pattern"
        
        # Fallback to standard endpoint patterns
        case "${environment}" in
            prod)
                endpoint="https://${service}.api.refunds.example.com"
                ;;
            staging)
                endpoint="https://${service}.api.staging.refunds.example.com"
                ;;
            dev)
                endpoint="https://${service}.api.dev.refunds.example.com"
                ;;
        esac
    fi
    
    # Check health endpoint
    log "INFO" "Checking health endpoint: ${endpoint}/health"
    if ! curl -s -f "${endpoint}/health" > /dev/null; then
        log "ERROR" "Health check failed for ${service}"
        return 1
    fi
    
    log "INFO" "Health check passed for ${service}"
    
    # Run smoke tests if applicable
    if ! run_smoke_tests "${service}" "${environment}"; then
        log "ERROR" "Smoke tests failed for ${service}"
        return 1
    fi
    
    log "INFO" "Deployment verification successful"
    return 0
}

# Main function
main() {
    # Parse command line arguments
    parse_arguments "$@"
    
    # Start the deployment process
    log "INFO" "Starting deployment process..."
    
    # Validate the environment and prerequisites
    if ! validate_environment "${ENVIRONMENT}"; then
        log "ERROR" "Environment validation failed"
        return 1
    fi
    
    # Check if this is a rollback operation
    if [[ "${ROLLBACK}" == true ]]; then
        log "INFO" "Rollback operation requested"
        
        # If service is not specified, prompt for it
        if [[ -z "${SERVICE}" ]]; then
            log "ERROR" "Service (-s, --service) is required for rollback"
            return 1
        fi
        
        # Perform the rollback
        if ! perform_rollback "${SERVICE}" "${ENVIRONMENT}"; then
            log "ERROR" "Rollback failed"
            send_deployment_notification "${SERVICE}" "${ENVIRONMENT}" "ROLLBACK_FAILED" "Rollback operation failed"
            return 1
        fi
        
        # Verify the rollback
        if ! verify_deployment "${SERVICE}" "${ENVIRONMENT}"; then
            log "ERROR" "Rollback verification failed"
            send_deployment_notification "${SERVICE}" "${ENVIRONMENT}" "ROLLBACK_VERIFICATION_FAILED" "Rollback verification failed"
            return 1
        }
        
        log "INFO" "Rollback completed successfully"
        send_deployment_notification "${SERVICE}" "${ENVIRONMENT}" "ROLLBACK_SUCCESS" "Rollback completed successfully"
        return 0
    fi
    
    # Deploy infrastructure if requested
    if [[ "${DEPLOY_INFRA}" == true ]]; then
        log "INFO" "Infrastructure deployment requested"
        
        if ! deploy_infrastructure "${ENVIRONMENT}"; then
            log "ERROR" "Infrastructure deployment failed"
            send_deployment_notification "infrastructure" "${ENVIRONMENT}" "FAILURE" "Infrastructure deployment failed"
            return 1
        fi
        
        log "INFO" "Infrastructure deployment completed successfully"
        send_deployment_notification "infrastructure" "${ENVIRONMENT}" "SUCCESS" "Infrastructure deployment completed successfully"
    fi
    
    # Determine which services to deploy
    local services_to_deploy
    if [[ -n "${SERVICE}" ]]; then
        services_to_deploy="${SERVICE}"
    else
        services_to_deploy="${SERVICES}"
    fi
    
    # Deploy each service
    local overall_success=true
    for service in ${services_to_deploy}; do
        log "INFO" "Processing deployment for service: ${service}"
        
        # Update task definition with new image tag
        local task_definition
        task_definition=$(update_task_definition "${service}" "${IMAGE_TAG}" "${ENVIRONMENT}")
        
        if [[ -z "${task_definition}" ]]; then
            log "ERROR" "Failed to update task definition for ${service}"
            send_deployment_notification "${service}" "${ENVIRONMENT}" "FAILURE" "Failed to update task definition"
            overall_success=false
            continue
        fi
        
        # Perform deployment (canary or standard)
        if [[ "${CANARY_DEPLOYMENT}" == true ]]; then
            log "INFO" "Using canary deployment with traffic shifting"
            
            if ! canary_deployment "${service}" "${task_definition}" "${ENVIRONMENT}"; then
                log "ERROR" "Canary deployment failed for ${service}"
                send_deployment_notification "${service}" "${ENVIRONMENT}" "FAILURE" "Canary deployment failed"
                
                # Attempt rollback
                log "INFO" "Attempting automatic rollback..."
                if ! perform_rollback "${service}" "${ENVIRONMENT}"; then
                    log "ERROR" "Automatic rollback failed for ${service}"
                    send_deployment_notification "${service}" "${ENVIRONMENT}" "ROLLBACK_FAILED" "Automatic rollback failed after deployment failure"
                else
                    log "INFO" "Automatic rollback successful for ${service}"
                    send_deployment_notification "${service}" "${ENVIRONMENT}" "ROLLBACK_SUCCESS" "Automatic rollback completed after deployment failure"
                fi
                
                overall_success=false
                continue
            fi
        else
            log "INFO" "Using standard deployment"
            
            if ! standard_deployment "${service}" "${task_definition}" "${ENVIRONMENT}"; then
                log "ERROR" "Standard deployment failed for ${service}"
                send_deployment_notification "${service}" "${ENVIRONMENT}" "FAILURE" "Standard deployment failed"
                
                # Attempt rollback
                log "INFO" "Attempting automatic rollback..."
                if ! perform_rollback "${service}" "${ENVIRONMENT}"; then
                    log "ERROR" "Automatic rollback failed for ${service}"
                    send_deployment_notification "${service}" "${ENVIRONMENT}" "ROLLBACK_FAILED" "Automatic rollback failed after deployment failure"
                else
                    log "INFO" "Automatic rollback successful for ${service}"
                    send_deployment_notification "${service}" "${ENVIRONMENT}" "ROLLBACK_SUCCESS" "Automatic rollback completed after deployment failure"
                fi
                
                overall_success=false
                continue
            fi
        fi
        
        # Verify deployment
        if ! verify_deployment "${service}" "${ENVIRONMENT}"; then
            log "ERROR" "Deployment verification failed for ${service}"
            send_deployment_notification "${service}" "${ENVIRONMENT}" "VERIFICATION_FAILED" "Deployment verification failed"
            
            # Attempt rollback
            log "INFO" "Attempting automatic rollback due to verification failure..."
            if ! perform_rollback "${service}" "${ENVIRONMENT}"; then
                log "ERROR" "Automatic rollback failed for ${service}"
                send_deployment_notification "${service}" "${ENVIRONMENT}" "ROLLBACK_FAILED" "Automatic rollback failed after verification failure"
            else
                log "INFO" "Automatic rollback successful for ${service}"
                send_deployment_notification "${service}" "${ENVIRONMENT}" "ROLLBACK_SUCCESS" "Automatic rollback completed after verification failure"
            fi
            
            overall_success=false
            continue
        fi
        
        # Deployment successful
        log "INFO" "Deployment of ${service} completed successfully"
        send_deployment_notification "${service}" "${ENVIRONMENT}" "SUCCESS" "Deployment completed successfully with image tag ${IMAGE_TAG}"
    done
    
    # Final status
    if [[ "${overall_success}" == true ]]; then
        log "INFO" "All deployments completed successfully"
        return 0
    else
        log "ERROR" "One or more deployments failed"
        return 1
    fi
}

# Execute the main function with all arguments
main "$@"