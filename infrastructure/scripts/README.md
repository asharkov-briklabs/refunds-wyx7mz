# Refunds Service Infrastructure Scripts

## Overview

This directory contains the infrastructure management scripts for the Refunds Service. These scripts provide automation for deployment, backup, restoration, and monitoring of the service across different environments. They are designed to ensure consistent, repeatable, and secure operations of the Refunds Service infrastructure.

The scripts in this directory implement key operational procedures defined in the Refunds Service architecture, including deployment workflows, disaster recovery procedures, and monitoring setup. They are intended for use by DevOps engineers and system administrators responsible for maintaining the Refunds Service infrastructure.

## Prerequisites

Before using these scripts, ensure you have the following prerequisites in place:

| Requirement | Version/Details | Purpose |
|-------------|----------------|---------|
| AWS CLI | v2.9.0+ | Interacting with AWS services |
| Terraform | v1.5.0+ | Infrastructure as code operations |
| MongoDB Tools | v6.0+ | Database backup and restore operations |
| Python | 3.11+ | Running helper scripts and tools |
| jq | 1.6+ | JSON parsing in scripts |
| AWS Access | IAM roles with appropriate permissions | Authentication to AWS services |
| Environment Variables | See environment-specific .env files | Configuration for different environments |

Ensure your AWS credentials are properly configured with access to the necessary services:
- ECS/Fargate
- ECR
- S3
- CloudWatch
- MongoDB Atlas (via appropriate credentials)
- KMS
- Secrets Manager
- SQS

## Scripts

### Deploy Script (deploy.sh)

The deployment script automates the process of deploying the Refunds Service to different environments using infrastructure as code and CI/CD principles.

#### Usage

```bash
./deploy.sh [OPTIONS] <environment>
```

#### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| environment | Yes | Target environment (dev, test, staging, prod) |
| -v, --version | No | Version to deploy (defaults to latest) |
| -c, --config | No | Custom config file path |
| -p, --profile | No | AWS profile to use |
| -r, --region | No | AWS region (defaults to us-west-2) |
| --skip-validation | No | Skip pre-deployment validation |
| --terraform-only | No | Only run Terraform changes |
| --container-only | No | Only update container images |
| --dry-run | No | Show changes without applying |

#### Examples

Deploy to development environment:
```bash
./deploy.sh dev
```

Deploy specific version to staging:
```bash
./deploy.sh -v 1.2.3 staging
```

Deploy to production with specific AWS profile and region:
```bash
./deploy.sh -p production-profile -r us-east-1 prod
```

Perform a dry run for production deployment:
```bash
./deploy.sh --dry-run prod
```

#### Notes

- Production deployments require manual approval in the CI/CD pipeline
- The deploy script performs pre-flight checks to validate infrastructure state
- Blue/Green deployment is used for production to minimize downtime
- Canary deployments can be configured for high-risk changes
- Failed deployments automatically trigger rollback procedures
- All deployments are logged for audit purposes

### Backup Script (backup.sh)

The backup script automates comprehensive backup procedures for the Refunds Service, including database, configuration, and critical files.

#### Usage

```bash
./backup.sh [OPTIONS] <environment>
```

#### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| environment | Yes | Source environment (dev, test, staging, prod) |
| -t, --type | No | Backup type (full, config-only, db-only, logs-only) - defaults to full |
| -d, --destination | No | Backup destination (s3://bucket/path) |
| -r, --region | No | AWS region |
| --retention | No | Backup retention period in days |
| --no-encrypt | No | Disable encryption (not recommended) |
| --include-pii | No | Include PII data (requires special permissions) |

#### Examples

Full backup of production environment:
```bash
./backup.sh prod
```

Database-only backup with custom retention:
```bash
./backup.sh -t db-only --retention 90 prod
```

Configuration backup to specific S3 location:
```bash
./backup.sh -t config-only -d s3://refunds-backup/configs/2023-05-15 prod
```

#### Notes

- Production backups are automatically scheduled daily
- Multiple backup types:
  - Full: Complete snapshot of the entire service
  - DB-only: MongoDB data backup
  - Config-only: Infrastructure and application configuration
  - Logs-only: Critical logs and audit records
- All backups are encrypted using KMS keys
- Point-in-time recovery is available for database backups
- Backup validation is performed to ensure recoverability
- Retention periods:
  - Production: 7 years (or as specified by compliance)
  - Staging: 90 days
  - Test/Dev: 30 days

### Restore Script (restore.sh)

The restore script facilitates disaster recovery by restoring the Refunds Service from backups.

#### Usage

```bash
./restore.sh [OPTIONS] <backup-id> <target-environment>
```

#### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| backup-id | Yes | Backup ID or path to restore from |
| target-environment | Yes | Target environment to restore to |
| -t, --type | No | Restore type (full, config-only, db-only, logs-only) |
| -p, --point-in-time | No | Point-in-time recovery timestamp (for database) |
| --force | No | Force restore without confirmation (use with caution) |
| --validate-only | No | Validate backup without performing restore |
| --skip-dependency-check | No | Skip dependency validation |

#### Examples

Restore production from the most recent backup:
```bash
./restore.sh latest prod
```

Restore database only to a point in time:
```bash
./restore.sh -t db-only -p "2023-05-15T14:30:00Z" backup-20230515 prod
```

Validate a backup without restoring:
```bash
./restore.sh --validate-only backup-20230515 staging
```

#### Notes

- Production restores require additional authorization
- Restoration process:
  1. Validation of backup integrity
  2. Infrastructure preparation
  3. Data restoration
  4. Configuration application
  5. Service verification
- Post-restore validation ensures system integrity
- Restore logs are created for audit purposes
- Testing regular restores in non-production environments is recommended
- Partial restores (specific services) are supported through the -t option

### Monitoring Setup Script (monitoring-setup.sh)

This script automates the setup and configuration of monitoring infrastructure for the Refunds Service.

#### Usage

```bash
./monitoring-setup.sh [OPTIONS] <environment>
```

#### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| environment | Yes | Target environment (dev, test, staging, prod) |
| -c, --config | No | Path to monitoring configuration file |
| --datadog | No | Configure DataDog integration |
| --cloudwatch | No | Configure advanced CloudWatch settings |
| --x-ray | No | Enable X-Ray tracing |
| --alerts | No | Configure alert policies and notifications |
| --dashboards | No | Deploy predefined dashboards |
| --update | No | Update existing monitoring setup |

#### Examples

Set up standard monitoring for development:
```bash
./monitoring-setup.sh dev
```

Configure production monitoring with DataDog and custom alerts:
```bash
./monitoring-setup.sh --datadog --alerts prod
```

Update existing monitoring dashboards:
```bash
./monitoring-setup.sh --dashboards --update staging
```

#### Notes

- The script configures:
  - Infrastructure metrics (CPU, memory, network)
  - Application metrics (latency, throughput, error rates)
  - Business metrics (refund volumes, processing times)
  - Log aggregation and analysis
  - Distributed tracing
  - Custom alerts and notifications
- Environment-specific thresholds are applied
- Integration with notification systems (PagerDuty, Slack)
- Default dashboards include:
  - Operational Health
  - Performance Metrics
  - Business Analytics
  - Security Monitoring
- Alerting policies follow escalation procedures defined in runbooks

## Best Practices

When working with these infrastructure scripts, follow these best practices:

1. **Version Control**
   - Always commit changes to infrastructure scripts to version control
   - Document script changes with detailed commit messages
   - Use branching strategies for script development

2. **Validation and Testing**
   - Test all script changes in development/test environments before production
   - Use `--dry-run` options where available to preview changes
   - Maintain a test suite for script functionality

3. **Security**
   - Never hardcode credentials in scripts
   - Use AWS Secrets Manager or parameter store for sensitive values
   - Follow the principle of least privilege when configuring IAM roles
   - Keep encryption enabled for all backups

4. **Documentation**
   - Document any custom parameters or configurations
   - Keep a log of script executions for audit purposes
   - Document any manual steps that accompany script usage

5. **Automation**
   - Schedule recurring operations (backups, monitoring checks)
   - Integrate scripts with CI/CD pipelines where appropriate
   - Implement alerting for script failures

6. **Disaster Recovery**
   - Regularly test backup and restore procedures
   - Document RTO/RPO achievements in test exercises
   - Maintain up-to-date contact information for emergency scenarios

## Troubleshooting

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| Deploy script fails with permission errors | Insufficient IAM permissions | Check AWS credentials and IAM role assignments |
| Database backup timing out | Large database size | Increase timeout parameters or use incremental backups |
| Restore script reports inconsistent state | Incomplete or corrupt backup | Use `--validate-only` to verify backup integrity |
| Monitoring alerts not firing | Misconfigured thresholds | Review alert configurations in monitoring-setup.sh |
| Deployment failing at Terraform stage | State file lock | Check for concurrent deployments or manually release the lock |
| Container services failing to start | Resource constraints | Check ECS logs and consider increasing resource allocations |
| Backup encryption failure | KMS key issues | Verify KMS key permissions and status |

For persistent issues:

1. Check the script logs in `/var/log/refunds-service/infrastructure/`
2. Review AWS CloudTrail for API errors
3. Consult the Refunds Service runbooks for specific error scenarios
4. Contact the DevOps team via the support channel

## Contributing

To contribute to the infrastructure scripts:

1. Follow the established coding standards for shell scripts:
   - Use shellcheck for validation
   - Include proper error handling
   - Add comprehensive logging
   - Document all parameters and options

2. Testing requirements:
   - Test all changes in development environment
   - Include unit tests for complex functions
   - Document test procedures and results

3. Contribution process:
   - Create a feature branch for your changes
   - Submit a pull request with detailed description
   - Ensure CI/CD pipeline passes for your changes
   - Obtain code review from at least one DevOps engineer

4. Documentation updates:
   - Update this README.md with new parameters or usage examples
   - Update related runbooks if operational procedures change
   - Provide changelog entries for significant updates