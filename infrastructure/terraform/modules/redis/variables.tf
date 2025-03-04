variable "name_prefix" {
  description = "Prefix for naming Redis resources to ensure unique resource names"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, test, staging, prod) for resource tagging and naming"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where Redis cluster will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs where Redis nodes will be placed for high availability"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "List of security group IDs allowed to connect to the Redis cluster"
  type        = list(string)
  default     = []
}

variable "node_type" {
  description = "Instance type for Redis nodes (e.g., cache.t3.medium, cache.m5.large)"
  type        = string
  default     = "cache.t3.medium"
}

variable "node_count" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 3
}

variable "multi_az_enabled" {
  description = "Whether to enable Multi-AZ deployment for Redis cluster"
  type        = bool
  default     = true
}

variable "auth_token" {
  description = "Password for Redis AUTH (transit encryption must be enabled)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "kms_key_id" {
  description = "KMS key ID for encrypting Redis data at rest"
  type        = string
  default     = ""
}

variable "snapshot_retention_days" {
  description = "Number of days to retain Redis automatic backups"
  type        = number
  default     = 7
}

variable "snapshot_window" {
  description = "Daily time range during which Redis snapshots are created"
  type        = string
  default     = "03:00-05:00"
}

variable "maintenance_window" {
  description = "Weekly maintenance window for Redis cluster updates"
  type        = string
  default     = "sun:23:00-mon:01:00"
}

variable "apply_immediately" {
  description = "Whether to apply changes immediately or during maintenance window"
  type        = bool
  default     = false
}

variable "cpu_alarm_threshold" {
  description = "CPU utilization percentage threshold for Redis alarm"
  type        = number
  default     = 70
}

variable "memory_alarm_threshold" {
  description = "Memory utilization percentage threshold for Redis alarm"
  type        = number
  default     = 70
}

variable "alarm_actions" {
  description = "List of SNS topic ARNs to notify when Redis alarms trigger"
  type        = list(string)
  default     = []
}