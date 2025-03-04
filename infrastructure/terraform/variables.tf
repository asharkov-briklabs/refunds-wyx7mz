# variables.tf - Defines all configurable parameters for the Refunds Service infrastructure

# Core project settings
variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "refunds-service"
}

variable "environment" {
  description = "Deployment environment (dev, test, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "test", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, test, staging, prod."
  }
}

variable "aws_region" {
  description = "Primary AWS region where the infrastructure will be deployed"
  type        = string
  default     = "us-east-1"
}

variable "secondary_region" {
  description = "Secondary AWS region for disaster recovery purposes"
  type        = string
  default     = "us-west-2"
}

variable "enable_dr" {
  description = "Whether to enable disaster recovery configuration in the secondary region"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Common resource tags to be applied to all resources"
  type        = map(string)
  default     = {}
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets, one per availability zone"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for private application subnets, one per availability zone"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "private_data_subnet_cidrs" {
  description = "CIDR blocks for private data subnets, one per availability zone"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

variable "availability_zones" {
  description = "List of availability zones to use in the primary region"
  type        = list(string)
  default     = null
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least two availability zones are required for high availability."
  }
}

variable "enable_nat_gateway" {
  description = "Whether to enable NAT Gateways for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Whether to use a single NAT Gateway across all availability zones (not recommended for production)"
  type        = bool
  default     = false
}

# DNS and Domains
variable "domain_name" {
  description = "Main domain name for the Refunds Service"
  type        = string
  default     = null
}

variable "api_subdomain" {
  description = "Subdomain for the Refunds API"
  type        = string
  default     = "api-refunds"
}

variable "ui_subdomain" {
  description = "Subdomain for the Refunds UI"
  type        = string
  default     = "refunds"
}

variable "admin_ui_subdomain" {
  description = "Subdomain for the Refunds Admin UI (Barracuda)"
  type        = string
  default     = "admin-refunds"
}

variable "enable_route53_health_checks" {
  description = "Whether to enable Route53 health checks for the endpoints"
  type        = bool
  default     = true
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  type        = string
  default     = null
}

# Storage
variable "s3_document_bucket_name" {
  description = "Name of the S3 bucket for storing refund supporting documents"
  type        = string
  default     = null
}

variable "s3_logs_bucket_name" {
  description = "Name of the S3 bucket for storing application logs"
  type        = string
  default     = null
}

variable "document_retention_days" {
  description = "Number of days to retain documents in S3"
  type        = number
  default     = 2555 # 7 years
  validation {
    condition     = var.document_retention_days >= 2555
    error_message = "Document retention must be at least 7 years (2555 days) for compliance."
  }
}

variable "logs_retention_days" {
  description = "Number of days to retain logs in S3"
  type        = number
  default     = 2555 # 7 years
  validation {
    condition     = var.logs_retention_days >= 2555
    error_message = "Log retention must be at least 7 years (2555 days) for compliance."
  }
}

variable "enable_s3_cross_region_replication" {
  description = "Whether to enable cross-region replication for S3 buckets"
  type        = bool
  default     = true
}

# SQS Queues
variable "sqs_standard_queue_names" {
  description = "Names of standard SQS queues to create"
  type        = list(string)
  default     = ["refund-request", "notification"]
}

variable "sqs_fifo_queue_names" {
  description = "Names of FIFO SQS queues to create"
  type        = list(string)
  default     = ["gateway-processing.fifo"]
}

variable "enable_sqs_encryption" {
  description = "Whether to enable encryption for SQS queues"
  type        = bool
  default     = true
}

# Security
variable "enable_waf" {
  description = "Whether to enable AWS WAF for the application load balancer"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Whether to enable AWS GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Whether to enable AWS CloudTrail for API audit logging"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Whether to enable AWS Config for configuration monitoring"
  type        = bool
  default     = true
}

variable "enable_securityhub" {
  description = "Whether to enable AWS Security Hub for security findings"
  type        = bool
  default     = true
}

variable "enable_kms_key_rotation" {
  description = "Whether to enable automatic rotation of KMS keys"
  type        = bool
  default     = true
}

variable "kms_key_rotation_period_days" {
  description = "Number of days between KMS key rotations"
  type        = number
  default     = 90
  validation {
    condition     = var.kms_key_rotation_period_days >= 90
    error_message = "KMS key rotation period must be at least 90 days."
  }
}

# MongoDB Atlas
variable "mongodb_atlas_project_id" {
  description = "MongoDB Atlas project ID"
  type        = string
  default     = null
}

variable "mongodb_atlas_cluster_name" {
  description = "MongoDB Atlas cluster name"
  type        = string
  default     = "refunds-service"
}

variable "mongodb_version" {
  description = "MongoDB version for the Atlas cluster"
  type        = string
  default     = "6.0"
}

variable "mongodb_instance_size" {
  description = "MongoDB Atlas instance size"
  type        = string
  default     = "M30"
}

variable "mongodb_disk_size_gb" {
  description = "Disk size in GB for MongoDB Atlas cluster"
  type        = number
  default     = 500
}

variable "mongodb_backup_enabled" {
  description = "Whether to enable backups for MongoDB Atlas"
  type        = bool
  default     = true
}

variable "mongodb_backup_retention_days" {
  description = "Number of days to retain MongoDB backups"
  type        = number
  default     = 7
}

variable "mongodb_auto_scaling_enabled" {
  description = "Whether to enable auto-scaling for MongoDB Atlas"
  type        = bool
  default     = true
}

variable "mongodb_multi_region" {
  description = "Whether to enable multi-region deployment for MongoDB Atlas"
  type        = bool
  default     = true
}

variable "mongodb_secondary_regions" {
  description = "List of secondary regions for MongoDB Atlas cluster"
  type        = list(string)
  default     = []
}

# Redis ElastiCache
variable "redis_node_type" {
  description = "Redis ElastiCache node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_node_count" {
  description = "Number of Redis ElastiCache nodes"
  type        = number
  default     = 3
  validation {
    condition     = var.redis_node_count >= 2
    error_message = "At least 2 Redis nodes are required for high availability."
  }
}

variable "redis_multi_az_enabled" {
  description = "Whether to enable Multi-AZ for Redis ElastiCache"
  type        = bool
  default     = true
}

variable "redis_snapshot_retention_days" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 7
}

# ECS Configuration
variable "ecs_task_cpu" {
  description = "CPU units for ECS tasks by service"
  type        = map(number)
  default = {
    "api"             = 1024
    "request_manager" = 2048
    "gateway"         = 1024
    "parameter"       = 512
    "reporting"       = 2048
  }
}

variable "ecs_task_memory" {
  description = "Memory (MB) for ECS tasks by service"
  type        = map(number)
  default = {
    "api"             = 2048
    "request_manager" = 4096
    "gateway"         = 2048
    "parameter"       = 1024
    "reporting"       = 4096
  }
}

variable "ecs_service_min_capacity" {
  description = "Minimum task count for ECS services"
  type        = map(number)
  default = {
    "api"             = 3
    "request_manager" = 2
    "gateway"         = 2
    "parameter"       = 2
    "reporting"       = 1
  }
}

variable "ecs_service_max_capacity" {
  description = "Maximum task count for ECS services"
  type        = map(number)
  default = {
    "api"             = 10
    "request_manager" = 8
    "gateway"         = 6
    "parameter"       = 4
    "reporting"       = 3
  }
}

variable "ecs_enable_execute_command" {
  description = "Whether to enable ECS Exec for debugging tasks"
  type        = bool
  default     = false
}

variable "ecs_enable_blue_green_deployment" {
  description = "Whether to enable blue/green deployments for ECS services"
  type        = bool
  default     = true
}

# Monitoring and Logging
variable "cloudwatch_log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 90
}

# Auto Scaling
variable "cpu_utilization_high_threshold" {
  description = "CPU utilization percentage threshold for scaling out"
  type        = number
  default     = 70
  validation {
    condition     = var.cpu_utilization_high_threshold > 0 && var.cpu_utilization_high_threshold <= 100
    error_message = "CPU utilization threshold must be between 1 and 100."
  }
}

variable "cpu_utilization_low_threshold" {
  description = "CPU utilization percentage threshold for scaling in"
  type        = number
  default     = 30
  validation {
    condition     = var.cpu_utilization_low_threshold > 0 && var.cpu_utilization_low_threshold <= 100
    error_message = "CPU utilization threshold must be between 1 and 100."
  }
}

variable "scale_out_cooldown" {
  description = "Cooldown period in seconds after scaling out"
  type        = number
  default     = 60
}

variable "scale_in_cooldown" {
  description = "Cooldown period in seconds after scaling in"
  type        = number
  default     = 300
}

# Alerting
variable "alert_email" {
  description = "Email address to receive infrastructure alerts"
  type        = string
  default     = null
}

# Container Images
variable "ecr_repository_url" {
  description = "URL of the ECR repository for container images"
  type        = string
  default     = null
}

variable "container_image_tag" {
  description = "Container image tag to deploy"
  type        = string
  default     = "latest"
}