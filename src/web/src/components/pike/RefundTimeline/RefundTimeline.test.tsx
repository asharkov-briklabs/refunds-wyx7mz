import React from 'react'; // version: ^18.2.0
import { render, screen } from '@testing-library/react'; // version: ^14.0.0
import { RefundTimeline } from './RefundTimeline';
import { renderWithProviders } from '../../../utils/test.utils';
import { RefundStatus } from '../../../types/refund.types';

// Mock the formatDateTime function to avoid timezone issues in tests
jest.mock('../../../utils/date.utils', () => ({
  formatDateTime: jest.fn((date) => `Formatted: ${date}`)
}));

/**
 * Creates a mock refund object with specified overrides for testing
 */
const createMockRefund = (overrides = {}) => ({
  refundId: 'ref_12345',
  transactionId: 'txn_67890',
  merchantId: 'mer_12345',
  customerId: 'cus_12345',
  amount: 100,
  currency: 'USD',
  refundMethod: 'ORIGINAL_PAYMENT',
  reasonCode: 'CUSTOMER_REQUEST',
  reason: 'Customer requested refund',
  status: RefundStatus.PROCESSING,
  createdAt: '2023-05-15T10:00:00Z',
  updatedAt: '2023-05-15T10:30:00Z',
  statusHistory: [
    { status: RefundStatus.DRAFT, timestamp: '2023-05-15T10:00:00Z', changedBy: 'John Doe' },
    { status: RefundStatus.SUBMITTED, timestamp: '2023-05-15T10:15:00Z', changedBy: 'John Doe' },
    { status: RefundStatus.PENDING_APPROVAL, timestamp: '2023-05-15T10:20:00Z', changedBy: 'System' },
    { status: RefundStatus.PROCESSING, timestamp: '2023-05-15T10:30:00Z', changedBy: 'Jane Smith' }
  ],
  ...overrides
});

describe('RefundTimeline', () => {
  /**
   * Setup function to render the RefundTimeline component with a mock refund
   * @param props - Optional props to override the default mock refund
   * @returns The rendered component for testing
   */
  const setup = (props = {}) => {
    // LD1: Combine default mock refund with any provided prop overrides
    const mockRefund = createMockRefund(props);

    // LD2: Render the RefundTimeline component with the mock data using renderWithProviders
    const renderResult = renderWithProviders(<RefundTimeline refund={mockRefund} />);

    // LD3: Return the render result for further testing
    return renderResult;
  };

  it('renders the component with all status history items', () => {
    // LD1: Render the component with the mock refund data
    const { getByText } = setup();

    // LD2: Check that each status from the history is displayed in the timeline
    expect(getByText('Draft')).toBeInTheDocument();
    expect(getByText('Submitted')).toBeInTheDocument();
    expect(getByText('Pending Approval')).toBeInTheDocument();
    expect(getByText('Processing')).toBeInTheDocument();

    // LD3: Verify status badges are shown for each timeline item
    expect(screen.getAllByRole('img')).toHaveLength(4);

    // LD4: Ensure timestamps are properly formatted for each status change
    expect(getByText('Formatted: 2023-05-15T10:00:00Z')).toBeInTheDocument();
    expect(getByText('Formatted: 2023-05-15T10:15:00Z')).toBeInTheDocument();
    expect(getByText('Formatted: 2023-05-15T10:20:00Z')).toBeInTheDocument();
    expect(getByText('Formatted: 2023-05-15T10:30:00Z')).toBeInTheDocument();
  });

  it('displays the correct progress based on status', () => {
    // LD1: Render the component with a refund in PROCESSING status
    const { rerender } = setup();

    // LD2: Verify the progress bar shows the correct percentage (60%)
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '60');

    // LD3: Re-render with a COMPLETED status refund
    rerender(<RefundTimeline refund={createMockRefund({ status: RefundStatus.COMPLETED })} />);

    // LD4: Verify the progress is now 100%
    const completedProgressBar = screen.getByRole('progressbar');
    expect(completedProgressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('uses the correct variant for each status', () => {
    // LD1: Render multiple instances with different status values
    const completed = renderWithProviders(<RefundTimeline refund={createMockRefund({ status: RefundStatus.COMPLETED })} />);
    const failed = renderWithProviders(<RefundTimeline refund={createMockRefund({ status: RefundStatus.FAILED })} />);
    const processing = renderWithProviders(<RefundTimeline refund={createMockRefund({ status: RefundStatus.PROCESSING })} />);
    const pendingApproval = renderWithProviders(<RefundTimeline refund={createMockRefund({ status: RefundStatus.PENDING_APPROVAL })} />);

    // LD2: Verify COMPLETED status uses 'success' variant
    expect(completed.getByRole('progressbar')).toHaveClass('bg-green-500');

    // LD3: Verify FAILED status uses 'error' variant
    expect(failed.getByRole('progressbar')).toHaveClass('bg-red-500');

    // LD4: Verify PROCESSING status uses 'info' variant
    expect(processing.getByRole('progressbar')).toHaveClass('bg-blue-500');

    // LD5: Verify PENDING_APPROVAL status uses 'warning' variant
    expect(pendingApproval.getByRole('progressbar')).toHaveClass('bg-yellow-500');
  });

  it('renders in compact mode correctly', () => {
    // LD1: Render the component with compact=true prop
    const { container } = setup({ compact: true });

    // LD2: Verify the timeline has compact styling with smaller spacing
    expect(container.firstChild).toHaveClass('refund-timeline');
    expect(container.querySelector('.timeline')).toHaveClass('timeline-compact');

    // LD3: Verify all status items are still visible but with condensed layout
    expect(screen.getByText('Draft')).toBeVisible();
    expect(screen.getByText('Submitted')).toBeVisible();
    expect(screen.getByText('Pending Approval')).toBeVisible();
    expect(screen.getByText('Processing')).toBeVisible();
  });

  it('hides progress bar when showProgress=false', () => {
    // LD1: Render the component with showProgress=false prop
    setup({ showProgress: false });

    // LD2: Verify the progress bar is not present in the rendered output
    const progressBar = screen.queryByRole('progressbar');
    expect(progressBar).not.toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    // LD1: Render the component with a custom className
    const { container } = setup({ className: 'custom-timeline' });

    // LD2: Verify the custom class is applied to the root element
    expect(container.firstChild).toHaveClass('custom-timeline');
  });

  it('chronologically sorts events by timestamp', () => {
    // LD1: Create a mock refund with out-of-order status history
    const mockRefund = createMockRefund({
      statusHistory: [
        { status: RefundStatus.SUBMITTED, timestamp: '2023-05-15T10:15:00Z', changedBy: 'John Doe' },
        { status: RefundStatus.DRAFT, timestamp: '2023-05-15T10:00:00Z', changedBy: 'John Doe' },
        { status: RefundStatus.PROCESSING, timestamp: '2023-05-15T10:30:00Z', changedBy: 'Jane Smith' },
        { status: RefundStatus.PENDING_APPROVAL, timestamp: '2023-05-15T10:20:00Z', changedBy: 'System' }
      ]
    });

    // LD2: Render the component with this data
    setup({ refund: mockRefund });

    // LD3: Verify the events are displayed in chronological order regardless of input order
    const timelineTimes = screen.getAllByClassName('timeline-time');
    expect(timelineTimes[0]).toHaveTextContent('Formatted: 2023-05-15T10:00:00Z');
    expect(timelineTimes[1]).toHaveTextContent('Formatted: 2023-05-15T10:15:00Z');
    expect(timelineTimes[2]).toHaveTextContent('Formatted: 2023-05-15T10:20:00Z');
    expect(timelineTimes[3]).toHaveTextContent('Formatted: 2023-05-15T10:30:00Z');
  });

  it('shows who performed each action in the timeline', () => {
    // LD1: Render the component with the mock refund
    setup();

    // LD2: Verify that each timeline item displays the 'changedBy' user who performed the action
    expect(screen.getByText('By: John Doe')).toBeInTheDocument();
    expect(screen.getByText('By: System')).toBeInTheDocument();
    expect(screen.getByText('By: Jane Smith')).toBeInTheDocument();
  });
});