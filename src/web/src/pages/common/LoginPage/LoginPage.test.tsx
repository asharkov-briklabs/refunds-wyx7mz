import React from 'react'; // react ^18.2.0
import { screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { renderWithProviders, setupUserEvent, waitForComponentToPaint } from '../../../utils/test.utils';
import LoginPage from './LoginPage';
import { ROUTES } from '../../../constants/routes.constants';
import { GENERIC_ERROR_MESSAGES } from '../../../constants/error-messages.constants';
import { createMockUser } from '../../../utils/test.utils';
import { createMockRouter } from '../../../utils/test.utils';
import { BrowserRouter } from 'react-router-dom'; // react-router-dom ^6.11.0
import jest from 'jest'; // jest ^29.5.0

// Mock the useAuth hook to control authentication state during tests
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

describe('LoginPage', () => {
  // TD1: Test suite for the LoginPage component
  // TD2: Verifies authentication functionality, form validation, error handling, and navigation
  // TD3: Covers both Pike and Barracuda interfaces

  // Set up test environment for the LoginPage component
  const setup = () => {
    // LD1: Setup user event for simulating user interactions
    const user = setupUserEvent();

    // LD2: Render the LoginPage component with Redux and Router providers
    const renderResult = renderWithProviders(<LoginPage />);

    // LD3: Return user and renderResult for test cases
    return { user, ...renderResult };
  };

  it('renders login form with email and password fields', () => {
    // TD1: Renders login form with email and password fields
    // TD2: Asserts that email and password fields are visible
    // TD3: Asserts that login button is rendered and enabled

    // Mock useAuth hook to return default values
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isLoading: false,
      error: null,
      isAuthenticated: false,
      login: jest.fn(),
      user: null
    });

    // Render the LoginPage component with providers
    const { getByLabelText, getByRole } = setup();

    // Assert that email and password fields are visible
    expect(getByLabelText('Email')).toBeVisible();
    expect(getByLabelText('Password')).toBeVisible();

    // Assert that login button is rendered and enabled
    const loginButton = getByRole('button', { name: 'Login' });
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toBeEnabled();
  });

  it('validates email format', async () => {
    // TD1: Validates email format
    // TD2: Enters invalid email format
    // TD3: Submits the form
    // TD4: Asserts that email validation error is displayed

    // Mock useAuth hook to return default values
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isLoading: false,
      error: null,
      isAuthenticated: false,
      login: jest.fn(),
      user: null
    });

    // Render the LoginPage component with providers
    const { getByLabelText, getByRole, user } = setup();

    // Enter invalid email format
    await user.type(getByLabelText('Email'), 'invalid-email');

    // Submit the form
    fireEvent.click(getByRole('button', { name: 'Login' }));

    // Assert that email validation error is displayed
    await waitFor(() => {
      expect(screen.getByText(GENERIC_ERROR_MESSAGES.AUTHENTICATION_ERROR)).toBeVisible();
    });
  });

  it('validates required fields', async () => {
    // TD1: Validates required fields
    // TD2: Submits the form without entering data
    // TD3: Asserts that required field error messages are displayed

    // Mock useAuth hook to return default values
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isLoading: false,
      error: null,
      isAuthenticated: false,
      login: jest.fn(),
      user: null
    });

    // Render the LoginPage component with providers
    const { getByRole, getByText, user } = setup();

    // Submit the form without entering data
    fireEvent.click(getByRole('button', { name: 'Login' }));

    // Assert that required field error messages are displayed
    await waitFor(() => {
      expect(getByText(GENERIC_ERROR_MESSAGES.AUTHENTICATION_ERROR)).toBeVisible();
    });
  });

  it('shows loading state during login attempt', () => {
    // TD1: Shows loading state during login attempt
    // TD2: Mocks useAuth hook to return isLoading: true
    // TD3: Renders the LoginPage component with providers
    // TD4: Asserts that login button shows loading state
    // TD5: Asserts that form inputs are disabled during loading

    // Mock useAuth hook to return isLoading: true
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isLoading: true,
      error: null,
      isAuthenticated: false,
      login: jest.fn(),
      user: null
    });

    // Render the LoginPage component with providers
    const { getByRole, getByLabelText } = setup();

    // Assert that login button shows loading state
    const loginButton = getByRole('button', { name: 'Logging in...' });
    expect(loginButton).toBeInTheDocument();

    // Assert that form inputs are disabled during loading
    expect(getByLabelText('Email')).toBeDisabled();
    expect(getByLabelText('Password')).toBeDisabled();
  });

  it('displays error message when login fails', () => {
    // TD1: Displays error message when login fails
    // TD2: Mocks useAuth hook to return error message
    // TD3: Renders the LoginPage component with providers
    // TD4: Asserts that error alert is displayed with correct message

    // Mock useAuth hook to return error message
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isLoading: false,
      error: 'Invalid credentials',
      isAuthenticated: false,
      login: jest.fn(),
      user: null
    });

    // Render the LoginPage component with providers
    const { getByText } = setup();

    // Assert that error alert is displayed with correct message
    expect(getByText('Invalid credentials')).toBeVisible();
  });

  it('submits form with correct credentials', async () => {
    // TD1: Submits form with correct credentials
    // TD2: Creates mock login function
    // TD3: Mocks useAuth hook to return the mock login function
    // TD4: Renders the LoginPage component with providers
    // TD5: Fills in valid email and password
    // TD6: Submits the form
    // TD7: Asserts that login function was called with correct credentials

    // Create mock login function
    const mockLogin = jest.fn();

    // Mock useAuth hook to return the mock login function
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isLoading: false,
      error: null,
      isAuthenticated: false,
      login: mockLogin,
      user: null
    });

    // Render the LoginPage component with providers
    const { getByLabelText, getByRole, user } = setup();

    // Fill in valid email and password
    await user.type(getByLabelText('Email'), 'test@example.com');
    await user.type(getByLabelText('Password'), 'password123');

    // Submit the form
    fireEvent.click(getByRole('button', { name: 'Login' }));

    // Assert that login function was called with correct credentials
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        redirectUri: window.location.origin + '/callback'
      });
    });
  });

  it('redirects to Pike dashboard when merchant user is authenticated', async () => {
    // TD1: Redirects to Pike dashboard when merchant user is authenticated
    // TD2: Mocks useAuth hook to return isAuthenticated: true and user with merchant role
    // TD3: Sets up mock navigation via React Router
    // TD4: Renders the LoginPage component with providers
    // TD5: Asserts that navigation was called with Pike dashboard route

    // Mock useAuth hook to return isAuthenticated: true and user with merchant role
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isLoading: false,
      error: null,
      isAuthenticated: true,
      login: jest.fn(),
      user: createMockUser({ roles: ['MERCHANT_ADMIN'] })
    });

    // Setup mock navigation via React Router
    const navigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => navigate,
    }));

    // Render the LoginPage component with providers
    const { rerender } = renderWithProviders(<LoginPage />);
    await waitForComponentToPaint({ rerender });

    // Assert that navigation was called with Pike dashboard route
    expect(navigate).toHaveBeenCalledWith(ROUTES.PIKE.DASHBOARD);
  });

  it('redirects to Barracuda dashboard when admin user is authenticated', async () => {
    // TD1: Redirects to Barracuda dashboard when admin user is authenticated
    // TD2: Mocks useAuth hook to return isAuthenticated: true and user with admin role
    // TD3: Sets up mock navigation via React Router
    // TD4: Renders the LoginPage component with providers
    // TD5: Asserts that navigation was called with Barracuda dashboard route

    // Mock useAuth hook to return isAuthenticated: true and user with admin role
    (require('../../../hooks/useAuth') as any).useAuth.mockReturnValue({
      isLoading: false,
      error: null,
      isAuthenticated: true,
      login: jest.fn(),
      user: createMockUser({ roles: ['BARRACUDA_ADMIN'] })
    });

    // Setup mock navigation via React Router
    const navigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => navigate,
    }));

    // Render the LoginPage component with providers
    const { rerender } = renderWithProviders(<LoginPage />);
    await waitForComponentToPaint({ rerender });

    // Assert that navigation was called with Barracuda dashboard route
    expect(navigate).toHaveBeenCalledWith(ROUTES.BARRACUDA.DASHBOARD);
  });
});