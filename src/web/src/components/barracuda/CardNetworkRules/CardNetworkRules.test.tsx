import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { jest } from '@jest/globals'; // jest ^29.5.0
import CardNetworkRules from './CardNetworkRules';
import { renderWithProviders } from '../../../utils/test.utils';
import { useParameterApi } from '../../../services/api/parameter.api';
import { CardNetworkRule } from '../../../types/parameter.types';

// Mock the parameter API module
jest.mock('../../../services/api/parameter.api');

describe('CardNetworkRules Component', () => {
  beforeEach(() => {
    // Setup before each test to clear mocks and configure API mock responses
    jest.clearAllMocks();

    // Mock the useParameterApi hook to return mock implementations of API methods
    (useParameterApi as jest.Mock).mockReturnValue({
      parameters: [
        {
          name: 'cardNetworkRules.visa.timeLimit',
          description: 'Maximum time after transaction for refund processing',
          value: 120,
        },
        {
          name: 'cardNetworkRules.visa.methodRestriction',
          description: 'Allowed refund methods for this card network',
          value: ['ORIGINAL_PAYMENT'],
        },
      ],
      fetchParameters: jest.fn(),
      updateParameter: jest.fn(),
      loading: false,
      error: null,
    });
  });

  test('renders card network selector', () => {
    // Test that the component renders a card network dropdown selector
    renderWithProviders(<CardNetworkRules entityId="test-bank-id" />);

    // Assert that a card network selector dropdown exists in the document
    const selector = screen.getByLabelText('Card Network');
    expect(selector).toBeInTheDocument();

    // Verify that the selector contains expected network options like VISA, Mastercard
    expect(selector).toHaveValue('VISA');
  });

  test('loads and displays rules for selected network', async () => {
    // Test that rules are loaded and displayed when a card network is selected
    renderWithProviders(<CardNetworkRules entityId="test-bank-id" />);

    // Select a specific card network (e.g., VISA) from the dropdown
    const selector = screen.getByLabelText('Card Network');
    fireEvent.change(selector, { target: { value: 'VISA' } });

    // Wait for rules to be loaded from the API
    await waitFor(() => {
      expect(screen.getByText('Maximum time after transaction for refund processing')).toBeInTheDocument();
    });

    // Assert that rule entries like Time Limit, Method Restriction appear in the document
    expect(screen.getByText('Time Limit')).toBeInTheDocument();
    expect(screen.getByText('Method Restriction')).toBeInTheDocument();

    // Verify that the values for these rules are correctly displayed
    expect(screen.getByText('120 days')).toBeInTheDocument();
    expect(screen.getByText('ORIGINAL_PAYMENT')).toBeInTheDocument();
  });

  test('allows editing a rule', async () => {
    // Test the functionality to edit an existing card network rule
    renderWithProviders(<CardNetworkRules entityId="test-bank-id" />);

    // Select a card network from the dropdown
    const selector = screen.getByLabelText('Card Network');
    fireEvent.change(selector, { target: { value: 'VISA' } });

    // Wait for rules to load
    await waitFor(() => {
      expect(screen.getByText('Maximum time after transaction for refund processing')).toBeInTheDocument();
    });

    // Click the edit button for a specific rule (e.g., Time Limit)
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    // Change the value in the input field
    const valueInput = screen.getByLabelText('Value');
    fireEvent.change(valueInput, { target: { value: '180' } });

    // Save the changes
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Verify that the API method for updating a rule was called with correct parameters
    await waitFor(() => {
      expect(useParameterApi().updateParameter).toHaveBeenCalledWith(
        'cardNetworkRules.visa.timeLimit',
        'BANK',
        'test-bank-id',
        {
          parameterValue: '180',
          description: 'Maximum time after transaction for refund processing',
        }
      );
    });

    // Confirm that the updated value is displayed in the UI
    await waitFor(() => {
      expect(screen.getByText('180 days')).toBeInTheDocument();
    });
  });

  test('displays error messages', async () => {
    // Test that error messages are displayed when API calls fail
    (useParameterApi as jest.Mock).mockReturnValue({
      parameters: [],
      fetchParameters: jest.fn(),
      updateParameter: jest.fn(),
      loading: false,
      error: 'API Error',
    });

    // Render the CardNetworkRules component with Redux providers
    renderWithProviders(<CardNetworkRules entityId="test-bank-id" />);

    // Wait for the component to attempt to load data
    await waitFor(() => {
      expect(screen.getByText('Failed to load rules: API Error')).toBeInTheDocument();
    });

    // Verify that an error message is displayed in the UI
    expect(screen.getByText('Failed to load rules: API Error')).toBeInTheDocument();
  });
});