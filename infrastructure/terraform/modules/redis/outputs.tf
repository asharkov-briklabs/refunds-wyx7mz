# Output definitions for the Redis module
# These outputs allow other modules to access the Redis cluster details

output "redis_endpoint" {
  description = "The primary endpoint of the Redis replication group"
  value       = aws_elasticache_replication_group.redis_cluster.primary_endpoint_address
}

output "redis_port" {
  description = "The port number on which the Redis cluster accepts connections"
  value       = aws_elasticache_replication_group.redis_cluster.port
}

output "redis_arn" {
  description = "The ARN of the Redis replication group"
  value       = aws_elasticache_replication_group.redis_cluster.arn
}

output "redis_security_group_id" {
  description = "The ID of the security group created for the Redis cluster"
  value       = aws_security_group.redis_security_group.id
}

output "reader_endpoint" {
  description = "The reader endpoint of the Redis replication group for read operations"
  value       = aws_elasticache_replication_group.redis_cluster.reader_endpoint_address
}

output "redis_nodes" {
  description = "List of node objects including id, address, port, and availability zone"
  value       = aws_elasticache_replication_group.redis_cluster.member_clusters
}

output "parameter_group_name" {
  description = "The name of the parameter group used by the Redis cluster"
  value       = aws_elasticache_parameter_group.redis_parameter_group.name
}

output "subnet_group_name" {
  description = "The name of the subnet group used by the Redis cluster"
  value       = aws_elasticache_subnet_group.redis_subnet_group.name
}

output "redis_configuration_endpoint" {
  description = "The configuration endpoint for the Redis replication group"
  value       = aws_elasticache_replication_group.redis_cluster.configuration_endpoint_address
}

output "cpu_alarm_arn" {
  description = "The ARN of the CloudWatch alarm for Redis CPU utilization"
  value       = aws_cloudwatch_metric_alarm.redis_cpu_utilization_alarm.arn
}

output "memory_alarm_arn" {
  description = "The ARN of the CloudWatch alarm for Redis memory utilization"
  value       = aws_cloudwatch_metric_alarm.redis_memory_utilization_alarm.arn
}