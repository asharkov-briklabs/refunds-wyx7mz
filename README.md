# Brik Refunds Service

A comprehensive service for processing, managing, and tracking refunds across diverse payment methods and workflows within the Brik platform.

## Overview

The Refunds Service is a critical component of the Brik payment ecosystem, supporting flexible and reliable refund processing for merchants across different payment methods, approval workflows, and compliance requirements.

### Key Features

- End-to-end refund lifecycle management
- Support for multiple refund methods (original payment, balance, other)
- Configurable approval workflows
- Card network rule enforcement
- Multi-level parameter configuration
- Comprehensive reporting and analytics
- Secure bank account management
- Multi-channel notifications

## System Architecture

The Refunds Service follows a microservices architecture with modular components:

- **Refund API Service**: Exposes RESTful endpoints for client applications
- **Refund Request Manager**: Orchestrates the refund lifecycle
- **Payment Method Handler**: Provides method-specific refund processing logic
- **Approval Workflow Engine**: Manages configurable approval flows
- **Compliance Engine**: Enforces card network rules and merchant policies
- **Gateway Integration Service**: Manages communication with payment gateways
- **Parameter Resolution Service**: Resolves hierarchical configuration parameters
- **Bank Account Manager**: Securely stores and verifies bank account information
- **Notification Service**: Delivers multi-channel notifications
- **Reporting & Analytics Engine**: Provides insights and metrics on refund activity

## Technology Stack

### Backend

- **Language**: Python 3.11+
- **Database**: MongoDB 6.0+
- **Caching**: Redis 7.0+
- **Message Queue**: AWS SQS
- **Authentication**: JWT with OAuth 2.0/Auth0

### Frontend

- **Framework**: React 18.2+ with TypeScript 5.0+
- **State Management**: Redux 4.2+
- **UI Framework**: TailwindCSS 3.3+
- **API Integration**: React Query 4.0+

### Infrastructure

- **Cloud Provider**: AWS
- **Containerization**: Docker 24.0+
- **Orchestration**: AWS ECS Fargate
- **IaC**: Terraform 1.5+
- **CI/CD**: GitHub Actions

## Project Structure

```
./
├── src/
│   ├── backend/           # Backend service implementation
│   └── web/               # Frontend web application
├── infrastructure/        # Infrastructure configuration
├── .github/               # GitHub workflows and templates
└── docs/                  # Project documentation
```

## Getting Started

### Prerequisites

- Node.js 16+
- Python 3.11+
- Docker and Docker Compose
- AWS CLI
- Terraform 1.5+

### Local Development Setup

1. Clone the repository:

```bash
git clone https://github.com/your-org/refunds-service.git
cd refunds-service
```

2. Set up the backend:

```bash
cd src/backend
cp .env.example .env
# Update .env with your local configuration
pip install -r requirements.txt
python -m pytest  # Run tests to verify setup
python -m src.backend.bin.www  # Start the backend server
```

3. Set up the frontend:

```bash
cd src/web
cp .env.example .env
# Update .env with your local configuration
npm install
npm start  # Start the development server
```

4. Access the applications:

- Backend API: http://localhost:3000
- Frontend: http://localhost:8000
- API Documentation: http://localhost:3000/api-docs

## Testing

The project includes comprehensive test suites for both backend and frontend:

### Backend Tests

```bash
cd src/backend
python -m pytest  # Run all tests
python -m pytest tests/unit  # Run unit tests only
python -m pytest tests/integration  # Run integration tests only
```

### Frontend Tests

```bash
cd src/web
npm test  # Run all tests
npm run test:coverage  # Run tests with coverage report
```

## Deployment

The project uses GitHub Actions workflows for CI/CD:

- `.github/workflows/build-and-test.yml` - Runs on all PRs to verify code quality
- `.github/workflows/deploy-dev.yml` - Deploys to development environment on main branch merges
- `.github/workflows/deploy-staging.yml` - Deploys to staging after development tests pass
- `.github/workflows/deploy-prod.yml` - Deploys to production after manual approval

For manual deployment, see the infrastructure documentation.

## Documentation

- [Backend Documentation](src/backend/README.md)
- [Frontend Documentation](src/web/README.md)
- [Infrastructure Documentation](infrastructure/README.md)
- [API Documentation](src/backend/api/openapi/spec.yaml)

## Contributing

1. Create a feature branch from `main`
2. Implement changes with appropriate tests
3. Ensure all tests pass and code quality checks succeed
4. Submit a pull request with a detailed description of changes
5. Obtain code review approval

## License

Copyright (c) 2023 Brik. All rights reserved.