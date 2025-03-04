import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import Select from '../../common/Select';
import Button from '../../common/Button';
import Table from '../../common/Table';
import TextField from '../../common/TextField';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../common/Modal';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import Alert from '../../common/Alert';
import useParameter from '../../../hooks/useParameter';
import useToast from '../../../hooks/useToast';
import { EntityType } from '../../../types/parameter.types';

/**
 * Enum of supported card network types
 */
export enum CardNetworkType {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  AMEX = 'AMEX',
  DISCOVER = 'DISCOVER',
}

/**
 * Props interface for the CardNetworkRules component
 */
export interface CardNetworkRulesProps {
  entityId: string;
  initialNetwork?: CardNetworkType;
  className?: string;
}

/**
 * Formats rule values based on their type for display purposes
 * @param ruleName 
 * @param value 
 * @returns Formatted value for display
 */
const formatRuleValue = (ruleName: string, value: any): string => {
  // Check if the rule is a timeLimit rule
  if (ruleName.includes('timeLimit')) {
    // Format time limit rules as days (e.g., '120 days')
    return `${value} days`;
  }

  // Check if the rule is a methodRestriction rule
  if (ruleName.includes('methodRestriction')) {
    // Format method restrictions as a comma-separated list
    if (Array.isArray(value)) {
      return value.join(', ');
    }
  }

  // Check if the rule is a documentationRequirement rule
  if (ruleName.includes('documentationRequirement')) {
    // Format documentation requirements with appropriate labels
    return `Requires ${value}`;
  }

  // Return the formatted string or original value if no formatting needed
  return String(value);
};

/**
 * Retrieves network-specific guidance and information text
 * @param networkType 
 * @returns Informational text about the card network's requirements
 */
const getNetworkSpecificInformation = (networkType: CardNetworkType): string => {
  switch (networkType) {
    case CardNetworkType.VISA:
      return 'VISA refunds must be processed within 120 days of the original transaction. Refunds outside this window must use alternative payment methods.';
    case CardNetworkType.MASTERCARD:
      return 'Mastercard refunds have a 180-day time limit. Ensure all refunds comply with Mastercard\'s guidelines.';
    case CardNetworkType.AMEX:
      return 'American Express refunds must adhere to specific documentation requirements for amounts over $2,500.';
    case CardNetworkType.DISCOVER:
      return 'Discover refunds have specific method restrictions. Only ORIGINAL_PAYMENT is allowed for most transactions.';
    default:
      return 'Please select a card network to view specific refund rules and requirements.';
  }
};

/**
 * A React component for the Barracuda admin interface that displays and manages
 * card network-specific rules for refunds.
 */
const CardNetworkRules: React.FC<CardNetworkRulesProps> = ({ entityId, initialNetwork = CardNetworkType.VISA, className }) => {
  // Component state variables
  const [selectedNetwork, setSelectedNetwork] = useState<CardNetworkType>(initialNetwork);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [currentRule, setCurrentRule] = useState<any | null>(null);
  const [editValue, setEditValue] = useState<string | number | string[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Hooks for parameter management and toast notifications
  const { 
    parameters, 
    fetchParameters, 
    updateParameter, 
    loading, 
    error,
  } = useParameter();
  const { success, error: toastError } = useToast();

  // Memoize the card network options for the Select component
  const cardNetworkOptions = useMemo(() => [
    { value: CardNetworkType.VISA, label: 'Visa' },
    { value: CardNetworkType.MASTERCARD, label: 'Mastercard' },
    { value: CardNetworkType.AMEX, label: 'American Express' },
    { value: CardNetworkType.DISCOVER, label: 'Discover' },
  ], []);

  // Construct parameter prefix based on selected network
  const parameterPrefix = `cardNetworkRules.${selectedNetwork.toLowerCase()}`;

  // Fetch card network rules on initial render and when network changes
  useEffect(() => {
    fetchParameters({ 
      entityType: EntityType.BANK, 
      entityId: entityId,
      searchQuery: parameterPrefix,
      page: 1,
      pageSize: 100,
    });
  }, [entityId, selectedNetwork, fetchParameters, parameterPrefix]);

  /**
   * Handles selection of a different card network
   * @param e 
   */
  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNetwork(e.target.value as CardNetworkType);
  };

  /**
   * Opens the edit modal for a specific rule
   * @param rule 
   */
  const handleEditRule = (rule: any) => {
    setCurrentRule(rule);
    setEditValue(rule.value);
    setIsEditModalOpen(true);
  };

  /**
   * Closes the edit modal
   */
  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setCurrentRule(null);
    setEditValue(null);
  };

  /**
   * Updates the editValue state as user types
   * @param e 
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  /**
   * Submits the updated rule value to the server
   */
  const handleUpdateRule = async () => {
    setIsSubmitting(true);
    try {
      if (!currentRule || !editValue) return;

      // Prepare update request object with new value and metadata
      const updateRequest = {
        parameterValue: editValue,
        description: currentRule.description,
      };

      // Call updateParameter API with current rule details and new value
      await updateParameter(currentRule.name, EntityType.BANK, entityId, updateRequest);

      // Show success toast
      success('Rule updated successfully!');

      // Close modal
      handleCloseModal();

      // Refresh rules
      fetchParameters({ 
        entityType: EntityType.BANK, 
        entityId: entityId,
        searchQuery: parameterPrefix,
        page: 1,
        pageSize: 100,
      });
    } catch (err: any) {
      // Show error toast with details
      toastError(`Failed to update rule: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Define table columns
  const columns = useMemo(() => [
    { 
      field: 'name', 
      header: 'Rule Name', 
      width: '25%',
    },
    { 
      field: 'description', 
      header: 'Description', 
      width: '40%',
    },
    { 
      field: 'value', 
      header: 'Current Value', 
      width: '20%',
      render: (value: any, row: any) => formatRuleValue(row.name, value),
    },
    { 
      header: 'Actions', 
      width: '15%',
      render: (_value: any, row: any) => (
        <Button variant="secondary" size="sm" onClick={() => handleEditRule(row)}>
          Edit
        </Button>
      ),
    },
  ], [handleEditRule]);

  return (
    <div className={className}>
      {/* Network Selector */}
      <div className="mb-4">
        <Select
          label="Card Network"
          name="cardNetwork"
          value={selectedNetwork}
          options={cardNetworkOptions}
          onChange={handleNetworkChange}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center">
          <Spinner size="md" color="primary" />
          <p className="ml-2">Loading rules...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert type="error" message={`Failed to load rules: ${error}`} />
      )}

      {/* Rules Table */}
      {!loading && !error && parameters && (
        <Table 
          data={parameters} 
          columns={columns} 
          rowKey={(row) => row.name}
        />
      )}

      {/* Network Information */}
      <Card title="Network-Specific Information" className="mt-4">
        {getNetworkSpecificInformation(selectedNetwork)}
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={handleCloseModal} title="Edit Rule">
        <ModalBody>
          {currentRule && (
            <div className="mb-4">
              <p className="text-gray-700">
                {currentRule.description}
              </p>
              <TextField
                label="Value"
                type="text"
                value={editValue as string}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={handleCloseModal} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateRule} isLoading={isSubmitting}>
            Save
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CardNetworkRules;