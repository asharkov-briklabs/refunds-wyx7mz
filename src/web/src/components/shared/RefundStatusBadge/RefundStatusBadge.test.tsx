import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, describe, it } from '@jest/globals';
import RefundStatusBadge from '../RefundStatusBadge';
import { RefundStatus } from '../../../types/refund.types';
import { getRefundStatusLabel, getRefundStatusColor } from '../../../constants/refund-status.constants';

describe('RefundStatusBadge', () => {
  it('renders with the correct label for each status', () => {
    // Test each RefundStatus value
    Object.values(RefundStatus).forEach(status => {
      const { unmount } = render(<RefundStatusBadge status={status} />);
      expect(screen.getByText(getRefundStatusLabel(status))).toBeInTheDocument();
      unmount(); // Clean up after each render
    });
  });

  it('applies the correct variant based on status', () => {
    // Define expected variant for each status based on REFUND_STATUS_COLORS
    const statusVariantMap = {
      [RefundStatus.COMPLETED]: 'success',
      [RefundStatus.FAILED]: 'error',
      [RefundStatus.REJECTED]: 'error',
      [RefundStatus.VALIDATION_FAILED]: 'error',
      [RefundStatus.PENDING_APPROVAL]: 'warning',
      [RefundStatus.GATEWAY_ERROR]: 'warning',
      [RefundStatus.PROCESSING]: 'info',
      [RefundStatus.SUBMITTED]: 'info',
      [RefundStatus.GATEWAY_PENDING]: 'info',
      [RefundStatus.DRAFT]: 'default',
      [RefundStatus.CANCELED]: 'default',
    };

    // Test each status and verify the applied variant classes
    Object.entries(statusVariantMap).forEach(([status, expectedVariant]) => {
      const { container, unmount } = render(<RefundStatusBadge status={status as RefundStatus} />);
      
      // Check for the appropriate variant classes
      switch (expectedVariant) {
        case 'success':
          expect(container.firstChild).toHaveClass('bg-semantic-success-100');
          expect(container.firstChild).toHaveClass('text-semantic-success-700');
          break;
        case 'error':
          expect(container.firstChild).toHaveClass('bg-semantic-error-100');
          expect(container.firstChild).toHaveClass('text-semantic-error-700');
          break;
        case 'warning':
          expect(container.firstChild).toHaveClass('bg-semantic-warning-100');
          expect(container.firstChild).toHaveClass('text-semantic-warning-700');
          break;
        case 'info':
          expect(container.firstChild).toHaveClass('bg-semantic-info-100');
          expect(container.firstChild).toHaveClass('text-semantic-info-700');
          break;
        default:
          expect(container.firstChild).toHaveClass('bg-gray-100');
          expect(container.firstChild).toHaveClass('text-gray-700');
          break;
      }
      
      unmount(); // Clean up after each render
    });
  });

  it('allows size customization', () => {
    // Test small size
    const { container: smallContainer, unmount: unmountSmall } = render(
      <RefundStatusBadge status={RefundStatus.COMPLETED} size="sm" />
    );
    expect(smallContainer.firstChild).toHaveClass('text-xs');
    unmountSmall();

    // Test medium size (default)
    const { container: mediumContainer, unmount: unmountMedium } = render(
      <RefundStatusBadge status={RefundStatus.COMPLETED} size="md" />
    );
    expect(mediumContainer.firstChild).toHaveClass('text-sm');
    unmountMedium();

    // Test large size
    const { container: largeContainer } = render(
      <RefundStatusBadge status={RefundStatus.COMPLETED} size="lg" />
    );
    expect(largeContainer.firstChild).toHaveClass('text-base');
  });

  it('accepts and applies additional className prop', () => {
    const { container } = render(
      <RefundStatusBadge status={RefundStatus.COMPLETED} className="test-class" />
    );
    expect(container.firstChild).toHaveClass('test-class');
  });

  it('supports rounded styling', () => {
    // Test with rounded=true (default)
    const { container: roundedContainer, unmount: unmountRounded } = render(
      <RefundStatusBadge status={RefundStatus.COMPLETED} />
    );
    expect(roundedContainer.firstChild).toHaveClass('rounded-full');
    unmountRounded();

    // Test with rounded=false
    const { container: nonRoundedContainer } = render(
      <RefundStatusBadge status={RefundStatus.COMPLETED} rounded={false} />
    );
    expect(nonRoundedContainer.firstChild).not.toHaveClass('rounded-full');
  });

  it('supports outlined styling', () => {
    // Test with outlined=true
    const { container: outlinedContainer, unmount: unmountOutlined } = render(
      <RefundStatusBadge status={RefundStatus.COMPLETED} outlined={true} />
    );
    expect(outlinedContainer.firstChild).toHaveClass('bg-transparent');
    expect(outlinedContainer.firstChild).toHaveClass('border');
    expect(outlinedContainer.firstChild).toHaveClass('border-semantic-success-500');
    unmountOutlined();

    // Test with outlined=false (default)
    const { container: filledContainer } = render(
      <RefundStatusBadge status={RefundStatus.COMPLETED} />
    );
    expect(filledContainer.firstChild).toHaveClass('bg-semantic-success-100');
    expect(filledContainer.firstChild).not.toHaveClass('border');
  });

  it('hides the label when showLabel is false', () => {
    const { container } = render(
      <RefundStatusBadge status={RefundStatus.COMPLETED} showLabel={false} />
    );
    expect(container.textContent).toBe('');
  });

  it('handles undefined status gracefully', () => {
    // @ts-ignore - Testing invalid prop usage
    const { container } = render(<RefundStatusBadge status={undefined} />);
    // Should render with the default "Unknown Status" text
    expect(container.textContent).toBe('Unknown Status');
    // Should apply default styling (gray)
    expect(container.firstChild).toHaveClass('bg-gray-100');
    expect(container.firstChild).toHaveClass('text-gray-700');
  });
});