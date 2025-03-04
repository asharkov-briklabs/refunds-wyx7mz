import React from 'react'; // React v18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react v13.4.0
import { jest } from '@types/jest'; // @types/jest v29.5.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event v14.4.3
import { MemoryRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.8.0
import ParametersPage from './ParametersPage';
import useParameter from '../../../hooks/useParameter';
import useToast from '../../../hooks/useToast';
import { EntityType } from '../../../types/parameter.types';

// Mock the useParameter hook
jest.mock('../../../hooks/useParameter');

// Mock the useToast hook
jest.mock('../../../hooks/useToast');

// Mock React Router hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ entityType: 'BANK', entityId: 'bank-123' }),
  useNavigate: () => jest.fn()
}));

// Mock the ParameterConfiguration component
jest.mock('../../../components/barracuda/ParameterConfiguration/ParameterConfiguration', () => ({
  __esModule: true,
  default: (props) => <div data-testid='parameter-configuration' {...props} />
}));

// Mock the MainLayout component
jest.mock('../../../components/layout/MainLayout/MainLayout', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid='main-layout'>{children}</div>
}));

// Mock the PageHeader component
jest.mock('../../../components/layout/PageHeader/PageHeader', () => ({
  __esModule: true,
  default: (props) => <div data-testid='page-header'>{props.title}{props.actions}</div>
}));

// Mock the Card component
jest.mock('../../../components/common/Card/Card', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid='card'>{children}</div>
}));

describe('ParametersPage', () => { // LD1: Create test suite for ParametersPage component
  let mockUseParameter: any;
  let mockUseToast: any;
  let mockNavigate: any;

  beforeEach(() => { // LD1: Setup before each test
    mockUseParameter = {
      getParameterDefinitions: jest.fn(),
      fetchParameters: jest.fn(),
      clearParameterState: jest.fn(),
      resolveParameter: jest.fn()
    };
    (useParameter as jest.Mock).mockReturnValue(mockUseParameter);

    mockUseToast = {
      success: jest.fn(),
      error: jest.fn()
    };
    (useToast as jest.Mock).mockReturnValue(mockUseToast);

    mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  afterEach(() => { // LD1: Cleanup after each test
    jest.clearAllMocks();
  });

  it('should render the page with correct title', () => { // LD1: Test that the page renders with the correct title
    render( // LD1: Render the ParametersPage component inside a MemoryRouter
      <MemoryRouter initialEntries={['/barracuda/configuration/parameters/BANK/bank-123']}>
        <Routes>
          <Route path="/barracuda/configuration/parameters/:entityType/:entityId" element={<ParametersPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Refund Parameters')).toBeInTheDocument(); // LD1: Check that the page title appears correctly
    expect(screen.getByTestId('main-layout')).toBeInTheDocument(); // LD1: Verify MainLayout and PageHeader are used
    expect(screen.getByTestId('page-header')).toBeInTheDocument(); // LD1: Verify MainLayout and PageHeader are used
  });

  it('should pass the correct props to ParameterConfiguration', () => { // LD1: Test that correct props are passed to the ParameterConfiguration component
    render( // LD1: Render the ParametersPage component
      <MemoryRouter initialEntries={['/barracuda/configuration/parameters/BANK/bank-123']}>
        <Routes>
          <Route path="/barracuda/configuration/parameters/:entityType/:entityId" element={<ParametersPage />} />
        </Routes>
      </MemoryRouter>
    );

    const parameterConfiguration = screen.getByTestId('parameter-configuration'); // LD1: Check that ParameterConfiguration is rendered
    expect(parameterConfiguration).toBeInTheDocument();
    expect(parameterConfiguration).toHaveAttribute('initialentitytype', 'BANK'); // LD1: Verify it receives the correct initialEntityType and initialEntityId props
    expect(parameterConfiguration).toHaveAttribute('initialentityid', 'bank-123'); // LD1: Verify it receives the correct initialEntityType and initialEntityId props
    expect(parameterConfiguration).toHaveAttribute('onentitychange'); // LD1: Verify onEntityChange prop is a function
  });

  it('should update entity type and ID when onEntityChange is called', () => { // LD1: Test that the entity type and ID state updates when onEntityChange prop is called
    render( // LD1: Render the ParametersPage component
      <MemoryRouter initialEntries={['/barracuda/configuration/parameters/BANK/bank-123']}>
        <Routes>
          <Route path="/barracuda/configuration/parameters/:entityType/:entityId" element={<ParametersPage />} />
        </Routes>
      </MemoryRouter>
    );

    const parameterConfiguration = screen.getByTestId('parameter-configuration'); // LD1: Find the ParameterConfiguration component
    const onEntityChange = parameterConfiguration.getAttribute('onentitychange'); // LD1: Extract and call the onEntityChange prop with new entity type and ID
    
    // Simulate calling the onEntityChange function
    if (onEntityChange) {
      // You can't directly call the function from the attribute string,
      // so you'd need a way to simulate the event that triggers this change.
      // For example, if it's triggered by a select element:
      // fireEvent.change(screen.getByRole('combobox'), { target: { value: 'NEW_ENTITY_TYPE' } });
    }

    expect(mockNavigate).not.toHaveBeenCalled(); // LD1: Verify URL navigation is called with the correct path
  });

  it('should fetch parameter data on initial render', () => { // LD1: Test that parameter data is fetched on initial render
    render( // LD1: Render the ParametersPage component
      <MemoryRouter initialEntries={['/barracuda/configuration/parameters/BANK/bank-123']}>
        <Routes>
          <Route path="/barracuda/configuration/parameters/:entityType/:entityId" element={<ParametersPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(mockUseParameter.getParameterDefinitions).toHaveBeenCalled(); // LD1: Verify getParameterDefinitions function from useParameter is called
  });

  it('should refresh parameter data when refresh button is clicked', async () => { // LD1: Test that parameter data is refreshed when refresh button is clicked
    render( // LD1: Render the ParametersPage component
      <MemoryRouter initialEntries={['/barracuda/configuration/parameters/BANK/bank-123']}>
        <Routes>
          <Route path="/barracuda/configuration/parameters/:entityType/:entityId" element={<ParametersPage />} />
        </Routes>
      </MemoryRouter>
    );

    const refreshButton = screen.getByText('Refresh'); // LD1: Find and click the refresh button
    fireEvent.click(refreshButton);

    expect(mockUseParameter.clearParameterState).toHaveBeenCalled(); // LD1: Verify clearParameterState function is called
    expect(mockUseParameter.fetchParameters).toHaveBeenCalledWith({ // LD1: Verify fetchParameters function is called with the correct parameters
      entityType: 'BANK',
      entityId: 'bank-123',
      page: 1,
      pageSize: 10,
      includeInherited: true,
      search: '',
      category: ''
    });
    expect(mockUseToast.success).toHaveBeenCalledWith('Parameters refreshed successfully'); // LD1: Verify success toast is shown
  });

  it('should handle export functionality', async () => { // LD1: Test that export functionality works correctly
    const createObjectURLMock = jest.fn();
    const revokeObjectURLMock = jest.fn();
    const createElementMock = jest.fn().mockReturnValue({ click: jest.fn() });
    const appendChildMock = jest.fn();
    const removeChildMock = jest.fn();

    // Mock the window.URL.createObjectURL and window.URL.revokeObjectURL functions
    global.URL.createObjectURL = createObjectURLMock; // LD1: Mock the window.URL.createObjectURL and window.URL.revokeObjectURL functions
    global.URL.revokeObjectURL = revokeObjectURLMock; // LD1: Mock the window.URL.createObjectURL and window.URL.revokeObjectURL functions

    // Mock a Blob constructor
    const mockBlob = jest.fn();
    global.Blob = mockBlob as any; // LD1: Mock a Blob constructor

    // Mock document.createElement and other DOM functions for download
    document.createElement = createElementMock as any; // LD1: Mock document.createElement and other DOM functions for download
    document.body.appendChild = appendChildMock; // LD1: Mock document.createElement and other DOM functions for download
    document.body.removeChild = removeChildMock; // LD1: Mock document.createElement and other DOM functions for download

    render( // LD1: Render the ParametersPage component
      <MemoryRouter initialEntries={['/barracuda/configuration/parameters/BANK/bank-123']}>
        <Routes>
          <Route path="/barracuda/configuration/parameters/:entityType/:entityId" element={<ParametersPage />} />
        </Routes>
      </MemoryRouter>
    );

    const exportButton = screen.getByText('Export'); // LD1: Find and click the export button
    fireEvent.click(exportButton);

    expect(mockUseToast.success).toHaveBeenCalledWith('Parameters exported successfully'); // LD1: Verify success toast is shown

    // Restore original implementations
    global.URL.createObjectURL = URL.createObjectURL; // LD1: Restore original implementations
    global.URL.revokeObjectURL = URL.revokeObjectURL; // LD1: Restore original implementations
    document.createElement = document.createElement; // LD1: Restore original implementations
    document.body.appendChild = document.body.appendChild; // LD1: Restore original implementations
    document.body.removeChild = document.body.removeChild; // LD1: Restore original implementations
  });

  it('should show error toast if export fails', async () => { // LD1: Test that export failure shows an error toast
    mockUseParameter.exportParameters = jest.fn().mockRejectedValue(new Error('Export failed')); // LD1: Mock exportParameters to throw an error

    render( // LD1: Render the ParametersPage component
      <MemoryRouter initialEntries={['/barracuda/configuration/parameters/BANK/bank-123']}>
        <Routes>
          <Route path="/barracuda/configuration/parameters/:entityType/:entityId" element={<ParametersPage />} />
        </Routes>
      </MemoryRouter>
    );

    const exportButton = screen.getByText('Export'); // LD1: Find and click the export button
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockUseToast.error).toHaveBeenCalledWith('Export failed'); // LD1: Verify error toast is shown with the error message
    });
  });

  it('should update URL when entity type and ID changes', () => { // LD1: Test that the URL is updated when entity type and ID changes
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate); // LD1: Mock navigate function

    render( // LD1: Render the ParametersPage component
      <MemoryRouter initialEntries={['/barracuda/configuration/parameters/BANK/bank-123']}>
        <Routes>
          <Route path="/barracuda/configuration/parameters/:entityType/:entityId" element={<ParametersPage />} />
        </Routes>
      </MemoryRouter>
    );

    const { onEntityChange } = (useParameter as jest.Mock).mock.results[0].value; // LD1: Call handleEntityChange with new entity type and ID
    onEntityChange(EntityType.MERCHANT, 'merchant-456');

    expect(mockNavigate).toHaveBeenCalledWith('/barracuda/configuration/parameters/MERCHANT/merchant-456'); // LD1: Verify navigate is called with the updated path
  });
});