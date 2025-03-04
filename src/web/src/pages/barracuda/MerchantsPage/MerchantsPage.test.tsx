import React from 'react'; // react ^18.2.0
import { screen, waitFor, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'; // vitest ^0.30.1

import { renderWithProviders, waitForComponentToPaint, setupUserEvent } from '../../../utils/test.utils';
import MerchantsPage from './MerchantsPage';
import { Merchant } from '../../../components/barracuda/MerchantSelector';

// Mock the apiClient module
vi.mock('../../../services/api/api.client', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock the useNavigate hook from react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('MerchantsPage', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders merchants data correctly', async () => {
    // LD1: Render the MerchantsPage component with providers
    renderWithProviders(<MerchantsPage />);

    // LD2: Wait for the component to finish rendering and updating
    await waitForComponentToPaint(screen);

    // LD3: Assert that merchant names are rendered in the table
    expect(screen.getByText('Merchant 1')).toBeInTheDocument();
    expect(screen.getByText('Merchant 2')).toBeInTheDocument();
    expect(screen.getByText('Merchant 3')).toBeInTheDocument();
  });

  it('handles search input correctly', async () => {
    // LD1: Render the MerchantsPage component with providers
    renderWithProviders(<MerchantsPage />);

    // LD2: Wait for the component to finish rendering and updating
    await waitForComponentToPaint(screen);

    // LD3: Get the search input element
    const searchInput = screen.getByPlaceholderText('Search merchants...');

    // LD4: Simulate typing in the search input
    fireEvent.change(searchInput, { target: { value: 'Merchant 1' } });

    // LD5: Wait for the debounced search to take effect
    await waitFor(() => {
      expect(searchInput).toHaveValue('Merchant 1');
    });
  });

  it('navigates to merchant details page when "View Details" button is clicked', async () => {
    // LD1: Render the MerchantsPage component with providers
    renderWithProviders(<MerchantsPage />);

    // LD2: Wait for the component to finish rendering and updating
    await waitForComponentToPaint(screen);

    // LD3: Mock the useNavigate hook
    const navigate = vi.mocked(require('react-router-dom').useNavigate);

    // LD4: Get the "View Details" button for the first merchant
    const viewDetailsButton = screen.getAllByText('View Details')[0];

    // LD5: Simulate clicking the "View Details" button
    fireEvent.click(viewDetailsButton);

    // LD6: Assert that the navigate function is called with the correct merchant ID
    expect(navigate).toHaveBeenCalledWith('/merchants/merchant-1');
  });

  it('displays "No data available" message when there are no merchants', async () => {
    // LD1: Mock the apiClient.get to return an empty array
    vi.mocked(apiClient.get).mockResolvedValue(mockApiResponse([]));

    // LD2: Render the MerchantsPage component with providers
    renderWithProviders(<MerchantsPage />);

    // LD3: Wait for the component to finish rendering and updating
    await waitForComponentToPaint(screen);

    // LD4: Assert that the "No data available" message is displayed
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('displays loading indicator while fetching merchants', () => {
    // LD1: Mock the apiClient.get to simulate a loading state
    vi.mocked(apiClient.get).mockImplementation(() => new Promise(() => {}));

    // LD2: Render the MerchantsPage component with providers
    renderWithProviders(<MerchantsPage />);

    // LD3: Assert that the loading indicator is displayed
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays an error message when fetching merchants fails', async () => {
    // LD1: Mock the apiClient.get to simulate an error
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Failed to fetch'));

    // LD2: Render the MerchantsPage component with providers
    renderWithProviders(<MerchantsPage />);

    // LD3: Wait for the component to finish rendering and updating
    await waitForComponentToPaint(screen);

    // LD4: Assert that the error message is displayed
    expect(screen.getByText('Error fetching merchants:')).toBeInTheDocument();
  });

  // FN1: createMockMerchantList - Creates a list of mock merchant data for testing
  const createMockMerchantList = (count: number): Merchant[] => {
    // LD1: Generate an array of specified count of mock merchant objects
    return Array.from({ length: count }, (_, i) => ({
      id: `merchant-${i + 1}`, // LD2: Each merchant has unique id
      name: `Merchant ${i + 1}`, // LD2: Each merchant has unique name
      organizationId: `org-${i % 3 + 1}`,
      programId: `program-${i % 2 + 1}`,
      bankId: `bank-${i % 4 + 1}`,
      status: 'active',
      totalRefundVolume: 1000 * (i + 1), // LD3: Include refund metrics
      refundSuccessRate: 0.95, // LD3: Include refund metrics
      averageProcessingTime: 24, // LD3: Include refund metrics
      refundRate: 0.05, // LD3: Include refund metrics
    })); // LD4: Return the generated array
  };

  // FN2: setupMocks - Sets up all necessary mocks for the tests
  const setupMocks = (): void => {
    // LD1: Mock apiClient.get to return mock merchant data
    vi.mocked(apiClient.get).mockResolvedValue(mockApiResponse(createMockMerchantList(3)));

    // LD2: Mock useNavigate from react-router-dom
    const navigate = vi.fn();
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(navigate);
  };

  // FN3: mockApiResponse - Creates a mock API response with pagination and data
  const mockApiResponse = (merchants: Merchant[]): object => {
    // LD1: Create a standard API response structure
    return {
      success: true, // LD4: Set success flag to true
      data: merchants, // LD2: Include data property with provided merchants array
      meta: {
        // LD3: Add metadata with pagination information (total, pageCount)
        total: merchants.length,
        pageCount: 1,
      },
    }; // LD5: Return the complete response object
  };
});