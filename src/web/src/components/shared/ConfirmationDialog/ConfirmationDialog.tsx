import React, { useState, useRef, useEffect, ReactNode } from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import Modal, { ModalHeader, ModalBody, ModalFooter, ModalSize } from '../../common/Modal';
import Button, { ButtonVariant } from '../../common/Button';
import Alert from '../../common/Alert';
import TextField from '../../common/TextField';

/**
 * A dialog component that requires explicit confirmation for important actions
 */
const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  warningMessage,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = ButtonVariant.PRIMARY,
  onConfirm,
  onCancel,
  isConfirmLoading = false,
  isConfirmDisabled = false,
  reasonInputLabel,
  reasonInputPlaceholder = 'Enter reason...',
  reasonRequired = false,
  className,
}) => {
  // State for reason input text if reasonInputLabel is provided
  const [reasonText, setReasonText] = useState('');
  
  // State for reason validation error
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);
  
  // Reference for confirm button to set initial focus
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  
  // Reset reason text and error when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setReasonText('');
      setReasonError(undefined);
    }
  }, [isOpen]);

  // Handle text input changes for reason field
  const handleReasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReasonText(e.target.value);
    // Clear error when user types
    if (reasonError) {
      setReasonError(undefined);
    }
  };

  // Handle confirm button click
  const handleConfirm = () => {
    // If reason is required, validate it
    if (reasonRequired && reasonInputLabel && !reasonText.trim()) {
      setReasonError('Please provide a reason');
      return;
    }

    // Call onConfirm with reason text if input is provided
    onConfirm(reasonInputLabel ? reasonText : undefined);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size={ModalSize.MD}
      className={classNames('confirmation-dialog', className)}
      initialFocusRef={confirmButtonRef}
      closeOnEsc={true}
      closeOnBackdropClick={true}
      ariaLabelledBy="confirmation-dialog-title"
      ariaDescribedBy="confirmation-dialog-description"
    >
      <ModalHeader>
        <h2 id="confirmation-dialog-title" className="text-lg font-medium">{title}</h2>
      </ModalHeader>
      
      <ModalBody className="space-y-4">
        {/* Main confirmation message */}
        <div 
          id="confirmation-dialog-description" 
          className="text-gray-700"
        >
          {message}
        </div>
        
        {/* Warning message if provided */}
        {warningMessage && (
          <Alert
            type="warning"
            message={warningMessage}
          />
        )}
        
        {/* Reason input field if label is provided */}
        {reasonInputLabel && (
          <TextField
            id="confirmation-dialog-reason"
            label={reasonInputLabel}
            value={reasonText}
            onChange={handleReasonChange}
            placeholder={reasonInputPlaceholder}
            error={reasonError}
            required={reasonRequired}
            autoFocus={false}
          />
        )}
      </ModalBody>
      
      <ModalFooter>
        <Button
          variant={ButtonVariant.SECONDARY}
          onClick={onCancel}
          type="button"
        >
          {cancelLabel}
        </Button>
        
        <Button
          ref={confirmButtonRef}
          variant={confirmVariant}
          onClick={handleConfirm}
          isLoading={isConfirmLoading}
          disabled={isConfirmDisabled}
          type="button"
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ConfirmationDialog;