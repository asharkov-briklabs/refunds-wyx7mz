# KMS Variables
variable "kms_key_alias" {
  description = "Alias for the KMS key used for encryption"
  type        = string
  default     = "alias/refunds-service"
}

variable "kms_key_description" {
  description = "Description for the KMS key"
  type        = string
  default     = "KMS key for encrypting Refunds Service data"
}

variable "kms_key_rotation_enabled" {
  description = "Whether key rotation is enabled for the KMS key"
  type        = bool
  default     = true
}

variable "kms_key_deletion_window_in_days" {
  description = "Duration in days after which the key is deleted after destruction of the resource"
  type        = number
  default     = 30
}

# WAF Variables
variable "waf_scope" {
  description = "Scope for the WAF WebACL (REGIONAL or CLOUDFRONT)"
  type        = string
  default     = "REGIONAL"
}

variable "waf_allowed_ip_addresses" {
  description = "List of IP addresses allowed to access the application"
  type        = list(string)
  default     = []
}

variable "waf_blocked_ip_addresses" {
  description = "List of IP addresses blocked from accessing the application"
  type        = list(string)
  default     = []
}

variable "waf_rate_limit" {
  description = "Maximum requests per 5-minute period per IP address"
  type        = number
  default     = 1000
}

# Secrets Manager Variables
variable "secrets_recovery_window_in_days" {
  description = "Number of days that Secrets Manager waits before it can delete the secret"
  type        = number
  default     = 30
}

variable "gateway_secrets" {
  description = "Map of payment gateway names to their secret configuration"
  type        = map(object({
    description = string
    tags        = map(string)
  }))
  default     = {}
}

# IAM Variables
variable "create_service_roles" {
  description = "Whether to create service IAM roles"
  type        = bool
  default     = true
}

variable "service_role_name_prefix" {
  description = "Prefix for service IAM role names"
  type        = string
  default     = "refunds-service-"
}

variable "service_principals" {
  description = "List of AWS service principals that are allowed to assume the roles"
  type        = list(string)
  default     = ["ecs-tasks.amazonaws.com"]
}

variable "additional_role_policies" {
  description = "Map of additional policies to attach to the service roles"
  type        = map(list(string))
  default     = {}
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}

# PCI Compliance Variables
variable "enable_pci_compliance" {
  description = "Whether to enable additional controls for PCI DSS compliance"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain security logs"
  type        = number
  default     = 2555  # 7 years for PCI compliance
}

# Security Monitoring Variables
variable "enable_guardduty" {
  description = "Whether to enable GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_securityhub" {
  description = "Whether to enable Security Hub for security posture management"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Whether to enable CloudTrail for API logging"
  type        = bool
  default     = true
}

# Certificate Manager Variables
variable "domain_names" {
  description = "List of domain names to secure with SSL/TLS certificates"
  type        = list(string)
  default     = []
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for DNS validation of certificates"
  type        = string
  default     = ""
}

# Data Encryption Variables
variable "encrypt_data_at_rest" {
  description = "Whether to encrypt data at rest for all applicable services"
  type        = bool
  default     = true
}

variable "encrypt_data_in_transit" {
  description = "Whether to enforce TLS for all data in transit"
  type        = bool
  default     = true
}

# Cross-Account Access Variables
variable "cross_account_roles" {
  description = "Map of cross-account roles to create"
  type        = map(object({
    account_id        = string
    role_name         = string
    policy_arns       = list(string)
    trusted_principals = list(string)
  }))
  default     = {}
}

# Security Group Variables
variable "create_security_groups" {
  description = "Whether to create security groups for services"
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "VPC ID where security groups will be created"
  type        = string
  default     = ""
}

variable "security_group_ingress_rules" {
  description = "Map of ingress rules for security groups"
  type        = map(list(object({
    description     = string
    from_port       = number
    to_port         = number
    protocol        = string
    cidr_blocks     = list(string)
    security_groups = list(string)
  })))
  default     = {}
}

variable "security_group_egress_rules" {
  description = "Map of egress rules for security groups"
  type        = map(list(object({
    description     = string
    from_port       = number
    to_port         = number
    protocol        = string
    cidr_blocks     = list(string)
    security_groups = list(string)
  })))
  default     = {}
}