# AWS ElastiCache Redis module for Refunds Service
# Provides caching for parameter resolution, distributed locking, and other caching needs
# Version: 1.0.0

# Create a subnet group that spans multiple Availability Zones
resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name        = "${var.name_prefix}-redis-subnet-group"
  subnet_ids  = var.subnet_ids
  description = "Subnet group for Refunds Service Redis cluster"
}

# Define parameter group with optimized settings for the Refunds Service
resource "aws_elasticache_parameter_group" "redis_parameter_group" {
  name        = "${var.name_prefix}-redis-params"
  family      = "redis7.0"
  description = "Refunds Service Redis parameter group"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }
}

# Security group with restricted access
resource "aws_security_group" "redis_security_group" {
  name        = "${var.name_prefix}-redis-sg"
  description = "Security group for Refunds Service Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
    description     = "Redis port access"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "${var.name_prefix}-redis-sg"
  }
}

# Redis cluster with replication for high availability
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id       = "${var.name_prefix}-redis"
  description                = "Redis cluster for Refunds Service"
  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = var.node_type
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.redis_parameter_group.name
  subnet_group_name          = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids         = [aws_security_group.redis_security_group.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.auth_token != "" ? var.auth_token : null
  automatic_failover_enabled = var.node_count > 1 ? true : false
  multi_az_enabled           = var.multi_az_enabled
  num_cache_clusters         = var.node_count
  kms_key_id                 = var.kms_key_id != "" ? var.kms_key_id : null
  snapshot_retention_limit   = var.snapshot_retention_days
  snapshot_window            = var.snapshot_window
  maintenance_window         = var.maintenance_window
  auto_minor_version_upgrade = true
  apply_immediately          = var.apply_immediately

  tags = {
    Name        = "${var.name_prefix}-redis"
    Environment = var.environment
    Service     = "refunds"
  }
}

# CloudWatch alarm for Redis CPU utilization
resource "aws_cloudwatch_metric_alarm" "redis_cpu_utilization_alarm" {
  alarm_name          = "${var.name_prefix}-redis-cpu-utilization"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  alarm_description   = "This metric monitors Redis CPU utilization"
  
  dimensions = {
    CacheClusterId = "${var.name_prefix}-redis-001"
  }
  
  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions
}

# CloudWatch alarm for Redis memory utilization
resource "aws_cloudwatch_metric_alarm" "redis_memory_utilization_alarm" {
  alarm_name          = "${var.name_prefix}-redis-memory-utilization"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.memory_alarm_threshold
  alarm_description   = "This metric monitors Redis memory utilization percentage"
  
  dimensions = {
    CacheClusterId = "${var.name_prefix}-redis-001"
  }
  
  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions
}