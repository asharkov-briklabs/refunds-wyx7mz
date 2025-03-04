import React from 'react'; // ^18.2.0
import { render, screen } from '@testing-library/react'; // ^14.0.0
import { axe, toHaveNoViolations } from 'jest-axe'; // ^7.0.0
import ProgressBar, { ProgressBarProps } from './ProgressBar';
import { renderWithProviders } from '../../../utils/test.utils';

// Add custom jest matchers for accessibility testing
expect.extend(toHaveNoViolations);

describe('ProgressBar', () => {
  // Group all ProgressBar component tests

  it('renders with default props', () => {
    // Tests that the component renders correctly with default props
    // Render ProgressBar with only required progress prop
    renderWithProviders(<ProgressBar progress={50} />);

    // Verify progress bar element is in the document
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();

    // Check that default height and variant styles are applied
    expect(progressBar).toHaveStyle('height: 8px');
  });

  it('renders with custom height', () => {
    // Tests that the component respects custom height prop
    // Render ProgressBar with custom height value
    renderWithProviders(<ProgressBar progress={50} height={20} />);

    // Verify the progress bar has the correct height style
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle('height: 20px');
  });

  it('renders with label', () => {
    // Tests that the component displays the label correctly
    // Render ProgressBar with a label prop
    renderWithProviders(<ProgressBar progress={50} label="Loading..." />);

    // Verify the label text is displayed
    const labelElement = screen.getByText('Loading...');
    expect(labelElement).toBeInTheDocument();

    // Check label positioning and styling
    expect(labelElement).toHaveClass('mr-2');
    expect(labelElement).toHaveClass('text-sm');
    expect(labelElement).toHaveClass('font-medium');
  });

  it('renders percentage when showPercentage is true', () => {
    // Tests that the component displays percentage value when enabled
    // Render ProgressBar with showPercentage set to true
    renderWithProviders(<ProgressBar progress={75} showPercentage />);

    // Verify the percentage text is visible
    const percentageElement = screen.getByText('75%');
    expect(percentageElement).toBeVisible();

    // Check that percentage matches the progress value
    expect(percentageElement).toHaveClass('ml-2');
    expect(percentageElement).toHaveClass('text-sm');
    expect(percentageElement).toHaveClass('font-medium');
  });

  it('renders different variants correctly', () => {
    // Tests that the component applies different variant styles
    // Render ProgressBar with 'success' variant
    renderWithProviders(<ProgressBar progress={50} variant="success" />);

    // Verify success variant styling (green) is applied
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-green-500');

    // Re-render with 'warning' variant
    render(<ProgressBar progress={50} variant="warning" />);

    // Verify warning variant styling (yellow) is applied
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-yellow-500');

    // Re-render with 'error' variant
    render(<ProgressBar progress={50} variant="error" />);

    // Verify error variant styling (red) is applied
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-red-500');

    // Re-render with 'info' variant
    render(<ProgressBar progress={50} variant="info" />);

    // Verify info variant styling (blue) is applied
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-blue-500');
  });

  it('applies animation class when animated prop is true', () => {
    // Tests that animation classes are applied when animated prop is enabled
    // Render ProgressBar with animated set to true
    renderWithProviders(<ProgressBar progress={50} animated />);

    // Verify animation classes are applied to the progress bar element
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('animate-pulse');
  });

  it('caps progress at 100', () => {
    // Tests that progress values greater than 100 are capped at 100
    // Render ProgressBar with progress value over 100
    renderWithProviders(<ProgressBar progress={150} />);

    // Verify the width style is set to 100%
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle('width: 100%');

    // Check aria-valuenow attribute is set to 100
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('floors progress at 0', () => {
    // Tests that progress values less than 0 are floored at 0
    // Render ProgressBar with negative progress value
    renderWithProviders(<ProgressBar progress={-50} />);

    // Verify the width style is set to 0%
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle('width: 0%');

    // Check aria-valuenow attribute is set to 0
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('has proper ARIA attributes', () => {
    // Tests that proper accessibility attributes are present
    // Render ProgressBar with progress value
    renderWithProviders(<ProgressBar progress={60} />);

    const progressBar = screen.getByRole('progressbar');

    // Verify role='progressbar' attribute is present
    expect(progressBar).toHaveAttribute('role', 'progressbar');

    // Check aria-valuenow equals progress value
    expect(progressBar).toHaveAttribute('aria-valuenow', '60');

    // Verify aria-valuemin='0' attribute is present
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');

    // Verify aria-valuemax='100' attribute is present
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('passes accessibility tests', async () => {
    // Tests that the component meets accessibility standards
    // Render ProgressBar component
    const { container } = renderWithProviders(<ProgressBar progress={50} />);

    // Run axe accessibility tests on the rendered component
    const results = await axe(container);

    // Assert that no accessibility violations are found
    expect(results).toHaveNoViolations();
  });
});