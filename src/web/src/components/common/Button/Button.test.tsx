import React from 'react'; // ^18.2.0
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { screen, waitFor } from '@testing-library/react'; // ^14.0.0
import Button, { ButtonVariant, ButtonSize } from './Button'; // Component under test
import { describe, it, expect, vi } from 'vitest'; // Testing framework

describe('Button Component', () => {
  // Test suite for the Button component
  // LD1: Group related tests for the Button component

  it('renders with default props correctly', async () => {
    // Tests that the Button component renders correctly with default props
    // LD1: Render Button component with default props and text content
    renderWithProviders(<Button>Click me</Button>);

    // LD2: Verify the button is in the document
    const buttonElement = screen.getByRole('button', { name: 'Click me' });
    expect(buttonElement).toBeInTheDocument();

    // LD3: Check button text content is correctly rendered
    expect(buttonElement).toHaveTextContent('Click me');

    // LD4: Verify default (PRIMARY) variant styling is applied
    expect(buttonElement).toHaveClass('bg-blue-600');

    // LD5: Verify default (MD) size styling is applied
    expect(buttonElement).toHaveClass('px-4');
  });

  it('renders with different variants correctly', async () => {
    // Tests that the Button component renders correctly with different variants
    // LD1: Loop through all ButtonVariant values
    for (const variant of Object.values(ButtonVariant)) {
      // LD2: For each variant, render Button with that variant
      renderWithProviders(<Button variant={variant}>Variant Button</Button>);

      // LD3: Verify the button is in the document
      const buttonElement = screen.getByRole('button', { name: 'Variant Button' });
      expect(buttonElement).toBeInTheDocument();

      // LD4: Check that appropriate variant-specific styling is applied
      switch (variant) {
        case ButtonVariant.PRIMARY:
          expect(buttonElement).toHaveClass('bg-blue-600');
          break;
        case ButtonVariant.SECONDARY:
          expect(buttonElement).toHaveClass('bg-gray-200');
          break;
        case ButtonVariant.TERTIARY:
          expect(buttonElement).toHaveClass('bg-white');
          break;
        case ButtonVariant.SUCCESS:
          expect(buttonElement).toHaveClass('bg-green-600');
          break;
        case ButtonVariant.DANGER:
          expect(buttonElement).toHaveClass('bg-red-600');
          break;
        case ButtonVariant.GHOST:
          expect(buttonElement).toHaveClass('bg-transparent');
          break;
        case ButtonVariant.LINK:
          expect(buttonElement).toHaveClass('bg-transparent');
          break;
        default:
          break;
      }
    }
  });

  it('renders with different sizes correctly', async () => {
    // Tests that the Button component renders correctly with different sizes
    // LD1: Render Button with size=ButtonSize.SM
    renderWithProviders(<Button size={ButtonSize.SM}>Small Button</Button>);

    // LD2: Verify small size styling is applied
    const smallButton = screen.getByRole('button', { name: 'Small Button' });
    expect(smallButton).toHaveClass('px-2.5');

    // LD3: Render Button with size=ButtonSize.MD
    renderWithProviders(<Button size={ButtonSize.MD}>Medium Button</Button>);

    // LD4: Verify medium size styling is applied
    const mediumButton = screen.getByRole('button', { name: 'Medium Button' });
    expect(mediumButton).toHaveClass('px-4');

    // LD5: Render Button with size=ButtonSize.LG
    renderWithProviders(<Button size={ButtonSize.LG}>Large Button</Button>);

    // LD6: Verify large size styling is applied
    const largeButton = screen.getByRole('button', { name: 'Large Button' });
    expect(largeButton).toHaveClass('px-6');
  });

  it('renders in disabled state correctly', async () => {
    // Tests that the Button component renders correctly when disabled
    // LD1: Render Button with disabled=true
    renderWithProviders(<Button disabled>Disabled Button</Button>);

    // LD2: Verify button has disabled attribute
    const disabledButton = screen.getByRole('button', { name: 'Disabled Button' });
    expect(disabledButton).toBeDisabled();

    // LD3: Verify aria-disabled attribute is set to true
    expect(disabledButton).toHaveAttribute('aria-disabled', 'true');

    // LD4: Check that appropriate disabled styling is applied
    expect(disabledButton).toHaveClass('opacity-75');
  });

  it('renders in loading state correctly', async () => {
    // Tests that the Button component renders correctly when in loading state
    // LD1: Render Button with isLoading=true
    renderWithProviders(<Button isLoading>Loading Button</Button>);

    // LD2: Verify spinner component is rendered
    const loadingButton = screen.getByRole('button', { name: 'Loading Button' });
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();

    // LD3: Verify aria-busy attribute is set to true
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');

    // LD4: Check button text content is still visible
    expect(loadingButton).toHaveTextContent('Loading Button');

    // LD5: Verify appropriate loading state styling is applied
    expect(loadingButton).toHaveClass('opacity-75');
  });

  it('renders with start icon correctly', async () => {
    // Tests that the Button component renders correctly with a start icon
    // LD1: Create a mock icon component
    const MockIcon = () => <span>Mock Icon</span>;

    // LD2: Render Button with startIcon prop set to the mock icon
    renderWithProviders(<Button startIcon={<MockIcon />}>Icon Button</Button>);

    // LD3: Verify the icon is rendered before the button text
    const iconButton = screen.getByRole('button', { name: 'Icon Button' });
    expect(iconButton.firstChild).toHaveTextContent('Mock Icon');

    // LD4: Check button text content is still visible
    expect(iconButton).toHaveTextContent('Icon Button');
  });

  it('renders with end icon correctly', async () => {
    // Tests that the Button component renders correctly with an end icon
    // LD1: Create a mock icon component
    const MockIcon = () => <span>Mock Icon</span>;

    // LD2: Render Button with endIcon prop set to the mock icon
    renderWithProviders(<Button endIcon={<MockIcon />}>Icon Button</Button>);

    // LD3: Verify the icon is rendered after the button text
    const iconButton = screen.getByRole('button', { name: 'Icon Button' });
    expect(iconButton.lastChild).toHaveTextContent('Mock Icon');

    // LD4: Check button text content is still visible
    expect(iconButton).toHaveTextContent('Icon Button');
  });

  it('renders with fullWidth correctly', async () => {
    // Tests that the Button component renders correctly with fullWidth prop
    // LD1: Render Button with fullWidth=true
    renderWithProviders(<Button fullWidth>Full Width Button</Button>);

    // LD2: Verify the button has fullWidth styling applied
    const fullWidthButton = screen.getByRole('button', { name: 'Full Width Button' });
    expect(fullWidthButton).toHaveClass('w-full');
  });

  it('calls onClick handler when clicked', async () => {
    // Tests that the onClick callback is called when the button is clicked
    // LD1: Create a mock function for onClick
    const onClick = vi.fn();

    // LD2: Render Button with the mock onClick handler
    renderWithProviders(<Button onClick={onClick}>Clickable Button</Button>);

    // LD3: Set up user event for interaction testing
    const user = setupUserEvent();

    // LD4: Simulate a click on the button
    const clickableButton = screen.getByRole('button', { name: 'Clickable Button' });
    await user.click(clickableButton);

    // LD5: Verify that the onClick mock function was called exactly once
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    // Tests that the onClick callback is not called when the button is disabled
    // LD1: Create a mock function for onClick
    const onClick = vi.fn();

    // LD2: Render Button with disabled=true and the mock onClick handler
    renderWithProviders(<Button disabled onClick={onClick}>Disabled Button</Button>);

    // LD3: Set up user event for interaction testing
    const user = setupUserEvent();

    // LD4: Simulate a click on the button
    const disabledButton = screen.getByRole('button', { name: 'Disabled Button' });
    await user.click(disabledButton);

    // LD5: Verify that the onClick mock function was not called
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', async () => {
    // Tests that the onClick callback is not called when the button is in loading state
    // LD1: Create a mock function for onClick
    const onClick = vi.fn();

    // LD2: Render Button with isLoading=true and the mock onClick handler
    renderWithProviders(<Button isLoading onClick={onClick}>Loading Button</Button>);

    // LD3: Set up user event for interaction testing
    const user = setupUserEvent();

    // LD4: Simulate a click on the button
    const loadingButton = screen.getByRole('button', { name: 'Loading Button' });
    await user.click(loadingButton);

    // LD5: Verify that the onClick mock function was not called
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies custom className when provided', async () => {
    // Tests that custom className prop is correctly applied to the component
    // LD1: Render Button with a custom className
    renderWithProviders(<Button className="custom-class">Custom Class Button</Button>);

    // LD2: Verify that the rendered button includes the custom class
    const customClassButton = screen.getByRole('button', { name: 'Custom Class Button' });
    expect(customClassButton).toHaveClass('custom-class');
  });
});