# MongoDB Atlas Configuration Variables
# These variables configure a MongoDB Atlas cluster for the Refunds Service

variable "project_id" {
  description = "The MongoDB Atlas project ID"
  type        = string
}

variable "cluster_name" {
  description = "Name of the MongoDB Atlas cluster"
  type        = string
  default     = "refunds-service"
}

variable "mongodb_version" {
  description = "MongoDB version to use for the cluster"
  type        = string
  default     = "6.0"
}

variable "instance_size" {
  description = "Atlas instance size for the cluster (e.g., M30, M40, etc.)"
  type        = string
  default     = "M30"
}

variable "cluster_type" {
  description = "Type of cluster to deploy (REPLICASET or SHARDED)"
  type        = string
  default     = "REPLICASET"
  validation {
    condition     = contains(["REPLICASET", "SHARDED"], var.cluster_type)
    error_message = "Cluster type must be either REPLICASET or SHARDED."
  }
}

variable "region" {
  description = "AWS region for the primary MongoDB Atlas cluster"
  type        = string
}

variable "disk_size_gb" {
  description = "Disk size for each node in the cluster (in GB)"
  type        = number
  default     = 500
}

variable "backup_enabled" {
  description = "Enable/disable backup for the MongoDB Atlas cluster"
  type        = bool
  default     = true
}

variable "retention_days" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

variable "num_shards" {
  description = "Number of shards in the cluster (if using SHARDED cluster type)"
  type        = number
  default     = 1
}

variable "num_replicas" {
  description = "Number of replica set members (including primary)"
  type        = number
  default     = 3
  validation {
    condition     = var.num_replicas >= 3
    error_message = "For production environments, at least 3 replicas are required for high availability."
  }
}

variable "auto_scaling_enabled" {
  description = "Enable/disable auto-scaling for the MongoDB Atlas cluster"
  type        = bool
  default     = true
}

variable "auto_scaling_max_instance_size" {
  description = "Maximum instance size for auto-scaling"
  type        = string
  default     = "M50"
}

variable "encryption_at_rest_enabled" {
  description = "Enable/disable encryption at rest for the MongoDB Atlas cluster"
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "ID of the VPC to connect to the MongoDB Atlas cluster"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs to connect to the MongoDB Atlas cluster"
  type        = list(string)
  default     = []
}

variable "cidr_block" {
  description = "CIDR block for the MongoDB Atlas peering connection"
  type        = string
}

variable "security_group_ids" {
  description = "List of security group IDs to apply to the MongoDB Atlas cluster"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to MongoDB Atlas resources"
  type        = map(string)
  default     = {}
}

variable "alerts_enabled" {
  description = "Enable/disable alerts for the MongoDB Atlas cluster"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email address to send MongoDB Atlas alerts to"
  type        = string
  default     = null
}

variable "multi_region" {
  description = "Enable/disable multi-region deployment for disaster recovery"
  type        = bool
  default     = true
}

variable "secondary_regions" {
  description = "List of AWS regions for secondary replica sets in multi-region deployment"
  type        = list(string)
  default     = []
}

variable "bi_connector_enabled" {
  description = "Enable/disable BI Connector for the MongoDB Atlas cluster"
  type        = bool
  default     = false
}