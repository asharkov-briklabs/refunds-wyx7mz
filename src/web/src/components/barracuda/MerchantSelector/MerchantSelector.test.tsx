import React from 'react'; // ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // ^14.0.0
import { MerchantSelector } from './MerchantSelector';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { mockApiClient } from 'jest-mock'; // ^29.5.0

// Mock the API client to control API responses during tests
jest.mock('../../../services/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('MerchantSelector Component', () => {
  const mockMerchants = [
    { id: '1', name: 'Merchant A', organizationId: 'org1', programId: 'prog1', bankId: 'bank1', status: 'active' },
    { id: '2', name: 'Merchant B', organizationId: 'org2', programId: 'prog2', bankId: 'bank2', status: 'inactive' },
    { id: '3', name: 'Merchant C', organizationId: 'org1', programId: 'prog1', bankId: 'bank1', status: 'active' },
  ];

  beforeEach(() => {
    (mockApiClient.get as jest.Mock).mockReset();
    (mockApiClient.get as jest.Mock).mockResolvedValue({ success: true, data: mockMerchants });
  });

  const testRenderingWithDefaultProps = async () => {
    // Render MerchantSelector with basic required props
    renderWithProviders(<MerchantSelector onChange={() => {}} />);

    // Verify that the component is rendered with default styling
    expect(screen.getByText('Select a merchant')).toBeInTheDocument();

    // Verify that merchants are displayed in the dropdown after loading
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Merchant A' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Merchant B' })).toBeInTheDocument();
    });

    // Verify API was called with correct parameters
    expect(mockApiClient.get).toHaveBeenCalledWith('/merchants', {});
  };

  it('Renders correctly with default props', async () => {
    await testRenderingWithDefaultProps();
  });

  const testHandlingSelectedValue = async () => {
    // Render MerchantSelector with a preset selected merchant ID
    renderWithProviders(<MerchantSelector value="2" onChange={() => {}} />);

    // Verify that the correct merchant name is displayed in the dropdown
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Merchant B' }).selected).toBe(true);
    });

    // Verify that the selection matches the provided value prop
    expect(screen.getByRole('combobox')).toHaveValue('2');
  };

  it('Correctly shows the selected merchant', async () => {
    await testHandlingSelectedValue();
  });

  const testSearchFunctionality = async () => {
    const user = setupUserEvent();

    // Render MerchantSelector with showSearch=true
    renderWithProviders(<MerchantSelector showSearch onChange={() => {}} />);

    // Type a search term in the search input
    const searchInput = screen.getByPlaceholderText('Search merchants...');
    await user.type(searchInput, 'Merchant A');

    // Verify that API call is made with search parameter
    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/merchants', {});
    });

    // Verify that merchant list is filtered according to search results
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Merchant A' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Merchant B' })).not.toBeInTheDocument();
    });
  };

  it('Filters merchants based on search input', async () => {
    await testSearchFunctionality();
  });

  const testHandlingLoadingState = async () => {
    // Mock API to delay response
    (mockApiClient.get as jest.Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, data: mockMerchants });
        }, 500);
      });
    });

    // Render MerchantSelector component
    renderWithProviders(<MerchantSelector onChange={() => {}} />);

    // Verify loading indicator is displayed
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Resolve API call
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Merchant A' })).toBeInTheDocument();
    });

    // Verify loading indicator is removed after data loads
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  };

  it('Shows loading state while fetching merchants', async () => {
    await testHandlingLoadingState();
  });

  const testHandlingApiErrors = async () => {
    // Mock API to return an error
    (mockApiClient.get as jest.Mock).mockRejectedValue(new Error('API Error'));

    // Render MerchantSelector component
    renderWithProviders(<MerchantSelector onChange={() => {}} />);

    // Verify that error state is displayed properly
    await waitFor(() => {
      expect(screen.getByText('Failed to load merchants')).toBeInTheDocument();
    });

    // Verify that appropriate error message is shown to the user
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  };

  it('Handles errors when fetching merchants fails', async () => {
    await testHandlingApiErrors();
  });

  const testFilteringByOrganization = async () => {
    // Render MerchantSelector with filterByOrganization prop
    renderWithProviders(<MerchantSelector filterByOrganization="org1" onChange={() => {}} />);

    // Verify that API call includes organizationId parameter
    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/merchants', { organizationId: 'org1' });
    });

    // Verify that correct merchants are displayed based on organization filter
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Merchant A' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Merchant B' })).not.toBeInTheDocument();
    });
  };

  it('Filters merchants by organizationId when provided', async () => {
    await testFilteringByOrganization();
  });

  it('Applies filters (organization, program, bank) to API requests', async () => {
    renderWithProviders(
      <MerchantSelector
        filterByOrganization="org1"
        filterByProgram="prog1"
        filterByBank="bank1"
        onChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/merchants', {
        organizationId: 'org1',
        programId: 'prog1',
        bankId: 'bank1',
      });
    });
  });

  it('Calls onChange handler when merchant selection changes', async () => {
    const user = setupUserEvent();
    const onChange = jest.fn();
    renderWithProviders(<MerchantSelector onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Merchant A' })).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByRole('combobox'), '1');
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('Renders in a disabled state', async () => {
    renderWithProviders(<MerchantSelector disabled onChange={() => {}} />);
    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toBeDisabled();
  });
});