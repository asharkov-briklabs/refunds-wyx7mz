terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.8"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

locals {
  cluster_name = "${var.cluster_name}"
  resource_tags = merge(
    {
      Environment = var.tags["Environment"] != null ? var.tags["Environment"] : "production"
      Service     = "refunds-service"
      ManagedBy   = "terraform"
    },
    var.tags
  )
}

provider "mongodbatlas" {
  public_key  = var.mongodb_atlas_public_key
  private_key = var.mongodb_atlas_private_key
}

# Create MongoDB Atlas Project if project_id is not provided
resource "mongodbatlas_project" "project" {
  count  = var.project_id == "" ? 1 : 0
  name   = "refunds-service-${var.tags["Environment"] != null ? var.tags["Environment"] : "production"}"
  org_id = var.mongodb_atlas_org_id
}

locals {
  # Use provided project_id or the one created by the module
  actual_project_id = var.project_id != "" ? var.project_id : mongodbatlas_project.project[0].id
}

# Create MongoDB Atlas Cluster
resource "mongodbatlas_cluster" "cluster" {
  project_id             = local.actual_project_id
  name                   = local.cluster_name
  mongo_db_major_version = var.mongodb_version
  cluster_type           = var.cluster_type
  
  # Provider settings
  provider_name               = "AWS"
  provider_region_name        = var.region
  provider_instance_size_name = var.instance_size
  provider_disk_iops          = var.disk_size_gb * 3 # Default IOPS calculation
  provider_volume_type        = "PROVISIONED"
  
  # Cluster configuration
  disk_size_gb                = var.disk_size_gb
  num_shards                  = var.cluster_type == "SHARDED" ? var.num_shards : 1
  
  # Replication configuration
  replication_specs {
    num_nodes         = var.num_replicas
    
    # Primary region configuration
    regions_config {
      region_name     = var.region
      electable_nodes = var.num_replicas
      priority        = 7
      read_only_nodes = 0
    }
    
    # Add secondary regions if multi-region is enabled
    dynamic "regions_config" {
      for_each = var.multi_region ? var.secondary_regions : []
      content {
        region_name     = regions_config.value
        electable_nodes = 1
        priority        = 6 - index(var.secondary_regions, regions_config.value)
        read_only_nodes = 0
      }
    }
  }

  # Auto-scaling configuration if enabled
  dynamic "auto_scaling" {
    for_each = var.auto_scaling_enabled ? [1] : []
    content {
      disk_gb_enabled = true
      
      compute_enabled = true
      compute_scale_down_enabled = true
      compute_min_instance_size = var.instance_size
      compute_max_instance_size = var.auto_scaling_max_instance_size
    }
  }
  
  # Encryption at rest for security compliance
  encryption_at_rest_provider = var.encryption_at_rest_enabled ? "AWS" : null
  
  # Advanced configuration for security
  advanced_configuration {
    javascript_enabled = true
    minimum_enabled_tls_protocol = "TLS1_2"
  }
  
  # BI Connector configuration
  dynamic "bi_connector" {
    for_each = var.bi_connector_enabled ? [1] : []
    content {
      enabled = true
      read_preference = "secondary"
    }
  }
  
  # Prevent accidental deletion of production clusters
  lifecycle {
    prevent_destroy = contains(["production", "prod"], lower(lookup(var.tags, "Environment", "")))
  }
}

# Generate secure random password for database user
resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Create database user for the application
resource "mongodbatlas_database_user" "db_user" {
  username           = "refunds-service-app"
  password           = random_password.db_password.result
  project_id         = local.actual_project_id
  auth_database_name = "admin"
  
  # Default roles for Refunds Service
  roles {
    role_name     = "readWrite"
    database_name = "refunds"
  }
  
  roles {
    role_name     = "readAnyDatabase"
    database_name = "admin"
  }
  
  # Scope the user to this specific cluster
  scopes {
    name = mongodbatlas_cluster.cluster.name
    type = "CLUSTER"
  }
}

# Create network container for VPC peering
resource "mongodbatlas_network_container" "container" {
  project_id       = local.actual_project_id
  atlas_cidr_block = var.cidr_block
  provider_name    = "AWS"
  region_name      = var.region
}

# Create VPC peering connection between Atlas and AWS VPC
resource "mongodbatlas_network_peering" "vpc_peering" {
  project_id             = local.actual_project_id
  container_id           = mongodbatlas_network_container.container.container_id
  accepter_region_name   = var.region
  provider_name          = "AWS"
  route_table_cidr_block = var.cidr_block
  vpc_id                 = var.vpc_id
  aws_account_id         = data.aws_caller_identity.current.account_id
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Accept the VPC peering connection on AWS side
resource "aws_vpc_peering_connection_accepter" "peer_accepter" {
  vpc_peering_connection_id = mongodbatlas_network_peering.vpc_peering.connection_id
  auto_accept               = true
  
  tags = local.resource_tags
}

# Create private endpoint for secure connection
resource "mongodbatlas_privatelink_endpoint" "private_endpoint" {
  project_id    = local.actual_project_id
  provider_name = "AWS"
  region        = var.region
}

# Create AWS VPC endpoint
resource "aws_vpc_endpoint" "mongodb_endpoint" {
  vpc_id              = var.vpc_id
  service_name        = mongodbatlas_privatelink_endpoint.private_endpoint.endpoint_service_name
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.subnet_ids
  security_group_ids  = var.security_group_ids
  private_dns_enabled = true
  
  tags = local.resource_tags
}

# Link the Atlas Private Endpoint with the AWS VPC Endpoint
resource "mongodbatlas_privatelink_endpoint_service" "endpoint_service" {
  project_id              = local.actual_project_id
  privatelink_endpoint_id = mongodbatlas_privatelink_endpoint.private_endpoint.id
  endpoint_service_id     = aws_vpc_endpoint.mongodb_endpoint.id
  provider_name           = "AWS"
}

# Configure backups if enabled
resource "mongodbatlas_cloud_backup_schedule" "backup_schedule" {
  count = var.backup_enabled ? 1 : 0
  
  project_id   = local.actual_project_id
  cluster_name = mongodbatlas_cluster.cluster.name
  
  reference_hour_of_day    = 2  # 2 AM
  reference_minute_of_hour = 0
  
  # Retention policy
  retention_value = var.retention_days
  
  # Daily policy
  policy_item_daily {
    frequency_interval = 1
    retention_unit     = "days"
    retention_value    = var.retention_days
  }
  
  # Point-in-time recovery
  # Use default 7 days for point-in-time recovery
  point_in_time_recovery_window_days = 7
  
  # Enable snapshot distribution for multi-region disaster recovery
  copy_settings {
    cloud_provider = "AWS"
    region_name    = var.region
    should_copy_oplogs = true
    frequencies    = ["DAILY"]
  }
  
  dynamic "copy_settings" {
    for_each = var.multi_region ? var.secondary_regions : []
    content {
      cloud_provider = "AWS"
      region_name    = copy_settings.value
      should_copy_oplogs = true
      frequencies    = ["DAILY"]
    }
  }
}

# Create KMS key for encrypting MongoDB credentials if not provided
resource "aws_kms_key" "mongodb_key" {
  count                   = var.kms_key_id == null ? 1 : 0
  description             = "KMS key for MongoDB Atlas credentials encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = local.resource_tags
}

locals {
  kms_key_id = var.kms_key_id == null ? aws_kms_key.mongodb_key[0].id : var.kms_key_id
}

# Create AWS Secrets Manager secret for MongoDB credentials
resource "aws_secretsmanager_secret" "mongodb_secret" {
  name                    = "${lookup(var.tags, "Environment", "production")}/refunds-service/mongodb"
  description             = "MongoDB Atlas credentials for the Refunds Service"
  recovery_window_in_days = 7
  kms_key_id              = local.kms_key_id
  
  tags = local.resource_tags
}

# Store MongoDB connection information in Secrets Manager
resource "aws_secretsmanager_secret_version" "mongodb_secret_version" {
  secret_id = aws_secretsmanager_secret.mongodb_secret.id
  secret_string = jsonencode({
    username                = mongodbatlas_database_user.db_user.username
    password                = random_password.db_password.result
    connection_string       = mongodbatlas_cluster.cluster.connection_strings[0].standard
    srv_connection_string   = mongodbatlas_cluster.cluster.connection_strings[0].standard_srv
    cluster_id              = mongodbatlas_cluster.cluster.cluster_id
    private_endpoint_connections = mongodbatlas_cluster.cluster.connection_strings[0].private_endpoint
    database_name           = "refunds"
    mongodb_version         = var.mongodb_version
  })
}

# Set up Atlas alerts for monitoring
resource "mongodbatlas_alert_configuration" "high_cpu_alert" {
  count = var.alerts_enabled ? 1 : 0
  
  project_id = local.actual_project_id
  event_type = "CLUSTER_MONGOS_IS_MISSING"
  enabled    = true
  
  notification {
    type_name     = "EMAIL"
    email_address = var.alert_email != null ? var.alert_email : "devops@example.com"
  }
  
  notification {
    type_name = "GROUP"
    group_id  = "5bc771258ae7df00178793a4" # Default MongoDB Atlas group
  }
}

# Output values
output "cluster_id" {
  value       = mongodbatlas_cluster.cluster.cluster_id
  description = "MongoDB Atlas cluster ID"
}

output "project_id" {
  value       = local.actual_project_id
  description = "MongoDB Atlas project ID"
}

output "cluster_name" {
  value       = mongodbatlas_cluster.cluster.name
  description = "MongoDB Atlas cluster name"
}

output "connection_string" {
  value       = mongodbatlas_cluster.cluster.connection_strings[0].standard
  description = "Standard MongoDB connection string for applications to connect to the cluster"
  sensitive   = true
}

output "connection_string_srv" {
  value       = mongodbatlas_cluster.cluster.connection_strings[0].standard_srv
  description = "SRV-format connection string for applications supporting DNS service discovery"
  sensitive   = true
}

output "secrets_manager_secret_id" {
  value       = aws_secretsmanager_secret.mongodb_secret.id
  description = "AWS Secrets Manager secret ID containing MongoDB credentials"
}

output "secrets_manager_secret_arn" {
  value       = aws_secretsmanager_secret.mongodb_secret.arn
  description = "AWS Secrets Manager secret ARN for IAM permissions configuration"
}

output "mongodb_version" {
  value       = mongodbatlas_cluster.cluster.mongo_db_major_version
  description = "Version of MongoDB running on the Atlas cluster"
}

output "backup_enabled" {
  value       = var.backup_enabled
  description = "Indicates whether automated backups are enabled for disaster recovery"
}

output "encryption_at_rest_enabled" {
  value       = var.encryption_at_rest_enabled
  description = "Indicates whether encryption at rest is enabled for compliance requirements"
}

output "vpc_peering_connection_id" {
  value       = mongodbatlas_network_peering.vpc_peering.connection_id
  description = "ID of the VPC peering connection for network security configuration"
}

output "network_container_id" {
  value       = mongodbatlas_network_container.container.container_id
  description = "ID of the Atlas network container used for private endpoint connections"
}

output "database_user" {
  value       = mongodbatlas_database_user.db_user.username
  description = "Username of the application database user created for the Refunds Service"
}

output "private_endpoint_connection_strings" {
  value       = mongodbatlas_cluster.cluster.connection_strings[0].private_endpoint
  description = "Connection strings for private endpoint access from within VPC"
  sensitive   = true
}