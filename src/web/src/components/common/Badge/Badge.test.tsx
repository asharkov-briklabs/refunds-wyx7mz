import React from 'react'; // version: ^18.2.0
import { screen, render } from '@testing-library/react'; // version: ^14.0.0
import Badge from './Badge';
import { renderWithProviders } from '../../../utils/test.utils';

describe('Badge component', () => {
  /**
   * Test suite for the Badge component
   */
  it('renders with default props', () => {
    /**
     * Test that the Badge component renders correctly with default props
     */
    // Render the Badge component with only children content
    renderWithProviders(<Badge>Default Badge</Badge>);

    // Verify that it renders with the correct default styling (medium size, default variant)
    const badgeElement = screen.getByText('Default Badge');
    expect(badgeElement).toBeInTheDocument();
    expect(badgeElement).toHaveClass('inline-flex');
    expect(badgeElement).toHaveClass('items-center');
    expect(badgeElement).toHaveClass('font-medium');
    expect(badgeElement).toHaveClass('text-sm');
    expect(badgeElement).toHaveClass('px-2.5');
    expect(badgeElement).toHaveClass('py-0.5');
    expect(badgeElement).toHaveClass('bg-gray-100');
    expect(badgeElement).toHaveClass('text-gray-700');

    // Check that the content is displayed correctly
    expect(badgeElement).toHaveTextContent('Default Badge');
  });

  it('renders different variants correctly', () => {
    /**
     * Test that different Badge variants render with appropriate styling
     */
    const variants = ['success', 'warning', 'error', 'info', 'default'];

    variants.forEach((variant) => {
      // Render Badge components with various variants (success, warning, error, info, default)
      renderWithProviders(<Badge variant={variant as any}>{variant} Badge</Badge>);

      // Verify that each variant has the appropriate styling classes applied
      const badgeElement = screen.getByText(`${variant} Badge`);
      expect(badgeElement).toBeInTheDocument();

      if (variant === 'success') {
        expect(badgeElement).toHaveClass('bg-semantic-success-100');
        expect(badgeElement).toHaveClass('text-semantic-success-700');
      } else if (variant === 'warning') {
        expect(badgeElement).toHaveClass('bg-semantic-warning-100');
        expect(badgeElement).toHaveClass('text-semantic-warning-700');
      } else if (variant === 'error') {
        expect(badgeElement).toHaveClass('bg-semantic-error-100');
        expect(badgeElement).toHaveClass('text-semantic-error-700');
      } else if (variant === 'info') {
        expect(badgeElement).toHaveClass('bg-semantic-info-100');
        expect(badgeElement).toHaveClass('text-semantic-info-700');
      } else {
        expect(badgeElement).toHaveClass('bg-gray-100');
        expect(badgeElement).toHaveClass('text-gray-700');
      }

      // Check that each variant displays its content correctly
      expect(badgeElement).toHaveTextContent(`${variant} Badge`);
    });
  });

  it('renders different sizes correctly', () => {
    /**
     * Test that different Badge sizes render correctly
     */
    const sizes = ['sm', 'md', 'lg'];

    sizes.forEach((size) => {
      // Render Badge components with different sizes (sm, md, lg)
      renderWithProviders(<Badge size={size as any}>{size} Badge</Badge>);

      // Verify that each size has the appropriate styling classes applied
      const badgeElement = screen.getByText(`${size} Badge`);
      expect(badgeElement).toBeInTheDocument();

      if (size === 'sm') {
        expect(badgeElement).toHaveClass('text-xs');
        expect(badgeElement).toHaveClass('px-2');
        expect(badgeElement).toHaveClass('py-0.5');
      } else if (size === 'md') {
        expect(badgeElement).toHaveClass('text-sm');
        expect(badgeElement).toHaveClass('px-2.5');
        expect(badgeElement).toHaveClass('py-0.5');
      } else {
        expect(badgeElement).toHaveClass('text-base');
        expect(badgeElement).toHaveClass('px-3');
        expect(badgeElement).toHaveClass('py-1');
      }

      // Check text and padding differences between sizes
      expect(badgeElement).toHaveTextContent(`${size} Badge`);
    });
  });

  it('applies rounded styling when rounded prop is true', () => {
    /**
     * Test that the rounded prop correctly applies rounded styling
     */
    // Render a Badge component with the rounded prop set to true
    renderWithProviders(<Badge rounded={true}>Rounded Badge</Badge>);

    // Verify that it has the rounded-full class applied
    const badgeElement = screen.getByText('Rounded Badge');
    expect(badgeElement).toBeInTheDocument();
    expect(badgeElement).toHaveClass('rounded-full');

    // Compare with a Badge without the rounded prop
    renderWithProviders(<Badge>Not Rounded Badge</Badge>);
    const notRoundedBadgeElement = screen.getByText('Not Rounded Badge');
    expect(notRoundedBadgeElement).toBeInTheDocument();
    expect(notRoundedBadgeElement).not.toHaveClass('rounded-full');
  });

  it('applies outlined styling when outlined prop is true', () => {
    /**
     * Test that the outlined prop correctly applies outlined styling
     */
    const variants = ['success', 'warning', 'error', 'info', 'default'];

    variants.forEach((variant) => {
      // Render Badge components with the outlined prop for different variants
      renderWithProviders(<Badge outlined={true} variant={variant as any}>{variant} Outlined</Badge>);

      // Verify that each has the correct outlined styling (border, transparent background)
      const badgeElement = screen.getByText(`${variant} Outlined`);
      expect(badgeElement).toBeInTheDocument();
      expect(badgeElement).toHaveClass('bg-transparent');
      expect(badgeElement).toHaveClass('border');

      // Check that text colors are still appropriate for each variant
      if (variant === 'success') {
        expect(badgeElement).toHaveClass('border-semantic-success-500');
        expect(badgeElement).toHaveClass('text-semantic-success-700');
      } else if (variant === 'warning') {
        expect(badgeElement).toHaveClass('border-semantic-warning-500');
        expect(badgeElement).toHaveClass('text-semantic-warning-700');
      } else if (variant === 'error') {
        expect(badgeElement).toHaveClass('border-semantic-error-500');
        expect(badgeElement).toHaveClass('text-semantic-error-700');
      } else if (variant === 'info') {
        expect(badgeElement).toHaveClass('border-semantic-info-500');
        expect(badgeElement).toHaveClass('text-semantic-info-700');
      } else {
        expect(badgeElement).toHaveClass('border-gray-500');
        expect(badgeElement).toHaveClass('text-gray-700');
      }
    });
  });

  it('combines custom className with component classes', () => {
    /**
     * Test that custom className props are properly merged with component classes
     */
    // Render a Badge with a custom className
    renderWithProviders(<Badge className="custom-class">Custom Class Badge</Badge>);

    // Verify that both the custom class and the component's default classes are applied
    const badgeElement = screen.getByText('Custom Class Badge');
    expect(badgeElement).toBeInTheDocument();
    expect(badgeElement).toHaveClass('custom-class');
    expect(badgeElement).toHaveClass('inline-flex');
    expect(badgeElement).toHaveClass('items-center');
    expect(badgeElement).toHaveClass('font-medium');

    // Check that the styling works as expected with combined classes
    expect(badgeElement).toHaveTextContent('Custom Class Badge');
  });
});