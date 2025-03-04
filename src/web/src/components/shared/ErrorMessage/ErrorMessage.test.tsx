import React from 'react'; // react ^18.2.0
import { render, screen } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect } from 'vitest'; // vitest ^0.32.0
import ErrorMessage, { ErrorMessageProps } from './ErrorMessage';
import { renderWithProviders } from '../../../utils/test.utils';

describe('ErrorMessage Component', () => {
  it('renders error message correctly', () => {
    renderWithProviders(<ErrorMessage severity="error" message="This is an error message" />);
    expect(screen.getByText('This is an error message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('bg-red-50');
    expect(screen.getByRole('alert')).toHaveAttribute('role', 'alert');
  });

  it('renders warning message correctly', () => {
    renderWithProviders(<ErrorMessage severity="warning" message="This is a warning message" />);
    expect(screen.getByText('This is a warning message')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('bg-amber-50');
    expect(screen.getByRole('status')).toHaveAttribute('role', 'status');
  });

  it('renders info message correctly', () => {
    renderWithProviders(<ErrorMessage severity="info" message="This is an info message" />);
    expect(screen.getByText('This is an info message')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('bg-blue-50');
    expect(screen.getByRole('status')).toHaveAttribute('role', 'status');
  });

  it('renders with icon when showIcon is true', () => {
    renderWithProviders(<ErrorMessage severity="error" message="This is an error message" showIcon={true} />);
    const icon = screen.getByTitle('Error');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-red-500');
  });

  it('does not render icon when showIcon is false', () => {
    renderWithProviders(<ErrorMessage severity="error" message="This is an error message" showIcon={false} />);
    const icon = screen.queryByTitle('Error');
    expect(icon).not.toBeInTheDocument();
  });

  it('renders children content when provided instead of message', () => {
    renderWithProviders(
      <ErrorMessage severity="error">
        <span>This is children content</span>
      </ErrorMessage>
    );
    expect(screen.getByText('This is children content')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    renderWithProviders(<ErrorMessage severity="error" message="This is an error message" className="custom-class" />);
    expect(screen.getByRole('alert')).toHaveClass('custom-class');
  });

  it('uses testId when provided', () => {
    renderWithProviders(<ErrorMessage severity="error" message="This is an error message" testId="custom-test-id" />);
    expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
  });

  it('renders nothing when no message or children are provided', () => {
    const { container } = renderWithProviders(<ErrorMessage severity="error" />);
    expect(container.firstChild).toBeNull();
  });
});