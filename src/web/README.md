# Refunds Service Frontend

## Introduction

The Refunds Service frontend application provides the user interfaces for the Brik platform's comprehensive refund processing and management system. It supports two distinct interfaces:

- **Pike**: The merchant-facing interface allowing businesses to initiate, track, and manage customer refunds
- **Barracuda**: The admin-facing interface for platform administrators to configure, monitor, and manage refund operations across the platform

This application is designed to handle complex refund workflows across diverse payment methods while ensuring compliance with card network rules, merchant policies, and regulatory requirements.

## Features

- **Refund Request Management**: Create, view, and manage refund requests
- **Payment Method Handling**: Support for multiple refund methods (original payment, balance, bank account)
- **Approval Workflows**: Configurable approval processes based on refund criteria
- **Bank Account Management**: Secure storage and verification of merchant bank accounts
- **Parameter Configuration**: Multi-level configuration of refund parameters
- **Compliance Enforcement**: Card network rule validation and enforcement
- **Real-time Status Tracking**: Visibility into refund processing status
- **Reporting & Analytics**: Comprehensive insights into refund operations

## Technology Stack

- **React 18+**: Core UI library
- **TypeScript 5.0+**: Static typing and enhanced developer experience
- **Redux**: State management for complex application state
- **React Query**: Data fetching, caching, and synchronization
- **TailwindCSS**: Utility-first CSS framework for styling
- **Jest/React Testing Library**: Testing framework for components and logic

## Project Structure

The frontend codebase is organized to support both Pike and Barracuda interfaces while sharing common components and utilities:

```
src/
├── components/
│   ├── common/           # Shared components used across interfaces
│   ├── pike/             # Merchant-specific components
│   └── barracuda/        # Admin-specific components
├── pages/                # Application pages/routes
│   ├── pike/             # Merchant interface pages
│   └── barracuda/        # Admin interface pages
├── services/             # API and service integrations
│   ├── api/              # API clients
│   └── hooks/            # Custom React hooks
├── store/                # Redux store configuration
│   ├── slices/           # Redux slices
│   └── selectors/        # State selectors
├── utils/                # Utility functions
├── types/                # TypeScript type definitions
├── config/               # Application configuration
└── assets/               # Static assets
```

### Key Directories

- **components**: React components organized by interface and functionality
- **pages**: Page components that represent application routes
- **services**: API clients and business logic services
- **store**: Global state management with Redux
- **utils**: Helper functions and utilities
- **config**: Configuration files and environment settings

### Component Organization

Components follow a hierarchical structure:

1. **Foundation Components**: Basic UI elements (buttons, inputs, etc.)
2. **Composite Components**: Combinations of foundation components for specific use cases
3. **Feature Components**: Complete functional units implementing business features
4. **Page Components**: Top-level components assembled from feature components

## Setup and Installation

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or yarn 1.22.x or higher
- Git

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/refunds-service.git
   cd refunds-service/web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create local environment configuration:
   ```bash
   cp .env.example .env.local
   ```

4. Start the development server:
   ```bash
   npm start
   ```

### Environment Configuration

The application uses environment variables for configuration. Create a `.env.local` file with the following variables:

```
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_AUTH_DOMAIN=your-auth-domain.auth0.com
REACT_APP_AUTH_CLIENT_ID=your-auth-client-id
REACT_APP_AUTH_AUDIENCE=your-api-audience
```

Different environments (development, staging, production) use specific environment files:
- `.env.development` - Development environment settings
- `.env.test` - Test environment settings
- `.env.production` - Production environment settings

## Available Scripts

The following scripts are available for development, testing, and building:

- `npm start` - Runs the app in development mode
- `npm test` - Runs the test suites
- `npm run build` - Builds the app for production
- `npm run lint` - Lints the codebase for code quality
- `npm run format` - Formats the code using Prettier

Additional utility scripts:
- `npm run test:coverage` - Runs tests with coverage report
- `npm run analyze` - Analyzes the bundle size
- `npm run storybook` - Runs Storybook for component development

## Development Guidelines

### Code Style

We follow a strict code style to maintain consistency across the codebase:

- ESLint and Prettier are configured to enforce code style
- TypeScript strict mode is enabled
- Component props must be typed with TypeScript interfaces
- File naming convention: PascalCase for components, camelCase for utilities

### Component Development

When creating new components:

1. Place components in the appropriate directory (`common`, `pike`, or `barracuda`)
2. Create a dedicated folder for each component with index.ts export
3. Include tests in a `__tests__` folder within the component folder
4. Document component props with JSDoc comments
5. Create Storybook stories for visual testing and documentation

Example component:

```tsx
import React from 'react';
import { Button } from '@common/Button';

interface RefundButtonProps {
  transactionId: string;
  disabled?: boolean;
  onRefund: (transactionId: string) => void;
}

export const RefundButton: React.FC<RefundButtonProps> = ({ 
  transactionId, 
  disabled = false, 
  onRefund 
}) => {
  const handleClick = () => {
    onRefund(transactionId);
  };

  return (
    <Button 
      variant="primary" 
      disabled={disabled} 
      onClick={handleClick}
    >
      Process Refund
    </Button>
  );
};
```

### State Management

The application uses a combination of state management approaches:

1. **Redux**: For global state shared across components or pages
2. **React Query**: For server state (API data fetching and caching)
3. **React Context**: For shared state within a specific feature
4. **Local Component State**: For UI state specific to a component

Guidelines for state management:
- Use Redux for auth state, user preferences, and global application state
- Use React Query for all API-related data
- Keep Redux store normalized to avoid duplication
- Use selectors to derive data from the Redux store

### Internationalization

The application supports multiple languages using i18next:

- Translation files are stored in `public/locales/{language}/translation.json`
- Use the `useTranslation` hook for text elements
- Format dates, times, and numbers according to locale

### Accessibility

All components must meet WCAG 2.1 AA standards:

- Use semantic HTML elements
- Include proper ARIA attributes when necessary
- Ensure keyboard navigation works for all interactive elements
- Maintain sufficient color contrast (minimum 4.5:1 ratio)
- Support screen readers with appropriate text alternatives
- Test with accessibility tools (axe, lighthouse)

## Testing Strategy

### Unit Testing

Unit tests focus on testing individual components and utilities in isolation:

- Test component rendering and interactions
- Mock external dependencies and services
- Verify component behavior with different props
- Test utility functions for correctness

Example test:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { RefundDetails } from './RefundDetails';

describe('RefundDetails component', () => {
  const mockRefund = {
    refundId: 'ref_12345',
    amount: 50.00,
    status: 'COMPLETED',
    createdAt: '2023-05-15T10:30:45Z'
  };

  test('displays refund details correctly', () => {
    render(<RefundDetails refund={mockRefund} />);
    
    expect(screen.getByText('ref_12345')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });
});
```

### Integration Testing

Integration tests verify that components work together correctly:

- Test page components with their child components
- Test form submissions and API interactions
- Verify workflows and user journeys
- Test interactions between components

### Test Coverage

We aim for high test coverage to ensure application reliability:

- Minimum 80% code coverage for all components
- Critical paths should have 90%+ coverage
- Business logic should have thorough testing
- UI interactions should be tested with user events

## Building and Deployment

### Build Process

To build the application for production:

1. Ensure all tests pass: `npm test`
2. Build the application: `npm run build`
3. The production files will be in the `build` directory

The build process:
- Transpiles TypeScript to JavaScript
- Bundles and minimizes code
- Optimizes assets
- Generates source maps
- Creates a production-ready build

### Deployment

The application can be deployed to various environments:

- **Development**: Automatic deployment from the `develop` branch
- **Staging**: Automatic deployment from the `staging` branch
- **Production**: Deployment from the `main` branch after approval

### CI/CD Integration

The repository uses GitHub Actions for CI/CD:

- `.github/workflows/ci.yml` - Runs on pull requests to validate code
- `.github/workflows/deploy.yml` - Deploys to the appropriate environment

CI pipeline steps:
1. Install dependencies
2. Run linting
3. Run tests
4. Build application
5. Deploy to environment (if applicable)

## User Interfaces

### Pike Interface

The Pike interface is designed for merchants to manage their refund operations:

- **Dashboard**: Overview of refund activity and status
- **Refund Creation**: Creating new refund requests from transactions
- **Refund Management**: Viewing and managing existing refunds
- **Bank Account Management**: Managing bank accounts for refund processing
- **Reports**: Viewing refund reports and analytics

Key user journeys:
1. Creating a refund from a transaction
2. Tracking refund status and history
3. Managing bank accounts for alternative refund methods
4. Viewing customer refund history

### Barracuda Interface

The Barracuda interface is designed for platform administrators:

- **Dashboard**: Platform-wide refund metrics and status
- **Merchant Management**: Managing merchant refund configurations
- **Parameter Configuration**: Setting up refund parameters at various levels
- **Approval Workflows**: Configuring and managing approval workflows
- **Compliance Rules**: Setting up and managing card network rules
- **Reports**: Comprehensive reporting and analytics

### Shared Components

Components shared between both interfaces:

- Authentication and authorization
- Notification system
- Form components and validation
- Data visualization components
- Error handling and messaging

## API Integration

### API Client

The application uses a centralized API client for backend communication.

### Data Fetching

Data fetching is handled with React Query for efficient caching and synchronization:

```ts
import { useQuery, useMutation } from 'react-query';
import { refundApi } from '@services/api/refund.api';

export const useRefundList = (merchantId: string) => {
  return useQuery(
    ['refunds', merchantId],
    () => refundApi.getRefundsByMerchant(merchantId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true
    }
  );
};

export const useCreateRefund = () => {
  return useMutation(
    (refundData) => refundApi.createRefund(refundData),
    {
      onSuccess: (data) => {
        // Handle success
      },
      onError: (error) => {
        // Handle error
      }
    }
  );
};
```

### Error Handling

API errors are handled at multiple levels:

1. **Global error handling**: Interceptors in the API client for authentication and server errors
2. **Query-level error handling**: Error states in React Query hooks
3. **Component-level error handling**: Error UI for specific use cases

## Troubleshooting

### Common Development Issues

1. **API Connection Issues**
   - Verify the `REACT_APP_API_BASE_URL` is correctly set
   - Check network tab for CORS issues
   - Verify authentication token is valid

2. **Build Failures**
   - Run `npm run lint` to check for linting errors
   - Check for TypeScript errors with `npm run tsc`
   - Verify dependency versions match requirements

3. **Test Failures**
   - Use `--watch` mode to debug failing tests
   - Check for outdated snapshots with `-u` flag
   - Verify mock data matches expected schema

### Support Resources

- **Internal Documentation**: Check the `/docs` folder for detailed guides
- **API Documentation**: Available at `/api/docs` endpoint in development
- **Technical Specs**: Review the technical specification document for requirements

## Contributing

### Development Workflow

1. Create a feature branch from `develop`
2. Implement your changes with tests
3. Submit a pull request to `develop`
4. Address review feedback
5. Merge after approval

### Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Include tests for new functionality
- Update documentation as needed
- Ensure CI passes (tests, linting, build)
- Request review from appropriate team members

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## Additional Resources

- [Backend API Documentation](../backend/api/openapi/spec.yaml)
- [UI Design System](../docs/ui-design-system.md)
- [Technical Specification](../docs/technical-specs.md)