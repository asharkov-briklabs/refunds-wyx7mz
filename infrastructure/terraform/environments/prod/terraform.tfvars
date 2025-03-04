# Configure the AWS Provider
provider "aws" {
  region = var.primary_region
  default_tags {
    tags = var.tags
  }
}

# Set up provider for secondary region
provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
  default_tags {
    tags = var.tags
  }
}

# VPC Module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 3.0"

  name = "refunds-service-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway
  enable_vpn_gateway = var.enable_vpn_gateway

  # DNS Support
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags
  tags = var.tags
}

# Security Groups
resource "aws_security_group" "alb" {
  name        = "refunds-service-alb-sg"
  description = "Security group for ALB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "refunds-service-alb-sg"
  })
}

resource "aws_security_group" "ecs_service" {
  name        = "refunds-service-ecs-sg"
  description = "Security group for ECS Services"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "refunds-service-ecs-sg"
  })
}

resource "aws_security_group" "redis" {
  name        = "refunds-service-redis-sg"
  description = "Security group for Redis"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_service.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "refunds-service-redis-sg"
  })
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "refunds-service-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = true

  tags = merge(var.tags, {
    Name = "refunds-service-alb"
  })
}

# Target Groups for each service
resource "aws_lb_target_group" "refund_api" {
  name        = "refund-api-tg"
  port        = var.refund_api_service.container_port
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = var.refund_api_service.health_check_path
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = var.tags
}

resource "aws_lb_target_group" "refund_processor" {
  name        = "refund-processor-tg"
  port        = var.refund_processor_service.container_port
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = var.refund_processor_service.health_check_path
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = var.tags
}

resource "aws_lb_target_group" "gateway_service" {
  name        = "gateway-service-tg"
  port        = var.gateway_service.container_port
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = var.gateway_service.health_check_path
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = var.tags
}

# ALB Listeners
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.cert.arn

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
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

# Listener Rules
resource "aws_lb_listener_rule" "refund_api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.refund_api.arn
  }

  condition {
    path_pattern {
      values = ["/api/refunds*"]
    }
  }
}

resource "aws_lb_listener_rule" "gateway_service" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gateway_service.arn
  }

  condition {
    path_pattern {
      values = ["/api/gateway*"]
    }
  }
}

# ACM Certificate
resource "aws_acm_certificate" "cert" {
  domain_name       = var.route53_config.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = var.ecs_cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = var.tags
}

# ECS Capacity Provider
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = var.ecs_capacity_providers

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = var.fargate_weight
  }

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = var.fargate_spot_weight
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "refunds-service-ecs-task-execution-role"

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

# IAM Role for ECS Task
resource "aws_iam_role" "ecs_task_role" {
  name = "refunds-service-ecs-task-role"

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

# Custom policy for ECS task role
resource "aws_iam_policy" "ecs_task_policy" {
  name        = "refunds-service-ecs-task-policy"
  description = "Policy for Refunds Service ECS Tasks"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [
          for queue in concat(var.sqs_config.standard_queues, var.sqs_config.fifo_queues) :
          "arn:aws:sqs:${var.primary_region}:*:${queue}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::refunds-service-*/*",
          "arn:aws:s3:::refunds-service-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [
          aws_kms_key.main.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.primary_region}:*:secret:refunds-service-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          "arn:aws:ssm:${var.primary_region}:*:parameter/refunds-service/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_policy_attachment" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_policy.arn
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "refund_api" {
  name              = "/ecs/refunds-service/${var.refund_api_service.name}"
  retention_in_days = var.monitoring_config.logs_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "refund_processor" {
  name              = "/ecs/refunds-service/${var.refund_processor_service.name}"
  retention_in_days = var.monitoring_config.logs_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "gateway_service" {
  name              = "/ecs/refunds-service/${var.gateway_service.name}"
  retention_in_days = var.monitoring_config.logs_retention_days

  tags = var.tags
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "refund_api" {
  family                   = var.refund_api_service.name
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.refund_api_service.cpu
  memory                   = var.refund_api_service.memory

  container_definitions = jsonencode([
    {
      name      = var.refund_api_service.name
      image     = "${aws_ecr_repository.refund_api.repository_url}:latest"
      essential = true
      
      portMappings = [
        {
          containerPort = var.refund_api_service.container_port
          hostPort      = var.refund_api_service.host_port
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "ENVIRONMENT",
          value = var.environment
        },
        {
          name  = "AWS_REGION",
          value = var.primary_region
        }
      ]
      
      secrets = [
        {
          name      = "DB_CONNECTION_STRING",
          valueFrom = "arn:aws:secretsmanager:${var.primary_region}:${data.aws_caller_identity.current.account_id}:secret:refunds-service/mongodb-connection-string"
        },
        {
          name      = "REDIS_CONNECTION_STRING",
          valueFrom = "arn:aws:secretsmanager:${var.primary_region}:${data.aws_caller_identity.current.account_id}:secret:refunds-service/redis-connection-string"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.refund_api.name
          "awslogs-region"        = var.primary_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.refund_api_service.container_port}${var.refund_api_service.health_check_path} || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_task_definition" "refund_processor" {
  family                   = var.refund_processor_service.name
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.refund_processor_service.cpu
  memory                   = var.refund_processor_service.memory

  container_definitions = jsonencode([
    {
      name      = var.refund_processor_service.name
      image     = "${aws_ecr_repository.refund_processor.repository_url}:latest"
      essential = true
      
      portMappings = [
        {
          containerPort = var.refund_processor_service.container_port
          hostPort      = var.refund_processor_service.host_port
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "ENVIRONMENT",
          value = var.environment
        },
        {
          name  = "AWS_REGION",
          value = var.primary_region
        }
      ]
      
      secrets = [
        {
          name      = "DB_CONNECTION_STRING",
          valueFrom = "arn:aws:secretsmanager:${var.primary_region}:${data.aws_caller_identity.current.account_id}:secret:refunds-service/mongodb-connection-string"
        },
        {
          name      = "REDIS_CONNECTION_STRING",
          valueFrom = "arn:aws:secretsmanager:${var.primary_region}:${data.aws_caller_identity.current.account_id}:secret:refunds-service/redis-connection-string"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.refund_processor.name
          "awslogs-region"        = var.primary_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.refund_processor_service.container_port}${var.refund_processor_service.health_check_path} || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_task_definition" "gateway_service" {
  family                   = var.gateway_service.name
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.gateway_service.cpu
  memory                   = var.gateway_service.memory

  container_definitions = jsonencode([
    {
      name      = var.gateway_service.name
      image     = "${aws_ecr_repository.gateway_service.repository_url}:latest"
      essential = true
      
      portMappings = [
        {
          containerPort = var.gateway_service.container_port
          hostPort      = var.gateway_service.host_port
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "ENVIRONMENT",
          value = var.environment
        },
        {
          name  = "AWS_REGION",
          value = var.primary_region
        }
      ]
      
      secrets = [
        {
          name      = "DB_CONNECTION_STRING",
          valueFrom = "arn:aws:secretsmanager:${var.primary_region}:${data.aws_caller_identity.current.account_id}:secret:refunds-service/mongodb-connection-string"
        },
        {
          name      = "REDIS_CONNECTION_STRING",
          valueFrom = "arn:aws:secretsmanager:${var.primary_region}:${data.aws_caller_identity.current.account_id}:secret:refunds-service/redis-connection-string"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.gateway_service.name
          "awslogs-region"        = var.primary_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.gateway_service.container_port}${var.gateway_service.health_check_path} || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = var.tags
}

# ECS Services
resource "aws_ecs_service" "refund_api" {
  name            = var.refund_api_service.name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.refund_api.arn
  desired_count   = var.refund_api_service.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.ecs_service.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.refund_api.arn
    container_name   = var.refund_api_service.name
    container_port   = var.refund_api_service.container_port
  }

  deployment_controller {
    type = "ECS"
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = var.fargate_weight
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = var.fargate_spot_weight
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = var.tags
}

resource "aws_ecs_service" "refund_processor" {
  name            = var.refund_processor_service.name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.refund_processor.arn
  desired_count   = var.refund_processor_service.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.ecs_service.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.refund_processor.arn
    container_name   = var.refund_processor_service.name
    container_port   = var.refund_processor_service.container_port
  }

  deployment_controller {
    type = "ECS"
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = var.fargate_weight
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = var.fargate_spot_weight
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = var.tags
}

resource "aws_ecs_service" "gateway_service" {
  name            = var.gateway_service.name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.gateway_service.arn
  desired_count   = var.gateway_service.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.ecs_service.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.gateway_service.arn
    container_name   = var.gateway_service.name
    container_port   = var.gateway_service.container_port
  }

  deployment_controller {
    type = "ECS"
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = var.fargate_weight
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = var.fargate_spot_weight
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = var.tags
}

# Auto Scaling for ECS Services
resource "aws_appautoscaling_target" "refund_api" {
  max_capacity       = var.refund_api_service.max_count
  min_capacity       = var.refund_api_service.min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.refund_api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "refund_api_cpu" {
  name               = "refund-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.refund_api.resource_id
  scalable_dimension = aws_appautoscaling_target.refund_api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.refund_api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.refund_api_service.cpu_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "refund_api_memory" {
  name               = "refund-api-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.refund_api.resource_id
  scalable_dimension = aws_appautoscaling_target.refund_api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.refund_api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.refund_api_service.memory_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_target" "refund_processor" {
  max_capacity       = var.refund_processor_service.max_count
  min_capacity       = var.refund_processor_service.min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.refund_processor.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "refund_processor_cpu" {
  name               = "refund-processor-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.refund_processor.resource_id
  scalable_dimension = aws_appautoscaling_target.refund_processor.scalable_dimension
  service_namespace  = aws_appautoscaling_target.refund_processor.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.refund_processor_service.cpu_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "refund_processor_memory" {
  name               = "refund-processor-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.refund_processor.resource_id
  scalable_dimension = aws_appautoscaling_target.refund_processor.scalable_dimension
  service_namespace  = aws_appautoscaling_target.refund_processor.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.refund_processor_service.memory_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_target" "gateway_service" {
  max_capacity       = var.gateway_service.max_count
  min_capacity       = var.gateway_service.min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.gateway_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "gateway_service_cpu" {
  name               = "gateway-service-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gateway_service.resource_id
  scalable_dimension = aws_appautoscaling_target.gateway_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.gateway_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.gateway_service.cpu_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "gateway_service_memory" {
  name               = "gateway-service-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gateway_service.resource_id
  scalable_dimension = aws_appautoscaling_target.gateway_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.gateway_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.gateway_service.memory_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ECS Service Discovery
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "refunds-service.local"
  description = "Private DNS namespace for Refunds Service"
  vpc         = module.vpc.vpc_id

  tags = var.tags
}

resource "aws_service_discovery_service" "refund_api" {
  name = var.refund_api_service.name

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = var.tags
}

resource "aws_service_discovery_service" "refund_processor" {
  name = var.refund_processor_service.name

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = var.tags
}

resource "aws_service_discovery_service" "gateway_service" {
  name = var.gateway_service.name

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = var.tags
}

# ECR Repositories
resource "aws_ecr_repository" "refund_api" {
  name                 = var.refund_api_service.name
  image_tag_mutability = "IMMUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.main.arn
  }
  
  tags = var.tags
}

resource "aws_ecr_repository" "refund_processor" {
  name                 = var.refund_processor_service.name
  image_tag_mutability = "IMMUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.main.arn
  }
  
  tags = var.tags
}

resource "aws_ecr_repository" "gateway_service" {
  name                 = var.gateway_service.name
  image_tag_mutability = "IMMUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.main.arn
  }
  
  tags = var.tags
}

# ECR Lifecycle Policy
resource "aws_ecr_lifecycle_policy" "refund_api" {
  repository = aws_ecr_repository.refund_api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 20 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 20
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "refund_processor" {
  repository = aws_ecr_repository.refund_processor.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 20 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 20
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "gateway_service" {
  repository = aws_ecr_repository.gateway_service.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 20 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 20
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# KMS Key for encryption
resource "aws_kms_key" "main" {
  description             = "KMS key for Refunds Service encryption"
  deletion_window_in_days = var.security_config.kms_key_deletion_window_in_days
  enable_key_rotation     = true
  multi_region            = true

  tags = var.tags
}

resource "aws_kms_alias" "main" {
  name          = "alias/refunds-service"
  target_key_id = aws_kms_key.main.key_id
}

# S3 Bucket for documents and logs
resource "aws_s3_bucket" "main" {
  bucket = "refunds-service-${data.aws_caller_identity.current.account_id}"

  tags = var.tags
}

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  
  versioning_configuration {
    status = var.s3_bucket_config.versioning_enabled ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.main.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "lifecycle-rule"
    status = "Enabled"

    transition {
      days          = var.s3_bucket_config.lifecycle_standard_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.s3_bucket_config.lifecycle_glacier_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.s3_bucket_config.lifecycle_expiration
    }
  }
}

resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# SQS Queues
resource "aws_sqs_queue" "standard_queues" {
  for_each = toset(var.sqs_config.standard_queues)

  name                      = each.value
  message_retention_seconds = var.sqs_config.message_retention_seconds
  visibility_timeout_seconds = var.sqs_config.visibility_timeout_seconds
  
  kms_master_key_id         = aws_kms_key.main.arn
  kms_data_key_reuse_period_seconds = 300
  
  tags = var.tags
}

resource "aws_sqs_queue" "standard_dlq" {
  for_each = toset(var.sqs_config.standard_queues)

  name                      = "${each.value}-dlq"
  message_retention_seconds = var.sqs_config.message_retention_seconds
  
  kms_master_key_id         = aws_kms_key.main.arn
  kms_data_key_reuse_period_seconds = 300
  
  tags = var.tags
}

resource "aws_sqs_queue_redrive_policy" "standard" {
  for_each = toset(var.sqs_config.standard_queues)

  queue_url = aws_sqs_queue.standard_queues[each.value].id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.standard_dlq[each.value].arn
    maxReceiveCount     = 5
  })
}

resource "aws_sqs_queue" "fifo_queues" {
  for_each = toset(var.sqs_config.fifo_queues)

  name                      = each.value
  fifo_queue                = true
  content_based_deduplication = true
  message_retention_seconds = var.sqs_config.message_retention_seconds
  visibility_timeout_seconds = var.sqs_config.visibility_timeout_seconds
  
  kms_master_key_id         = aws_kms_key.main.arn
  kms_data_key_reuse_period_seconds = 300
  
  tags = var.tags
}

resource "aws_sqs_queue" "fifo_dlq" {
  for_each = toset(var.sqs_config.fifo_queues)

  name                      = "${each.value}-dlq"
  fifo_queue                = true
  message_retention_seconds = var.sqs_config.message_retention_seconds
  
  kms_master_key_id         = aws_kms_key.main.arn
  kms_data_key_reuse_period_seconds = 300
  
  tags = var.tags
}

resource "aws_sqs_queue_redrive_policy" "fifo" {
  for_each = toset(var.sqs_config.fifo_queues)

  queue_url = aws_sqs_queue.fifo_queues[each.value].id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.fifo_dlq[each.value].arn
    maxReceiveCount     = 5
  })
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "refunds-service-redis-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = var.tags
}

resource "aws_elasticache_parameter_group" "main" {
  name   = "refunds-service-redis-params"
  family = var.redis.parameter_group_name

  tags = var.tags
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = "refunds-service-redis"
  description                   = "Redis cluster for Refunds Service"
  node_type                     = var.redis.node_type
  num_cache_clusters            = var.redis.num_cache_clusters
  parameter_group_name          = aws_elasticache_parameter_group.main.name
  subnet_group_name             = aws_elasticache_subnet_group.main.name
  security_group_ids            = [aws_security_group.redis.id]
  automatic_failover_enabled    = var.redis.automatic_failover_enabled
  multi_az_enabled              = var.redis.multi_az_enabled
  engine_version                = var.redis.engine_version
  at_rest_encryption_enabled    = var.redis.at_rest_encryption_enabled
  transit_encryption_enabled    = var.redis.transit_encryption_enabled
  kms_key_id                    = aws_kms_key.main.arn

  tags = var.tags
}

# Route53 DNS
resource "aws_route53_zone" "main" {
  name = var.route53_config.domain_name

  tags = var.tags
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.route53_config.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = var.cloudfront_config.enabled
  is_ipv6_enabled     = true
  comment             = "Refunds Service Distribution"
  default_root_object = var.cloudfront_config.default_root_object
  price_class         = var.cloudfront_config.price_class

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB"

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
      headers = ["Host", "Origin", "Authorization", "Referer"]
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations        = []
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.main.bucket_domain_name
    prefix          = "cloudfront-logs/"
  }

  tags = var.tags
}

# WAF for API Gateway and CloudFront
resource "aws_wafv2_web_acl" "main" {
  name        = "refunds-service-waf"
  description = "WAF for Refunds Service"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimit"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_config.rule_rate_limit_threshold
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "refunds-service-waf-metric"
    sampled_requests_enabled   = true
  }

  tags = var.tags
}

resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# AWS Backup
resource "aws_backup_vault" "main" {
  name        = "refunds-service-backup-vault"
  kms_key_arn = aws_kms_key.main.arn
  
  tags = var.tags
}

resource "aws_backup_plan" "main" {
  name = "refunds-service-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = var.backup_config.schedule_expression
    
    lifecycle {
      delete_after = var.backup_config.delete_after_days
      cold_storage_after = var.backup_config.cold_storage_after_days
    }
  }

  tags = var.tags
}

resource "aws_backup_selection" "main" {
  name         = "refunds-service-resources"
  iam_role_arn = aws_iam_role.backup_role.arn
  plan_id      = aws_backup_plan.main.id

  selection_tag {
    type  = "STRINGEQUAL"
    key   = "Project"
    value = "RefundsService"
  }
}

resource "aws_iam_role" "backup_role" {
  name = "refunds-service-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backup_role_policy" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

# Security Services
resource "aws_guardduty_detector" "main" {
  enable                       = var.security_config.enable_guardduty
  finding_publishing_frequency = "SIX_HOURS"
  
  tags = var.tags
}

resource "aws_securityhub_account" "main" {
  count = var.security_config.enable_securityhub ? 1 : 0
}

resource "aws_securityhub_standards_subscription" "cis" {
  count = var.security_config.enable_securityhub ? 1 : 0
  
  standards_arn = "arn:aws:securityhub:${var.primary_region}::standards/cis-aws-foundations-benchmark/v/1.2.0"
}

resource "aws_securityhub_standards_subscription" "pci_dss" {
  count = var.security_config.enable_securityhub ? 1 : 0
  
  standards_arn = "arn:aws:securityhub:${var.primary_region}::standards/pci-dss/v/3.2.1"
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "cpu_high_refund_api" {
  alarm_name          = "refund-api-cpu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.monitoring_config.alarm_evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.refund_api_service.cpu_threshold
  alarm_description   = "This metric monitors ECS service CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  datapoints_to_alarm = var.monitoring_config.alarm_datapoints_to_alarm

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.refund_api.name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "memory_high_refund_api" {
  alarm_name          = "refund-api-memory-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.monitoring_config.alarm_evaluation_periods
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.refund_api_service.memory_threshold
  alarm_description   = "This metric monitors ECS service memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  datapoints_to_alarm = var.monitoring_config.alarm_datapoints_to_alarm

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.refund_api.name
  }

  tags = var.tags
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name              = "refunds-service-alerts"
  kms_master_key_id = aws_kms_key.main.arn
  
  tags = var.tags
}

resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "default"
    Statement = [
      {
        Sid       = "AllowCloudWatchAlarms"
        Effect    = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action    = "sns:Publish"
        Resource  = aws_sns_topic.alerts.arn
      }
    ]
  })
}

# Required data sources
data "aws_caller_identity" "current" {}

# Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "alb_dns_name" {
  description = "The DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "redis_endpoint" {
  description = "Redis primary endpoint address"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value = {
    refund_api        = aws_ecr_repository.refund_api.repository_url
    refund_processor  = aws_ecr_repository.refund_processor.repository_url
    gateway_service   = aws_ecr_repository.gateway_service.repository_url
  }
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for encryption"
  value       = aws_kms_key.main.arn
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "route53_zone_id" {
  description = "ID of the Route53 zone"
  value       = aws_route53_zone.main.zone_id
}

output "sqs_queue_urls" {
  description = "URLs of the SQS queues"
  value = {
    for name in var.sqs_config.standard_queues : name => aws_sqs_queue.standard_queues[name].id
  }
}

output "fifo_queue_urls" {
  description = "URLs of the FIFO SQS queues"
  value = {
    for name in var.sqs_config.fifo_queues : name => aws_sqs_queue.fifo_queues[name].id
  }
}