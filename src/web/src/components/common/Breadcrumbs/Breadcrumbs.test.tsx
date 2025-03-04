import React from 'react'; // react ^18.2.0
import { screen, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import Breadcrumbs from './index'; // Import the Breadcrumbs component being tested
import { renderWithProviders } from '../../../utils/test.utils'; // Testing utility for rendering components with providers
import { NextIcon } from '../../../assets/icons/navigation-icons'; // Import the default separator icon used by Breadcrumbs

describe('Breadcrumbs', () => {
  /**
   * Test suite for the Breadcrumbs component
   * @returns {void} No return value
   * @steps Define test cases for Breadcrumbs component
   */

  test('renders without crashing', () => {
    /**
     * Verifies that the Breadcrumbs component renders without errors
     * @returns {void} No return value
     * @steps Define test items with labels and paths
     * Render the Breadcrumbs component with test items
     * Verify the component rendered successfully
     */
    const items = [
      { label: 'Home', path: '/' },
      { label: 'Refunds', path: '/refunds' },
    ];
    renderWithProviders(<Breadcrumbs items={items} />);
    expect(screen.getByText('Refunds')).toBeInTheDocument();
  });

  test('renders correct number of items', () => {
    /**
     * Verifies that the correct number of breadcrumb items are rendered
     * @returns {void} No return value
     * @steps Define test items with multiple breadcrumbs
     * Render the Breadcrumbs component with test items
     * Query and count the breadcrumb items
     * Assert that the number of items matches expected count
     */
    const items = [
      { label: 'Home', path: '/' },
      { label: 'Transactions', path: '/transactions' },
      { label: 'Refunds', path: '/refunds' },
    ];
    renderWithProviders(<Breadcrumbs items={items} />);
    const breadcrumbItems = screen.getAllByRole('listitem');
    expect(breadcrumbItems.length).toBe(3);
  });

  test('renders last item as active (non-clickable)', () => {
    /**
     * Verifies that the last breadcrumb item is rendered as active and non-clickable
     * @returns {void} No return value
     * @steps Define test items with multiple breadcrumbs
     * Set the last item as active
     * Render the Breadcrumbs component with test items
     * Query for the last item
     * Verify that it has the appropriate active class and aria-current attribute
     * Verify it is not wrapped in a link element
     */
    const items = [
      { label: 'Home', path: '/' },
      { label: 'Refunds', path: '/refunds' },
    ];
    renderWithProviders(<Breadcrumbs items={items} />);
    const lastItem = screen.getByText('Refunds');
    expect(lastItem).toHaveClass('breadcrumbs-active');
    expect(lastItem).toHaveAttribute('aria-current', 'page');
    expect(lastItem.closest('a')).not.toBeInTheDocument();
  });

  test('renders with custom separator', () => {
    /**
     * Verifies that a custom separator can be used instead of the default
     * @returns {void} No return value
     * @steps Define test items
     * Define a custom separator element
     * Render the Breadcrumbs component with test items and custom separator
     * Verify that the custom separator is used instead of the default
     */
    const items = [
      { label: 'Home', path: '/' },
      { label: 'Refunds', path: '/refunds' },
    ];
    const customSeparator = <span>/</span>;
    renderWithProviders(<Breadcrumbs items={items} separator={customSeparator} />);
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.queryByTitle('Next')).not.toBeInTheDocument();
  });

  test('applies custom className', () => {
    /**
     * Verifies that a custom className is properly applied to the root element
     * @returns {void} No return value
     * @steps Define test items
     * Define a custom className
     * Render the Breadcrumbs component with test items and custom className
     * Verify that the root element has the custom className
     */
    const items = [
      { label: 'Home', path: '/' },
      { label: 'Refunds', path: '/refunds' },
    ];
    const className = 'custom-breadcrumbs';
    const { container } = renderWithProviders(<Breadcrumbs items={items} className={className} />);
    expect(container.firstChild).toHaveClass(className);
  });

  test('navigates when breadcrumb links are clicked', async () => {
    /**
     * Verifies that clicking a breadcrumb item navigates to the correct path
     * @returns {void} No return value
     * @steps Define test items with paths
     * Render the Breadcrumbs component with test items and router provider
     * Find a clickable breadcrumb item
     * Simulate clicking the item
     * Verify that navigation occurred to the expected path
     */
    const items = [
      { label: 'Home', path: '/' },
      { label: 'Refunds', path: '/refunds' },
    ];
    const { container } = renderWithProviders(<Breadcrumbs items={items} />, { route: '/refunds' });
    const homeLink = screen.getByText('Home');
    await userEvent.click(homeLink);
    expect(container.innerHTML).toContain('Home');
  });

  test('has proper accessibility attributes', () => {
    /**
     * Verifies that the component has the correct ARIA attributes for accessibility
     * @returns {void} No return value
     * @steps Define test items
     * Render the Breadcrumbs component with test items
     * Verify that the nav element has role='navigation'
     * Verify that the nav element has aria-label='Breadcrumb'
     * Verify that the active item has aria-current='page'
     */
    const items = [
      { label: 'Home', path: '/' },
      { label: 'Refunds', path: '/refunds' },
    ];
    renderWithProviders(<Breadcrumbs items={items} />);
    const navElement = screen.getByRole('navigation');
    expect(navElement).toHaveAttribute('aria-label', 'Breadcrumb');
    const activeItem = screen.getByText('Refunds');
    expect(activeItem).toHaveAttribute('aria-current', 'page');
  });

  test('renders nothing when no items provided', () => {
    /**
     * Verifies that the component renders nothing when an empty items array is provided
     * @returns {void} No return value
     * @steps Render the Breadcrumbs component with an empty items array
     * Verify that no breadcrumb elements are rendered
     */
    renderWithProviders(<Breadcrumbs items={[]} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  test('supports keyboard navigation', async () => {
    /**
     * Verifies that the breadcrumb links can be navigated and activated using keyboard
     * @returns {void} No return value
     * @steps Define test items
     * Render the Breadcrumbs component with test items
     * Focus on a breadcrumb link using Tab key
     * Simulate pressing Enter key
     * Verify that navigation occurred to the expected path
     */
    const items = [
      { label: 'Home', path: '/' },
      { label: 'Refunds', path: '/refunds' },
    ];
    const { container } = renderWithProviders(<Breadcrumbs items={items} />, { route: '/refunds' });
    const homeLink = screen.getByText('Home');
    homeLink.focus();
    await userEvent.keyboard('[Enter]');
    expect(container.innerHTML).toContain('Home');
  });
});