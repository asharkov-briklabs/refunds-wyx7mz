# src/web/src/pages/barracuda/RulesPage/RulesPage.test.tsx
```typescript
import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, jest } from '@jest/globals'; // @jest/globals ^29.5.0
import RulesPage from './RulesPage';
import { renderWithProviders, setupUserEvent, waitForComponentToPaint } from '../../../utils/test.utils';
import { EntityType } from '../../../types/parameter.types';
import { CardNetworkType } from '../../../components/barracuda/CardNetworkRules';

// Mock the useParameter hook
jest.mock('../../../hooks/useParameter', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    fetchParameters: jest.fn(),
    updateParameter: jest.fn(),
    parameters: [],
    loading: false,
    error: null,
  }),
}));

// Mock the useToast hook
jest.mock('../../../hooks/useToast', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// Setup function that runs before each test
beforeEach(() => {
  // Clear mock history on fetchMock
  jest.clearAllMocks();
  // Reset any mock implementations
  jest.restoreAllMocks();
});

// Helper function to set up mock API responses for parameter-related requests
const setupParameterMocks = () => {
  // Mock successful parameter fetching response with card network rules
  (require('../../../hooks/useParameter') as any).default.mockReturnValue({
    fetchParameters: jest.fn(),
    updateParameter: jest.fn(),
    parameters: [
      { name: 'cardNetworkRules.visa.timeLimit', value: 120, description: 'Time limit for Visa refunds' },
      { name: 'cardNetworkRules.mastercard.timeLimit', value: 180, description: 'Time limit for Mastercard refunds' },
    ],
    loading: false,
    error: null,
  });

  // Mock parameter update response for rule changes
  (require('../../../hooks/useToast') as any).default.mockReturnValue({
    success: jest.fn(),
    error: jest.fn(),
  });
};

describe('RulesPage Component', () => {
  it('renders without crashing', async () => {
    // Render RulesPage with test providers
    renderWithProviders(<RulesPage />);
    // Expect the component to be in the document
    expect(screen.getByText('Rules Configuration')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    // Mock parameters loading state to true
    (require('../../../hooks/useParameter') as any).default.mockReturnValue({
      fetchParameters: jest.fn(),
      updateParameter: jest.fn(),
      parameters: [],
      loading: true,
      error: null,
    });
    // Render RulesPage with test providers
    renderWithProviders(<RulesPage />);
    // Expect loading spinner to be visible
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays error state when fetching rules fails', async () => {
    // Mock parameter fetch to return error
    (require('../../../hooks/useParameter') as any).default.mockReturnValue({
      fetchParameters: jest.fn(),
      updateParameter: jest.fn(),
      parameters: [],
      loading: false,
      error: 'Failed to fetch rules',
    });
    // Render RulesPage with test providers
    renderWithProviders(<RulesPage />);
    // Wait for component to update
    await waitForComponentToPaint(renderWithProviders(<RulesPage />));
    // Expect error alert to be visible with error message
    expect(screen.getByText('Failed to load card network rules: Failed to fetch rules')).toBeInTheDocument();
  });

  it('shows card network rules tab by default', async () => {
    // Render RulesPage with test providers
    renderWithProviders(<RulesPage />);
    // Wait for data to load
    await waitFor(() => expect(screen.getByText('Card Network Rules')).toBeInTheDocument());
    // Expect card network rules tab to be active
    expect(screen.getByText('Card Network Rules')).toHaveClass('tabs__tab--active');
    // Expect card network rules component to be visible
    expect(screen.getByText('Network-Specific Information')).toBeInTheDocument();
  });
});

describe('Tab Navigation', () => {
  it('switches between tabs correctly', async () => {
    // Render RulesPage with test providers
    renderWithProviders(<RulesPage />);
    // Wait for data to load
    await waitFor(() => expect(screen.getByText('Card Network Rules')).toBeInTheDocument());
    // Click on 'Compliance Rules' tab
    await setupUserEvent().click(screen.getByText('Compliance Rules'));
    // Expect compliance rules section to be visible
    expect(screen.getByText('Compliance rules content coming soon...')).toBeInTheDocument();
    // Click on 'Merchant Rules' tab
    await setupUserEvent().click(screen.getByText('Merchant Policies'));
    // Expect merchant rules section to be visible
    expect(screen.getByText('Merchant policies content coming soon...')).toBeInTheDocument();
    // Click on 'Card Network Rules' tab
    await setupUserEvent().click(screen.getByText('Card Network Rules'));
    // Expect card network rules to be visible again
    expect(screen.getByText('Network-Specific Information')).toBeInTheDocument();
  });
});

describe('Card Network Rules', () => {
  it('displays network selector with correct options', async () => {
    // Render RulesPage with test providers
    renderWithProviders(<RulesPage />);
    // Wait for data to load
    await waitFor(() => expect(screen.getByLabelText('Card Network')).toBeInTheDocument());
    // Expect network selector to be visible
    expect(screen.getByLabelText('Card Network')).toBeVisible();
    // Expect network selector to contain VISA and MASTERCARD options
    expect(screen.getByRole('combobox')).toHaveTextContent('Visa');
    expect(screen.getByRole('combobox')).toHaveTextContent('Mastercard');
  });

  it('loads rules for selected network', async () => {
    // Setup mock for parameter fetching
    const fetchParametersMock = jest.fn();
    (require('../../../hooks/useParameter') as any).default.mockReturnValue({
      fetchParameters: fetchParametersMock,
      updateParameter: jest.fn(),
      parameters: [],
      loading: false,
      error: null,
    });
    // Render RulesPage with test providers
    renderWithProviders(<RulesPage />);
    // Wait for data to load
    await waitFor(() => expect(screen.getByLabelText('Card Network')).toBeInTheDocument());
    // Select MASTERCARD from network dropdown
    await setupUserEvent().selectOptions(screen.getByLabelText('Card Network'), 'MASTERCARD');
    // Expect fetchParameters to be called with correct network filter
    expect(fetchParametersMock).toHaveBeenCalledWith({
      entityType: EntityType.BANK,
      entityId: 'default-bank-id',
      searchQuery: 'cardNetworkRules.mastercard',
      page: 1,
      pageSize: 100,
    });
  });

  it('handles rule update correctly', async () => {
    // Setup mocks for parameter fetching and updating
    setupParameterMocks();
    const updateParameterMock = jest.fn().mockResolvedValue(undefined);
    (require('../../../hooks/useParameter') as any).default.mockReturnValue({
      fetchParameters: jest.fn(),
      updateParameter: updateParameterMock,
      parameters: [
        { name: 'cardNetworkRules.visa.timeLimit', value: 120, description: 'Time limit for Visa refunds' },
      ],
      loading: false,
      error: null,
    });
    const successMock = jest.fn();
    (require('../../../hooks/useToast') as any).default.mockReturnValue({
      success: successMock,
      error: jest.fn(),
    });
    // Render RulesPage with test providers
    renderWithProviders(<RulesPage />);
    // Wait for data to load
    await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument());
    // Click edit button on 'Time Limit' rule
    await setupUserEvent().click(screen.getByText('Edit'));
    // Enter new value in edit modal
    await setupUserEvent().type(screen.getByLabelText('Value'), '150');
    // Click save button
    await setupUserEvent().click(screen.getByText('Save'));
    // Expect updateParameter to be called with correct data
    expect(updateParameterMock).toHaveBeenCalledWith(
      'cardNetworkRules.visa.timeLimit',
      EntityType.BANK,
      'default-bank-id',
      { parameterValue: '150', description: 'Time limit for Visa refunds' }
    );
    // Expect success notification to be displayed
    expect(successMock).toHaveBeenCalledWith('Rule updated successfully!');
  });
});

describe('Error Handling', () => {
  it('displays error when rule update fails', async () => {
    // Setup mocks with update returning error
    setupParameterMocks();
    const updateParameterMock = jest.fn().mockRejectedValue(new Error('Update failed'));
    (require('../../../hooks/useParameter') as any).default.mockReturnValue({
      fetchParameters: jest.fn(),
      updateParameter: updateParameterMock,
      parameters: [
        { name: 'cardNetworkRules.visa.timeLimit', value: 120, description: 'Time limit for Visa refunds' },
      ],
      loading: false,
      error: null,
    });
    const errorMock = jest.fn();
    (require('../../../hooks/useToast') as any).default.mockReturnValue({
      success: jest.fn(),
      error: errorMock,
    });
    // Render RulesPage with test providers
    renderWithProviders(<RulesPage />);
    // Wait for data to load
    await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument());
    // Click edit button on rule
    await setupUserEvent().click(screen.getByText('Edit'));
    // Enter new value in edit modal
    await setupUserEvent().type(screen.getByLabelText('Value'), '150');
    // Click save button
    await setupUserEvent().click(screen.getByText('Save'));
    // Expect error notification to be displayed with correct message
    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('Failed to update rule: Update failed'));
  });
});