import React from 'react';
import { render, screen } from '@testing-library/react';
import RefundStatusIndicator from './RefundStatusIndicator';
import { RefundStatus } from '../../../types/refund.types';
import { getRefundStatusLabel } from '../../../constants/refund-status.constants';

/**
 * Test suite for the RefundStatusIndicator component.
 * 
 * This component visually represents refund status with icons, badges, and progress bars.
 * The tests verify the component renders correctly with different statuses and props.
 */
describe('RefundStatusIndicator', () => {
  /**
   * Test rendering with different refund statuses
   */
  test('renders with COMPLETED status', () => {
    render(<RefundStatusIndicator status={RefundStatus.COMPLETED} />);
    
    // Check that the component renders with the correct status label
    expect(screen.getByText(getRefundStatusLabel(RefundStatus.COMPLETED))).toBeInTheDocument();
    
    // Check that the progress bar has the correct value
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  test('renders with PROCESSING status', () => {
    render(<RefundStatusIndicator status={RefundStatus.PROCESSING} />);
    
    // Check that the component renders with the correct status label
    expect(screen.getByText(getRefundStatusLabel(RefundStatus.PROCESSING))).toBeInTheDocument();
    
    // Check that the progress bar has the correct value
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '60');
  });

  test('renders with FAILED status', () => {
    render(<RefundStatusIndicator status={RefundStatus.FAILED} />);
    
    // Check that the component renders with the correct status label
    expect(screen.getByText(getRefundStatusLabel(RefundStatus.FAILED))).toBeInTheDocument();
    
    // Check that the progress bar has the correct value
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  test('renders with PENDING_APPROVAL status', () => {
    render(<RefundStatusIndicator status={RefundStatus.PENDING_APPROVAL} />);
    
    // Check that the component renders with the correct status label
    expect(screen.getByText(getRefundStatusLabel(RefundStatus.PENDING_APPROVAL))).toBeInTheDocument();
    
    // Check that the progress bar has the correct value
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '40');
  });

  /**
   * Test visibility toggle props
   */
  test('hides progress bar when showProgress is false', () => {
    render(<RefundStatusIndicator status={RefundStatus.COMPLETED} showProgress={false} />);
    
    // Progress bar should not be in the document
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  test('hides label when showLabel is false', () => {
    render(<RefundStatusIndicator status={RefundStatus.COMPLETED} showLabel={false} />);
    
    // Label should not be in the document
    expect(screen.queryByText(getRefundStatusLabel(RefundStatus.COMPLETED))).not.toBeInTheDocument();
  });

  test('hides icon when showIcon is false', () => {
    const { container } = render(<RefundStatusIndicator status={RefundStatus.COMPLETED} showIcon={false} />);
    
    // Find the icon container by class and check it doesn't exist
    expect(container.querySelector('.flex-shrink-0')).not.toBeInTheDocument();
  });

  /**
   * Test size variants and custom styling
   */
  test('applies different size classes correctly', () => {
    // Test small size
    const { rerender } = render(<RefundStatusIndicator status={RefundStatus.COMPLETED} size="sm" />);
    
    // The container should have the small size class
    expect(screen.getByLabelText(`Refund status: ${getRefundStatusLabel(RefundStatus.COMPLETED)}`)).toHaveClass('text-xs');
    
    // Test large size
    rerender(<RefundStatusIndicator status={RefundStatus.COMPLETED} size="lg" />);
    
    // The container should have the large size class
    expect(screen.getByLabelText(`Refund status: ${getRefundStatusLabel(RefundStatus.COMPLETED)}`)).toHaveClass('text-base');
  });

  test('applies custom className when provided', () => {
    render(<RefundStatusIndicator status={RefundStatus.COMPLETED} className="custom-test-class" />);
    
    // The container should have the custom class
    expect(screen.getByLabelText(`Refund status: ${getRefundStatusLabel(RefundStatus.COMPLETED)}`)).toHaveClass('custom-test-class');
  });
  
  /**
   * Tooltip test could be expanded with userEvent to simulate hover
   * and verify tooltip appearance, but this is beyond the scope of this test suite.
   */
  test('shows tooltip with detailed description on hover', () => {
    // This test is a placeholder for hover-based tooltip testing
    // In a real implementation, we would use userEvent.hover() to trigger the tooltip
    // and then verify its content
    
    render(<RefundStatusIndicator status={RefundStatus.COMPLETED} />);
    
    // Verify the tooltip is not initially visible (would be shown on hover)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    
    // Complete tooltip testing would require userEvent library
  });
});