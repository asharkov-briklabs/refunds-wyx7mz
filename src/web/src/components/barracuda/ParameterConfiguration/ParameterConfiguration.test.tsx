import React from 'react'; // react ^18.2.0
import { screen, waitFor, within, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { jest } from '@testing-library/react'; // jest ^29.5.0
import ParameterConfiguration from './ParameterConfiguration';
import { renderWithProviders, waitForComponentToPaint, setupUserEvent } from '../../../utils/test.utils';
import { EntityType, ParameterDataType } from '../../../types/parameter.types';

/**
 * Helper function to set up the component for testing
 * @param {object} props - Component properties
 * @returns {object} Rendered component and test utilities
 */
const setup = (props = {}) => {
  // LD1: Set up default props for the component
  const defaultProps = {
    initialEntityType: EntityType.MERCHANT,
    initialEntityId: 'test-merchant-id',
    onEntityChange: jest.fn(),
    className: 'test-class',
    ...props,
  };

  // LD2: Create a mock user event instance
  const user = setupUserEvent();

  // LD3: Set up mock Redux state with parameter definitions and data
  const mockParameterDefs = mockParameterDefinitions();
  const mockParams = mockParameters();
  const preloadedState = {
    parameter: {
      parameters: mockParams,
      parameterDefinitions: mockParameterDefs,
      currentParameter: null,
      parameterInheritance: null,
      resolvedParameter: null,
      loading: false,
      error: null,
      totalItems: mockParams.length,
    },
  };

  // LD4: Render the component with providers using renderWithProviders
  const renderResult = renderWithProviders(
    <ParameterConfiguration {...defaultProps} />,
    { preloadedState }
  );

  // LD5: Return rendered component and user event instance
  return {
    ...renderResult,
    user,
  };
};

/**
 * Helper function to create mock parameter definitions
 * @returns {array} Array of mock parameter definitions
 */
const mockParameterDefinitions = () => {
  // LD1: Create array of mock parameter definitions with different data types
  const definitions = [
    {
      name: 'maxRefundAmount',
      description: 'Maximum refund amount',
      dataType: ParameterDataType.NUMBER,
      defaultValue: 1000,
      validationRules: [],
      overridable: true,
      category: 'limits',
      sensitivity: 'internal',
      auditRequired: true,
    },
    {
      name: 'refundTimeLimit',
      description: 'Refund time limit in days',
      dataType: ParameterDataType.NUMBER,
      defaultValue: 30,
      validationRules: [{ type: 'RANGE', min: 1, max: 365 }],
      overridable: true,
      category: 'limits',
      sensitivity: 'internal',
      auditRequired: true,
    },
    {
      name: 'requireDocumentation',
      description: 'Whether documentation is required for refunds',
      dataType: ParameterDataType.BOOLEAN,
      defaultValue: false,
      validationRules: [],
      overridable: true,
      category: 'rules',
      sensitivity: 'internal',
      auditRequired: true,
    },
  ];

  // LD2: Include validation rules for some parameters
  // LD3: Return the mock parameter definitions array
  return definitions;
};

/**
 * Helper function to create mock parameters
 * @returns {array} Array of mock parameters
 */
const mockParameters = () => {
  // LD1: Create array of mock parameters with values at different entity levels
  const parameters = [
    {
      id: 'param-1',
      entityType: EntityType.MERCHANT,
      entityId: 'test-merchant-id',
      parameterName: 'maxRefundAmount',
      value: 500,
      effectiveDate: '2023-01-01',
      expirationDate: null,
      overridden: false,
      version: 1,
      createdBy: 'admin',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      definition: {
        name: 'maxRefundAmount',
        description: 'Maximum refund amount',
        dataType: ParameterDataType.NUMBER,
        defaultValue: 1000,
        validationRules: [],
        overridable: true,
        category: 'limits',
        sensitivity: 'internal',
        auditRequired: true,
      },
    },
    {
      id: 'param-2',
      entityType: EntityType.ORGANIZATION,
      entityId: 'test-org-id',
      parameterName: 'refundTimeLimit',
      value: 60,
      effectiveDate: '2023-01-01',
      expirationDate: null,
      overridden: false,
      version: 1,
      createdBy: 'admin',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      definition: {
        name: 'refundTimeLimit',
        description: 'Refund time limit in days',
        dataType: ParameterDataType.NUMBER,
        defaultValue: 30,
        validationRules: [{ type: 'RANGE', min: 1, max: 365 }],
        overridable: true,
        category: 'limits',
        sensitivity: 'internal',
        auditRequired: true,
      },
    },
  ];

  // LD2: Include parameters that are inherited and overridden
  // LD3: Return the mock parameters array
  return parameters;
};

/**
 * Helper function to create mock parameter inheritance data
 * @returns {object} Mock inheritance data structure
 */
const mockParameterInheritance = () => {
  // LD1: Create mock inheritance chain with entities at different levels
  const inheritance = {
    current: {
      entityType: EntityType.MERCHANT,
      entityId: 'test-merchant-id',
      entityName: 'Test Merchant',
      level: 1,
    },
    inheritance: [
      {
        entityType: EntityType.ORGANIZATION,
        entityId: 'test-org-id',
        entityName: 'Test Organization',
        level: 2,
      },
      {
        entityType: EntityType.PROGRAM,
        entityId: 'test-program-id',
        entityName: 'Test Program',
        level: 3,
      },
    ],
  };

  // LD2: Return the mock inheritance data structure
  return inheritance;
};

/**
 * Helper function to create mock resolved parameter data
 * @returns {object} Mock resolved parameter with inheritance values
 */
const mockResolvedParameter = () => {
  // LD1: Create mock resolved parameter with values at different inheritance levels
  const resolved = {
    parameterName: 'maxRefundAmount',
    definition: {
      name: 'maxRefundAmount',
      description: 'Maximum refund amount',
      dataType: ParameterDataType.NUMBER,
      defaultValue: 1000,
      validationRules: [],
      overridable: true,
      category: 'limits',
      sensitivity: 'internal',
      auditRequired: true,
    },
    effectiveValue: 500,
    inheritanceValues: [
      {
        entityType: EntityType.MERCHANT,
        entityId: 'test-merchant-id',
        entityName: 'Test Merchant',
        value: 500,
        level: 1,
        isEffective: true,
      },
      {
        entityType: EntityType.ORGANIZATION,
        entityId: 'test-org-id',
        entityName: 'Test Organization',
        value: 1000,
        level: 2,
        isEffective: false,
      },
    ],
    effectiveLevel: 1,
  };

  // LD2: Indicate which level's value is effective
  // LD3: Return the mock resolved parameter data
  return resolved;
};

describe('ParameterConfiguration Component', () => {
  it('renders without crashing', () => {
    const { getByText } = setup();
    expect(getByText('Entity Selection')).toBeInTheDocument();
  });

  it('displays the entity selection card', () => {
    const { getByText } = setup();
    expect(getByText('Entity Selection')).toBeVisible();
  });

  it('displays the parameter list card when entity type and ID are selected', async () => {
    const { findByText, user } = setup();
    const merchantSelect = screen.getByLabelText('Entity Type');
    fireEvent.change(merchantSelect, { target: { value: 'MERCHANT' } });
    const merchantIdInput = screen.getByLabelText('Merchant');
    fireEvent.change(merchantIdInput, { target: { value: 'test-merchant-id' } });
    await waitForComponentToPaint();
    expect(await findByText('Parameter List')).toBeVisible();
  });

  it('displays the parameter details card when a parameter is selected', async () => {
    const { findByText, user } = setup();
    const merchantSelect = screen.getByLabelText('Entity Type');
    fireEvent.change(merchantSelect, { target: { value: 'MERCHANT' } });
    const merchantIdInput = screen.getByLabelText('Merchant');
    fireEvent.change(merchantIdInput, { target: { value: 'test-merchant-id' } });
    await waitForComponentToPaint();
    const parameterName = await screen.findByText('maxRefundAmount');
    fireEvent.click(parameterName);
    expect(await findByText('Parameter Details')).toBeVisible();
  });
});