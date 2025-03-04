# ---------------------------------------------------------------------------
# Basic Environment Configuration
# ---------------------------------------------------------------------------

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["dev", "test", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, test, staging, prod."
  }
}

variable "project" {
  description = "Project name for the Refunds Service"
  type        = string
  default     = "refunds-service"
}

variable "aws_region" {
  description = "AWS region for deploying resources"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID where resources will be deployed"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Default tags to apply to all resources"
  type        = map(string)
  default     = {
    Environment = "prod"
    Project     = "refunds-service"
    ManagedBy   = "terraform"
    Team        = "platform-engineering"
  }
}

# ---------------------------------------------------------------------------
# Terraform State Management
# ---------------------------------------------------------------------------

variable "tf_state_bucket" {
  description = "S3 bucket name for storing Terraform state"
  type        = string
  default     = "refunds-service-tfstate-prod"
}

variable "tf_state_key" {
  description = "S3 key for the Terraform state file"
  type        = string
  default     = "environments/prod/terraform.tfstate"
}

variable "tf_state_dynamodb_table" {
  description = "DynamoDB table for Terraform state locking"
  type        = string
  default     = "refunds-service-tflock-prod"
}

# ---------------------------------------------------------------------------
# VPC and Networking Configuration
# ---------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for private application subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "private_data_subnet_cidrs" {
  description = "CIDR blocks for private data subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

variable "availability_zones" {
  description = "Availability zones for the subnets"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "single_nat_gateway" {
  description = "Whether to use a single NAT Gateway (false for high availability in production)"
  type        = bool
  default     = false
}

variable "enable_vpn_gateway" {
  description = "Whether to enable VPN Gateway"
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Whether to enable VPC flow logs"
  type        = bool
  default     = true
}

variable "flow_logs_retention_days" {
  description = "Number of days to retain flow logs"
  type        = number
  default     = 365
}

# ---------------------------------------------------------------------------
# MongoDB Atlas Configuration
# ---------------------------------------------------------------------------

variable "mongodb_atlas_public_key" {
  description = "MongoDB Atlas public API key"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_private_key" {
  description = "MongoDB Atlas private API key"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_org_id" {
  description = "MongoDB Atlas organization ID"
  type        = string
  default     = "5f8a942e12ab34cd56ef7890"
}

variable "mongodb_project_name" {
  description = "MongoDB Atlas project name"
  type        = string
  default     = "refunds-service-prod"
}

variable "mongodb_cluster_name" {
  description = "MongoDB Atlas cluster name"
  type        = string
  default     = "refunds-prod"
}

variable "mongodb_instance_size" {
  description = "MongoDB Atlas instance size (larger for production workloads)"
  type        = string
  default     = "M50"
}

variable "mongodb_disk_size_gb" {
  description = "MongoDB Atlas disk size in GB"
  type        = number
  default     = 100
}

variable "mongodb_version" {
  description = "MongoDB version"
  type        = string
  default     = "6.0"
}

variable "mongodb_backup_enabled" {
  description = "Whether to enable MongoDB backups"
  type        = bool
  default     = true
}

variable "mongodb_retain_backups_days" {
  description = "Number of days to retain MongoDB backups"
  type        = number
  default     = 28
}

variable "default_database_name" {
  description = "Default MongoDB database name"
  type        = string
  default     = "refunds"
}

variable "app_username" {
  description = "Application username for MongoDB authentication"
  type        = string
  default     = "refunds-service"
}

variable "atlas_cidr_block" {
  description = "CIDR block for MongoDB Atlas IP access list"
  type        = string
  default     = "10.8.0.0/21"
}

variable "sharded_cluster" {
  description = "Whether to create a sharded MongoDB cluster"
  type        = bool
  default     = true
}

variable "bi_connector_enabled" {
  description = "Whether to enable MongoDB BI Connector"
  type        = bool
  default     = true
}

variable "secondary_regions" {
  description = "Secondary regions for MongoDB Atlas cluster for disaster recovery"
  type        = list(string)
  default     = ["us-west-2", "eu-west-1"]
}

# ---------------------------------------------------------------------------
# Redis ElastiCache Configuration
# ---------------------------------------------------------------------------

variable "redis_cluster_id" {
  description = "Redis ElastiCache cluster identifier"
  type        = string
  default     = "refunds-redis-prod"
}

variable "redis_node_type" {
  description = "Redis ElastiCache node type for production workloads"
  type        = string
  default     = "cache.m5.xlarge"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 3
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 7
}

variable "redis_multi_az_enabled" {
  description = "Whether to enable multi-AZ for Redis"
  type        = bool
  default     = true
}

variable "redis_automatic_failover_enabled" {
  description = "Whether to enable automatic failover for Redis"
  type        = bool
  default     = true
}

variable "redis_at_rest_encryption_enabled" {
  description = "Whether to enable at-rest encryption for Redis"
  type        = bool
  default     = true
}

variable "redis_transit_encryption_enabled" {
  description = "Whether to enable in-transit encryption for Redis"
  type        = bool
  default     = true
}

variable "redis_alarm_cpu_threshold" {
  description = "CPU utilization threshold for Redis alarms"
  type        = number
  default     = 75
}

variable "redis_alarm_memory_threshold" {
  description = "Memory utilization threshold for Redis alarms"
  type        = number
  default     = 75
}

# ---------------------------------------------------------------------------
# ECS Service Configuration
# ---------------------------------------------------------------------------

variable "api_service_cpu" {
  description = "CPU units for Refund API Service (1 vCPU = 1024 units)"
  type        = number
  default     = 1024
}

variable "api_service_memory" {
  description = "Memory for Refund API Service (in MB)"
  type        = number
  default     = 2048
}

variable "api_service_min_capacity" {
  description = "Minimum number of tasks for Refund API Service"
  type        = number
  default     = 3
}

variable "api_service_max_capacity" {
  description = "Maximum number of tasks for Refund API Service"
  type        = number
  default     = 10
}

variable "request_manager_cpu" {
  description = "CPU units for Refund Request Manager (1 vCPU = 1024 units)"
  type        = number
  default     = 2048
}

variable "request_manager_memory" {
  description = "Memory for Refund Request Manager (in MB)"
  type        = number
  default     = 4096
}

variable "request_manager_min_capacity" {
  description = "Minimum number of tasks for Refund Request Manager"
  type        = number
  default     = 2
}

variable "request_manager_max_capacity" {
  description = "Maximum number of tasks for Refund Request Manager"
  type        = number
  default     = 8
}

variable "gateway_service_cpu" {
  description = "CPU units for Gateway Integration Service (1 vCPU = 1024 units)"
  type        = number
  default     = 1024
}

variable "gateway_service_memory" {
  description = "Memory for Gateway Integration Service (in MB)"
  type        = number
  default     = 2048
}

variable "gateway_service_min_capacity" {
  description = "Minimum number of tasks for Gateway Integration Service"
  type        = number
  default     = 2
}

variable "gateway_service_max_capacity" {
  description = "Maximum number of tasks for Gateway Integration Service"
  type        = number
  default     = 6
}

variable "parameter_service_cpu" {
  description = "CPU units for Parameter Resolution Service (1 vCPU = 1024 units)"
  type        = number
  default     = 512
}

variable "parameter_service_memory" {
  description = "Memory for Parameter Resolution Service (in MB)"
  type        = number
  default     = 1024
}

variable "parameter_service_min_capacity" {
  description = "Minimum number of tasks for Parameter Resolution Service"
  type        = number
  default     = 2
}

variable "parameter_service_max_capacity" {
  description = "Maximum number of tasks for Parameter Resolution Service"
  type        = number
  default     = 4
}

variable "reporting_service_cpu" {
  description = "CPU units for Reporting & Analytics Engine (1 vCPU = 1024 units)"
  type        = number
  default     = 2048
}

variable "reporting_service_memory" {
  description = "Memory for Reporting & Analytics Engine (in MB)"
  type        = number
  default     = 4096
}

variable "reporting_service_min_capacity" {
  description = "Minimum number of tasks for Reporting & Analytics Engine"
  type        = number
  default     = 1
}

variable "reporting_service_max_capacity" {
  description = "Maximum number of tasks for Reporting & Analytics Engine"
  type        = number
  default     = 3
}

variable "container_image_tag" {
  description = "Container image tag to deploy"
  type        = string
  default     = "prod"
}

# ---------------------------------------------------------------------------
# Scaling Configuration
# ---------------------------------------------------------------------------

variable "cpu_utilization_high_threshold" {
  description = "CPU utilization threshold for scaling out"
  type        = number
  default     = 70
}

variable "cpu_utilization_low_threshold" {
  description = "CPU utilization threshold for scaling in"
  type        = number
  default     = 30
}

variable "scale_out_cooldown" {
  description = "Cooldown period in seconds before another scale out action"
  type        = number
  default     = 300
}

variable "scale_in_cooldown" {
  description = "Cooldown period in seconds before another scale in action"
  type        = number
  default     = 600
}

variable "deployment_maximum_percent" {
  description = "The maximum percent of tasks that can be running during a deployment"
  type        = number
  default     = 200
}

variable "deployment_minimum_healthy_percent" {
  description = "The minimum percent of tasks that must remain healthy during a deployment"
  type        = number
  default     = 100
}

variable "health_check_grace_period_seconds" {
  description = "The health check grace period for ECS services in seconds"
  type        = number
  default     = 120
}

# ---------------------------------------------------------------------------
# Logging and Monitoring
# ---------------------------------------------------------------------------

variable "cloudwatch_log_retention_in_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 90
}

variable "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  type        = string
  default     = "/ecs/refunds-service-prod"
}

variable "enable_cloudtrail" {
  description = "Whether to enable CloudTrail for audit logging"
  type        = bool
  default     = true
}

variable "cloudtrail_retention_period" {
  description = "Number of days to retain CloudTrail logs"
  type        = number
  default     = 2555  # 7 years for compliance
}

variable "enable_log_file_validation" {
  description = "Whether to enable log file validation for CloudTrail"
  type        = bool
  default     = true
}

variable "performance_insights_enabled" {
  description = "Whether to enable Performance Insights for databases"
  type        = bool
  default     = true
}

variable "performance_insights_retention_period" {
  description = "Retention period in days for Performance Insights"
  type        = number
  default     = 14
}

variable "alarm_email_endpoint" {
  description = "Email endpoint for alarm notifications"
  type        = string
  default     = "platform-alerts@example.com"
}

# ---------------------------------------------------------------------------
# Backup and Retention
# ---------------------------------------------------------------------------

variable "backup_retention_days" {
  description = "Number of days to retain backups in production"
  type        = number
  default     = 90
}

variable "document_bucket_name" {
  description = "S3 bucket name for storing refund supporting documents"
  type        = string
  default     = "refunds-service-documents-prod"
}

variable "log_bucket_name" {
  description = "S3 bucket name for storing application logs"
  type        = string
  default     = "refunds-service-logs-prod"
}

variable "document_retention_period_days" {
  description = "Number of days to retain refund documents in standard storage"
  type        = number
  default     = 2555  # 7 years for compliance
}

# ---------------------------------------------------------------------------
# Security Configuration
# ---------------------------------------------------------------------------

variable "enable_waf" {
  description = "Whether to enable AWS WAF"
  type        = bool
  default     = true
}

variable "waf_scope" {
  description = "Scope for WAF (REGIONAL or CLOUDFRONT)"
  type        = string
  default     = "REGIONAL"
}

variable "waf_managed_rule_groups" {
  description = "AWS WAF managed rule groups to enable"
  type        = list(object({
    name     = string
    priority = number
  }))
  default = [
    { name = "AWSManagedRulesCommonRuleSet", priority = 10 },
    { name = "AWSManagedRulesSQLiRuleSet", priority = 20 },
    { name = "AWSManagedRulesKnownBadInputsRuleSet", priority = 30 }
  ]
}

variable "enable_key_rotation" {
  description = "Whether to enable KMS key rotation"
  type        = bool
  default     = true
}

variable "key_deletion_window_in_days" {
  description = "Waiting period before KMS key deletion"
  type        = number
  default     = 30
}

variable "secrets_recovery_window_in_days" {
  description = "Recovery window for deleted secrets"
  type        = number
  default     = 30
}

# ---------------------------------------------------------------------------
# Deployment Configuration
# ---------------------------------------------------------------------------

variable "enable_service_discovery" {
  description = "Whether to enable AWS Cloud Map service discovery"
  type        = bool
  default     = true
}

variable "enable_blue_green_deployment" {
  description = "Whether to enable CodeDeploy blue-green deployments"
  type        = bool
  default     = true
}

variable "deployment_config_name" {
  description = "The deployment configuration for CodeDeploy"
  type        = string
  default     = "CodeDeployDefault.ECSAllAtOnce"
}

# ---------------------------------------------------------------------------
# DNS and Certificate Configuration
# ---------------------------------------------------------------------------

variable "certificate_arn" {
  description = "ARN of the SSL certificate for the load balancer"
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS records"
  type        = string
  default     = null
}

variable "domain_name" {
  description = "Domain name for the Refunds Service"
  type        = string
  default     = "refunds.example.com"
}

# ---------------------------------------------------------------------------
# Disaster Recovery Configuration
# ---------------------------------------------------------------------------

variable "enable_disaster_recovery" {
  description = "Whether to enable cross-region disaster recovery configuration"
  type        = bool
  default     = true
}

variable "recovery_point_objective_minutes" {
  description = "Recovery Point Objective (RPO) in minutes"
  type        = number
  default     = 15
}

variable "recovery_time_objective_minutes" {
  description = "Recovery Time Objective (RTO) in minutes"
  type        = number
  default     = 60
}