# ECS Cluster Outputs
output "cluster_id" {
  description = "The ID of the created ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "The name of the created ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "The ARN of the created ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

# Service Discovery Outputs
output "service_discovery_namespace_id" {
  description = "The ID of the service discovery namespace used for container service discovery"
  value       = aws_service_discovery_private_dns_namespace.main.id
}

output "service_discovery_namespace_name" {
  description = "The name of the service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

# IAM Role Outputs
output "execution_role_arn" {
  description = "The ARN of the IAM role for ECS task execution"
  value       = aws_iam_role.ecs_execution_role.arn
}

output "task_role_arn" {
  description = "The ARN of the IAM role for ECS tasks with AWS service access permissions"
  value       = aws_iam_role.ecs_task_role.arn
}

# Security Group Output
output "security_group_id" {
  description = "The ID of the security group created for ECS services"
  value       = aws_security_group.ecs_sg.id
}

# Service Outputs
output "service_arns" {
  description = "Map of ARNs for each ECS service, keyed by service name"
  value       = { for k, v in aws_ecs_service.services : k => v.id }
}

output "service_names" {
  description = "Map of service names, keyed by logical service identifier"
  value       = { for k, v in aws_ecs_service.services : k => v.name }
}

# CloudWatch Log Group Output
output "cloudwatch_log_group_name" {
  description = "The name of the CloudWatch log group for container logs"
  value       = aws_cloudwatch_log_group.ecs_logs.name
}

# Service-specific Outputs for API Service
output "api_service_discovery_arn" {
  description = "The ARN of the service discovery entry for the API service"
  value       = aws_service_discovery_service.api.arn
}

output "api_task_definition_arn" {
  description = "The ARN of the task definition for the API service"
  value       = aws_ecs_task_definition.api.arn
}

# Service-specific Outputs for Request Manager Service
output "request_manager_service_discovery_arn" {
  description = "The ARN of the service discovery entry for the Request Manager service"
  value       = aws_service_discovery_service.request_manager.arn
}

output "request_manager_task_definition_arn" {
  description = "The ARN of the task definition for the Request Manager service"
  value       = aws_ecs_task_definition.request_manager.arn
}

# Service-specific Outputs for Gateway Integration Service
output "gateway_service_discovery_arn" {
  description = "The ARN of the service discovery entry for the Gateway Integration service"
  value       = aws_service_discovery_service.gateway.arn
}

output "gateway_task_definition_arn" {
  description = "The ARN of the task definition for the Gateway Integration service"
  value       = aws_ecs_task_definition.gateway.arn
}

# Service-specific Outputs for Parameter Resolution Service
output "parameter_service_discovery_arn" {
  description = "The ARN of the service discovery entry for the Parameter Resolution service"
  value       = aws_service_discovery_service.parameter.arn
}

output "parameter_task_definition_arn" {
  description = "The ARN of the task definition for the Parameter Resolution service"
  value       = aws_ecs_task_definition.parameter.arn
}

# Auto-scaling Outputs
output "autoscaling_target_arns" {
  description = "Map of ARNs for each auto-scaling target, keyed by service name"
  value       = { for k, v in aws_appautoscaling_target.ecs_target : k => v.resource_id }
}

output "autoscaling_policy_arns" {
  description = "Map of ARNs for each auto-scaling policy, keyed by policy name"
  value       = { for k, v in aws_appautoscaling_policy.ecs_policy : k => v.arn }
}