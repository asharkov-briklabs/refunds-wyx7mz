# outputs.tf - Terraform outputs for the Refunds Service infrastructure
# Exposes key resource identifiers and endpoints for operational use, integration, and documentation

# Networking outputs
output "vpc_id" {
  description = "The ID of the VPC where all Refunds Service infrastructure is deployed"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs where load balancers and public-facing resources are deployed"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs where secured services like ECS tasks are deployed"
  value       = module.vpc.private_subnet_ids
}

output "availability_zones" {
  description = "List of availability zones used by the infrastructure for high availability"
  value       = module.vpc.availability_zones
}

# Load Balancer outputs
output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer for the Refunds Service"
  value       = module.alb.dns_name
}

output "alb_arn" {
  description = "The ARN of the Application Load Balancer for reference and integration"
  value       = module.alb.arn
}

output "alb_security_group_id" {
  description = "The security group ID for the Application Load Balancer"
  value       = module.alb.security_group_id
}

# Security Group outputs
output "app_security_group_id" {
  description = "The security group ID for application resources"
  value       = module.security_groups.app_security_group_id
}

# ECS Cluster outputs
output "ecs_cluster_id" {
  description = "The ID of the ECS cluster for the Refunds Service"
  value       = module.ecs.cluster_id
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster for the Refunds Service"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "The ARN of the ECS cluster for the Refunds Service"
  value       = module.ecs.cluster_arn
}

# ECS Service outputs
output "service_arns" {
  description = "Map of ECS service ARNs, keyed by service name (refund_api, request_manager, etc.)"
  value       = module.ecs.service_arns
}

output "task_definition_arns" {
  description = "Map of ECS task definition ARNs, keyed by service name"
  value       = module.ecs.task_definition_arns
}

# IAM Role outputs
output "execution_role_arn" {
  description = "The ARN of the IAM execution role for ECS tasks"
  value       = module.iam.execution_role_arn
}

output "task_role_arn" {
  description = "The ARN of the IAM task role for ECS tasks"
  value       = module.iam.task_role_arn
}

# Service Discovery outputs
output "service_discovery_namespace_id" {
  description = "The ID of the service discovery namespace for container service discovery"
  value       = module.service_discovery.namespace_id
}

# Redis outputs
output "redis_endpoint" {
  description = "The primary endpoint of the Redis replication group for connection configuration"
  value       = module.redis.primary_endpoint
}

output "redis_port" {
  description = "The port number on which the Redis cluster accepts connections"
  value       = module.redis.port
}

output "redis_reader_endpoint" {
  description = "The reader endpoint of the Redis replication group for read operations"
  value       = module.redis.reader_endpoint
}

# MongoDB outputs
output "mongodb_connection_string_template" {
  description = "The MongoDB connection string template (without credentials) for documentation"
  value       = module.mongodb.connection_string_template
}

output "mongodb_host" {
  description = "The MongoDB host address for application configuration"
  value       = module.mongodb.host
}

# S3 Bucket outputs
output "document_bucket_name" {
  description = "The S3 bucket name for storing supporting documents"
  value       = module.s3.document_bucket_name
}

output "logs_bucket_name" {
  description = "The S3 bucket name for storing logs"
  value       = module.s3.logs_bucket_name
}

# SQS Queue outputs
output "refund_request_queue_url" {
  description = "The URL of the SQS queue for refund request processing"
  value       = module.sqs.refund_request_queue_url
}

output "gateway_processing_queue_url" {
  description = "The URL of the SQS queue for gateway processing"
  value       = module.sqs.gateway_processing_queue_url
}

output "notification_queue_url" {
  description = "The URL of the SQS queue for notifications"
  value       = module.sqs.notification_queue_url
}

output "dead_letter_queue_url" {
  description = "The URL of the SQS dead letter queue"
  value       = module.sqs.dead_letter_queue_url
}

# KMS outputs
output "kms_key_arn" {
  description = "The ARN of the KMS key used for data encryption"
  value       = module.kms.key_arn
}

# CloudFront outputs
output "cloudfront_distribution_id" {
  description = "The CloudFront distribution ID for the Refunds Service"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_domain_name" {
  description = "The CloudFront domain name for the Refunds Service"
  value       = module.cloudfront.domain_name
}

# WAF outputs
output "waf_acl_arn" {
  description = "The ARN of the WAF ACL protecting the Refunds Service"
  value       = module.waf.acl_arn
}

# CloudWatch outputs
output "cloudwatch_log_group" {
  description = "The name of the CloudWatch log group for application logs"
  value       = module.logging.log_group_name
}

# API Service outputs
output "api_service_url" {
  description = "The complete URL for accessing the Refunds Service API"
  value       = "https://${module.cloudfront.domain_name}/api/v1"
}

# Auto Scaling outputs
output "autoscaling_target_arns" {
  description = "Map of ARNs for auto-scaling targets, keyed by service name"
  value       = module.autoscaling.target_arns
}

output "autoscaling_policy_arns" {
  description = "Map of ARNs for auto-scaling policies, keyed by policy name"
  value       = module.autoscaling.policy_arns
}