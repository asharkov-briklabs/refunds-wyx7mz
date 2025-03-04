terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.8"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
  backend "s3" {
    bucket         = "refunds-service-tfstate-staging"
    key            = "environments/staging/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "refunds-service-tflock-staging"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = var.tags
  }
}

provider "mongodbatlas" {
  public_key  = var.mongodb_atlas_public_key
  private_key = var.mongodb_atlas_private_key
}

locals {
  environment = "staging"
  name_prefix = "${var.project}-${local.environment}"
}

# Networking module for VPC, subnets, and security groups
module "networking" {
  source = "../../modules/networking"

  environment               = var.environment
  vpc_cidr                  = var.vpc_cidr
  public_subnet_cidrs       = var.public_subnet_cidrs
  private_app_subnet_cidrs  = var.private_app_subnet_cidrs
  private_data_subnet_cidrs = var.private_data_subnet_cidrs
  availability_zones        = var.availability_zones
  single_nat_gateway        = var.single_nat_gateway
  enable_vpn_gateway        = var.enable_vpn_gateway
  enable_flow_logs          = var.enable_flow_logs
  flow_logs_retention_days  = var.flow_logs_retention_days
}

# Security module for WAF, CloudTrail, and encryption settings
module "security" {
  source = "../../modules/security"

  environment                     = var.environment
  vpc_id                          = module.networking.vpc_id
  public_subnet_ids               = module.networking.public_subnet_ids
  private_app_subnet_ids          = module.networking.private_app_subnet_ids
  private_data_subnet_ids         = module.networking.private_data_subnet_ids
  enable_waf                      = var.enable_waf
  waf_scope                       = var.waf_scope
  waf_managed_rule_groups         = var.waf_managed_rule_groups
  enable_cloudtrail               = var.enable_cloudtrail
  cloudtrail_retention_period     = var.cloudtrail_retention_period
  enable_key_rotation             = var.enable_key_rotation
  key_deletion_window_in_days     = var.key_deletion_window_in_days
  secrets_recovery_window_in_days = var.secrets_recovery_window_in_days
  enable_log_file_validation      = var.enable_log_file_validation
}

# MongoDB Atlas module for document database
module "mongodb" {
  source = "../../modules/mongodb"

  environment                 = var.environment
  mongodb_atlas_public_key    = var.mongodb_atlas_public_key
  mongodb_atlas_private_key   = var.mongodb_atlas_private_key
  mongodb_atlas_org_id        = var.mongodb_atlas_org_id
  mongodb_project_name        = var.mongodb_project_name
  mongodb_cluster_name        = var.mongodb_cluster_name
  mongodb_instance_size       = var.mongodb_instance_size
  mongodb_disk_size_gb        = var.mongodb_disk_size_gb
  mongodb_version             = var.mongodb_version
  mongodb_backup_enabled      = var.mongodb_backup_enabled
  mongodb_retain_backups_days = var.mongodb_retain_backups_days
  default_database_name       = var.default_database_name
  app_username                = var.app_username
  atlas_cidr_block            = var.atlas_cidr_block
  vpc_id                      = module.networking.vpc_id
  vpc_cidr_block              = module.networking.vpc_cidr_block
  aws_account_id              = var.aws_account_id
  sharded_cluster             = var.sharded_cluster
  bi_connector_enabled        = var.bi_connector_enabled
  secondary_regions           = var.secondary_regions
  refund_encryption_key_arn   = module.security.refund_encryption_key_arn
}

# Redis ElastiCache module for parameter caching and distributed locking
module "redis" {
  source = "../../modules/redis"

  name_prefix                      = local.name_prefix
  environment                      = var.environment
  redis_cluster_id                 = var.redis_cluster_id
  redis_node_type                  = var.redis_node_type
  redis_num_cache_nodes            = var.redis_num_cache_nodes
  redis_engine_version             = var.redis_engine_version
  redis_port                       = var.redis_port
  redis_snapshot_retention_limit   = var.redis_snapshot_retention_limit
  redis_multi_az_enabled           = var.redis_multi_az_enabled
  redis_automatic_failover_enabled = var.redis_automatic_failover_enabled
  redis_at_rest_encryption_enabled = var.redis_at_rest_encryption_enabled
  redis_transit_encryption_enabled = var.redis_transit_encryption_enabled
  redis_alarm_cpu_threshold        = var.redis_alarm_cpu_threshold
  redis_alarm_memory_threshold     = var.redis_alarm_memory_threshold
  vpc_id                           = module.networking.vpc_id
  subnet_ids                       = module.networking.private_app_subnet_ids
  security_group_id                = module.security.app_security_group_id
  kms_key_arn                      = module.security.refund_encryption_key_arn
}

# ECS module for hosting the Refunds Service microservices
module "ecs" {
  source = "../../modules/ecs"

  name_prefix                           = local.name_prefix
  environment                           = var.environment
  subnet_ids                            = module.networking.private_app_subnet_ids
  vpc_id                                = module.networking.vpc_id
  
  # Service configurations
  api_service_cpu                       = var.api_service_cpu
  api_service_memory                    = var.api_service_memory
  api_service_min_capacity              = var.api_service_min_capacity
  api_service_max_capacity              = var.api_service_max_capacity
  
  request_manager_cpu                   = var.request_manager_cpu
  request_manager_memory                = var.request_manager_memory
  request_manager_min_capacity          = var.request_manager_min_capacity
  request_manager_max_capacity          = var.request_manager_max_capacity
  
  gateway_service_cpu                   = var.gateway_service_cpu
  gateway_service_memory                = var.gateway_service_memory
  gateway_service_min_capacity          = var.gateway_service_min_capacity
  gateway_service_max_capacity          = var.gateway_service_max_capacity
  
  parameter_service_cpu                 = var.parameter_service_cpu
  parameter_service_memory              = var.parameter_service_memory
  parameter_service_min_capacity        = var.parameter_service_min_capacity
  parameter_service_max_capacity        = var.parameter_service_max_capacity
  
  reporting_service_cpu                 = var.reporting_service_cpu
  reporting_service_memory              = var.reporting_service_memory
  reporting_service_min_capacity        = var.reporting_service_min_capacity
  reporting_service_max_capacity        = var.reporting_service_max_capacity
  
  # Deployment and scaling settings
  container_image_tag                   = var.container_image_tag
  cloudwatch_log_retention_in_days      = var.cloudwatch_log_retention_in_days
  cloudwatch_log_group_name             = var.cloudwatch_log_group_name
  cpu_utilization_high_threshold        = var.cpu_utilization_high_threshold
  cpu_utilization_low_threshold         = var.cpu_utilization_low_threshold
  scale_out_cooldown                    = var.scale_out_cooldown
  scale_in_cooldown                     = var.scale_in_cooldown
  enable_service_discovery              = var.enable_service_discovery
  enable_blue_green_deployment          = var.enable_blue_green_deployment
  deployment_config_name                = var.deployment_config_name
  health_check_grace_period_seconds     = var.health_check_grace_period_seconds
  deployment_maximum_percent            = var.deployment_maximum_percent
  deployment_minimum_healthy_percent    = var.deployment_minimum_healthy_percent
  
  # IAM and security integration
  task_role_arn                         = module.security.task_role_arn
  execution_role_arn                    = module.security.execution_role_arn
  mongodb_secrets_manager_secret_arn    = module.mongodb.secrets_manager_secret_arn
  redis_endpoint_address                = module.redis.primary_endpoint_address
  redis_auth_token                      = module.redis.auth_token
}

# CloudWatch dashboard for monitoring Refunds Service
resource "aws_cloudwatch_dashboard" "refunds_dashboard" {
  dashboard_name = "${local.name_prefix}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", "${local.name_prefix}-api-service", "ClusterName", module.ecs.cluster_name],
            ["AWS/ECS", "CPUUtilization", "ServiceName", "${local.name_prefix}-request-manager", "ClusterName", module.ecs.cluster_name],
            ["AWS/ECS", "CPUUtilization", "ServiceName", "${local.name_prefix}-gateway-service", "ClusterName", module.ecs.cluster_name]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS CPU Utilization"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ServiceName", "${local.name_prefix}-api-service", "ClusterName", module.ecs.cluster_name],
            ["AWS/ECS", "MemoryUtilization", "ServiceName", "${local.name_prefix}-request-manager", "ClusterName", module.ecs.cluster_name],
            ["AWS/ECS", "MemoryUtilization", "ServiceName", "${local.name_prefix}-gateway-service", "ClusterName", module.ecs.cluster_name]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Memory Utilization"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", module.redis.cluster_id],
            ["AWS/ElastiCache", "NetworkBytesIn", "CacheClusterId", module.redis.cluster_id],
            ["AWS/ElastiCache", "NetworkBytesOut", "CacheClusterId", module.redis.cluster_id]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Redis Performance"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApiGateway", "4XXError", "ApiName", "${local.name_prefix}-api"],
            ["AWS/ApiGateway", "5XXError", "ApiName", "${local.name_prefix}-api"],
            ["AWS/ApiGateway", "Count", "ApiName", "${local.name_prefix}-api"]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "API Gateway Metrics"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 24
        height = 6
        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "${local.name_prefix}-refund-request-queue"],
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "${local.name_prefix}-gateway-processing-queue"],
            ["AWS/SQS", "ApproximateNumberOfMessagesNotVisible", "QueueName", "${local.name_prefix}-refund-request-queue"],
            ["AWS/SQS", "ApproximateNumberOfMessagesNotVisible", "QueueName", "${local.name_prefix}-gateway-processing-queue"]
          ]
          period = 300
          stat   = "Maximum"
          region = var.aws_region
          title  = "SQS Queue Metrics"
        }
      }
    ]
  })
}

# SNS topic for operational alerts
resource "aws_sns_topic" "refunds_alerts" {
  name            = "${local.name_prefix}-alerts"
  delivery_policy = jsonencode({
    "http" : {
      "defaultHealthyRetryPolicy" : {
        "minDelayTarget" : 20,
        "maxDelayTarget" : 20,
        "numRetries" : 3,
        "numMaxDelayRetries" : 0,
        "numNoDelayRetries" : 0,
        "numMinDelayRetries" : 0,
        "backoffFunction" : "linear"
      },
      "disableSubscriptionOverrides" : false
    }
  })
  
  tags = {
    Name        = "${local.name_prefix}-alerts"
    Environment = var.environment
    Service     = "refunds-service"
  }
}

# CloudWatch alarms for critical service metrics
resource "aws_cloudwatch_metric_alarm" "api_service_error_rate" {
  alarm_name          = "${local.name_prefix}-api-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "This alarm monitors API Gateway 5XX errors"
  alarm_actions       = [aws_sns_topic.refunds_alerts.arn]
  ok_actions          = [aws_sns_topic.refunds_alerts.arn]
  dimensions = {
    ApiName = "${local.name_prefix}-api"
  }
}

resource "aws_cloudwatch_metric_alarm" "service_cpu_high" {
  for_each            = toset(module.ecs.service_names)
  
  alarm_name          = "${local.name_prefix}-${each.value}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This alarm monitors ECS service CPU utilization"
  alarm_actions       = [aws_sns_topic.refunds_alerts.arn]
  ok_actions          = [aws_sns_topic.refunds_alerts.arn]
  dimensions = {
    ClusterName = module.ecs.cluster_name
    ServiceName = each.value
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  alarm_name          = "${local.name_prefix}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.redis_alarm_cpu_threshold
  alarm_description   = "This alarm monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.refunds_alerts.arn]
  ok_actions          = [aws_sns_topic.refunds_alerts.arn]
  dimensions = {
    CacheClusterId = module.redis.cluster_id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory_high" {
  alarm_name          = "${local.name_prefix}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.redis_alarm_memory_threshold
  alarm_description   = "This alarm monitors Redis memory utilization"
  alarm_actions       = [aws_sns_topic.refunds_alerts.arn]
  ok_actions          = [aws_sns_topic.refunds_alerts.arn]
  dimensions = {
    CacheClusterId = module.redis.cluster_id
  }
}

# Outputs
output "vpc_id" {
  description = "ID of the VPC created for the staging environment"
  value       = module.networking.vpc_id
}

output "mongodb_connection_string" {
  description = "Connection string for MongoDB Atlas cluster"
  value       = module.mongodb.connection_string
  sensitive   = true
}

output "redis_endpoint" {
  description = "Endpoint address for Redis ElastiCache cluster"
  value       = module.redis.primary_endpoint_address
}

output "api_service_url" {
  description = "URL endpoint for the Refunds API Service"
  value       = module.ecs.api_service_url
}

output "secrets_manager_arns" {
  description = "ARNs of Secrets Manager secrets containing credentials"
  value       = {
    mongodb = module.mongodb.secrets_manager_secret_arn
    redis   = module.redis.auth_token_secret_arn
  }
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster hosting the Refunds Service"
  value       = module.ecs.cluster_name
}

output "cloudwatch_dashboard_url" {
  description = "URL to the CloudWatch dashboard for monitoring"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.refunds_dashboard.dashboard_name}"
}