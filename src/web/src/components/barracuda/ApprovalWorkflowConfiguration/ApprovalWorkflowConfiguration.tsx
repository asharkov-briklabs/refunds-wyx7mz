import React, { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'; // ^2.0.0
import Card from '../../../components/common/Card';
import { Select } from '../../../components/common/Select';
import Button from '../../../components/common/Button';
import TextField from '../../../components/common/TextField';
import useParameter from '../../../hooks/useParameter';
import { EntityType } from '../../../types/parameter.types';

/**
 * Interface defining the props for the ApprovalWorkflowConfiguration component
 */
export interface ApprovalWorkflowConfigurationProps {
  workflow?: ApprovalWorkflow;
  entityType: EntityType;
  entityId: string;
  isNew?: boolean;
  onSave: (workflow: ApprovalWorkflow) => void;
  onCancel: () => void;
}

/**
 * Interface defining the structure of an approval workflow
 */
interface ApprovalWorkflow {
  id?: string;
  name: string;
  entityType: EntityType;
  entityId: string;
  triggerType: TriggerType;
  threshold: number;
  additionalCondition: string | null;
  approvalLevels: ApprovalLevel[];
  finalEscalation: string | null;
  onTimeout: TimeoutAction;
}

/**
 * Interface defining an approval level with role and timeout
 */
interface ApprovalLevel {
  role: string;
  timeout: number;
}

/**
 * Enum defining the types of triggers that can initiate an approval workflow
 */
export enum TriggerType {
  AMOUNT = 'AMOUNT',
  PAYMENT_METHOD = 'PAYMENT_METHOD',
  CUSTOMER_RISK = 'CUSTOMER_RISK',
  MERCHANT_RISK = 'MERCHANT_RISK',
  CUSTOM = 'CUSTOM',
}

/**
 * Enum defining the actions to take when an approval timeout occurs
 */
export enum TimeoutAction {
  ESCALATE_TO_NEXT_LEVEL = 'ESCALATE_TO_NEXT_LEVEL',
  AUTO_APPROVE = 'AUTO_APPROVE',
  AUTO_REJECT = 'AUTO_REJECT',
}

/**
 * Component for configuring approval workflows for refund requests
 */
const ApprovalWorkflowConfiguration: React.FC<ApprovalWorkflowConfigurationProps> = ({
  workflow,
  entityType,
  entityId,
  isNew,
  onSave,
  onCancel,
}) => {
  // LD1: Destructure props to access workflow, entityType, entityId, isNew flag, and handlers
  // LD2: Initialize state for workflow form data with defaults or provided workflow values
  const [formData, setFormData] = useState<ApprovalWorkflow>({
    id: workflow?.id || '',
    name: workflow?.name || '',
    entityType: entityType,
    entityId: entityId,
    triggerType: workflow?.triggerType || TriggerType.AMOUNT,
    threshold: workflow?.threshold || 0,
    additionalCondition: workflow?.additionalCondition || null,
    approvalLevels: workflow?.approvalLevels || [{ role: '', timeout: 1 }],
    finalEscalation: workflow?.finalEscalation || null,
    onTimeout: workflow?.onTimeout || TimeoutAction.ESCALATE_TO_NEXT_LEVEL,
  });

  // LD2: Initialize parameter hook for accessing roles and configuration data
  const { parameterDefinitions } = useParameter();

  // LD2: Define form validation logic to ensure required fields are filled
  // LD2: Implement handleAddLevel function to add a new approval level to the workflow
  const handleAddLevel = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      approvalLevels: [...prev.approvalLevels, { role: '', timeout: 1 }],
    }));
  }, []);

  // LD2: Implement handleRemoveLevel function to remove an approval level from the workflow
  const handleRemoveLevel = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      approvalLevels: prev.approvalLevels.filter((_, i) => i !== index),
    }));
  }, []);

  // LD2: Implement handleChangeLevel function to update properties of an approval level
  const handleChangeLevel = useCallback(
    (index: number, field: string, value: any) => {
      setFormData((prev) => {
        const newLevels = [...prev.approvalLevels];
        newLevels[index] = { ...newLevels[index], [field]: value };
        return { ...prev, approvalLevels: newLevels };
      });
    },
    []
  );

  // LD2: Implement handleTriggerChange function to handle changes to the trigger type
  const handleTriggerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      triggerType: e.target.value as TriggerType,
    }));
  }, []);

  // LD2: Implement handleSave function to validate and submit the workflow configuration
  const handleSave = useCallback(() => {
    // Basic validation
    if (!formData.name || formData.approvalLevels.some((level) => !level.role || !level.timeout)) {
      alert('Please fill in all required fields.');
      return;
    }

    // Call the onSave handler passed from the parent component
    onSave(formData);
  }, [formData, onSave]);

  // LD2: Render the workflow name input field
  // LD2: Render the entity selection dropdown (disabled if entityType and entityId are provided)
  // LD2: Render the trigger type selection with appropriate fields based on the selected trigger
  // LD2: Render the threshold input with appropriate validation and formatting
  // LD2: Render additional condition input when applicable
  // LD2: Render the approval levels section with ability to add/remove levels
  // LD2: For each approval level, render role selection and timeout inputs
  // LD2: Render escalation settings section with timeout action selection
  // LD2: Render final escalation selection when applicable
  // LD2: Render save and cancel buttons at the bottom of the form
  return (
    <Card title="Approval Workflow Configuration">
      <div>
        <TextField
          label="Workflow Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <Select
          label="Trigger Type"
          name="triggerType"
          value={formData.triggerType}
          onChange={handleTriggerChange}
          options={[
            { value: TriggerType.AMOUNT, label: 'Amount' },
            { value: TriggerType.PAYMENT_METHOD, label: 'Payment Method' },
            { value: TriggerType.CUSTOMER_RISK, label: 'Customer Risk' },
            { value: TriggerType.MERCHANT_RISK, label: 'Merchant Risk' },
            { value: TriggerType.CUSTOM, label: 'Custom' },
          ]}
        />
        {formData.triggerType === TriggerType.AMOUNT && (
          <TextField
            label="Threshold Amount"
            type="number"
            value={String(formData.threshold)}
            onChange={(e) => setFormData({ ...formData, threshold: Number(e.target.value) })}
          />
        )}
        <TextField
          label="Additional Condition"
          value={formData.additionalCondition || ''}
          onChange={(e) => setFormData({ ...formData, additionalCondition: e.target.value })}
        />
        <div>
          <h3>Approval Levels</h3>
          {formData.approvalLevels.map((level, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <Select
                label={`Level ${index + 1} Role`}
                name={`level${index}Role`}
                value={level.role}
                onChange={(e) => handleChangeLevel(index, 'role', e.target.value)}
                options={[
                  { value: 'MERCHANT_ADMIN', label: 'Merchant Admin' },
                  { value: 'ORGANIZATION_ADMIN', label: 'Organization Admin' },
                  { value: 'BANK_ADMIN', label: 'Bank Admin' },
                ]}
              />
              <TextField
                label={`Level ${index + 1} Timeout (hours)`}
                type="number"
                value={String(level.timeout)}
                onChange={(e) => handleChangeLevel(index, 'timeout', Number(e.target.value))}
              />
              <Button variant="danger" size="sm" onClick={() => handleRemoveLevel(index)}>
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={handleAddLevel}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Approval Level
          </Button>
        </div>
        <div>
          <h3>Escalation Settings</h3>
          <Select
            label="On Timeout"
            name="onTimeout"
            value={formData.onTimeout}
            onChange={(e) => setFormData({ ...formData, onTimeout: e.target.value as TimeoutAction })}
            options={[
              { value: TimeoutAction.ESCALATE_TO_NEXT_LEVEL, label: 'Escalate to Next Level' },
              { value: TimeoutAction.AUTO_APPROVE, label: 'Auto Approve' },
              { value: TimeoutAction.AUTO_REJECT, label: 'Auto Reject' },
            ]}
          />
          {formData.onTimeout === TimeoutAction.ESCALATE_TO_NEXT_LEVEL && (
            <Select
              label="Final Escalation"
              name="finalEscalation"
              value={formData.finalEscalation || ''}
              onChange={(e) => setFormData({ ...formData, finalEscalation: e.target.value })}
              options={[
                { value: 'MERCHANT_ADMIN', label: 'Merchant Admin' },
                { value: 'ORGANIZATION_ADMIN', label: 'Organization Admin' },
                { value: 'BANK_ADMIN', label: 'Bank Admin' },
              ]}
            />
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Workflow
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ApprovalWorkflowConfiguration;

export interface ApprovalWorkflowConfigurationProps {
  workflow?: ApprovalWorkflow;
  entityType: EntityType;
  entityId: string;
  isNew?: boolean;
  onSave: (workflow: ApprovalWorkflow) => void;
  onCancel: () => void;
}

export enum TriggerType {
  AMOUNT = 'AMOUNT',
  PAYMENT_METHOD = 'PAYMENT_METHOD',
  CUSTOMER_RISK = 'CUSTOMER_RISK',
  MERCHANT_RISK = 'MERCHANT_RISK',
  CUSTOM = 'CUSTOM',
}

export enum TimeoutAction {
  ESCALATE_TO_NEXT_LEVEL = 'ESCALATE_TO_NEXT_LEVEL',
  AUTO_APPROVE = 'AUTO_APPROVE',
  AUTO_REJECT = 'AUTO_REJECT',
}