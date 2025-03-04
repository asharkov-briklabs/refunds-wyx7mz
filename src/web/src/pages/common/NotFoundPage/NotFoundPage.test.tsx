import React from 'react'; // react ^18.2.0
import { screen } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, jest } from '@jest/globals'; // @jest/globals ^29.5.0
import NotFoundPage from './NotFoundPage';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { COMMON_ROUTES } from '../../../constants/routes.constants';

/**
 * Test suite for the NotFoundPage component
 */
describe('NotFoundPage', () => {
  /**
   * Group related tests under a single describe block
   * Set up any needed mocks and utilities
   */

  /**
   * Tests that the NotFoundPage component renders with correct content
   */
  it('renders the 404 page correctly', async () => {
    /**
     * Render the NotFoundPage component with necessary providers
     */
    renderWithProviders(<NotFoundPage />);

    /**
     * Assert that the 404 text is displayed
     */
    expect(screen.getByText('404')).toBeInTheDocument();

    /**
     * Assert that the error message is displayed
     */
    expect(screen.getByText("We couldn't find the page you're looking for.")).toBeInTheDocument();

    /**
     * Assert that the illustration is present
     */
    const illustration = screen.getByAltText('Page not found illustration');
    expect(illustration).toBeInTheDocument();

    /**
     * Assert that both navigation buttons exist
     */
    expect(screen.getByRole('button', { name: 'Go Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
  });

  /**
   * Tests that clicking the home button triggers navigation to the home route
   */
  it("navigates to home page when 'Go Home' button is clicked", async () => {
    /**
     * Mock the navigation function using jest.fn()
     */
    const navigate = jest.fn();

    /**
     * Setup user event for interaction testing
     */
    const user = setupUserEvent();

    /**
     * Render the NotFoundPage component with the mocked router
     */
    renderWithProviders(<NotFoundPage />, {
      store: {
        reducer: {},
        middleware: [],
        preloadedState: {},
        devTools: false,
        replaceReducer: () => {},
        subscribe: () => () => {},
        dispatch: () => {}
      },
      route: '/not-found',
      wrapper: ({ children }) => {
        return (
          <div>
            {children}
          </div>
        );
      }
    });

    /**
     * Find and click the 'Go Home' button
     */
    const goHomeButton = screen.getByRole('button', { name: 'Go Home' });
    await user.click(goHomeButton);

    /**
     * Assert that navigation was called with the HOME route path
     */
    expect(navigate).toHaveBeenCalledWith(COMMON_ROUTES.HOME);
  });

  /**
   * Tests that clicking the back button calls the browser history back function
   */
  it("navigates back when 'Go Back' button is clicked", async () => {
    /**
     * Mock window.history.back using jest.fn()
     */
    const goBack = jest.fn();
    Object.defineProperty(window, 'history', {
      value: {
        back: goBack,
      },
      writable: true,
    });

    /**
     * Setup user event for interaction testing
     */
    const user = setupUserEvent();

    /**
     * Render the NotFoundPage component with necessary providers
     */
    renderWithProviders(<NotFoundPage />);

    /**
     * Find and click the 'Go Back' button
     */
    const goBackButton = screen.getByRole('button', { name: 'Go Back' });
    await user.click(goBackButton);

    /**
     * Assert that window.history.back was called
     */
    expect(goBack).toHaveBeenCalled();
  });

  /**
   * Tests that the component has appropriate accessibility attributes
   */
  it('applies correct accessible attributes', async () => {
    /**
     * Render the NotFoundPage component with necessary providers
     */
    renderWithProviders(<NotFoundPage />);

    /**
     * Assert that elements have appropriate aria-* attributes
     */
    const alertDiv = screen.getByRole('alert');
    expect(alertDiv).toHaveAttribute('aria-labelledby', 'notFoundTitle');

    /**
     * Assert that heading hierarchy is appropriate
     */
    const heading = screen.getByRole('heading', { name: '404' });
    expect(heading).toHaveAccessibleName('404');

    /**
     * Assert that buttons have accessible names
     */
    const goHomeButton = screen.getByRole('button', { name: 'Go Home' });
    expect(goHomeButton).toHaveAccessibleName('Go Home');

    const goBackButton = screen.getByRole('button', { name: 'Go Back' });
    expect(goBackButton).toHaveAccessibleName('Go Back');
  });
});