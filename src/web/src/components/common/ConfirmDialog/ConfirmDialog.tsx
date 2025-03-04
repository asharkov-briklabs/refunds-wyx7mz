import React, { useState, useRef, useEffect, ReactNode } from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import Modal, { ModalSize, ModalBody, ModalFooter } from '../Modal';
import Button, { ButtonVariant } from '../Button';
import Alert from '../Alert';
import TextField from '../TextField';

/**
 * Props for the ConfirmDialog component
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** The title to display */
  title: string;
  /** The message to display */
  message: string | ReactNode;
  /** Optional warning message to display */
  warningMessage?: string | ReactNode;
  /** Function to call when the user confirms */
  onConfirm: () => void;
  /** Function to call when the user cancels */
  onCancel: () => void;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Variant for the confirm button */
  confirmVariant?: ButtonVariant;
  /** Whether the confirm button is in a loading state */
  isConfirmLoading?: boolean;
  /** Whether the confirm button is disabled */
  isConfirmDisabled?: boolean;
  /** Whether to show a reason input field */
  showReasonField?: boolean;
  /** Label for the reason field (default: "Reason") */
  reasonLabel?: string;
  /** Placeholder for the reason field */
  reasonPlaceholder?: string;
  /** Function to call with the reason text when confirmed */
  onConfirmWithReason?: (reason: string) => void;
  /** Additional content to display */
  children?: ReactNode;
  /** Additional CSS class for the dialog */
  className?: string;
}

/**
 * A dialog component that requires explicit confirmation for important actions.
 * Provides support for warnings, reason input, and customizable buttons.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  warningMessage,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = ButtonVariant.PRIMARY,
  isConfirmLoading = false,
  isConfirmDisabled = false,
  showReasonField = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Please provide a reason",
  onConfirmWithReason,
  children,
  className,
}) => {
  // State for reason input
  const [reason, setReason] = useState("");
  
  // Reference for the confirm button to set focus when dialog opens
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  
  // Handle confirm action with reason value when required
  const handleConfirm = () => {
    if (showReasonField && onConfirmWithReason) {
      onConfirmWithReason(reason);
    } else {
      onConfirm();
    }
  };
  
  // Reset reason field when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setReason("");
    }
  }, [isOpen]);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size={ModalSize.MD}
      closeOnEsc={true}
      closeOnBackdropClick={true}
      className={className}
      initialFocusRef={confirmButtonRef}
    >
      <ModalBody>
        {/* Display message as paragraph if string, otherwise render as ReactNode */}
        {typeof message === "string" ? <p className="text-gray-700">{message}</p> : message}
        
        {/* Display warning message if provided */}
        {warningMessage && (
          <Alert
            type="warning"
            message={warningMessage}
            className="mt-4"
          />
        )}
        
        {/* Display reason input field if enabled */}
        {showReasonField && (
          <TextField
            label={reasonLabel}
            placeholder={reasonPlaceholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-4"
          />
        )}
        
        {/* Render any additional children */}
        {children}
      </ModalBody>
      
      <ModalFooter>
        {/* Cancel button */}
        <Button
          variant={ButtonVariant.TERTIARY}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        
        {/* Confirm button */}
        <Button
          ref={confirmButtonRef}
          variant={confirmVariant}
          onClick={handleConfirm}
          isLoading={isConfirmLoading}
          disabled={isConfirmDisabled || isConfirmLoading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ConfirmDialog;