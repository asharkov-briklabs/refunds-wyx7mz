import React from 'react'; // react ^18.2.0
import { screen } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import { PageHeader } from './index';
import { renderWithProviders } from '../../../utils/test.utils';
import { Breadcrumbs } from '../../common/Breadcrumbs';

describe('PageHeader', () => {
  // Test suite for the PageHeader component

  test('renders with required props', () => {
    // Verifies that the PageHeader renders correctly with only the required title prop
    // Render the PageHeader component with a title prop
    renderWithProviders(<PageHeader title="Test Title" />);

    // Query for the title element
    const titleElement = screen.getByText('Test Title');

    // Assert that the title text is displayed correctly
    expect(titleElement).toBeInTheDocument();
  });

  test('renders with subtitle', () => {
    // Verifies that the PageHeader renders a subtitle when provided
    // Render the PageHeader component with title and subtitle props
    renderWithProviders(<PageHeader title="Test Title" subtitle="Test Subtitle" />);

    // Query for the subtitle element
    const subtitleElement = screen.getByText('Test Subtitle');

    // Assert that the subtitle text is displayed correctly
    expect(subtitleElement).toBeInTheDocument();
  });

  test('renders breadcrumbs when provided', () => {
    // Verifies that breadcrumbs are displayed when a valid breadcrumbs prop is provided
    // Define test breadcrumb items
    const breadcrumbItems = [
      { label: 'Home', path: '/' },
      { label: 'Test', path: '/test' },
      { label: 'Current', path: '/current' },
    ];

    // Render the PageHeader with title and breadcrumbs props
    renderWithProviders(<PageHeader title="Test Title" breadcrumbs={breadcrumbItems} />);

    // Query for the breadcrumbs component
    const breadcrumbsElement = screen.getByRole('navigation', { name: 'Breadcrumb' });

    // Assert that breadcrumb items are displayed correctly
    expect(breadcrumbsElement).toBeInTheDocument();
  });

  test('does not render breadcrumbs when empty array provided', () => {
    // Verifies that breadcrumbs section is not rendered when an empty array is provided
    // Render the PageHeader with title and empty breadcrumbs array
    renderWithProviders(<PageHeader title="Test Title" breadcrumbs={[]} />);

    // Verify that the breadcrumbs component is not in the document
    const breadcrumbsElement = screen.queryByRole('navigation', { name: 'Breadcrumb' });
    expect(breadcrumbsElement).not.toBeInTheDocument();
  });

  test('renders action buttons', () => {
    // Verifies that action buttons are rendered when provided as props
    // Create a test button element as an action
    const actionButton = <button>Test Action</button>;

    // Render the PageHeader with title and actions prop
    renderWithProviders(<PageHeader title="Test Title" actions={actionButton} />);

    // Query for the action button
    const buttonElement = screen.getByText('Test Action');

    // Assert that the action button is rendered correctly
    expect(buttonElement).toBeInTheDocument();
  });

  test('applies custom className', () => {
    // Verifies that a custom className is properly applied to the component
    // Define a custom className
    const customClassName = 'custom-header';

    // Render the PageHeader with title and className props
    renderWithProviders(<PageHeader title="Test Title" className={customClassName} />);

    // Query for the main container element
    const headerElement = screen.getByRole('heading', { level: 1 }).closest('div');

    // Assert that the element has the custom className
    expect(headerElement).toHaveClass(customClassName);
  });

  test('renders with all props', () => {
    // Verifies that the PageHeader renders correctly with all possible props
    // Define test breadcrumb items
    const breadcrumbItems = [
      { label: 'Home', path: '/' },
      { label: 'Test', path: '/test' },
      { label: 'Current', path: '/current' },
    ];

    // Create a test button element as an action
    const actionButton = <button>Test Action</button>;

    // Define a custom className
    const customClassName = 'custom-header';

    // Render the PageHeader with all props
    renderWithProviders(
      <PageHeader
        title="Test Title"
        subtitle="Test Subtitle"
        breadcrumbs={breadcrumbItems}
        actions={actionButton}
        className={customClassName}
      />
    );

    // Assert that title, subtitle, breadcrumbs, and actions are all rendered correctly
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Test Action')).toBeInTheDocument();

    // Verify that the custom className is applied
    const headerElement = screen.getByRole('heading', { level: 1 }).closest('div');
    expect(headerElement).toHaveClass(customClassName);
  });
});