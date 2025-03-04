# Refunds Service Terraform Infrastructure

This repository contains the Terraform configuration for deploying and managing the Refunds Service infrastructure on AWS. The infrastructure is designed for high availability, scalability, and security to support mission-critical refund processing operations.

## Architecture

The Refunds Service infrastructure follows a multi-layer architecture with the following components:

- **Public Layer**: Route53, CloudFront, WAF, and Application Load Balancer
- **Application Layer**: ECS Fargate for containerized microservices
- **Data Layer**: MongoDB Atlas, ElastiCache Redis, S3, and SQS
- **Security Layer**: KMS, Secrets Manager
- **Monitoring Layer**: CloudWatch, X-Ray

## Repository Structure

```
├── modules/                    # Reusable Terraform modules
│   ├── ecs/                   # ECS Fargate cluster and services
│   ├── mongodb/               # MongoDB Atlas configuration
│   ├── redis/                 # ElastiCache Redis configuration
│   ├── networking/            # VPC, subnets, security groups
│   └── security/              # IAM, KMS, WAF configurations
├── environments/              # Environment-specific configurations
│   ├── dev/                   # Development environment
│   ├── staging/               # Staging environment
│   └── prod/                  # Production environment
├── main.tf                    # Root module configuration
├── variables.tf               # Root module variables
├── outputs.tf                 # Root module outputs
└── providers.tf               # Provider configurations
```

## Prerequisites

- Terraform 1.5+
- AWS CLI configured with appropriate credentials
- Access to AWS account with required permissions
- Access to MongoDB Atlas account (for database deployment)
- Git for version control

## Getting Started

### Installation

1. Clone this repository
2. Navigate to the desired environment directory (e.g., `environments/dev`)
3. Initialize Terraform: `terraform init`
4. Validate the configuration: `terraform validate`
5. Plan the deployment: `terraform plan -out=tfplan`
6. Apply the changes: `terraform apply tfplan`

### Configuration

Each environment has its own `terraform.tfvars` file containing environment-specific variables. Review and update these variables before applying the configuration.

## Module Documentation

### ECS Module

The ECS module provisions the ECS Fargate cluster and services for the Refunds Service components.

**Key Features:**
- Auto-scaling based on CPU, memory, and SQS queue depth
- Task definitions for each microservice
- Service discovery using Cloud Map
- Load balancer integration

### MongoDB Module

This module manages the MongoDB Atlas cluster for the Refunds Service data storage.

**Key Features:**
- Multi-region deployment
- Automatic backups
- Point-in-time recovery
- Network security configuration

### Redis Module

The Redis module provisions ElastiCache Redis clusters for caching and distributed locking.

**Key Features:**
- Multi-AZ deployment
- Automatic failover
- Parameter group configuration
- Encryption at rest

### Networking Module

This module sets up the VPC, subnets, security groups, and other networking components.

**Key Features:**
- Multi-AZ deployment
- Public and private subnets
- NAT gateways
- Security group configuration

### Security Module

The Security module manages IAM roles, KMS keys, and other security configurations.

**Key Features:**
- IAM roles with least privilege
- KMS keys for encryption
- WAF configuration
- Secrets management

## Environment Configurations

### Development (Dev)

The development environment is used for ongoing development and testing.

**Characteristics:**
- Smaller instance sizes
- Reduced redundancy
- Faster deployment cycles
- Non-critical alerting

### Staging

The staging environment mimics production for final testing before deployment.

**Characteristics:**
- Production-like configuration
- Full redundancy
- Data isolation
- Pre-production testing

### Production (Prod)

The production environment hosts the live service.

**Characteristics:**
- Maximum redundancy and high availability
- Production-grade security
- Regular backup schedules
- Critical incident alerting

## Disaster Recovery

The infrastructure includes disaster recovery capabilities:

- Multi-region deployment with active-passive configuration
- Automated backups with point-in-time recovery
- Regular DR testing procedures
- Documented recovery runbooks

## Cost Optimization

The infrastructure employs several cost optimization strategies:

- Right-sizing of resources based on actual needs
- Auto-scaling to match demand
- Reserved Instances for baseline capacity
- Spot Instances for non-critical workloads
- Cost monitoring and alerting

## Security Considerations

- All data encrypted at rest and in transit
- Network isolation through VPC design
- Least privilege access control
- WAF protection for public endpoints
- Regular security patching
- Compliance with PCI DSS and other regulatory requirements

## Contributing

1. Create a new branch for your changes
2. Make your changes and test locally
3. Run `terraform fmt` and `terraform validate`
4. Commit your changes with a descriptive message
5. Create a pull request for review
6. After approval, changes will be applied through the CI/CD pipeline

## Troubleshooting

### Common Issues

- **State Lock Issues**: If a Terraform state lock persists, it may need to be manually released using `terraform force-unlock`
- **Dependency Errors**: Ensure all required providers are properly initialized
- **Permission Errors**: Verify that your AWS credentials have the necessary permissions
- **Resource Limits**: Check if you've hit AWS service limits or quotas

### Logs and Monitoring

- CloudWatch Logs for application logs
- CloudTrail for API activity
- Terraform logs (set TF_LOG=DEBUG for verbose output)

## Contact

For questions or issues related to the infrastructure, contact the DevOps team.