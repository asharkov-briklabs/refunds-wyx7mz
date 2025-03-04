# AWS Security Module for Refunds Service
#
# This module provisions all security-related AWS resources required for the Refunds Service including:
# - KMS encryption keys for data at rest (PCI DSS 3.4)
# - IAM roles and policies with least privilege (PCI DSS 7.1)
# - Security groups for network isolation (PCI DSS 1.3)
# - WAF configuration for API protection
# - CloudTrail for audit logging (PCI DSS 10.2)
# - Secrets Manager for credential management

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Current AWS account information for policies
data "aws_caller_identity" "current" {}

# -----------------------------------------------------------------------------
# KMS Key and Alias for Encryption at Rest
# -----------------------------------------------------------------------------

# KMS key for encrypting refund data at rest
resource "aws_kms_key" "refund_encryption_key" {
  description             = "KMS key for Refunds Service data encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # Automatic key rotation for enhanced security
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid       = "Enable IAM User Permissions",
        Effect    = "Allow",
        Principal = { 
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" 
        },
        Action    = "kms:*",
        Resource  = "*"
      },
      {
        Sid       = "Allow use of the key for refund service",
        Effect    = "Allow",
        Principal = {
          AWS = aws_iam_role.refund_service_role.arn
        },
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ],
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name        = "refund-encryption-key"
    Service     = "Refunds Service"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# KMS alias for easier key reference
resource "aws_kms_alias" "refund_encryption_key_alias" {
  name          = "alias/refund-encryption-key"
  target_key_id = aws_kms_key.refund_encryption_key.key_id
}

# -----------------------------------------------------------------------------
# IAM Role and Policy for Refund Service
# -----------------------------------------------------------------------------

# IAM role for the Refund Service with ECS task execution permissions
resource "aws_iam_role" "refund_service_role" {
  name = "refund-service-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
  
  tags = {
    Name        = "refund-service-role"
    Service     = "Refunds Service"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# IAM policy for refund service implementing least privilege principle
resource "aws_iam_policy" "refund_service_policy" {
  name        = "refund-service-policy-${var.environment}"
  description = "IAM policy for Refunds Service with least privilege access"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      # KMS permissions for data encryption/decryption
      {
        Effect = "Allow",
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ],
        Resource = aws_kms_key.refund_encryption_key.arn
      },
      # SQS permissions for messaging
      {
        Effect = "Allow",
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ],
        Resource = "arn:aws:sqs:*:*:refund-*"
      },
      # Secrets Manager permissions
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ],
        Resource = aws_secretsmanager_secret.refund_service_secrets.arn
      },
      # CloudWatch Logs permissions
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "arn:aws:logs:*:*:log-group:/aws/ecs/refund-service-*"
      }
    ]
  })
  
  tags = {
    Name        = "refund-service-policy"
    Service     = "Refunds Service"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Attach the policy to the role
resource "aws_iam_role_policy_attachment" "refund_service_policy_attachment" {
  role       = aws_iam_role.refund_service_role.name
  policy_arn = aws_iam_policy.refund_service_policy.arn
}

# -----------------------------------------------------------------------------
# Security Group for Network Isolation
# -----------------------------------------------------------------------------

# Security group for Refund Service resources
resource "aws_security_group" "refund_service_sg" {
  name        = "refund-service-sg-${var.environment}"
  description = "Security group for Refunds Service resources"
  vpc_id      = var.vpc_id
  
  tags = {
    Name        = "refund-service-sg"
    Service     = "Refunds Service"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Ingress rule for HTTPS traffic from private subnets
resource "aws_security_group_rule" "refund_service_ingress" {
  security_group_id = aws_security_group.refund_service_sg.id
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = var.private_subnet_cidr_blocks
  description       = "Allow HTTPS traffic from private subnets"
}

# Egress rule allowing all outbound traffic
resource "aws_security_group_rule" "refund_service_egress" {
  security_group_id = aws_security_group.refund_service_sg.id
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow all outbound traffic"
}

# -----------------------------------------------------------------------------
# WAF for Web Application Protection
# -----------------------------------------------------------------------------

# WAF Web ACL to protect against common web vulnerabilities
resource "aws_wafv2_web_acl" "refund_service_waf" {
  name        = "refund-service-waf-${var.environment}"
  description = "WAF Web ACL protecting Refunds Service APIs"
  scope       = "REGIONAL"
  
  default_action {
    allow {}
  }
  
  # AWS Managed rule set for common web vulnerabilities
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "refund-service-common-rule-metric"
      sampled_requests_enabled   = true
    }
  }
  
  # SQL injection protection rules
  rule {
    name     = "AWS-AWSManagedRulesSQLiRuleSet"
    priority = 2
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "refund-service-sqli-rule-metric"
      sampled_requests_enabled   = true
    }
  }
  
  # Rate-based protection against DDoS and brute force attacks
  rule {
    name     = "RateLimitRule"
    priority = 3
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "refund-service-rate-limit-metric"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "refund-service-waf-metric"
    sampled_requests_enabled   = true
  }
  
  tags = {
    Name        = "refund-service-waf"
    Service     = "Refunds Service"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# CloudTrail for Audit Logging
# -----------------------------------------------------------------------------

# CloudTrail configuration for comprehensive audit logging
resource "aws_cloudtrail" "refund_service_trail" {
  name                          = "refund-service-trail-${var.environment}"
  s3_bucket_name                = var.log_bucket_id
  include_global_service_events = true
  enable_log_file_validation    = true # For log integrity validation
  kms_key_id                    = aws_kms_key.refund_encryption_key.arn
  
  event_selector {
    read_write_type           = "All"
    include_management_events = true
    
    # Track data events for sensitive resources
    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::${var.log_bucket_id}/"]
    }
  }
  
  tags = {
    Name        = "refund-service-trail"
    Service     = "Refunds Service"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# Secrets Manager for Secure Credential Storage
# -----------------------------------------------------------------------------

# Secrets Manager secret for storing service credentials securely
resource "aws_secretsmanager_secret" "refund_service_secrets" {
  name                    = "refund-service-secrets-${var.environment}"
  description             = "Secure storage for Refunds Service credentials"
  kms_key_id              = aws_kms_key.refund_encryption_key.arn
  recovery_window_in_days = 30 # Protects against accidental deletion
  
  tags = {
    Name        = "refund-service-secrets"
    Service     = "Refunds Service"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Deployment environment (e.g., dev, test, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where security groups will be created"
  type        = string
}

variable "private_subnet_cidr_blocks" {
  description = "CIDR blocks for private subnets used in security group rules"
  type        = list(string)
}

variable "log_bucket_id" {
  description = "ID of the S3 bucket for storing CloudTrail logs"
  type        = string
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "kms_key_id" {
  description = "The ID of the KMS key used for encryption"
  value       = aws_kms_key.refund_encryption_key.key_id
}

output "kms_key_arn" {
  description = "The ARN of the KMS key used for encryption"
  value       = aws_kms_key.refund_encryption_key.arn
}

output "iam_role_name" {
  description = "The name of the IAM role for the Refunds Service"
  value       = aws_iam_role.refund_service_role.name
}

output "iam_role_arn" {
  description = "The ARN of the IAM role for the Refunds Service"
  value       = aws_iam_role.refund_service_role.arn
}

output "security_group_id" {
  description = "The ID of the security group for the Refunds Service"
  value       = aws_security_group.refund_service_sg.id
}

output "waf_acl_id" {
  description = "The ID of the WAF Web ACL for the Refunds Service"
  value       = aws_wafv2_web_acl.refund_service_waf.id
}

output "waf_acl_arn" {
  description = "The ARN of the WAF Web ACL for the Refunds Service"
  value       = aws_wafv2_web_acl.refund_service_waf.arn
}