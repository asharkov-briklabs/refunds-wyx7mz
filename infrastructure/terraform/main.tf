# Main Terraform configuration file for the Refunds Service infrastructure that orchestrates 
# all infrastructure resources across AWS.

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.89"
    }
  }
  
  # Backend configuration is typically environment-specific
  # This would be configured during deployment or in a separate file
  # backend "s3" {
  #   bucket         = "refunds-service-terraform-state"
  #   key            = "infrastructure/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "refunds-service-terraform-locks"
  #   encrypt        = true
  # }
}

# Configure the AWS Provider for the primary region
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = var.tags
  }
}

# Configure the AWS Provider for the secondary region (used for disaster recovery)
provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
  
  default_tags {
    tags = var.tags
  }
}

# Local variables for naming convention and tagging standards
locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project
      ManagedBy   = "terraform"
    }
  )
}

# Import security module for KMS, IAM, and WAF configurations
module "security" {
  source = "./modules/security"
  
  name_prefix                = local.name_prefix
  environment                = var.environment
  enable_waf                 = var.enable_waf
  enable_guardduty           = var.enable_guardduty
  enable_cloudtrail          = var.enable_cloudtrail
  enable_config              = var.enable_config
  enable_securityhub         = var.enable_securityhub
  enable_kms_key_rotation    = var.enable_kms_key_rotation
  kms_key_rotation_period_days = var.kms_key_rotation_period_days
  tags                       = local.common_tags
}

# S3 bucket for storing refund supporting documents
resource "aws_s3_bucket" "document_storage" {
  bucket = var.s3_document_bucket_name
  tags   = local.common_tags
}

# S3 bucket for storing application logs
resource "aws_s3_bucket" "logs" {
  bucket = var.s3_logs_bucket_name
  tags   = local.common_tags
}

# Enable server-side encryption for document bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "document" {
  bucket = aws_s3_bucket.document_storage.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = module.security.refund_encryption_key_arn
      sse_algorithm     = "aws:kms"
    }
  }
}

# Enable server-side encryption for logs bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = module.security.refund_encryption_key_arn
      sse_algorithm     = "aws:kms"
    }
  }
}

# Configure lifecycle policies for document retention
resource "aws_s3_bucket_lifecycle_configuration" "document" {
  bucket = aws_s3_bucket.document_storage.id
  
  rule {
    id     = "document-retention"
    status = "Enabled"
    
    expiration {
      days = var.document_retention_days
    }
  }
}

# Configure lifecycle policies for logs retention
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  
  rule {
    id     = "logs-retention"
    status = "Enabled"
    
    expiration {
      days = var.logs_retention_days
    }
  }
}

# Standard SQS queues for asynchronous processing
resource "aws_sqs_queue" "standard" {
  count = length(var.sqs_standard_queue_names)
  
  name                        = "${local.name_prefix}-${var.sqs_standard_queue_names[count.index]}"
  message_retention_seconds   = 1209600  # 14 days
  visibility_timeout_seconds  = 180
  kms_master_key_id           = var.enable_sqs_encryption ? module.security.refund_encryption_key_arn : null
  kms_data_key_reuse_period_seconds = 300
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.standard_dlq[count.index].arn
    maxReceiveCount     = 5
  })
  
  tags = local.common_tags
}

# FIFO SQS queues for ordered processing
resource "aws_sqs_queue" "fifo" {
  count = length(var.sqs_fifo_queue_names)
  
  name                        = "${local.name_prefix}-${var.sqs_fifo_queue_names[count.index]}.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = 1209600  # 14 days
  visibility_timeout_seconds  = 180
  kms_master_key_id           = var.enable_sqs_encryption ? module.security.refund_encryption_key_arn : null
  kms_data_key_reuse_period_seconds = 300
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.fifo_dlq[count.index].arn
    maxReceiveCount     = 5
  })
  
  tags = local.common_tags
}

# Dead letter queues for standard queues
resource "aws_sqs_queue" "standard_dlq" {
  count = length(var.sqs_standard_queue_names)
  
  name                      = "${local.name_prefix}-${var.sqs_standard_queue_names[count.index]}-dlq"
  message_retention_seconds = 1209600  # 14 days
  kms_master_key_id         = var.enable_sqs_encryption ? module.security.refund_encryption_key_arn : null
  kms_data_key_reuse_period_seconds = 300
  
  tags = local.common_tags
}

# Dead letter queues for FIFO queues
resource "aws_sqs_queue" "fifo_dlq" {
  count = length(var.sqs_fifo_queue_names)
  
  name                      = "${local.name_prefix}-${var.sqs_fifo_queue_names[count.index]}-dlq.fifo"
  fifo_queue                = true
  content_based_deduplication = true
  message_retention_seconds = 1209600  # 14 days
  kms_master_key_id         = var.enable_sqs_encryption ? module.security.refund_encryption_key_arn : null
  kms_data_key_reuse_period_seconds = 300
  
  tags = local.common_tags
}

# SNS topic for monitoring alerts
resource "aws_sns_topic" "monitoring_alerts" {
  name              = "${local.name_prefix}-monitoring-alerts"
  kms_master_key_id = module.security.refund_encryption_key_arn
  tags              = local.common_tags
}

# CloudWatch dashboard for Refunds Service monitoring
resource "aws_cloudwatch_dashboard" "refunds" {
  dashboard_name = "${local.name_prefix}-dashboard"
  dashboard_body = file("${path.module}/templates/dashboard.json")
}

# Get information about current AWS account and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Conditional deployment of security resources in secondary region for disaster recovery
module "security_secondary" {
  count    = var.enable_dr ? 1 : 0
  source   = "./modules/security"
  providers = {
    aws = aws.secondary
  }
  
  name_prefix                = local.name_prefix
  environment                = var.environment
  enable_waf                 = var.enable_waf
  enable_guardduty           = var.enable_guardduty
  enable_cloudtrail          = false  # Only enable in primary region
  enable_config              = false  # Only enable in primary region
  enable_securityhub         = false  # Only enable in primary region
  enable_kms_key_rotation    = var.enable_kms_key_rotation
  kms_key_rotation_period_days = var.kms_key_rotation_period_days
  tags                       = local.common_tags
}

# Replica bucket in secondary region for disaster recovery
resource "aws_s3_bucket" "document_storage_replica" {
  count    = var.enable_s3_cross_region_replication ? 1 : 0
  provider = aws.secondary
  
  bucket = "${var.s3_document_bucket_name}-replica"
  tags   = local.common_tags
}

# Encryption for replica document bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "document_replica" {
  count    = var.enable_s3_cross_region_replication ? 1 : 0
  provider = aws.secondary
  bucket   = aws_s3_bucket.document_storage_replica[0].id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = module.security_secondary[0].refund_encryption_key_arn
      sse_algorithm     = "aws:kms"
    }
  }
}

# IAM role for S3 cross-region replication
resource "aws_iam_role" "replication" {
  name = "${local.name_prefix}-s3-replication"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

# Route53 health check for API endpoint
resource "aws_route53_health_check" "api" {
  count = var.enable_route53_health_checks && var.domain_name != null ? 1 : 0
  
  fqdn              = "${var.api_subdomain}.${var.domain_name}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  
  tags = local.common_tags
}

# Outputs for use by other modules or for information
output "document_bucket_id" {
  description = "ID of the S3 bucket for storing refund supporting documents"
  value       = aws_s3_bucket.document_storage.id
}

output "logs_bucket_id" {
  description = "ID of the S3 bucket for storing application logs"
  value       = aws_s3_bucket.logs.id
}

output "sqs_standard_queue_urls" {
  description = "URLs of the standard SQS queues"
  value       = aws_sqs_queue.standard[*].url
}

output "sqs_fifo_queue_urls" {
  description = "URLs of the FIFO SQS queues"
  value       = aws_sqs_queue.fifo[*].url
}

output "sns_monitoring_topic_arn" {
  description = "ARN of the SNS topic for monitoring alerts"
  value       = aws_sns_topic.monitoring_alerts.arn
}

output "refund_encryption_key_arn" {
  description = "ARN of the KMS key used for refund data encryption"
  value       = module.security.refund_encryption_key_arn
}

output "refund_service_role_arn" {
  description = "ARN of the IAM role for the Refunds Service"
  value       = module.security.refund_service_role_arn
}