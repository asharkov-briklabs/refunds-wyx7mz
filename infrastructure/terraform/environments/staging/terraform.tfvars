# Refunds Service - Staging Environment Configuration
# =============================================================================

# General Settings
# -----------------------------------------------------------------------------
environment       = "staging"
project           = "refunds-service"
aws_region        = "us-east-1"
aws_account_id    = "456789012345"

# Resource Tags
# -----------------------------------------------------------------------------
tags = {
  Environment   = "staging"
  Project       = "refunds-service"
  ManagedBy     = "terraform"
  Team          = "platform-engineering"
  BusinessUnit  = "payments"
}

# Terraform State Management
# -----------------------------------------------------------------------------
tf_state_bucket          = "refunds-service-tfstate-staging"
tf_state_key             = "environments/staging/terraform.tfstate"
tf_state_dynamodb_table  = "refunds-service-tflock-staging"

# Network Configuration
# -----------------------------------------------------------------------------
vpc_cidr                 = "10.0.0.0/16"
public_subnet_cidrs      = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_app_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
private_data_subnet_cidrs = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
availability_zones       = ["us-east-1a", "us-east-1b", "us-east-1c"]
single_nat_gateway       = false  # Use multiple NAT gateways for high availability
enable_vpn_gateway       = true
enable_flow_logs         = true
flow_logs_retention_days = 90

# MongoDB Atlas Configuration
# -----------------------------------------------------------------------------
mongodb_atlas_org_id     = "5f8a942e12ab34cd56ef7890"
mongodb_project_name     = "refunds-service-staging"
mongodb_cluster_name     = "refunds-staging"
mongodb_instance_size    = "M30"
mongodb_disk_size_gb     = 50
mongodb_version          = "6.0"
mongodb_backup_enabled   = true
mongodb_retain_backups_days = 14
default_database_name    = "refunds"
app_username             = "refunds-service"
atlas_cidr_block         = "10.8.0.0/21"
sharded_cluster          = true
bi_connector_enabled     = true
secondary_regions        = []  # No multi-region in staging

# Redis Configuration
# -----------------------------------------------------------------------------
redis_cluster_id             = "refunds-redis-staging"
redis_node_type              = "cache.m5.large"
redis_num_cache_nodes        = 2
redis_engine_version         = "7.0"
redis_port                   = 6379
redis_snapshot_retention_limit = 7
redis_multi_az_enabled       = true
redis_automatic_failover_enabled = true
redis_at_rest_encryption_enabled = true
redis_transit_encryption_enabled = true
redis_alarm_cpu_threshold    = 70
redis_alarm_memory_threshold = 70

# ECS Service Configuration - API Service
# -----------------------------------------------------------------------------
api_service_cpu          = 1024  # 1 vCPU
api_service_memory       = 2048  # 2 GB
api_service_min_capacity = 3
api_service_max_capacity = 8

# ECS Service Configuration - Request Manager Service
# -----------------------------------------------------------------------------
request_manager_cpu          = 1024  # 1 vCPU
request_manager_memory       = 2048  # 2 GB
request_manager_min_capacity = 2
request_manager_max_capacity = 6

# ECS Service Configuration - Gateway Service
# -----------------------------------------------------------------------------
gateway_service_cpu          = 1024  # 1 vCPU
gateway_service_memory       = 2048  # 2 GB
gateway_service_min_capacity = 2
gateway_service_max_capacity = 5

# ECS Service Configuration - Parameter Service
# -----------------------------------------------------------------------------
parameter_service_cpu          = 512   # 0.5 vCPU
parameter_service_memory       = 1024  # 1 GB
parameter_service_min_capacity = 2
parameter_service_max_capacity = 4

# ECS Service Configuration - Reporting Service
# -----------------------------------------------------------------------------
reporting_service_cpu          = 1024  # 1 vCPU
reporting_service_memory       = 2048  # 2 GB
reporting_service_min_capacity = 1
reporting_service_max_capacity = 3

# Container and Deployment Configuration
# -----------------------------------------------------------------------------
container_image_tag                 = "staging"
cloudwatch_log_retention_in_days    = 90
cloudwatch_log_group_name           = "/ecs/refunds-service-staging"
cpu_utilization_high_threshold      = 70
cpu_utilization_low_threshold       = 30
scale_out_cooldown                  = 60   # 1 minute cooldown after scaling out
scale_in_cooldown                   = 300  # 5 minutes cooldown after scaling in
enable_service_discovery            = true
health_check_grace_period_seconds   = 60
deployment_maximum_percent          = 200
deployment_minimum_healthy_percent  = 100
enable_blue_green_deployment        = true
deployment_config_name              = "CodeDeployDefault.ECSLinear10PercentEvery1Minute"

# Security Configuration
# -----------------------------------------------------------------------------
enable_waf                     = true
waf_scope                      = "REGIONAL"
waf_managed_rule_groups        = [
  {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10
  },
  {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 20
  },
  {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 30
  }
]
enable_cloudtrail              = true
cloudtrail_retention_period    = 90
enable_key_rotation            = true
key_deletion_window_in_days    = 30
secrets_recovery_window_in_days = 30
enable_log_file_validation     = true

# Storage Configuration
# -----------------------------------------------------------------------------
document_bucket_name           = "refunds-service-documents-staging"
log_bucket_name                = "refunds-service-logs-staging"
document_retention_period_days = 180

# Monitoring and Performance
# -----------------------------------------------------------------------------
performance_insights_enabled        = true
performance_insights_retention_period = 7  # days
backup_retention_days               = 30