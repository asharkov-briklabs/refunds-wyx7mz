# AWS Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

data "aws_region" "current" {}

#--------------------------------------
# Variables
#--------------------------------------
variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where resources will be created"
  type        = string
}

variable "vpc_cidr_blocks" {
  description = "List of CIDR blocks for the VPC, used for security group ingress rules"
  type        = list(string)
  default     = ["10.0.0.0/8"]
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}

variable "namespace_name" {
  description = "Name of the service discovery namespace"
  type        = string
  default     = "refunds.internal"
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "services" {
  description = "Map of service configurations"
  type = map(object({
    cpu           = number
    memory        = number
    min_instances = number
    max_instances = number
    image_url     = string
    port          = number
    command       = optional(list(string))
    environment   = optional(list(object({
      name  = string
      value = string
    })))
    secrets       = optional(list(object({
      name      = string
      valueFrom = string
    })))
    health_check_path = optional(string)
    load_balancer     = optional(object({
      target_group_arn = string
      container_port   = number
    }))
    scaling_config    = object({
      metric_type        = string # "cpu", "memory", "sqs", "request"
      target_value       = number
      scale_in_cooldown  = number
      scale_out_cooldown = number
      sqs_queue_url      = optional(string) # Required if metric_type is "sqs"
      target_group_arn   = optional(string) # Required if metric_type is "request"
    })
  }))
}

#--------------------------------------
# ECS Cluster
#--------------------------------------
resource "aws_ecs_cluster" "this" {
  name = var.cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }

  tags = merge(
    var.common_tags,
    {
      Name = var.cluster_name
    }
  )
}

#--------------------------------------
# Service Discovery
#--------------------------------------
resource "aws_service_discovery_private_dns_namespace" "this" {
  name        = var.namespace_name
  description = "Service discovery namespace for Refunds Service"
  vpc         = var.vpc_id

  tags = merge(
    var.common_tags,
    {
      Name = var.namespace_name
    }
  )
}

resource "aws_service_discovery_service" "this" {
  for_each = var.services

  name = each.key

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.this.id
    
    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = var.common_tags
}

#--------------------------------------
# IAM Roles
#--------------------------------------
resource "aws_iam_role" "execution_role" {
  name = "${var.cluster_name}-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "execution_role_policy" {
  role       = aws_iam_role.execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task_role" {
  name = "${var.cluster_name}-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = var.common_tags
}

#--------------------------------------
# CloudWatch Logs
#--------------------------------------
resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.cluster_name}"
  retention_in_days = var.log_retention_days

  tags = var.common_tags
}

#--------------------------------------
# Security Groups
#--------------------------------------
resource "aws_security_group" "ecs_services" {
  name        = "${var.cluster_name}-services-sg"
  description = "Security group for ${var.cluster_name} ECS services"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = var.vpc_cidr_blocks
    description = "Allow all traffic from within VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-services-sg"
    }
  )
}

#--------------------------------------
# Local Values
#--------------------------------------
locals {
  # Convert the CPU units from vCPU to the values required by ECS
  cpu_map = {
    0.25 = 256
    0.5  = 512
    1    = 1024
    2    = 2048
    4    = 4096
  }

  # Convert the memory units from GB to MB as required by ECS
  memory_map = {
    0.5 = 512
    1   = 1024
    2   = 2048
    3   = 3072
    4   = 4096
    5   = 5120
    6   = 6144
    7   = 7168
    8   = 8192
  }
}

#--------------------------------------
# ECS Task Definitions
#--------------------------------------
resource "aws_ecs_task_definition" "this" {
  for_each = var.services

  family                   = "${var.cluster_name}-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = lookup(local.cpu_map, each.value.cpu, 1024)
  memory                   = lookup(local.memory_map, each.value.memory, 2048)
  execution_role_arn       = aws_iam_role.execution_role.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = each.value.image_url
      essential = true
      
      portMappings = [
        {
          containerPort = each.value.port
          hostPort      = each.value.port
          protocol      = "tcp"
        }
      ]
      
      environment = each.value.environment != null ? each.value.environment : []

      secrets = each.value.secrets != null ? each.value.secrets : []
      
      command = each.value.command != null ? each.value.command : null
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = each.key
        }
      }
      
      healthCheck = each.value.health_check_path != null ? {
        command     = ["CMD-SHELL", "curl -f http://localhost:${each.value.port}${each.value.health_check_path} || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      } : null
    }
  ])

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-${each.key}"
    }
  )
}

#--------------------------------------
# ECS Services
#--------------------------------------
resource "aws_ecs_service" "this" {
  for_each = var.services

  name            = each.key
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this[each.key].arn
  launch_type     = "FARGATE"
  desired_count   = each.value.min_instances

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_services.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.this[each.key].arn
  }

  dynamic "load_balancer" {
    for_each = each.value.load_balancer != null ? [each.value.load_balancer] : []
    
    content {
      target_group_arn = load_balancer.value.target_group_arn
      container_name   = each.key
      container_port   = load_balancer.value.container_port
    }
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.cluster_name}-${each.key}"
    }
  )

  lifecycle {
    ignore_changes = [desired_count] # Allow auto-scaling to manage the desired count
  }
}

#--------------------------------------
# Auto-scaling Configuration
#--------------------------------------
resource "aws_appautoscaling_target" "this" {
  for_each = var.services

  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.this[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = each.value.min_instances
  max_capacity       = each.value.max_instances
}

# CPU-based auto-scaling policy
resource "aws_appautoscaling_policy" "cpu" {
  for_each = {
    for k, v in var.services : k => v
    if v.scaling_config.metric_type == "cpu"
  }

  name               = "${each.key}-cpu-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.this[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.this[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    
    target_value       = each.value.scaling_config.target_value
    scale_in_cooldown  = each.value.scaling_config.scale_in_cooldown
    scale_out_cooldown = each.value.scaling_config.scale_out_cooldown
  }
}

# Memory-based auto-scaling policy
resource "aws_appautoscaling_policy" "memory" {
  for_each = {
    for k, v in var.services : k => v
    if v.scaling_config.metric_type == "memory"
  }

  name               = "${each.key}-memory-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.this[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.this[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    
    target_value       = each.value.scaling_config.target_value
    scale_in_cooldown  = each.value.scaling_config.scale_in_cooldown
    scale_out_cooldown = each.value.scaling_config.scale_out_cooldown
  }
}

# Request-based auto-scaling policy
resource "aws_appautoscaling_policy" "request" {
  for_each = {
    for k, v in var.services : k => v
    if v.scaling_config.metric_type == "request"
  }

  name               = "${each.key}-request-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.this[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.this[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = each.value.scaling_config.target_group_arn
    }
    
    target_value       = each.value.scaling_config.target_value
    scale_in_cooldown  = each.value.scaling_config.scale_in_cooldown
    scale_out_cooldown = each.value.scaling_config.scale_out_cooldown
  }
}

# SQS-based auto-scaling policy
resource "aws_appautoscaling_policy" "sqs" {
  for_each = {
    for k, v in var.services : k => v
    if v.scaling_config.metric_type == "sqs"
  }

  name               = "${each.key}-sqs-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.this[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.this[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    customized_metric_specification {
      metrics {
        id          = "sqs_queue_depth"
        expression  = "m1 / m2"
        label       = "Queue Messages Per Instance"
        return_data = true
        
        metric {
          id          = "m1"
          namespace   = "AWS/SQS"
          metric_name = "ApproximateNumberOfMessages"
          stat        = "Sum"
          
          dimensions {
            name  = "QueueName"
            value = element(split("/", each.value.scaling_config.sqs_queue_url), length(split("/", each.value.scaling_config.sqs_queue_url)) - 1)
          }
        }
        
        metric {
          id          = "m2"
          namespace   = "AWS/ECS"
          metric_name = "RunningTaskCount"
          stat        = "Average"
          
          dimensions {
            name  = "ClusterName"
            value = aws_ecs_cluster.this.name
          }
          
          dimensions {
            name  = "ServiceName"
            value = aws_ecs_service.this[each.key].name
          }
        }
      }
    }
    
    target_value       = each.value.scaling_config.target_value
    scale_in_cooldown  = each.value.scaling_config.scale_in_cooldown
    scale_out_cooldown = each.value.scaling_config.scale_out_cooldown
  }
}

#--------------------------------------
# Outputs
#--------------------------------------
output "cluster_id" {
  description = "The ID of the created ECS cluster"
  value       = aws_ecs_cluster.this.id
}

output "cluster_name" {
  description = "The name of the created ECS cluster"
  value       = aws_ecs_cluster.this.name
}

output "service_discovery_namespace_id" {
  description = "The ID of the service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.this.id
}

output "execution_role_arn" {
  description = "The ARN of the ECS task execution role"
  value       = aws_iam_role.execution_role.arn
}

output "task_role_arn" {
  description = "The ARN of the ECS task role"
  value       = aws_iam_role.task_role.arn
}

output "security_group_id" {
  description = "The ID of the security group for ECS services"
  value       = aws_security_group.ecs_services.id
}

output "service_arns" {
  description = "The ARNs of the created ECS services, keyed by service name"
  value       = { for k, v in aws_ecs_service.this : k => v.id }
}

output "service_names" {
  description = "The names of the created ECS services, keyed by service name"
  value       = { for k, v in aws_ecs_service.this : k => v.name }
}