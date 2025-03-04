# Provider configuration
provider "aws" {
  region = var.aws_region
  default_tags {
    tags = var.tags
  }
}

# Terraform backend configuration for remote state
terraform {
  backend "s3" {
    bucket         = "refunds-service-tfstate-dev"
    key            = "environments/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "refunds-service-tflock-dev"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.6"
    }
  }
}

provider "mongodbatlas" {
  public_key  = var.mongodb_atlas_public_key
  private_key = var.mongodb_atlas_private_key
}

# Create a KMS key for encrypting sensitive data
resource "aws_kms_key" "refunds_service_key" {
  description             = "KMS key for encrypting refunds service sensitive data"
  deletion_window_in_days = var.key_deletion_window_in_days
  enable_key_rotation     = var.enable_key_rotation
  tags                    = var.tags
}

resource "aws_kms_alias" "refunds_service_key_alias" {
  name          = "alias/refunds-service-${var.environment}"
  target_key_id = aws_kms_key.refunds_service_key.key_id
}

# VPC Module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.18.1"

  name = "refunds-service-vpc-${var.environment}"
  cidr = var.vpc_cidr

  azs                = var.availability_zones
  public_subnets     = var.public_subnet_cidrs
  private_subnets    = var.private_app_subnet_cidrs
  database_subnets   = var.private_data_subnet_cidrs

  # NAT Gateway configuration
  enable_nat_gateway     = true
  single_nat_gateway     = var.single_nat_gateway
  one_nat_gateway_per_az = !var.single_nat_gateway
  enable_vpn_gateway     = var.enable_vpn_gateway

  # Enable flow logs for VPC
  enable_flow_log                   = var.enable_flow_logs
  flow_log_destination_type         = "cloud-watch-logs"
  flow_log_cloudwatch_log_group_kms_key_id = aws_kms_key.refunds_service_key.arn
  flow_log_cloudwatch_log_group_retention_in_days = var.flow_logs_retention_days

  # DNS settings
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Additional tags
  tags = var.tags
}

# Security Groups
resource "aws_security_group" "api_service" {
  name        = "refunds-api-service-${var.environment}"
  description = "Security group for Refunds API Service"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from public"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from public"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "refunds-api-service-${var.environment}"
  })
}

resource "aws_security_group" "internal_services" {
  name        = "refunds-internal-services-${var.environment}"
  description = "Security group for Refunds internal services"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.api_service.id]
    description     = "All traffic from API service"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "refunds-internal-services-${var.environment}"
  })
}

resource "aws_security_group" "redis" {
  name        = "refunds-redis-${var.environment}"
  description = "Security group for Redis ElastiCache cluster"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = var.redis_port
    to_port         = var.redis_port
    protocol        = "tcp"
    security_groups = [aws_security_group.api_service.id, aws_security_group.internal_services.id]
    description     = "Redis access from services"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "refunds-redis-${var.environment}"
  })
}

# MongoDB Atlas Project
resource "mongodbatlas_project" "refunds_project" {
  name   = var.mongodb_project_name
  org_id = var.mongodb_atlas_org_id
}

# MongoDB Atlas Cluster
resource "mongodbatlas_cluster" "refunds_cluster" {
  project_id = mongodbatlas_project.refunds_project.id
  name       = var.mongodb_cluster_name

  # Cluster tier
  provider_name               = "AWS"
  provider_region_name        = var.aws_region
  provider_instance_size_name = var.mongodb_instance_size
  mongo_db_major_version      = var.mongodb_version

  # Backup options
  cloud_backup                 = var.mongodb_backup_enabled
  pit_enabled                  = var.mongodb_backup_enabled
  auto_scaling_disk_gb_enabled = true
  disk_size_gb                 = var.mongodb_disk_size_gb

  # Advanced configuration
  advanced_configuration {
    javascript_enabled            = true
    minimum_enabled_tls_protocol  = "TLS1_2"
  }

  # Add additional MongoDB configurations as needed
}

# MongoDB Atlas Database User
resource "mongodbatlas_database_user" "refunds_app_user" {
  username           = var.app_username
  password           = random_password.mongodb_password.result
  project_id         = mongodbatlas_project.refunds_project.id
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = var.default_database_name
  }

  scopes {
    name = mongodbatlas_cluster.refunds_cluster.name
    type = "CLUSTER"
  }
}

# Create a random password for MongoDB
resource "random_password" "mongodb_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
}

# Store MongoDB connection details in AWS Secrets Manager
resource "aws_secretsmanager_secret" "mongodb_connection" {
  name        = "refunds-service/${var.environment}/mongodb"
  description = "MongoDB connection details for Refunds Service"
  kms_key_id  = aws_kms_key.refunds_service_key.arn
  recovery_window_in_days = var.secrets_recovery_window_in_days
  tags        = var.tags
}

resource "aws_secretsmanager_secret_version" "mongodb_connection" {
  secret_id     = aws_secretsmanager_secret.mongodb_connection.id
  secret_string = jsonencode({
    username        = mongodbatlas_database_user.refunds_app_user.username
    password        = random_password.mongodb_password.result
    connection_string = mongodbatlas_cluster.refunds_cluster.connection_strings[0].standard_srv
    database_name   = var.default_database_name
  })
}

# Redis ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name       = "refunds-redis-subnet-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

# Redis ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "redis_params" {
  name   = "refunds-redis-params-${var.environment}"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }
}

# Redis ElastiCache Cluster
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id       = var.redis_cluster_id
  description                = "Redis cluster for Refunds Service"
  engine                     = "redis"
  engine_version             = var.redis_engine_version
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.redis_num_cache_nodes
  parameter_group_name       = aws_elasticache_parameter_group.redis_params.name
  port                       = var.redis_port
  subnet_group_name          = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = var.redis_at_rest_encryption_enabled
  transit_encryption_enabled = var.redis_transit_encryption_enabled
  snapshot_retention_limit   = var.redis_snapshot_retention_limit
  automatic_failover_enabled = var.redis_automatic_failover_enabled
  multi_az_enabled           = var.redis_multi_az_enabled

  tags = var.tags
}

# Store Redis connection details in AWS Secrets Manager
resource "aws_secretsmanager_secret" "redis_connection" {
  name        = "refunds-service/${var.environment}/redis"
  description = "Redis connection details for Refunds Service"
  kms_key_id  = aws_kms_key.refunds_service_key.arn
  recovery_window_in_days = var.secrets_recovery_window_in_days
  tags        = var.tags
}

resource "aws_secretsmanager_secret_version" "redis_connection" {
  secret_id     = aws_secretsmanager_secret.redis_connection.id
  secret_string = jsonencode({
    primary_endpoint   = aws_elasticache_replication_group.redis_cluster.primary_endpoint_address
    reader_endpoint    = aws_elasticache_replication_group.redis_cluster.reader_endpoint_address
    port               = var.redis_port
  })
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "refunds-redis-cpu-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.redis_alarm_cpu_threshold
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis_cluster.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "refunds-redis-memory-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.redis_alarm_memory_threshold
  alarm_description   = "This metric monitors Redis memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis_cluster.id
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name              = "refunds-service-alerts-${var.environment}"
  kms_master_key_id = aws_kms_key.refunds_service_key.id
  tags              = var.tags
}

# Application Load Balancer
resource "aws_lb" "refunds_alb" {
  name               = "refunds-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.api_service.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = true
  
  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "refunds-alb-logs"
    enabled = true
  }

  tags = var.tags
}

# S3 bucket for ALB logs
resource "aws_s3_bucket" "alb_logs" {
  bucket = "refunds-service-alb-logs-${var.environment}-${var.aws_account_id}"
  tags   = var.tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.refunds_service_key.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "log-expiration"
    status = "Enabled"

    expiration {
      days = 90
    }
  }
}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.aws_account_id}:root"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
      }
    ]
  })
}

# ALB Target Group for API Service
resource "aws_lb_target_group" "api_service" {
  name        = "refunds-api-tg-${var.environment}"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    interval            = 30
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    matcher             = "200"
  }

  tags = var.tags
}

# ALB Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.refunds_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = "arn:aws:acm:${var.aws_region}:${var.aws_account_id}:certificate/example" # Replace with actual certificate ARN

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_service.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.refunds_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "refunds_cluster" {
  name = "refunds-service-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = var.tags
}

# CloudWatch Log Groups for ECS Services
resource "aws_cloudwatch_log_group" "api_service" {
  name              = "/ecs/refunds-api-service-${var.environment}"
  retention_in_days = var.cloudwatch_log_retention_in_days
  kms_key_id        = aws_kms_key.refunds_service_key.arn
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "request_manager" {
  name              = "/ecs/refunds-request-manager-${var.environment}"
  retention_in_days = var.cloudwatch_log_retention_in_days
  kms_key_id        = aws_kms_key.refunds_service_key.arn
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "gateway_service" {
  name              = "/ecs/refunds-gateway-service-${var.environment}"
  retention_in_days = var.cloudwatch_log_retention_in_days
  kms_key_id        = aws_kms_key.refunds_service_key.arn
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "parameter_service" {
  name              = "/ecs/refunds-parameter-service-${var.environment}"
  retention_in_days = var.cloudwatch_log_retention_in_days
  kms_key_id        = aws_kms_key.refunds_service_key.arn
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "reporting_service" {
  name              = "/ecs/refunds-reporting-service-${var.environment}"
  retention_in_days = var.cloudwatch_log_retention_in_days
  kms_key_id        = aws_kms_key.refunds_service_key.arn
  tags              = var.tags
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "refunds-ecs-task-execution-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Policy for secrets access
resource "aws_iam_policy" "secrets_access" {
  name        = "refunds-secrets-access-${var.environment}"
  description = "Policy for accessing secrets in Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
          "kms:Decrypt"
        ]
        Effect   = "Allow"
        Resource = [
          aws_secretsmanager_secret.mongodb_connection.arn,
          aws_secretsmanager_secret.redis_connection.arn,
          aws_kms_key.refunds_service_key.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "secrets_access" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.secrets_access.arn
}

# IAM Role for ECS Task
resource "aws_iam_role" "ecs_task_role" {
  name = "refunds-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# Task Definition for API Service
resource "aws_ecs_task_definition" "api_service" {
  family                   = "refunds-api-service-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.api_service_cpu
  memory                   = var.api_service_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "refunds-api-service"
      image     = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/refunds-api-service:${var.container_image_tag}"
      essential = true
      
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        }
      ]
      
      secrets = [
        {
          name      = "MONGODB_CONNECTION"
          valueFrom = aws_secretsmanager_secret.mongodb_connection.arn
        },
        {
          name      = "REDIS_CONNECTION"
          valueFrom = aws_secretsmanager_secret.redis_connection.arn
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api_service.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = var.tags
}

# ECS Service for API Service
resource "aws_ecs_service" "api_service" {
  name                   = "refunds-api-service-${var.environment}"
  cluster                = aws_ecs_cluster.refunds_cluster.id
  task_definition        = aws_ecs_task_definition.api_service.arn
  desired_count          = var.api_service_min_capacity
  launch_type            = "FARGATE"
  platform_version       = "LATEST"
  enable_execute_command = true
  
  deployment_maximum_percent         = var.deployment_maximum_percent
  deployment_minimum_healthy_percent = var.deployment_minimum_healthy_percent
  health_check_grace_period_seconds  = var.health_check_grace_period_seconds

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.api_service.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api_service.arn
    container_name   = "refunds-api-service"
    container_port   = 80
  }

  deployment_controller {
    type = var.enable_blue_green_deployment ? "CODE_DEPLOY" : "ECS"
  }

  lifecycle {
    ignore_changes = [
      task_definition,
      desired_count,
      load_balancer
    ]
  }

  depends_on = [
    aws_lb_listener.https
  ]

  tags = var.tags
}

# Auto Scaling for API Service
resource "aws_appautoscaling_target" "api_service" {
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.refunds_cluster.name}/${aws_ecs_service.api_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.api_service_min_capacity
  max_capacity       = var.api_service_max_capacity
}

resource "aws_appautoscaling_policy" "api_service_cpu" {
  name               = "refunds-api-service-cpu-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.api_service.service_namespace
  resource_id        = aws_appautoscaling_target.api_service.resource_id
  scalable_dimension = aws_appautoscaling_target.api_service.scalable_dimension

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.cpu_utilization_high_threshold
    scale_in_cooldown  = var.scale_in_cooldown
    scale_out_cooldown = var.scale_out_cooldown
  }
}

# Similar task definitions and services would be defined for the other services:
# - Request Manager Service
# - Gateway Service
# - Parameter Service
# - Reporting Service
# These would follow a similar pattern to the API Service defined above

# Web Application Firewall (WAF)
resource "aws_wafv2_web_acl" "refunds_waf" {
  count       = var.enable_waf ? 1 : 0
  name        = "refunds-service-waf-${var.environment}"
  description = "WAF for Refunds Service"
  scope       = var.waf_scope

  default_action {
    allow {}
  }

  # Add managed rule groups
  dynamic "rule" {
    for_each = var.waf_managed_rule_groups
    content {
      name     = rule.value.name
      priority = rule.value.priority

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = rule.value.name
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = rule.value.name
        sampled_requests_enabled   = true
      }
    }
  }

  # Rate limiting rule
  rule {
    name     = "rate-limit"
    priority = 100

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "refunds-service-waf-${var.environment}"
    sampled_requests_enabled   = true
  }

  tags = var.tags
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  count        = var.enable_waf ? 1 : 0
  resource_arn = aws_lb.refunds_alb.arn
  web_acl_arn  = aws_wafv2_web_acl.refunds_waf[0].arn
}

# CloudTrail for audit logging
resource "aws_cloudtrail" "refunds_trail" {
  count                         = var.enable_cloudtrail ? 1 : 0
  name                          = "refunds-service-trail-${var.environment}"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_logs[0].id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = var.enable_log_file_validation

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::"]
    }
  }

  kms_key_id = aws_kms_key.refunds_service_key.arn
  tags       = var.tags
}

# S3 bucket for CloudTrail logs
resource "aws_s3_bucket" "cloudtrail_logs" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = "refunds-service-cloudtrail-${var.environment}-${var.aws_account_id}"
  tags   = var.tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail_logs" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail_logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.refunds_service_key.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail_logs" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail_logs[0].id

  rule {
    id     = "log-retention"
    status = "Enabled"

    expiration {
      days = var.cloudtrail_retention_period
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  count  = var.enable_cloudtrail ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail_logs[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_logs[0].arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_logs[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "mongodb_connection_secret" {
  description = "ARN of the MongoDB connection secret"
  value       = aws_secretsmanager_secret.mongodb_connection.arn
}

output "redis_connection_secret" {
  description = "ARN of the Redis connection secret"
  value       = aws_secretsmanager_secret.redis_connection.arn
}

output "alb_dns_name" {
  description = "The DNS name of the load balancer"
  value       = aws_lb.refunds_alb.dns_name
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.refunds_cluster.name
}

output "kms_key_arn" {
  description = "The ARN of the KMS key"
  value       = aws_kms_key.refunds_service_key.arn
}