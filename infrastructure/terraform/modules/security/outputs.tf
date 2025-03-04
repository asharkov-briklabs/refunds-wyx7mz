# KMS Outputs
output "kms_key_id" {
  description = "The ID of the KMS encryption key used for refund data"
  value       = aws_kms_key.refund_encryption_key.key_id
}

output "kms_key_arn" {
  description = "The ARN of the KMS encryption key used for refund data"
  value       = aws_kms_key.refund_encryption_key.arn
}

# IAM Role Outputs
output "iam_role_name" {
  description = "The name of the IAM role for the refund service"
  value       = aws_iam_role.refund_service_role.name
}

output "iam_role_arn" {
  description = "The ARN of the IAM role for the refund service"
  value       = aws_iam_role.refund_service_role.arn
}

# Security Group Output
output "security_group_id" {
  description = "The ID of the security group for the refund service"
  value       = aws_security_group.refund_service_sg.id
}

# WAF Outputs
output "waf_acl_id" {
  description = "The ID of the WAF web ACL for the refund service"
  value       = aws_wafv2_web_acl.refund_service_waf.id
}

output "waf_acl_arn" {
  description = "The ARN of the WAF web ACL for the refund service"
  value       = aws_wafv2_web_acl.refund_service_waf.arn
}

# Secrets Manager Output
output "secrets_manager_arn" {
  description = "The ARN of the Secrets Manager secret for refund service credentials"
  value       = aws_secretsmanager_secret.refund_service_secret.arn
}