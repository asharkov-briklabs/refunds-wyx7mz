import React from 'react'; // ^18.2.0
import { render, screen } from '../../../utils/test.utils'; // Importing render and screen from test.utils
import Spinner from './Spinner'; // Importing the Spinner component
import '@testing-library/jest-dom'; // ^5.16.5

describe('Spinner component', () => {
  // Test suite for the Spinner component
  // Group all spinner component tests together

  it('renders without crashing', () => {
    // Verifies the Spinner component renders without errors

    // Render the Spinner component
    render(<Spinner />);

    // Verify it appears in the document using getByTestId
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('applies size prop correctly', () => {
    // Verifies the Spinner component correctly applies size prop

    // Render the Spinner component with small size
    render(<Spinner size="sm" />);

    // Verify small class is applied
    expect(screen.getByTestId('spinner')).toHaveClass('h-4');
    expect(screen.getByTestId('spinner')).toHaveClass('w-4');

    // Render the Spinner component with medium size
    render(<Spinner size="md" />);

    // Verify medium class is applied
    expect(screen.getByTestId('spinner')).toHaveClass('h-6');
    expect(screen.getByTestId('spinner')).toHaveClass('w-6');

    // Render the Spinner component with large size
    render(<Spinner size="lg" />);

    // Verify large class is applied
    expect(screen.getByTestId('spinner')).toHaveClass('h-8');
    expect(screen.getByTestId('spinner')).toHaveClass('w-8');
  });

  it('applies variant prop correctly', () => {
    // Verifies the Spinner component correctly applies variant prop

    // Render the Spinner component with primary variant
    render(<Spinner color="primary" />);

    // Verify primary variant class is applied
    expect(screen.getByTestId('spinner')).toHaveClass('text-blue-600');

    // Render the Spinner component with secondary variant
    render(<Spinner color="secondary" />);

    // Verify secondary variant class is applied
    expect(screen.getByTestId('spinner')).toHaveClass('text-purple-600');
  });

  it('applies the className prop correctly', () => {
    // Verifies the Spinner component correctly applies custom className

    // Render the Spinner component with custom class name
    render(<Spinner className="custom-class" />);

    // Verify custom class is applied in addition to default classes
    expect(screen.getByTestId('spinner')).toHaveClass('custom-class');
  });

  it('has correct accessibility attributes', () => {
    // Verifies the Spinner component has proper accessibility attributes

    // Render the Spinner component
    render(<Spinner />);

    // Verify it has role='status'
    expect(screen.getByTestId('spinner')).toHaveAttribute('role', 'status');

    // Verify it has aria-label attribute for accessibility
    expect(screen.getByTestId('spinner')).toHaveAttribute('aria-label', 'Loading...');
  });
});