# Variables for the Refunds Service networking Terraform module
# This module creates VPC, subnets, security groups, and other AWS networking resources
# required for the high-availability and securely segmented infrastructure

variable "aws_region" {
  description = "The AWS region where the networking resources will be created"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z][a-z]-[a-z]+-[0-9]$", var.aws_region))
    error_message = "Must be a valid AWS region identifier (e.g., us-east-1, eu-west-2)."
  }
}

variable "environment" {
  description = "Environment name (e.g., dev, test, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "staging", "prod"], var.environment)
    error_message = "Must be one of: dev, test, staging, prod"
  }
}

variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "refunds-service"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project))
    error_message = "No spaces allowed, lowercase alphanumeric with hyphens"
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "Must be a valid CIDR notation"
  }
}

variable "public_subnet_cidrs" {
  description = "List of CIDR blocks for public subnets, one per availability zone"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]

  validation {
    condition     = alltrue([for cidr in var.public_subnet_cidrs : can(cidrnetmask(cidr))])
    error_message = "Each entry must be a valid CIDR notation within the VPC CIDR range"
  }
}

variable "private_app_subnet_cidrs" {
  description = "List of CIDR blocks for private application subnets, one per availability zone"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

  validation {
    condition     = alltrue([for cidr in var.private_app_subnet_cidrs : can(cidrnetmask(cidr))])
    error_message = "Each entry must be a valid CIDR notation within the VPC CIDR range"
  }
}

variable "private_data_subnet_cidrs" {
  description = "List of CIDR blocks for private data subnets, one per availability zone"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]

  validation {
    condition     = alltrue([for cidr in var.private_data_subnet_cidrs : can(cidrnetmask(cidr))])
    error_message = "Each entry must be a valid CIDR notation within the VPC CIDR range"
  }
}

variable "availability_zones" {
  description = "List of availability zones to use for the subnets in the VPC"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]

  validation {
    condition     = length(var.availability_zones) > 0
    error_message = "Must be valid availability zones for the specified AWS region"
  }
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets outbound internet access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway to save costs (not recommended for production)"
  type        = bool
  default     = false
}

variable "enable_vpn_gateway" {
  description = "Enable VPN Gateway for connection to on-premises network"
  type        = bool
  default     = false
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs for network monitoring and troubleshooting"
  type        = bool
  default     = true
}

variable "flow_logs_retention_days" {
  description = "Number of days to retain VPC Flow Logs"
  type        = number
  default     = 90

  validation {
    condition     = var.flow_logs_retention_days > 0
    error_message = "Must be a positive integer"
  }
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}

variable "create_private_subnet_route_table" {
  description = "Controls if separate route tables for private subnets should be created"
  type        = bool
  default     = true
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in the VPC"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support in the VPC"
  type        = bool
  default     = true
}

variable "restrict_default_security_group" {
  description = "Restrict default security group to deny all traffic"
  type        = bool
  default     = true
}

variable "create_database_subnet_group" {
  description = "Controls if database subnet group should be created (for RDS, ElastiCache, etc)"
  type        = bool
  default     = true
}