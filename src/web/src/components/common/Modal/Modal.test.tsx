import React, { useRef } from 'react'; // ^18.2.0
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'; // ^14.0.0
import { act } from 'react-dom/test-utils'; // ^18.2.0
import userEvent from '@testing-library/user-event'; // ^14.4.3
import Modal, { ModalSize, ModalHeader, ModalBody, ModalFooter } from './Modal';
import Button from '../Button';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';

describe('Modal component', () => {
  // Set up test suite for Modal component
  // Define common test variables and mock functions
  // Group related tests into nested describe blocks
  // Test all Modal component features

  test('renders correctly when isOpen is true', async () => {
    // Verifies that Modal renders correctly when the isOpen prop is true
    // Render Modal component with isOpen set to true
    const { container } = renderWithProviders(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" testId="test-modal">
        <ModalBody>Test Content</ModalBody>
      </Modal>
    );

    // Verify that modal content is displayed
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();

    // Check that modal has correct accessibility attributes
    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  test('does not render when isOpen is false', async () => {
    // Verifies that Modal does not render when the isOpen prop is false
    // Render Modal component with isOpen set to false
    renderWithProviders(<Modal isOpen={false} onClose={() => {}}>Test Content</Modal>);

    // Verify that modal content is not in the document
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', async () => {
    // Verifies that the onClose callback is called when the close button is clicked
    // Create a mock function for onClose
    const onClose = jest.fn();

    // Render Modal with showCloseButton=true and the mock onClose function
    renderWithProviders(
      <Modal isOpen={true} onClose={onClose} showCloseButton={true}>
        Test Content
      </Modal>
    );

    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    await setupUserEvent().click(closeButton);

    // Verify that onClose was called
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when backdrop is clicked and closeOnBackdropClick is true', async () => {
    // Verifies that onClose is called when clicking the backdrop with closeOnBackdropClick enabled
    // Create a mock function for onClose
    const onClose = jest.fn();

    // Render Modal with closeOnBackdropClick=true and the mock onClose function
    renderWithProviders(
      <Modal isOpen={true} onClose={onClose} closeOnBackdropClick={true}>
        Test Content
      </Modal>
    );

    // Find and click the backdrop overlay
    const backdrop = screen.getByTestId('modal-backdrop');
    await setupUserEvent().click(backdrop);

    // Verify that onClose was called
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not call onClose when backdrop is clicked and closeOnBackdropClick is false', async () => {
    // Verifies that onClose is not called when clicking the backdrop with closeOnBackdropClick disabled
    // Create a mock function for onClose
    const onClose = jest.fn();

    // Render Modal with closeOnBackdropClick=false and the mock onClose function
    renderWithProviders(
      <Modal isOpen={true} onClose={onClose} closeOnBackdropClick={false}>
        Test Content
      </Modal>
    );

    // Find and click the backdrop overlay
    const backdrop = screen.getByTestId('modal-backdrop');
    await setupUserEvent().click(backdrop);

    // Verify that onClose was not called
    expect(onClose).not.toHaveBeenCalled();
  });

  test('calls onClose when Escape key is pressed and closeOnEsc is true', async () => {
    // Verifies that onClose is called when pressing Escape key with closeOnEsc enabled
    // Create a mock function for onClose
    const onClose = jest.fn();

    // Render Modal with closeOnEsc=true and the mock onClose function
    renderWithProviders(
      <Modal isOpen={true} onClose={onClose} closeOnEsc={true}>
        Test Content
      </Modal>
    );

    // Simulate Escape key press
    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    });

    // Verify that onClose was called
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not call onClose when Escape key is pressed and closeOnEsc is false', async () => {
    // Verifies that onClose is not called when pressing Escape key with closeOnEsc disabled
    // Create a mock function for onClose
    const onClose = jest.fn();

    // Render Modal with closeOnEsc=false and the mock onClose function
    renderWithProviders(
      <Modal isOpen={true} onClose={onClose} closeOnEsc={false}>
        Test Content
      </Modal>
    );

    // Simulate Escape key press
    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    });

    // Verify that onClose was not called
    expect(onClose).not.toHaveBeenCalled();
  });

  test('applies correct size classes', async () => {
    // Verifies that the modal applies the correct size classes based on the size prop
    // Define test cases for each modal size
    const sizeClasses = {
      [ModalSize.SM]: 'max-w-sm',
      [ModalSize.MD]: 'max-w-md',
      [ModalSize.LG]: 'max-w-lg',
      [ModalSize.XL]: 'max-w-xl',
      [ModalSize.FULL]: 'max-w-full mx-4'
    };

    // For each size, render Modal with that size
    for (const size in sizeClasses) {
      renderWithProviders(<Modal isOpen={true} onClose={() => {}} size={size as ModalSize}>Test Content</Modal>);

      // Verify that the correct CSS classes are applied based on the size
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass(sizeClasses[size as ModalSize]);
    }
  });

  test('renders ModalHeader, ModalBody, and ModalFooter correctly', async () => {
    // Verifies that the modal subcomponents render correctly
    // Render Modal with ModalHeader, ModalBody, and ModalFooter subcomponents
    renderWithProviders(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <ModalHeader>Header Content</ModalHeader>
        <ModalBody>Body Content</ModalBody>
        <ModalFooter>Footer Content</ModalFooter>
      </Modal>
    );

    // Verify that each subcomponent renders with the correct content
    expect(screen.getByText('Header Content')).toBeInTheDocument();
    expect(screen.getByText('Body Content')).toBeInTheDocument();
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  test('manages focus trap correctly', async () => {
    // Verifies that focus is correctly trapped within the modal when open
    // Create a component with focusable elements outside and inside the modal
    const TestComponent = () => {
      const initialFocusRef = useRef(null);

      return (
        <div>
          <button data-testid="outside-button">Outside Button</button>
          <Modal isOpen={true} onClose={() => {}} initialFocusRef={initialFocusRef}>
            <ModalBody>
              <input type="text" data-testid="inside-input" ref={initialFocusRef} />
              <button data-testid="inside-button">Inside Button</button>
            </ModalBody>
          </Modal>
        </div>
      );
    };

    // Render the component with modal open
    renderWithProviders(<TestComponent />);

    // Verify initial focus is within the modal
    expect(screen.getByTestId('inside-input')).toHaveFocus();

    // Simulate Tab key presses to navigate through focusable elements
    const user = setupUserEvent();
    await user.tab();
    expect(screen.getByTestId('inside-button')).toHaveFocus();
    await user.tab();
    expect(screen.getByTestId('inside-input')).toHaveFocus();

    // Verify focus remains trapped within the modal
    expect(screen.queryByTestId('outside-button')).not.toHaveFocus();
  });

  test('respects initialFocusRef', async () => {
    // Verifies that the initialFocusRef prop correctly sets initial focus
    // Create a ref for a specific element inside the modal
    const initialFocusRef = useRef(null);

    // Render Modal with initialFocusRef set to that ref
    renderWithProviders(
      <Modal isOpen={true} onClose={() => {}} initialFocusRef={initialFocusRef}>
        <ModalBody>
          <input type="text" data-testid="other-input" />
          <button data-testid="focus-button" ref={initialFocusRef}>Focus Button</button>
        </ModalBody>
      </Modal>
    );

    // Verify that the referenced element receives focus when modal opens
    expect(screen.getByTestId('focus-button')).toHaveFocus();
  });

  test('applies custom class names correctly', async () => {
    // Verifies that custom class names are applied to the modal components
    // Define custom class names for modal container, content, header, body, and footer
    const containerClassName = 'custom-container';
    const contentClassName = 'custom-content';
    const headerClassName = 'custom-header';
    const bodyClassName = 'custom-body';
    const footerClassName = 'custom-footer';

    // Render Modal with all custom class names
    renderWithProviders(
      <Modal
        isOpen={true}
        onClose={() => {}}
        className={containerClassName}
        contentClassName={contentClassName}
        headerClassName={headerClassName}
        bodyClassName={bodyClassName}
        footerClassName={footerClassName}
        title="Test Modal"
      >
        <ModalHeader>Header Content</ModalHeader>
        <ModalBody>Body Content</ModalBody>
        <ModalFooter>Footer Content</ModalFooter>
      </Modal>
    );

    // Verify that each element has the correct custom classes applied
    expect(screen.getByRole('dialog')).toHaveClass(containerClassName);
    expect(screen.getByText('Header Content').closest('div')).toHaveClass(headerClassName);
    expect(screen.getByText('Body Content').closest('div')).toHaveClass(bodyClassName);
    expect(screen.getByText('Footer Content').closest('div')).toHaveClass(footerClassName);
  });
});