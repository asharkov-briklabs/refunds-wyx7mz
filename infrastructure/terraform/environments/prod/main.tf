# This Terraform configuration sets up the production environment for the Refunds Service.
# It configures all infrastructure components required for a highly available, secure,
# and compliant financial service including networking, databases, caching, compute resources,
# and monitoring.

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
    bucket         = "refunds-service-tfstate-prod"
    key            = "environments/prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "refunds-service-tflock-prod"
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
  environment = "prod"
  name_prefix = "${var.project}-${local.environment}"
  multi_az_enabled = true
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  secondary_regions = ["us-west-2", "eu-west-1"] # For disaster recovery
}

# Networking Module
# Sets up the VPC, subnets, security groups, and other networking components for the production environment
module "networking" {
  source = "../../../modules/networking"
  
  environment              = local.environment
  vpc_cidr                 = var.vpc_cidr
  public_subnet_cidrs      = var.public_subnet_cidrs
  private_app_subnet_cidrs = var.private_app_subnet_cidrs
  private_data_subnet_cidrs = var.private_data_subnet_cidrs
  availability_zones       = local.availability_zones
  enable_nat_gateway       = true
  single_nat_gateway       = false
  one_nat_gateway_per_az   = true
  enable_vpn_gateway       = var.enable_vpn_gateway
  enable_flow_logs         = true
  flow_logs_retention_days = 365
  restrict_default_security_group = true
  create_database_subnet_group    = true
  tags                     = var.tags
}

# Security Module
# Configures security-related resources like KMS keys, IAM roles, WAF, and security policies
module "security" {
  source = "../../../modules/security"
  
  environment                    = local.environment
  vpc_id                         = module.networking.vpc_id
  enable_waf                     = true
  waf_scope                      = "REGIONAL"
  waf_managed_rule_groups        = var.waf_managed_rule_groups
  enable_cloudtrail              = true
  cloudtrail_retention_period    = 2555
  enable_key_rotation            = true
  key_deletion_window_in_days    = 30
  secrets_recovery_window_in_days = 30
  enable_log_file_validation     = true
  tags                           = var.tags
}

# MongoDB Atlas Module
# Sets up MongoDB Atlas with production-grade configuration, including multi-region deployment for disaster recovery
module "mongodb" {
  source = "../../../modules/mongodb"
  
  environment              = local.environment
  mongodb_atlas_public_key = var.mongodb_atlas_public_key
  mongodb_atlas_private_key = var.mongodb_atlas_private_key
  mongodb_atlas_org_id     = var.mongodb_atlas_org_id
  project_name             = var.mongodb_project_name
  cluster_name             = var.mongodb_cluster_name
  instance_size            = var.mongodb_instance_size
  disk_size_gb             = var.mongodb_disk_size_gb
  mongodb_version          = var.mongodb_version
  backup_enabled           = true
  pit_enabled              = true
  retain_backups_days      = 28
  default_database_name    = var.default_database_name
  app_username             = var.app_username
  atlas_cidr_block         = var.atlas_cidr_block
  vpc_id                   = module.networking.vpc_id
  vpc_cidr_block           = module.networking.vpc_cidr_block
  aws_account_id           = var.aws_account_id
  sharded_cluster          = true
  bi_connector_enabled     = var.bi_connector_enabled
  secondary_regions        = local.secondary_regions
  encryption_at_rest_enabled = true
  kms_key_arn              = module.security.refund_encryption_key_arn
  tags                     = var.tags
}

# Redis Module
# Configures ElastiCache for Redis with high availability, multi-AZ deployment, and encryption
module "redis" {
  source = "../../../modules/redis"
  
  name_prefix                  = local.name_prefix
  environment                  = local.environment
  redis_cluster_id             = var.redis_cluster_id
  node_type                    = var.redis_node_type
  num_cache_nodes              = 3
  engine_version               = var.redis_engine_version
  port                         = var.redis_port
  snapshot_retention_limit     = 7
  snapshot_window              = "00:00-03:00"
  maintenance_window           = "sun:03:30-sun:04:30"
  multi_az_enabled             = true
  automatic_failover_enabled   = true
  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = true
  apply_immediately            = false
  alarm_cpu_threshold          = 75
  alarm_memory_threshold       = 75
  vpc_id                       = module.networking.vpc_id
  subnet_ids                   = module.networking.private_app_subnet_ids
  allowed_security_groups      = [module.networking.app_security_group_id]
  kms_key_id                   = module.security.refund_encryption_key_arn
  alarm_actions                = [aws_sns_topic.refund_service_alarms.arn]
  tags                         = var.tags
}

# ECS Module
# Deploys ECS clusters, services, and tasks for Refund Service components with production configuration
module "ecs" {
  source = "../../../modules/ecs"
  
  name_prefix                          = local.name_prefix
  environment                          = local.environment
  vpc_id                               = module.networking.vpc_id
  private_subnet_ids                   = module.networking.private_app_subnet_ids
  public_subnet_ids                    = module.networking.public_subnet_ids
  
  api_service_cpu                      = var.api_service_cpu
  api_service_memory                   = var.api_service_memory
  api_service_min_capacity             = var.api_service_min_capacity
  api_service_max_capacity             = var.api_service_max_capacity
  
  request_manager_cpu                  = var.request_manager_cpu
  request_manager_memory               = var.request_manager_memory
  request_manager_min_capacity         = var.request_manager_min_capacity
  request_manager_max_capacity         = var.request_manager_max_capacity
  
  gateway_service_cpu                  = var.gateway_service_cpu
  gateway_service_memory               = var.gateway_service_memory
  gateway_service_min_capacity         = var.gateway_service_min_capacity
  gateway_service_max_capacity         = var.gateway_service_max_capacity
  
  parameter_service_cpu                = var.parameter_service_cpu
  parameter_service_memory             = var.parameter_service_memory
  parameter_service_min_capacity       = var.parameter_service_min_capacity
  parameter_service_max_capacity       = var.parameter_service_max_capacity
  
  reporting_service_cpu                = var.reporting_service_cpu
  reporting_service_memory             = var.reporting_service_memory
  reporting_service_min_capacity       = var.reporting_service_min_capacity
  reporting_service_max_capacity       = var.reporting_service_max_capacity
  
  container_image_tag                  = var.container_image_tag
  cloudwatch_log_retention_in_days     = 90
  cloudwatch_log_group_name            = var.cloudwatch_log_group_name
  
  cpu_utilization_high_threshold       = 70
  cpu_utilization_low_threshold        = 30
  scale_out_cooldown                   = 300
  scale_in_cooldown                    = 600
  
  enable_service_discovery             = true
  enable_blue_green_deployment         = true
  deployment_config_name               = "CodeDeployDefault.ECSAllAtOnce"
  health_check_grace_period_seconds    = 120
  deployment_maximum_percent           = 200
  deployment_minimum_healthy_percent   = 100
  
  task_role_arn                        = module.security.task_role_arn
  execution_role_arn                   = module.security.execution_role_arn
  secrets_manager_arns                 = [module.mongodb.secrets_manager_secret_arn]
  redis_endpoint                       = module.redis.primary_endpoint_address
  redis_auth_token                     = module.redis.auth_token
  waf_acl_arn                          = module.security.waf_acl_arn
  certificate_arn                      = var.certificate_arn
  
  tags                                 = var.tags
}

# SNS Topic for operational alerts from the production environment
resource "aws_sns_topic" "refund_service_alarms" {
  name            = "${local.name_prefix}-alarms"
  kms_master_key_id = module.security.refund_encryption_key_arn
  delivery_policy = {
  "http": {
    "defaultHealthyRetryPolicy": {
      "minDelayTarget": 20,
      "maxDelayTarget": 20,
      "numRetries": 3,
      "numMaxDelayRetries": 0,
      "numNoDelayRetries": 0,
      "numMinDelayRetries": 0,
      "backoffFunction": "linear"
    },
    "disableSubscriptionOverrides": false,
    "defaultThrottlePolicy": {
      "maxReceivesPerSecond": 1
    }
  }
}
  tags = var.tags
}

# Email subscription for alarm notifications
resource "aws_sns_topic_subscription" "email_subscription" {
  topic_arn = aws_sns_topic.refund_service_alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email_endpoint
}

# CloudWatch dashboard for monitoring Refund Service in production
resource "aws_cloudwatch_dashboard" "refund_service_dashboard" {
  dashboard_name = "${local.name_prefix}-dashboard"
  dashboard_body = jsonencode({
  widgets = [
    {
      type   = "metric",
      x      = 0,
      y      = 0,
      width  = 12,
      height = 6,
      properties = {
        metrics = [
          ["AWS/ECS", "CPUUtilization", "ServiceName", module.ecs.service_names["api_service"], "ClusterName", module.ecs.cluster_name, { "stat": "Average" }],
          ["AWS/ECS", "CPUUtilization", "ServiceName", module.ecs.service_names["request_manager"], "ClusterName", module.ecs.cluster_name, { "stat": "Average" }],
          ["AWS/ECS", "CPUUtilization", "ServiceName", module.ecs.service_names["gateway_service"], "ClusterName", module.ecs.cluster_name, { "stat": "Average" }],
          ["AWS/ECS", "CPUUtilization", "ServiceName", module.ecs.service_names["parameter_service"], "ClusterName", module.ecs.cluster_name, { "stat": "Average" }],
          ["AWS/ECS", "CPUUtilization", "ServiceName", module.ecs.service_names["reporting_service"], "ClusterName", module.ecs.cluster_name, { "stat": "Average" }]
        ],
        period = 300,
        title  = "ECS CPU Utilization",
        view   = "timeSeries",
        stacked = false
      }
    },
    {
      type   = "metric",
      x      = 12,
      y      = 0,
      width  = 12,
      height = 6,
      properties = {
        metrics = [
          ["AWS/ECS", "MemoryUtilization", "ServiceName", module.ecs.service_names["api_service"], "ClusterName", module.ecs.cluster_name, { "stat": "Average" }],
          ["AWS/ECS", "MemoryUtilization", "ServiceName", module.ecs.service_names["request_manager"], "ClusterName", module.ecs.cluster_name, { "stat": "Average" }],
          ["AWS/ECS", "MemoryUtilization", "ServiceName", module.ecs.service_names["gateway_service"], "ClusterName", module.ecs.cluster_name, { "stat": "Average" }],
          ["AWS/ECS", "MemoryUtilization", "ServiceName", module.ecs.service_names["parameter_service"], "ClusterName", module.ecs.cluster_name, { "stat": "Average" }],
          ["AWS/ECS", "MemoryUtilization", "ServiceName", module.ecs.service_names["reporting_service"], "ClusterName", module.ecs.cluster_name, { "stat": "Average" }]
        ],
        period = 300,
        title  = "ECS Memory Utilization",
        view   = "timeSeries",
        stacked = false
      }
    }
  ]
})
}

# Alarm for high rate of 5XX errors from the API
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${local.name_prefix}-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "This metric monitors the rate of 5XX errors from the API"
  alarm_actions       = [aws_sns_topic.refund_service_alarms.arn]
  ok_actions          = [aws_sns_topic.refund_service_alarms.arn]
  dimensions = {
    LoadBalancer = module.ecs.load_balancer_arn_suffix
  }
}

# Alarm for high rate of 4XX errors from the API
resource "aws_cloudwatch_metric_alarm" "api_4xx_errors" {
  alarm_name          = "${local.name_prefix}-api-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "4XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "This metric monitors the rate of 4XX errors from the API"
  alarm_actions       = [aws_sns_topic.refund_service_alarms.arn]
  ok_actions          = [aws_sns_topic.refund_service_alarms.arn]
  dimensions = {
    LoadBalancer = module.ecs.load_balancer_arn_suffix
  }
}

# Alarm for high API latency
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${local.name_prefix}-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  extended_statistic  = "p95"
  threshold           = 0.5
  alarm_description   = "This metric monitors the p95 latency of the API"
  alarm_actions       = [aws_sns_topic.refund_service_alarms.arn]
  ok_actions          = [aws_sns_topic.refund_service_alarms.arn]
  dimensions = {
    LoadBalancer = module.ecs.load_balancer_arn_suffix
  }
}

# Metric filter for refund processing errors in logs
resource "aws_cloudwatch_log_metric_filter" "refund_processing_errors" {
  name           = "${local.name_prefix}-refund-processing-errors"
  pattern        = "ERROR RefundRequestManager: Failed to process refund"
  log_group_name = module.ecs.log_group_name
  
  metric_transformation {
    name          = "RefundProcessingErrors"
    namespace     = "RefundService/Errors"
    value         = "1"
    default_value = "0"
  }
}

# Alarm for high rate of refund processing errors
resource "aws_cloudwatch_metric_alarm" "refund_processing_errors_alarm" {
  alarm_name          = "${local.name_prefix}-refund-processing-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RefundProcessingErrors"
  namespace           = "RefundService/Errors"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "This metric monitors the rate of refund processing errors"
  alarm_actions       = [aws_sns_topic.refund_service_alarms.arn]
  ok_actions          = [aws_sns_topic.refund_service_alarms.arn]
}

# DNS record for the Refunds API
resource "aws_route53_record" "api_dns" {
  zone_id = var.route53_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  
  alias {
    name                   = module.ecs.load_balancer_dns_name
    zone_id                = module.ecs.load_balancer_zone_id
    evaluate_target_health = true
  }
}

# Health check for the Refunds API
resource "aws_route53_health_check" "api_health_check" {
  fqdn              = "api.${var.domain_name}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  measure_latency   = true
  
  tags = {
    Name = "${local.name_prefix}-api-health-check"
  }
}

# SSM parameter storing the MongoDB connection string
resource "aws_ssm_parameter" "mongodb_connection_string" {
  name   = "/${local.environment}/refund-service/mongodb-connection-string"
  type   = "SecureString"
  value  = module.mongodb.connection_string_srv
  key_id = module.security.refund_encryption_key_arn
  tags   = var.tags
}

# SSM parameter storing the Redis endpoint
resource "aws_ssm_parameter" "redis_endpoint" {
  name   = "/${local.environment}/refund-service/redis-endpoint"
  type   = "SecureString"
  value  = module.redis.primary_endpoint_address
  key_id = module.security.refund_encryption_key_arn
  tags   = var.tags
}