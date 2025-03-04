variable "app_name" {
  description = "The name of the application for resource naming"
  type        = string
  default     = "refund-service"
}

variable "environment" {
  description = "The deployment environment (dev, test, staging, prod)"
  type        = string
  
  validation {
    condition     = contains(["dev", "test", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, test, staging, prod."
  }
}

variable "aws_region" {
  description = "The AWS region to deploy resources into"
  type        = string
  default     = "us-east-1"
}

variable "tags" {
  description = "A map of tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "vpc_id" {
  description = "The ID of the VPC where the ECS resources will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "The IDs of the private subnets where the ECS tasks will be deployed"
  type        = list(string)
  
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least two private subnets are required for high availability."
  }
}

variable "public_subnet_ids" {
  description = "The IDs of the public subnets where the load balancer will be deployed"
  type        = list(string)
  
  validation {
    condition     = length(var.public_subnet_ids) >= 2
    error_message = "At least two public subnets are required for high availability."
  }
}

variable "container_security_group_id" {
  description = "The ID of the security group for the ECS tasks"
  type        = string
}

variable "load_balancer_security_group_id" {
  description = "The ID of the security group for the load balancer"
  type        = string
}

variable "ecs_cluster_name" {
  description = "The name of the ECS cluster to create"
  type        = string
}

variable "enable_execute_command" {
  description = "Whether to enable ECS Exec for the tasks"
  type        = bool
  default     = false
}

variable "capacity_providers" {
  description = "A list of capacity providers to use for the cluster"
  type        = list(string)
  default     = ["FARGATE", "FARGATE_SPOT"]
}

variable "default_capacity_provider_strategy" {
  description = "The default capacity provider strategy for the cluster"
  type        = list(object({
    capacity_provider = string
    weight            = number
    base              = number
  }))
  default = [{
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }]
}

variable "services" {
  description = "Map of service configurations for different components"
  type = map(object({
    cpu                    = number
    memory                 = number
    container_port         = number
    host_port              = number
    min_capacity           = number
    max_capacity           = number
    desired_count          = number
    health_check_path      = string
    health_check_timeout   = number
    health_check_interval  = number
    health_check_matcher   = string
    image                  = string
    command                = list(string)
    environment_variables  = list(object({
      name  = string
      value = string
    }))
    secrets = list(object({
      name      = string
      valueFrom = string
    }))
  }))
  default = {}
}

variable "api_service_cpu" {
  description = "The CPU units to allocate for the Refund API Service (1 vCPU = 1024 units)"
  type        = number
  default     = 1024
  
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.api_service_cpu)
    error_message = "CPU must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "api_service_memory" {
  description = "The memory to allocate for the Refund API Service (in MB)"
  type        = number
  default     = 2048
  
  validation {
    condition     = var.api_service_memory >= 512
    error_message = "Memory must be at least 512 MB."
  }
}

variable "api_service_min_capacity" {
  description = "The minimum number of tasks for the Refund API Service"
  type        = number
  default     = 3
}

variable "api_service_max_capacity" {
  description = "The maximum number of tasks for the Refund API Service"
  type        = number
  default     = 10
}

variable "request_manager_cpu" {
  description = "The CPU units to allocate for the Refund Request Manager (1 vCPU = 1024 units)"
  type        = number
  default     = 2048
  
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.request_manager_cpu)
    error_message = "CPU must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "request_manager_memory" {
  description = "The memory to allocate for the Refund Request Manager (in MB)"
  type        = number
  default     = 4096
  
  validation {
    condition     = var.request_manager_memory >= 1024
    error_message = "Memory must be at least 1024 MB."
  }
}

variable "request_manager_min_capacity" {
  description = "The minimum number of tasks for the Refund Request Manager"
  type        = number
  default     = 2
}

variable "request_manager_max_capacity" {
  description = "The maximum number of tasks for the Refund Request Manager"
  type        = number
  default     = 8
}

variable "gateway_service_cpu" {
  description = "The CPU units to allocate for the Gateway Integration Service (1 vCPU = 1024 units)"
  type        = number
  default     = 1024
  
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.gateway_service_cpu)
    error_message = "CPU must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "gateway_service_memory" {
  description = "The memory to allocate for the Gateway Integration Service (in MB)"
  type        = number
  default     = 2048
  
  validation {
    condition     = var.gateway_service_memory >= 512
    error_message = "Memory must be at least 512 MB."
  }
}

variable "gateway_service_min_capacity" {
  description = "The minimum number of tasks for the Gateway Integration Service"
  type        = number
  default     = 2
}

variable "gateway_service_max_capacity" {
  description = "The maximum number of tasks for the Gateway Integration Service"
  type        = number
  default     = 6
}

variable "parameter_service_cpu" {
  description = "The CPU units to allocate for the Parameter Resolution Service (1 vCPU = 1024 units)"
  type        = number
  default     = 512
  
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.parameter_service_cpu)
    error_message = "CPU must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "parameter_service_memory" {
  description = "The memory to allocate for the Parameter Resolution Service (in MB)"
  type        = number
  default     = 1024
  
  validation {
    condition     = var.parameter_service_memory >= 512
    error_message = "Memory must be at least 512 MB."
  }
}

variable "parameter_service_min_capacity" {
  description = "The minimum number of tasks for the Parameter Resolution Service"
  type        = number
  default     = 2
}

variable "parameter_service_max_capacity" {
  description = "The maximum number of tasks for the Parameter Resolution Service"
  type        = number
  default     = 4
}

variable "reporting_service_cpu" {
  description = "The CPU units to allocate for the Reporting & Analytics Engine (1 vCPU = 1024 units)"
  type        = number
  default     = 2048
  
  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.reporting_service_cpu)
    error_message = "CPU must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "reporting_service_memory" {
  description = "The memory to allocate for the Reporting & Analytics Engine (in MB)"
  type        = number
  default     = 4096
  
  validation {
    condition     = var.reporting_service_memory >= 1024
    error_message = "Memory must be at least 1024 MB."
  }
}

variable "reporting_service_min_capacity" {
  description = "The minimum number of tasks for the Reporting & Analytics Engine"
  type        = number
  default     = 1
}

variable "reporting_service_max_capacity" {
  description = "The maximum number of tasks for the Reporting & Analytics Engine"
  type        = number
  default     = 3
}

variable "ecr_repository_url" {
  description = "The URL of the ECR repository where container images are stored"
  type        = string
}

variable "container_image_tag" {
  description = "The tag of the container image to deploy"
  type        = string
  default     = "latest"
}

variable "cloudwatch_log_group_name" {
  description = "The name of the CloudWatch log group for the ECS tasks"
  type        = string
  default     = "/ecs/refund-service"
}

variable "cloudwatch_log_retention_in_days" {
  description = "The number of days to retain logs in CloudWatch"
  type        = number
  default     = 30
}

variable "task_execution_role_arn" {
  description = "The ARN of the IAM role that the ECS task executes with"
  type        = string
}

variable "task_role_arn" {
  description = "The ARN of the IAM role that the ECS task has permissions for AWS resources"
  type        = string
}

variable "load_balancer_arn" {
  description = "The ARN of the load balancer to attach ECS services to"
  type        = string
}

variable "health_check_grace_period_seconds" {
  description = "The health check grace period for ECS services in seconds"
  type        = number
  default     = 60
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

variable "cpu_utilization_high_threshold" {
  description = "The CPU utilization percentage threshold for scaling out"
  type        = number
  default     = 70
  
  validation {
    condition     = var.cpu_utilization_high_threshold > 0 && var.cpu_utilization_high_threshold <= 100
    error_message = "CPU utilization threshold must be between 1 and 100."
  }
}

variable "cpu_utilization_low_threshold" {
  description = "The CPU utilization percentage threshold for scaling in"
  type        = number
  default     = 30
  
  validation {
    condition     = var.cpu_utilization_low_threshold > 0 && var.cpu_utilization_low_threshold <= 100
    error_message = "CPU utilization threshold must be between 1 and 100."
  }
}

variable "scale_out_cooldown" {
  description = "The cooldown period in seconds before another scale out action can take place"
  type        = number
  default     = 60
}

variable "scale_in_cooldown" {
  description = "The cooldown period in seconds before another scale in action can take place"
  type        = number
  default     = 300
}

variable "enable_service_discovery" {
  description = "Whether to enable AWS Cloud Map service discovery"
  type        = bool
  default     = true
}

variable "service_discovery_namespace_id" {
  description = "The ID of the AWS Cloud Map namespace for service discovery"
  type        = string
}

variable "enable_blue_green_deployment" {
  description = "Whether to enable CodeDeploy blue-green deployments"
  type        = bool
  default     = true
}

variable "deployment_config_name" {
  description = "The deployment configuration for CodeDeploy"
  type        = string
  default     = "CodeDeployDefault.ECSLinear10PercentEvery1Minute"
}