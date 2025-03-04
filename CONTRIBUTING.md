# Contributing to the Refunds Service

Thank you for your interest in contributing to the Refunds Service! This document provides guidelines to help you contribute effectively to this critical component of the Brik platform.

## Development Environment Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker and Docker Compose
- AWS CLI configured for local development
- Git

### Backend Setup (Python)

1. Clone the repository:
   ```bash
   git clone https://github.com/brik/refunds-service.git
   cd refunds-service
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

4. Install pre-commit hooks:
   ```bash
   pre-commit install
   ```

5. Set up local environment:
   ```bash
   docker-compose up -d
   ```

6. Run tests to verify setup:
   ```bash
   pytest
   ```

### Frontend Setup (TypeScript/React)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Coding Standards

### Python

- Follow [PEP 8](https://pep8.org/) coding style guidelines
- Use type hints for function parameters and return values
- Document all classes and functions using docstrings
- Format code using Black with a line length of 88 characters
- Sort imports using isort
- Maintain a minimum code coverage of 90% for all Python code (95% for critical components)

### TypeScript/React

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript for all new code with strict type checking
- Use functional components with hooks for React components
- Document complex functions and components with JSDoc comments
- Format code using Prettier
- Maintain a minimum code coverage of 90% for all TypeScript/React code

### General Guidelines

- Keep functions small and focused on a single responsibility
- Write self-explanatory code with clear variable and function names
- Limit nested code blocks to a maximum depth of 3
- Add comments only for complex logic that may not be immediately obvious
- Avoid commented-out code
- Keep cognitive complexity below 15 per method

## Git Workflow

### Branch Naming

Use the following branch naming convention:
- Feature: `feature/JIRA-123-short-description`
- Bug fix: `fix/JIRA-123-short-description`
- Documentation: `docs/JIRA-123-short-description`
- Refactoring: `refactor/JIRA-123-short-description`
- Performance: `perf/JIRA-123-short-description`

### Commit Messages

- Use the [Conventional Commits](https://www.conventionalcommits.org/) format
- Start with a type: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- Include the scope in parentheses if applicable
- Provide a concise description in the imperative mood
- Example: `feat(refund-api): add support for partial refunds`

### Workflow Process

1. Create a branch from `main` using the naming convention
2. Implement your changes with regular commits
3. Pull latest changes from `main` and resolve any conflicts
4. Push your branch to the remote repository
5. Create a pull request following the pull request template
6. Address review feedback and make necessary changes
7. Once approved, squash and merge into `main`

## Testing Requirements

### Unit Testing

- Write unit tests for all new code
- Maintain a minimum code coverage of 90% (95% for critical components)
- Use pytest for Python and Jest for TypeScript/React
- Mock all external dependencies
- Keep tests fast (under 5 minutes for the full suite)
- Name tests descriptively: `test_<function_name>_<scenario>_<expected_outcome>`

### Integration Testing

- Write integration tests for service-to-service interactions
- Maintain a minimum coverage of 85% for service contracts
- Use contract testing (e.g., Pact) for consumer-driven contracts
- Test database interactions with transaction-safe tests
- Test API endpoints with black-box testing

### End-to-End Testing

- Implement E2E tests for critical user journeys
- Use Cypress for UI automation
- Keep E2E tests independent and self-contained
- Clean up test data after execution
- Define clear pass/fail criteria

### Running Tests

- Run unit tests before committing:
  ```bash
  # Python
  pytest
  
  # TypeScript/React
  npm test
  ```

- Run integration tests:
  ```bash
  pytest -m integration
  ```

- Run E2E tests:
  ```bash
  npm run test:e2e
  ```

## Pull Request Process

1. Create a pull request from your feature branch to `main`
2. Fill out the pull request template completely
3. Ensure all CI/CD checks pass:
   - Static analysis (SonarQube + Pylint)
   - Unit tests (pytest, Jest)
   - Security scanning (Snyk + OWASP Dependency Check)
4. Request reviews from at least two team members
5. Address all review comments and update the PR as needed
6. Once approved, your PR will be merged by the maintainers

### CI/CD Pipeline Integration

Your PR will automatically trigger the following CI/CD pipeline stages:

1. Static Analysis (SonarQube, Pylint) - Quality gate: 90% minimum
2. Unit Tests (90% code coverage minimum, 95% for critical components)
3. Security Scan (zero high/critical vulnerabilities)
4. Build Artifact (containerized build environment)
5. Deploy to Development (on merge to main)
6. Integration Tests
7. Deploy to Test (automatic)
8. System Tests
9. Deploy to Staging (automatic)
10. User Acceptance Tests
11. Deploy to Production (manual approval required)

## Security Considerations

### Handling Sensitive Data

- Never commit secrets or credentials to the repository
- Use AWS Secrets Manager for managing secrets
- Always use parameterized queries to prevent SQL injection
- Apply proper input validation for all user-supplied data
- Ensure all PII and payment data is encrypted at rest and in transit

### Security Review

- All changes involving payment processing, authentication, or sensitive data require a security review
- Report potential security issues directly to the security team, not via GitHub issues

### Vulnerability Reporting

- If you discover a security vulnerability, please report it via email to security@brik.com
- Do not disclose security issues publicly until they have been addressed

## Documentation Updates

- Update relevant documentation as part of your changes
- Documentation should be treated as code and included in the same PR
- Update the following as needed:
  - API documentation (OpenAPI/Swagger)
  - README files
  - Technical documentation
  - Architecture diagrams
  - User guides

---

By following these guidelines, you help maintain the high quality and reliability standards required for the Refunds Service. Thank you for your contributions!