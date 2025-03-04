# Refunds Service Backend

> Core backend implementation for the Brik Refunds Service

## Overview

The Refunds Service is a comprehensive module within the Brik platform designed to process, manage, and track refunds across diverse payment methods and workflows. This backend implementation provides the core business logic, API endpoints, and integration points needed to support the platform's refund capabilities.

## Technology Stack

- **Language**: TypeScript/Node.js
- **Database**: MongoDB 6.0+
- **Caching**: Redis 7.0+
- **Message Queue**: AWS SQS
- **Authentication**: JWT with Auth0 integration
- **Testing**: Jest, Supertest
- **Code Quality**: ESLint, Prettier
- **CI/CD**: GitHub Actions

## Architecture Components

The Refunds Service backend is built with a modular architecture consisting of:

- **Refund API Service**: RESTful endpoints for refund operations
- **Refund Request Manager**: Orchestrates refund lifecycle
- **Payment Method Handler**: Method-specific refund processing logic
- **Approval Workflow Engine**: Configurable approval flows
- **Compliance Engine**: Enforces card network rules
- **Gateway Integration**: Handles communication with payment gateways
- **Parameter Resolution Service**: Manages configuration hierarchy
- **Bank Account Manager**: Secure storage of bank account information
- **Notification Service**: Multi-channel notifications
- **Reporting Engine**: Analytics and reporting capabilities

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB (v6.0+)
- Redis (v7.0+)
- AWS Account for SQS integration
- Docker and Docker Compose (optional)

### Installation

1. Clone the repository
2. Navigate to the backend directory: `cd src/backend`
3. Install dependencies: `npm install`
4. Copy environment template: `cp .env.example .env`
5. Update environment variables in `.env`

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Docker

```bash
docker-compose up -d
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

## Project Structure

```
src/backend/
├── api/              # API routes and controllers
├── bin/              # Binary scripts
├── common/           # Shared utilities and interfaces
├── config/           # Environment configurations
├── database/         # Data models and repositories
├── integrations/     # External service clients
├── services/         # Core business logic services
│   ├── approval-workflow-engine/   # Approval workflows
│   ├── bank-account-manager/       # Bank account handling
│   ├── compliance-engine/          # Rule enforcement
│   ├── gateway-integration/        # Payment gateways
│   ├── notification-service/       # Notifications
│   ├── parameter-resolution/       # Configuration
│   ├── payment-method-handler/     # Payment methods
│   ├── refund-api/                 # API handlers
│   ├── refund-request-manager/     # Request lifecycle
│   └── reporting-analytics/        # Reports and analytics
├── tests/            # Test suites
└── workers/          # Background processes
```

## API Documentation

API documentation is available through Swagger/OpenAPI.

- Access at http://localhost:3000/api-docs (development)
- Generate with `npm run generate-docs`

## Configuration

Key environment variables include:

- `NODE_ENV`: Application environment
- `PORT`: Server port
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection string
- `AWS_REGION`: AWS region for services
- `SQS_QUEUE_URL`: SQS queue URL
- `LOG_LEVEL`: Logging level
- `JWT_SECRET`: JWT verification secret
- `AUTH0_DOMAIN`: Auth0 domain
- `AUTH0_AUDIENCE`: Auth0 API audience

See `.env.example` for a complete list.

## Development Workflows

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Migrations

```bash
npm run migrate
```

## Deployment

The service uses containerization and CI/CD pipelines:

- GitHub Actions for CI/CD (see `.github/workflows`)
- Docker for containerization
- Environment-specific configurations

## Troubleshooting

### Common Issues

- **MongoDB Connection**: Verify URI and service availability
- **Redis Connection**: Ensure Redis is running
- **AWS Credentials**: Check AWS credential configuration

### Logging

The application uses structured JSON logging with configurable levels.

## Contributing

1. Create a feature branch from `main`
2. Implement changes with tests
3. Ensure all tests pass
4. Update documentation
5. Submit a pull request

Follow the coding standards and commit message conventions.

## License

Copyright (c) 2023 Brik. All rights reserved.