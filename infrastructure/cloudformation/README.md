# AWS CloudFormation Templates for Refunds Service

## Overview

This directory contains AWS CloudFormation templates used as a supplementary Infrastructure as Code (IaC) tool for the Refunds Service. While Terraform is our primary IaC solution, CloudFormation is used specifically for AWS-native resources where it provides enhanced capabilities or better integration with AWS services.

## Purpose

These CloudFormation templates serve the following purposes:

1. Define AWS-specific resources that integrate more seamlessly with CloudFormation
2. Configure ECS task definitions for all Refunds Service components
3. Implement auto-scaling configurations with appropriate metrics and thresholds
4. Set up AWS-specific monitoring and alerting resources

## Template Structure

```
cloudformation/
├── ecs/
│   ├── refund-api-service.yaml       # API service task definition and service configuration
│   ├── refund-request-manager.yaml   # Request Manager task definition and service configuration
│   ├── gateway-integration.yaml      # Gateway Integration service configuration
│   ├── parameter-service.yaml        # Parameter Resolution service configuration
│   └── reporting-engine.yaml         # Reporting service configuration
├── scaling/
│   ├── cpu-based-scaling.yaml        # CPU utilization scaling policies
│   ├── memory-based-scaling.yaml     # Memory utilization scaling policies
│   ├── sqs-based-scaling.yaml        # SQS queue depth scaling policies 
│   └── request-based-scaling.yaml    # Request count scaling policies
├── monitoring/
│   ├── cloudwatch-alarms.yaml        # CloudWatch alarms for critical metrics
│   ├── container-insights.yaml       # Container monitoring configuration
│   └── dashboard-templates.yaml      # CloudWatch dashboard templates
└── networking/
    └── security-groups.yaml          # Service-specific security groups
```

## Usage with Terraform

These CloudFormation templates are designed to work alongside our primary Terraform infrastructure. They are typically invoked from Terraform using the `aws_cloudformation_stack` resource, allowing us to:

1. Maintain a single source of truth for infrastructure
2. Pass relevant outputs from Terraform to CloudFormation templates
3. Extract CloudFormation outputs for use in other Terraform resources

Example Terraform integration:

```hcl
resource "aws_cloudformation_stack" "refund_api_service" {
  name = "refund-api-service-stack"
  
  template_body = file("${path.module}/cloudformation/ecs/refund-api-service.yaml")
  
  parameters = {
    ClusterName     = aws_ecs_cluster.refunds_cluster.name
    ServiceName     = "refund-api-service"
    TaskRole        = aws_iam_role.ecs_task_role.name
    ExecutionRole   = aws_iam_role.ecs_execution_role.name
    ContainerImage  = "${aws_ecr_repository.refund_api.repository_url}:${var.image_tag}"
    VpcId           = aws_vpc.refunds_vpc.id
    SubnetIds       = join(",", aws_subnet.private_subnets[*].id)
    SecurityGroups  = aws_security_group.refund_api_sg.id
    TargetGroupArn  = aws_lb_target_group.refund_api_tg.arn
    LogGroupName    = aws_cloudwatch_log_group.refund_api_logs.name
    Environment     = var.environment
  }
  
  capabilities = ["CAPABILITY_IAM"]
  
  depends_on = [
    aws_ecs_cluster.refunds_cluster,
    aws_iam_role.ecs_task_role,
    aws_iam_role.ecs_execution_role,
    aws_ecr_repository.refund_api,
    aws_vpc.refunds_vpc,
    aws_subnet.private_subnets,
    aws_security_group.refund_api_sg,
    aws_lb_target_group.refund_api_tg,
    aws_cloudwatch_log_group.refund_api_logs
  ]
}
```

## Container Orchestration

The ECS templates define the container orchestration for each Refunds Service component, including:

### Resource Allocation

Service components are allocated resources according to their specific workload requirements:

| Service | CPU Allocation | Memory Allocation | Instance Count |
|---------|---------------|-------------------|----------------|
| Refund API Service | 1 vCPU | 2 GB | 3-10 (auto-scaled) |
| Refund Request Manager | 2 vCPU | 4 GB | 2-8 (auto-scaled) |
| Gateway Integration Service | 1 vCPU | 2 GB | 2-6 (auto-scaled) |
| Parameter Resolution Service | 0.5 vCPU | 1 GB | 2-4 (auto-scaled) |
| Reporting Engine | 2 vCPU | 4 GB | 1-3 (auto-scaled) |

### Deployment Configuration

These templates configure the following for each service:

- Task definitions with appropriate container settings
- Service definitions with deployment configurations
- Health check endpoints and thresholds
- Service discovery configuration
- Log configuration

## Auto-scaling Configuration

The scaling templates implement auto-scaling policies for the Refunds Service components:

### Scaling Metrics

| Service | Primary Scaling Metric | Scale Out Threshold | Scale In Threshold | Min/Max Instances |
|---------|------------------------|---------------------|-------------------|-------------------|
| Refund API Service | CPU Utilization | >70% | <30% | 3/10 |
| Refund Request Manager | SQS Queue Depth | >1000 messages | <100 messages | 2/8 |
| Gateway Integration | Request Rate | >50 req/min | <10 req/min | 2/6 |
| Parameter Service | CPU Utilization | >70% | <30% | 2/4 |

### Cooldown Periods

- Scale Out Cooldown: 60 seconds
- Scale In Cooldown: 300 seconds

This asymmetric cooldown ensures rapid scaling up for increased load while preventing oscillation when scaling in.

## Deployment

These templates are deployed as part of our CI/CD pipeline via GitHub Actions. The typical deployment flow is:

1. Terraform applies core infrastructure
2. CloudFormation templates are deployed for AWS-specific resources
3. Application deployment occurs with appropriate dependencies

## Monitoring and Alerting

The CloudFormation templates set up:

- CloudWatch Container Insights for monitoring container performance
- CloudWatch Alarms for critical thresholds
- Custom dashboards for operational visibility

## Security Considerations

These templates implement:

- Least privilege IAM roles
- Security groups with minimal required access
- VPC endpoint configurations
- Encrypted communication channels

## Best Practices

When modifying these templates:

1. Always update the corresponding Terraform code to ensure consistency
2. Test changes in lower environments before deploying to production
3. Use the AWS CloudFormation Linter (`cfn-lint`) to validate templates
4. Document all parameter changes and update this README if necessary
5. Maintain version control and change history

## Troubleshooting

Common issues and solutions:

1. **Stack Creation Failure**: Check CloudFormation events for specific error details
2. **Service Deployment Issues**: Verify ECS task definitions and container health checks
3. **Scaling Problems**: Ensure CloudWatch metrics are being collected correctly
4. **Integration Issues**: Verify that all required parameters are being passed from Terraform

For further assistance, contact the DevOps team.