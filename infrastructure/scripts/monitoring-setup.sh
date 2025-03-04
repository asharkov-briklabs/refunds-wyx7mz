#!/bin/bash
#
# monitoring-setup.sh - Automate the deployment and configuration of monitoring infrastructure
#
# This script sets up comprehensive monitoring for the Refunds Service, including:
# - CloudWatch dashboards and alarms
# - DataDog integration, dashboards, and monitors
# - X-Ray for distributed tracing
# - Log aggregation configuration
#
# It can be run as part of the infrastructure deployment process or independently.
#
# Version: 1.0.0

# Exit on error
set -e

# Utility to print colored output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"

# Default values
ENV="dev"
REGION="us-east-1"
SETUP_CLOUDWATCH=true
SETUP_DATADOG=true
SETUP_XRAY=true
SETUP_LOGS=true
VERBOSE=false
DATADOG_API_KEY=""
DATADOG_APP_KEY=""

# Print usage information
usage() {
    echo -e "Usage: $0 [options]"
    echo -e "\nThis script automates the deployment and configuration of monitoring infrastructure for the Refunds Service."
    echo -e "\nOptions:"
    echo -e "  -e, --environment ENV       Set environment (dev, test, staging, prod) (default: dev)"
    echo -e "  -r, --region REGION         Set AWS region (default: us-east-1)"
    echo -e "  --no-cloudwatch             Skip CloudWatch setup"
    echo -e "  --no-datadog                Skip DataDog setup"
    echo -e "  --no-xray                   Skip X-Ray setup"
    echo -e "  --no-logs                   Skip log aggregation setup"
    echo -e "  --datadog-api-key KEY       DataDog API key (will try to fetch from Secrets Manager if not provided)"
    echo -e "  --datadog-app-key KEY       DataDog application key (will try to fetch from Secrets Manager if not provided)"
    echo -e "  -v, --verbose               Enable verbose output"
    echo -e "  -h, --help                  Display this help message"
    echo -e "\nExamples:"
    echo -e "  $0 -e prod -r us-west-2     Setup monitoring in production environment in us-west-2 region"
    echo -e "  $0 --no-datadog             Setup all monitoring except DataDog"
    exit 1
}

# Parse command-line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--environment)
                ENV="$2"
                shift 2
                ;;
            -r|--region)
                REGION="$2"
                shift 2
                ;;
            --no-cloudwatch)
                SETUP_CLOUDWATCH=false
                shift
                ;;
            --no-datadog)
                SETUP_DATADOG=false
                shift
                ;;
            --no-xray)
                SETUP_XRAY=false
                shift
                ;;
            --no-logs)
                SETUP_LOGS=false
                shift
                ;;
            --datadog-api-key)
                DATADOG_API_KEY="$2"
                shift 2
                ;;
            --datadog-app-key)
                DATADOG_APP_KEY="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                usage
                ;;
        esac
    done

    # Validate environment
    if [[ ! "$ENV" =~ ^(dev|test|staging|prod)$ ]]; then
        echo -e "${RED}Invalid environment: $ENV. Must be one of: dev, test, staging, prod${NC}"
        exit 1
    fi

    # Print configuration if verbose
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${GREEN}Configuration:${NC}"
        echo -e "  Environment: $ENV"
        echo -e "  Region: $REGION"
        echo -e "  Setup CloudWatch: $SETUP_CLOUDWATCH"
        echo -e "  Setup DataDog: $SETUP_DATADOG"
        echo -e "  Setup X-Ray: $SETUP_XRAY"
        echo -e "  Setup Logs: $SETUP_LOGS"
    fi
}

# Check prerequisites
check_prerequisites() {
    local prerequisites_ok=true

    # Check AWS CLI
    if ! command -v aws &>/dev/null; then
        echo -e "${RED}Error: AWS CLI is not installed or not in PATH${NC}"
        echo -e "Please install AWS CLI: https://aws.amazon.com/cli/"
        prerequisites_ok=false
    else
        aws_version=$(aws --version 2>&1)
        echo -e "${GREEN}AWS CLI installed:${NC} $aws_version"
    fi

    # Check jq
    if ! command -v jq &>/dev/null; then
        echo -e "${RED}Error: jq is not installed or not in PATH${NC}"
        echo -e "Please install jq: https://stedolan.github.io/jq/download/"
        prerequisites_ok=false
    else
        jq_version=$(jq --version 2>&1)
        echo -e "${GREEN}jq installed:${NC} $jq_version"
    fi

    # Check curl
    if ! command -v curl &>/dev/null; then
        echo -e "${RED}Error: curl is not installed or not in PATH${NC}"
        echo -e "Please install curl"
        prerequisites_ok=false
    else
        curl_version=$(curl --version | head -n 1)
        echo -e "${GREEN}curl installed:${NC} $curl_version"
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        echo -e "${RED}Error: AWS credentials not configured or insufficient permissions${NC}"
        echo -e "Please configure AWS credentials: aws configure"
        prerequisites_ok=false
    else
        aws_identity=$(aws sts get-caller-identity --query "Arn" --output text)
        echo -e "${GREEN}AWS identity:${NC} $aws_identity"
    fi

    # Check or retrieve DataDog API keys if needed
    if [[ "$SETUP_DATADOG" == true ]]; then
        # If not provided as parameters, try to get from Secrets Manager
        if [[ -z "$DATADOG_API_KEY" || -z "$DATADOG_APP_KEY" ]]; then
            echo -e "${YELLOW}Retrieving DataDog API keys from AWS Secrets Manager...${NC}"
            
            # Try to get DataDog API key
            if [[ -z "$DATADOG_API_KEY" ]]; then
                DATADOG_API_KEY=$(aws secretsmanager get-secret-value \
                    --region "$REGION" \
                    --secret-id "datadog-api-key" \
                    --query "SecretString" --output text 2>/dev/null || echo "")
                
                if [[ -z "$DATADOG_API_KEY" ]]; then
                    echo -e "${RED}Error: DataDog API key not provided and not found in Secrets Manager${NC}"
                    echo -e "Please provide the API key using --datadog-api-key or add it to Secrets Manager"
                    prerequisites_ok=false
                else
                    echo -e "${GREEN}DataDog API key retrieved from Secrets Manager${NC}"
                fi
            fi
            
            # Try to get DataDog Application key
            if [[ -z "$DATADOG_APP_KEY" ]]; then
                DATADOG_APP_KEY=$(aws secretsmanager get-secret-value \
                    --region "$REGION" \
                    --secret-id "datadog-app-key" \
                    --query "SecretString" --output text 2>/dev/null || echo "")
                
                if [[ -z "$DATADOG_APP_KEY" ]]; then
                    echo -e "${RED}Error: DataDog Application key not provided and not found in Secrets Manager${NC}"
                    echo -e "Please provide the Application key using --datadog-app-key or add it to Secrets Manager"
                    prerequisites_ok=false
                else
                    echo -e "${GREEN}DataDog Application key retrieved from Secrets Manager${NC}"
                fi
            fi
            
            # Validate DataDog API keys
            if [[ -n "$DATADOG_API_KEY" && -n "$DATADOG_APP_KEY" ]]; then
                echo -e "${YELLOW}Validating DataDog API keys...${NC}"
                
                dd_validation=$(curl -s -o /dev/null -w "%{http_code}" \
                    "https://api.datadoghq.com/api/v1/validate" \
                    -H "Content-Type: application/json" \
                    -H "DD-API-KEY: $DATADOG_API_KEY" \
                    -H "DD-APPLICATION-KEY: $DATADOG_APP_KEY")
                
                if [[ "$dd_validation" == "200" ]]; then
                    echo -e "${GREEN}DataDog API keys are valid${NC}"
                else
                    echo -e "${RED}Error: DataDog API keys are invalid${NC}"
                    prerequisites_ok=false
                fi
            fi
        fi
    fi

    if [[ "$prerequisites_ok" != true ]]; then
        echo -e "${RED}Prerequisites check failed. Please fix the issues above and try again.${NC}"
        return 1
    fi

    echo -e "${GREEN}All prerequisites satisfied!${NC}"
    return 0
}

# Setup CloudWatch dashboards and alarms
setup_cloudwatch() {
    echo -e "${GREEN}Setting up CloudWatch dashboards and alarms...${NC}"

    # Load dashboard configuration
    local dashboard_file="${SCRIPT_DIR}/../monitoring/cloudwatch/dashboards/refund-service-dashboard.json"
    
    if [[ ! -f "$dashboard_file" ]]; then
        echo -e "${RED}Error: Dashboard configuration file not found: $dashboard_file${NC}"
        return 1
    fi

    echo -e "${YELLOW}Loading CloudWatch dashboard configuration...${NC}"
    local dashboard_json=$(cat "$dashboard_file")
    
    # Replace environment placeholders
    dashboard_json=$(echo "$dashboard_json" | sed "s/\${AWS::Region}/$REGION/g")
    dashboard_json=$(echo "$dashboard_json" | sed "s/\${Environment}/$ENV/g")
    
    # Create or update dashboard
    echo -e "${YELLOW}Creating/updating CloudWatch dashboard...${NC}"
    aws cloudwatch put-dashboard \
        --region "$REGION" \
        --dashboard-name "RefundService-$ENV" \
        --dashboard-body "$dashboard_json"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}CloudWatch dashboard created/updated successfully${NC}"
    else
        echo -e "${RED}Error creating/updating CloudWatch dashboard${NC}"
        return 1
    fi
    
    # Load alarm configuration
    local alarm_file="${SCRIPT_DIR}/../monitoring/cloudwatch/alarms/refund-service-alarms.json"
    
    if [[ ! -f "$alarm_file" ]]; then
        echo -e "${RED}Error: Alarm configuration file not found: $alarm_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Loading CloudWatch alarm configuration...${NC}"
    local alarms=$(jq -c '.alarms[]' "$alarm_file")
    
    # Create SNS topic for alarms if it doesn't exist
    local sns_topic_name="refund-service-alarms-$ENV"
    local sns_topic_arn=$(aws sns create-topic --name "$sns_topic_name" --region "$REGION" --query 'TopicArn' --output text)
    
    echo -e "${YELLOW}Using SNS topic: $sns_topic_arn${NC}"
    
    # Process each alarm
    echo "$alarms" | while read -r alarm; do
        local alarm_name=$(echo "$alarm" | jq -r '.name')
        local alarm_description=$(echo "$alarm" | jq -r '.description // .name')
        local alarm_metric=$(echo "$alarm" | jq -r '.metric')
        local alarm_namespace=$(echo "$alarm" | jq -r '.namespace // "RefundService"')
        local alarm_statistic=$(echo "$alarm" | jq -r '.statistic // "Average"')
        local alarm_period=$(echo "$alarm" | jq -r '.period // 300')
        local alarm_evaluation_periods=$(echo "$alarm" | jq -r '.evaluation_periods // 1')
        local alarm_threshold=$(echo "$alarm" | jq -r '.threshold')
        local alarm_comparison_operator=$(echo "$alarm" | jq -r '.comparison_operator // "GreaterThanThreshold"')
        
        # Add environment to alarm name
        alarm_name="$alarm_name-$ENV"
        
        echo -e "${YELLOW}Creating/updating CloudWatch alarm: $alarm_name${NC}"
        
        aws cloudwatch put-metric-alarm \
            --region "$REGION" \
            --alarm-name "$alarm_name" \
            --alarm-description "$alarm_description" \
            --metric-name "$alarm_metric" \
            --namespace "$alarm_namespace" \
            --statistic "$alarm_statistic" \
            --period "$alarm_period" \
            --evaluation-periods "$alarm_evaluation_periods" \
            --threshold "$alarm_threshold" \
            --comparison-operator "$alarm_comparison_operator" \
            --alarm-actions "$sns_topic_arn" \
            --ok-actions "$sns_topic_arn" \
            --dimensions "Name=Environment,Value=$ENV"
        
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}CloudWatch alarm $alarm_name created/updated successfully${NC}"
        else
            echo -e "${RED}Error creating/updating CloudWatch alarm $alarm_name${NC}"
            # Continue with next alarm
        fi
    done
    
    echo -e "${GREEN}CloudWatch setup completed${NC}"
    return 0
}

# Setup DataDog dashboards and monitors
setup_datadog() {
    echo -e "${GREEN}Setting up DataDog dashboards and monitors...${NC}"

    # Load dashboard configuration
    local dashboard_file="${SCRIPT_DIR}/../monitoring/datadog/dashboards/refund-performance-dashboard.json"
    
    if [[ ! -f "$dashboard_file" ]]; then
        echo -e "${RED}Error: DataDog dashboard configuration file not found: $dashboard_file${NC}"
        return 1
    fi

    echo -e "${YELLOW}Loading DataDog dashboard configuration...${NC}"
    local dashboard_json=$(cat "$dashboard_file")
    
    # Update dashboard title to include environment
    dashboard_json=$(echo "$dashboard_json" | jq --arg env "$ENV" '.title = "Refunds Service - " + $env + " Environment"')
    
    # Set default environment template variable
    dashboard_json=$(echo "$dashboard_json" | jq --arg env "$ENV" '.template_variables[0].default = $env')
    
    # Create or update DataDog dashboard
    echo -e "${YELLOW}Creating/updating DataDog dashboard...${NC}"
    curl -s -X POST "https://api.datadoghq.com/api/v1/dashboard" \
        -H "Content-Type: application/json" \
        -H "DD-API-KEY: $DATADOG_API_KEY" \
        -H "DD-APPLICATION-KEY: $DATADOG_APP_KEY" \
        -d "$dashboard_json" > /dev/null
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}DataDog dashboard created/updated successfully${NC}"
    else
        echo -e "${RED}Error creating/updating DataDog dashboard${NC}"
        return 1
    fi
    
    # Load monitor configuration
    local monitors_file="${SCRIPT_DIR}/../monitoring/datadog/monitors/refund-service-monitors.json"
    
    if [[ ! -f "$monitors_file" ]]; then
        echo -e "${RED}Error: DataDog monitor configuration file not found: $monitors_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Loading DataDog monitor configuration...${NC}"
    local monitors=$(jq -c '.monitors[]' "$monitors_file")
    
    # Process each monitor
    echo "$monitors" | while read -r monitor; do
        local monitor_name=$(echo "$monitor" | jq -r '.name')
        local monitor_type=$(echo "$monitor" | jq -r '.type')
        local monitor_query=$(echo "$monitor" | jq -r '.query')
        local monitor_message=$(echo "$monitor" | jq -r '.message')
        
        # Update query to include environment if needed
        if [[ "$monitor_query" == *"{env:production}"* ]]; then
            monitor_query=$(echo "$monitor_query" | sed "s/{env:production}/{env:$ENV}/g")
        fi
        
        # Add environment to monitor name
        monitor_name="$monitor_name [$ENV]"
        
        # Create monitor JSON payload
        local monitor_payload=$(jq -n \
            --arg name "$monitor_name" \
            --arg type "$monitor_type" \
            --arg query "$monitor_query" \
            --arg message "$monitor_message" \
            --argjson options "$(echo "$monitor" | jq '.options')" \
            --argjson tags "$(echo "$monitor" | jq '.tags // []')" \
            '{name: $name, type: $type, query: $query, message: $message, options: $options, tags: $tags}')
        
        # Add environment tag
        monitor_payload=$(echo "$monitor_payload" | jq --arg env "$ENV" '.tags += ["environment:" + $env]')
        
        echo -e "${YELLOW}Creating/updating DataDog monitor: $monitor_name${NC}"
        
        curl -s -X POST "https://api.datadoghq.com/api/v1/monitor" \
            -H "Content-Type: application/json" \
            -H "DD-API-KEY: $DATADOG_API_KEY" \
            -H "DD-APPLICATION-KEY: $DATADOG_APP_KEY" \
            -d "$monitor_payload" > /dev/null
        
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}DataDog monitor $monitor_name created/updated successfully${NC}"
        else
            echo -e "${RED}Error creating/updating DataDog monitor $monitor_name${NC}"
            # Continue with next monitor
        fi
    done
    
    echo -e "${GREEN}DataDog setup completed${NC}"
    return 0
}

# Setup X-Ray for distributed tracing
setup_xray() {
    echo -e "${GREEN}Setting up AWS X-Ray for distributed tracing...${NC}"
    
    # Create or update X-Ray sampling rule
    local sampling_rule_name="RefundService-$ENV"
    
    # Define sampling rule JSON
    local sampling_rule=$(cat <<EOF
{
    "SamplingRule": {
        "RuleName": "$sampling_rule_name",
        "ResourceARN": "*",
        "Priority": 10,
        "FixedRate": 0.05,
        "ReservoirSize": 5,
        "ServiceName": "refund-service",
        "ServiceType": "*",
        "Host": "*",
        "HTTPMethod": "*",
        "URLPath": "*",
        "Version": 1,
        "Attributes": {
            "environment": "$ENV"
        }
    }
}
EOF
)
    
    echo -e "${YELLOW}Creating/updating X-Ray sampling rule: $sampling_rule_name${NC}"
    
    # Check if the sampling rule already exists
    if aws xray get-sampling-rules --region "$REGION" | grep -q "\"RuleName\": \"$sampling_rule_name\""; then
        # Update existing rule
        aws xray update-sampling-rule \
            --region "$REGION" \
            --cli-input-json "$sampling_rule"
    else
        # Create new rule
        aws xray create-sampling-rule \
            --region "$REGION" \
            --cli-input-json "$sampling_rule"
    fi
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}X-Ray sampling rule created/updated successfully${NC}"
    else
        echo -e "${RED}Error creating/updating X-Ray sampling rule${NC}"
        return 1
    fi
    
    # Create X-Ray group
    local group_name="RefundService-$ENV"
    local group_filter="{\"environment\":\"$ENV\",\"service\":\"refund-service\"}"
    
    echo -e "${YELLOW}Creating/updating X-Ray group: $group_name${NC}"
    
    # Check if the group already exists
    if aws xray get-groups --region "$REGION" | grep -q "\"GroupName\": \"$group_name\""; then
        # Update existing group
        aws xray update-group \
            --region "$REGION" \
            --group-name "$group_name" \
            --filter-expression "$group_filter"
    else
        # Create new group
        aws xray create-group \
            --region "$REGION" \
            --group-name "$group_name" \
            --filter-expression "$group_filter"
    fi
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}X-Ray group created/updated successfully${NC}"
    else
        echo -e "${RED}Error creating/updating X-Ray group${NC}"
        return 1
    fi
    
    echo -e "${GREEN}X-Ray setup completed${NC}"
    return 0
}

# Setup log aggregation
setup_log_aggregation() {
    echo -e "${GREEN}Setting up log aggregation...${NC}"
    
    # Create CloudWatch Log Groups with appropriate retention periods
    local log_groups=(
        "/aws/ecs/refund-api-service-$ENV:90"
        "/aws/ecs/refund-request-manager-$ENV:90"
        "/aws/ecs/gateway-integration-service-$ENV:90"
        "/aws/ecs/parameter-resolution-service-$ENV:90"
        "/aws/lambda/refund-service-$ENV:30"
        "refund-service-audit-logs-$ENV:2555" # 7 years retention for audit logs
    )
    
    for log_group_info in "${log_groups[@]}"; do
        # Split the string to get log group name and retention period
        IFS=':' read -r log_group_name retention_days <<< "$log_group_info"
        
        echo -e "${YELLOW}Creating/updating CloudWatch Log Group: $log_group_name${NC}"
        
        # Create log group if it doesn't exist
        aws logs create-log-group \
            --region "$REGION" \
            --log-group-name "$log_group_name" 2>/dev/null || true
        
        # Set retention policy
        aws logs put-retention-policy \
            --region "$REGION" \
            --log-group-name "$log_group_name" \
            --retention-in-days "$retention_days"
        
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}CloudWatch Log Group $log_group_name created/updated successfully${NC}"
        else
            echo -e "${RED}Error creating/updating CloudWatch Log Group $log_group_name${NC}"
            # Continue with next log group
        fi
        
        # Add tags to the log group
        aws logs tag-log-group \
            --region "$REGION" \
            --log-group-name "$log_group_name" \
            --tags "Environment=$ENV,Service=refund-service"
    done
    
    # Create CloudWatch Metric Filters for key events
    echo -e "${YELLOW}Creating CloudWatch Metric Filters...${NC}"
    
    # Define metric filters - format: "logGroupName:filterName:filterPattern:metricNamespace:metricName:metricValue"
    local metric_filters=(
        "/aws/ecs/refund-api-service-$ENV:ApiErrorFilter:{$.level = \"ERROR\"}:RefundService:api.errors:1"
        "/aws/ecs/gateway-integration-service-$ENV:GatewayErrorFilter:{$.level = \"ERROR\" && $.component = \"gateway\"}:RefundService:gateway.errors:1"
        "/aws/ecs/refund-request-manager-$ENV:RefundFailedFilter:{$.event = \"REFUND_FAILED\"}:RefundService:refund.failed:1"
    )
    
    for filter_info in "${metric_filters[@]}"; do
        # Split the string to get filter components
        IFS=':' read -r log_group filter_name filter_pattern metric_namespace metric_name metric_value <<< "$filter_info"
        
        echo -e "${YELLOW}Creating/updating CloudWatch Metric Filter: $filter_name${NC}"
        
        # Create or update metric filter
        aws logs put-metric-filter \
            --region "$REGION" \
            --log-group-name "$log_group" \
            --filter-name "$filter_name" \
            --filter-pattern "$filter_pattern" \
            --metric-transformations \
                metricName="$metric_name",metricNamespace="$metric_namespace",metricValue="$metric_value"
        
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}CloudWatch Metric Filter $filter_name created/updated successfully${NC}"
        else
            echo -e "${RED}Error creating/updating CloudWatch Metric Filter $filter_name${NC}"
            # Continue with next filter
        fi
    done
    
    # Check if OpenSearch integration is required for this environment
    if [[ "$ENV" == "staging" || "$ENV" == "prod" ]]; then
        echo -e "${YELLOW}Setting up CloudWatch Logs to OpenSearch streaming...${NC}"
        
        # Check if OpenSearch domain exists
        local opensearch_domain="refund-service-logs-$ENV"
        
        if aws opensearch describe-domain --region "$REGION" --domain-name "$opensearch_domain" &>/dev/null; then
            echo -e "${GREEN}OpenSearch domain $opensearch_domain exists${NC}"
            
            # Get OpenSearch domain ARN
            local opensearch_arn=$(aws opensearch describe-domain \
                --region "$REGION" \
                --domain-name "$opensearch_domain" \
                --query 'DomainStatus.ARN' \
                --output text)
            
            # Create IAM role for CloudWatch Logs to OpenSearch subscription if it doesn't exist
            local role_name="CloudWatchLogsToOpenSearch-$ENV"
            
            if ! aws iam get-role --role-name "$role_name" &>/dev/null; then
                echo -e "${YELLOW}Creating IAM role for CloudWatch Logs to OpenSearch streaming...${NC}"
                
                # Create trust policy document
                local trust_policy=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "logs.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF
)
                
                # Create role
                aws iam create-role \
                    --role-name "$role_name" \
                    --assume-role-policy-document "$trust_policy"
                
                # Create and attach policy
                local policy_name="CloudWatchLogsToOpenSearchPolicy-$ENV"
                local policy_document=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "es:ESHttpPost"
            ],
            "Effect": "Allow",
            "Resource": "$opensearch_arn/*"
        }
    ]
}
EOF
)
                
                aws iam create-policy \
                    --policy-name "$policy_name" \
                    --policy-document "$policy_document"
                
                local policy_arn=$(aws iam list-policies \
                    --query "Policies[?PolicyName=='$policy_name'].Arn" \
                    --output text)
                
                aws iam attach-role-policy \
                    --role-name "$role_name" \
                    --policy-arn "$policy_arn"
            fi
            
            # Get role ARN
            local role_arn=$(aws iam get-role \
                --role-name "$role_name" \
                --query 'Role.Arn' \
                --output text)
            
            # Create subscription filter for each log group
            for log_group_info in "${log_groups[@]}"; do
                # Get just the log group name
                IFS=':' read -r log_group_name _ <<< "$log_group_info"
                
                echo -e "${YELLOW}Creating subscription filter for log group: $log_group_name${NC}"
                
                aws logs put-subscription-filter \
                    --region "$REGION" \
                    --log-group-name "$log_group_name" \
                    --filter-name "OpenSearchSubscription" \
                    --filter-pattern "" \
                    --destination-arn "$opensearch_arn" \
                    --role-arn "$role_arn"
                
                if [[ $? -eq 0 ]]; then
                    echo -e "${GREEN}Subscription filter for $log_group_name created successfully${NC}"
                else
                    echo -e "${RED}Error creating subscription filter for $log_group_name${NC}"
                    # Continue with next log group
                fi
            done
        else
            echo -e "${YELLOW}OpenSearch domain $opensearch_domain does not exist. Skipping log streaming setup.${NC}"
        fi
    fi
    
    echo -e "${GREEN}Log aggregation setup completed${NC}"
    return 0
}

# Main function
main() {
    # Parse command-line arguments
    parse_arguments "$@"
    
    # Check prerequisites
    check_prerequisites
    if [[ $? -ne 0 ]]; then
        exit 1
    fi
    
    # Setup CloudWatch
    if [[ "$SETUP_CLOUDWATCH" == true ]]; then
        setup_cloudwatch
        if [[ $? -ne 0 ]]; then
            echo -e "${RED}CloudWatch setup failed${NC}"
            # Continue with other setups
        fi
    else
        echo -e "${YELLOW}Skipping CloudWatch setup${NC}"
    fi
    
    # Setup DataDog
    if [[ "$SETUP_DATADOG" == true ]]; then
        setup_datadog
        if [[ $? -ne 0 ]]; then
            echo -e "${RED}DataDog setup failed${NC}"
            # Continue with other setups
        fi
    else
        echo -e "${YELLOW}Skipping DataDog setup${NC}"
    fi
    
    # Setup X-Ray
    if [[ "$SETUP_XRAY" == true ]]; then
        setup_xray
        if [[ $? -ne 0 ]]; then
            echo -e "${RED}X-Ray setup failed${NC}"
            # Continue with other setups
        fi
    else
        echo -e "${YELLOW}Skipping X-Ray setup${NC}"
    fi
    
    # Setup log aggregation
    if [[ "$SETUP_LOGS" == true ]]; then
        setup_log_aggregation
        if [[ $? -ne 0 ]]; then
            echo -e "${RED}Log aggregation setup failed${NC}"
            # Continue with other setups
        fi
    else
        echo -e "${YELLOW}Skipping log aggregation setup${NC}"
    fi
    
    echo -e "${GREEN}Monitoring setup complete!${NC}"
    return 0
}

# Execute main function with all command-line arguments
main "$@"