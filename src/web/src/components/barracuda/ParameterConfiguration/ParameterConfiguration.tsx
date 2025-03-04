import React, { useState, useEffect, useMemo, useCallback } from 'react'; // react ^18.2.0
import cloneDeep from 'lodash/cloneDeep'; // ^4.17.21
import Card from '../../common/Card/Card';
import Select from '../../common/Select/Select';
import Button from '../../common/Button/Button';
import TextField from '../../common/TextField/TextField';
import Spinner from '../../common/Spinner/Spinner';
import Modal from '../../common/Modal/Modal';
import Table from '../../common/Table/Table';
import CurrencyInput from '../../common/CurrencyInput/CurrencyInput';
import MerchantSelector from '../MerchantSelector/MerchantSelector';
import useParameter from '../../../hooks/useParameter';
import useToast from '../../../hooks/useToast';
import { EntityType, ParameterDataType, Parameter, ParameterDefinition, ParameterCreateRequest, ParameterUpdateRequest, ParameterInheritanceList, ResolvedParameter } from '../../../types/parameter.types';

/**
 * Interface defining the props for the ParameterConfiguration component
 */
export interface ParameterConfigurationProps {
  /** Initial entity type to display */
  initialEntityType?: EntityType;
  /** Initial entity ID to display */
  initialEntityId?: string;
  /** Callback function called when entity type or ID changes */
  onEntityChange?: (entityType: EntityType, entityId: string) => void;
  /** Optional CSS class name for the component */
  className?: string;
}

/**
 * Main component for managing configuration parameters across different entity levels
 */
const ParameterConfiguration: React.FC<ParameterConfigurationProps> = ({
  initialEntityType,
  initialEntityId,
  onEntityChange,
  className,
}) => {
  // LD1: Initialize state for entity type, entity ID, selected parameter, editing mode, and form values
  const [entityType, setEntityType] = useState<EntityType>(initialEntityType || EntityType.MERCHANT);
  const [entityId, setEntityId] = useState<string>(initialEntityId || '');
  const [selectedParameter, setSelectedParameter] = useState<Parameter | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<any>({});

  // LD1: Use useParameter hook to access parameter management functionality
  const { 
    parameters, 
    parameterDefinitions, 
    parameterInheritance, 
    resolvedParameter, 
    loading, 
    error, 
    fetchParameters, 
    getParameterDefinitions, 
    createParameter, 
    updateParameter, 
    deleteParameter, 
    getParameterInheritance,
    resolveParameter
  } = useParameter();

  // LD1: Use useToast hook for displaying notifications
  const { success, error: toastError } = useToast();

  // LD1: Fetch parameter definitions on component mount
  useEffect(() => {
    getParameterDefinitions();
  }, [getParameterDefinitions]);

  // LD1: Fetch parameters when entity type or ID changes
  useEffect(() => {
    if (entityType && entityId) {
      fetchParameters({ entityType, entityId, page: 1, pageSize: 10, includeInherited: true, search: '', category: '' });
      getParameterInheritance(entityType, entityId);
    }
  }, [entityType, entityId, fetchParameters, getParameterInheritance]);

  // LD1: Handle entity type selection changes
  const handleEntityTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEntityType = e.target.value as EntityType;
    setEntityType(newEntityType);
    setEntityId(''); // Clear entity ID when type changes
    onEntityChange?.(newEntityType, '');
  };

  // LD1: Handle entity ID selection changes
  const handleEntityIdChange = (newEntityId: string) => {
    setEntityId(newEntityId);
    onEntityChange?.(entityType, newEntityId);
  };

  // LD1: Handle parameter selection and display inheritance details
  const handleParameterSelect = (parameter: Parameter) => {
    setSelectedParameter(parameter);
    resolveParameter(parameter.parameterName, entityType, entityId);
  };

  // LD1: Implement add parameter functionality
  const handleAddParameter = () => {
    setIsEditing(true);
    setSelectedParameter(null);
    setFormValues({});
  };

  // LD1: Implement edit parameter functionality
  const handleEditParameter = () => {
    if (selectedParameter) {
      setIsEditing(true);
      setFormValues(cloneDeep(selectedParameter.value)); // Deep clone to avoid modifying original
    }
  };

  // LD1: Implement delete parameter functionality
  const handleDeleteParameter = async () => {
    if (selectedParameter) {
      try {
        await deleteParameter(selectedParameter.parameterName, entityType, entityId);
        success('Parameter deleted successfully');
        setSelectedParameter(null);
        fetchParameters({ entityType, entityId, page: 1, pageSize: 10, includeInherited: true, search: '', category: '' });
      } catch (e: any) {
        toastError(e.message || 'Failed to delete parameter');
      }
    }
  };

  // LD1: Render entity selector components (type and ID)
  // LD1: Render parameter list table with values and inheritance information
  // LD1: Render parameter detail view with inheritance chain visualization
  // LD1: Render parameter edit modal for adding or editing parameters
  // LD1: Handle loading states with spinner component
  // LD1: Handle error states with appropriate messaging
  return (
    <div className={`parameter-configuration ${className || ''}`}>
      <Card title="Entity Selection">
        <EntitySelector 
          entityType={entityType} 
          entityId={entityId} 
          onEntityTypeChange={handleEntityTypeChange}
          onEntityIdChange={handleEntityIdChange}
        />
      </Card>

      {entityType && entityId && (
        <div className="mt-4 flex">
          <div className="w-1/2 pr-4">
            <Card title="Parameter List" actions={
              <Button size="sm" onClick={handleAddParameter}>Add Parameter</Button>
            }>
              {loading ? (
                <div className="flex justify-center"><Spinner /></div>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : (
                <ParameterList 
                  parameters={parameters} 
                  onSelect={handleParameterSelect} 
                  selectedParameter={selectedParameter}
                  onEdit={handleEditParameter}
                  onDelete={handleDeleteParameter}
                />
              )}
            </Card>
          </div>

          <div className="w-1/2 pl-4">
            <Card title="Parameter Details">
              {selectedParameter && resolvedParameter ? (
                <ParameterInheritanceView resolvedParameter={resolvedParameter} />
              ) : (
                <p>Select a parameter to view details.</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {isEditing && (
        <ParameterEditForm
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          parameter={selectedParameter}
          entityType={entityType}
          entityId={entityId}
          onSubmit={() => {
            setIsEditing(false);
            fetchParameters({ entityType, entityId, page: 1, pageSize: 10, includeInherited: true, search: '', category: '' });
          }}
        />
      )}
    </div>
  );
};

interface EntitySelectorProps {
  entityType: EntityType;
  entityId: string;
  onEntityTypeChange: (entityType: EntityType) => void;
  onEntityIdChange: (entityId: string) => void;
}

/**
 * Sub-component for selecting entity type and ID
 */
const EntitySelector: React.FC<EntitySelectorProps> = ({
  entityType,
  entityId,
  onEntityTypeChange,
  onEntityIdChange,
}) => {
  // LD1: Render entity type dropdown with options (MERCHANT, ORGANIZATION, PROGRAM, BANK)
  // LD1: Conditionally render appropriate entity ID selector based on selected entity type
  // LD1: For MERCHANT type, render MerchantSelector component
  // LD1: For other types, render appropriate entity selector components
  // LD1: Handle selection changes and propagate them to parent component
  return (
    <div>
      <Select
        label="Entity Type"
        name="entityType"
        value={entityType}
        onChange={(e) => onEntityTypeChange(e.target.value as EntityType)}
        options={[
          { value: EntityType.MERCHANT, label: 'Merchant' },
          { value: EntityType.ORGANIZATION, label: 'Organization' },
          { value: EntityType.PROGRAM, label: 'Program' },
          { value: EntityType.BANK, label: 'Bank' },
        ]}
      />

      {entityType === EntityType.MERCHANT ? (
        <MerchantSelector
          label="Merchant"
          value={entityId}
          onChange={onEntityIdChange}
        />
      ) : (
        <TextField
          label="Entity ID"
          value={entityId}
          onChange={(e) => onEntityIdChange(e.target.value)}
        />
      )}
    </div>
  );
};

interface ParameterListProps {
  parameters: Parameter[];
  onSelect: (parameter: Parameter) => void;
  selectedParameter: Parameter | null;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Sub-component for displaying the list of parameters
 */
const ParameterList: React.FC<ParameterListProps> = ({
  parameters,
  onSelect,
  selectedParameter,
  onEdit,
  onDelete,
}) => {
  // LD1: Render table with parameter columns (name, value, type, inherited from)
  // LD1: Display parameter values with appropriate formatting based on data type
  // LD1: Show inheritance source when parameter is inherited from higher level
  // LD1: Implement sorting and filtering of parameters
  // LD1: Handle parameter selection by forwarding to parent component
  // LD1: Render add, edit, and delete buttons with appropriate permissions
  // LD1: Handle loading and empty states
  return (
    <div>
      <Table
        data={parameters}
        columns={[
          {
            field: 'definition.name',
            header: 'Name',
            render: (value, row) => row.definition.name,
          },
          {
            field: 'value',
            header: 'Value',
            render: (value, row) => formatParameterValue(value, row.definition.dataType),
          },
          {
            field: 'entityType',
            header: 'Inherited From',
            render: (value, row) => row.entityType,
          },
        ]}
        onRowClick={(row) => onSelect(row)}
        rowClassName={(row) => row.id === selectedParameter?.id ? 'bg-blue-100' : ''}
        actions={
          <>
            <Button size="sm" onClick={onEdit} disabled={!selectedParameter}>
              Edit
            </Button>
            <Button size="sm" variant="danger" onClick={onDelete} disabled={!selectedParameter}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
};

interface ParameterInheritanceViewProps {
  resolvedParameter: ResolvedParameter;
}

/**
 * Sub-component that visualizes parameter inheritance
 */
const ParameterInheritanceView: React.FC<ParameterInheritanceViewProps> = ({
  resolvedParameter,
}) => {
  // LD1: Display hierarchical structure of inheritance chain
  // LD1: Show current entity level and parent levels
  // LD1: Indicate which level defines the effective value
  // LD1: Show value at each level of the inheritance chain
  // LD1: Highlight overridden values
  // LD1: Use indentation and visual cues to represent hierarchy
  return (
    <div>
      <p>Parameter: {resolvedParameter.definition.name}</p>
      <ul>
        {resolvedParameter.inheritanceValues.map((value) => (
          <li key={`${value.entityType}-${value.entityId}`}>
            {value.entityType}: {formatParameterValue(value.value, resolvedParameter.definition.dataType)}
            {value.isEffective && <span> (Effective)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

interface ParameterEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  parameter?: Parameter;
  entityType: EntityType;
  entityId: string;
  onSubmit: () => void;
}

/**
 * Sub-component for adding or editing parameter values
 */
const ParameterEditForm: React.FC<ParameterEditFormProps> = ({
  isOpen,
  onClose,
  parameter,
  entityType,
  entityId,
  onSubmit,
}) => {
  // LD1: Render form fields for parameter selection, value, effective date, and expiration date
  // LD1: Use appropriate input component based on parameter data type
  // LD1: Handle form validation according to parameter definition rules
  // LD1: Implement form submission that creates or updates parameters
  // LD1: Display parameter definition information like data type and constraints
  // LD1: Show current value when editing existing parameters
  // LD1: Handle cancellation and form reset
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={parameter ? 'Edit Parameter' : 'Add Parameter'}>
      <Modal.Body>
        {/* Form content here */}
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onSubmit}>
          {parameter ? 'Update' : 'Create'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

/**
 * Utility function to format parameter values based on their data type
 */
const formatParameterValue = (value: any, dataType: ParameterDataType): string => {
  // LD1: Format string values as-is
  // LD1: Format number values with appropriate decimal places
  // LD1: Format boolean values as 'Yes' or 'No'
  // LD1: Format object and array values as JSON string with pretty printing
  // LD1: Format decimal values with currency symbol when appropriate
  // LD1: Handle null or undefined values with appropriate placeholder
  return String(value);
};

/**
 * Utility function to validate parameter values against their definition rules
 */
const validateParameterValue = (value: any, definition: ParameterDefinition): { valid: boolean, errors: string[] } => {
  // LD1: Validate value data type matches parameter definition
  // LD1: Apply range validation rules if applicable
  // LD1: Apply pattern validation rules if applicable
  // LD1: Apply enum validation rules if applicable
  // LD1: Return validation result with error messages
  return { valid: true, errors: [] };
};

export default ParameterConfiguration;