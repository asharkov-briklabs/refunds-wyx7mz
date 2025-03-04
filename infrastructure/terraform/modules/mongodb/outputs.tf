# MongoDB Atlas resource identifiers
output "cluster_id" {
  description = "The MongoDB Atlas cluster ID for reference by other modules and resources"
  value       = module.mongodb_atlas.cluster_id
  sensitive   = false
}

output "project_id" {
  description = "The MongoDB Atlas project ID containing the cluster"
  value       = module.mongodb_atlas.project_id
  sensitive   = false
}

output "cluster_name" {
  description = "The name of the MongoDB Atlas cluster"
  value       = module.mongodb_atlas.cluster_name
  sensitive   = false
}

output "network_container_id" {
  description = "The ID of the Atlas network container for networking configuration"
  value       = module.mongodb_atlas.network_container_id
  sensitive   = false
}

output "vpc_peering_connection_id" {
  description = "The ID of the VPC peering connection for network configuration"
  value       = module.mongodb_atlas.vpc_peering_connection_id
  sensitive   = false
}

# Connection information
output "connection_string" {
  description = "Standard MongoDB connection string for applications to connect to the cluster"
  value       = module.mongodb_atlas.connection_string
  sensitive   = true
}

output "connection_string_srv" {
  description = "SRV-format connection string for applications supporting DNS service discovery"
  value       = module.mongodb_atlas.connection_string_srv
  sensitive   = true
}

output "private_endpoint_connection_strings" {
  description = "Map of connection strings for private endpoints for secure VPC-only access"
  value       = module.mongodb_atlas.private_endpoint_connection_strings
  sensitive   = true
}

output "mongo_db_hostname" {
  description = "Hostname of the MongoDB Atlas cluster for direct DNS configuration"
  value       = module.mongodb_atlas.mongo_db_hostname
  sensitive   = false
}

output "mongo_db_port" {
  description = "Port number for connecting to the MongoDB Atlas cluster"
  value       = module.mongodb_atlas.mongo_db_port
  sensitive   = false
}

output "database_user" {
  description = "Username of the application database user created for the Refunds Service"
  value       = module.mongodb_atlas.database_user
  sensitive   = false
}

# Security and configuration
output "secrets_manager_secret_id" {
  description = "AWS Secrets Manager secret ID containing MongoDB credentials"
  value       = aws_secretsmanager_secret.mongodb_credentials.id
  sensitive   = false
}

output "secrets_manager_secret_arn" {
  description = "AWS Secrets Manager secret ARN for IAM permissions configuration"
  value       = aws_secretsmanager_secret.mongodb_credentials.arn
  sensitive   = false
}

output "mongodb_version" {
  description = "Version of MongoDB running on the Atlas cluster"
  value       = module.mongodb_atlas.mongodb_version
  sensitive   = false
}

output "backup_enabled" {
  description = "Indicates whether automated backups are enabled for compliance purposes"
  value       = module.mongodb_atlas.backup_enabled
  sensitive   = false
}

output "encryption_at_rest_enabled" {
  description = "Indicates whether encryption at rest is enabled for compliance"
  value       = module.mongodb_atlas.encryption_at_rest_enabled
  sensitive   = false
}