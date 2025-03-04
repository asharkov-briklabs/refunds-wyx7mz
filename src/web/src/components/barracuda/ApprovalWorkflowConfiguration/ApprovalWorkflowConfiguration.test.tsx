import React from 'react'; // ^18.2.0
import { screen, waitFor, within, fireEvent } from '@testing-library/react'; // ^14.0.0
import { ApprovalWorkflowConfiguration } from './ApprovalWorkflowConfiguration';
import { renderWithProviders, waitForComponentToPaint, setupUserEvent } from '../../../utils/test.utils';
import { EntityType } from '../../../types/parameter.types';
import { MockWorkflow } from './ApprovalWorkflowConfiguration.test';
import { TriggerType, TimeoutAction } from './ApprovalWorkflowConfiguration';
import { jest } from 'jest'; // ^29.5.0

/**
 * Helper function to set up the component for testing
 * @param {object} props - Component props
 * @returns {object} Rendered component and test utilities
 */
const setup = (props: any = {}) => {
  // LD1: Set up default props for the component
  const defaultProps = {
    entityType: EntityType.MERCHANT,
    entityId: 'test-merchant-id',
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  const combinedProps = { ...defaultProps, ...props };

  // LD2: Create a mock user event instance
  const user = setupUserEvent();

  // LD3: Set up mock Redux state with roles and configuration data
  const preloadedState = {
    auth: {
      isAuthenticated: true,
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['BARRACUDA_ADMIN'],
        permissions: [],
        merchantId: 'test-merchant-id',
        organizationId: null,
        bankId: null,
        programId: null,
        mfaEnabled: false,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      token: 'test-token',
      loading: false,
      error: null,
    },
  };

  // LD4: Render the component with providers using renderWithProviders
  const renderResult = renderWithProviders(
    <ApprovalWorkflowConfiguration {...combinedProps} />,
    { preloadedState }
  );

  // LD5: Return rendered component and user event instance
  return {
    ...renderResult,
    user,
  };
};

/**
 * Helper function to create a mock workflow for testing
 * @param {object} overrides - Overrides for the default workflow
 * @returns {MockWorkflow} Mock workflow object
 */
const createMockWorkflow = (overrides: any = {}): MockWorkflow => {
  // LD1: Create default mock workflow with AMOUNT trigger type
  const defaultWorkflow = {
    name: 'Test Workflow',
    entityType: EntityType.MERCHANT,
    entityId: 'test-merchant-id',
    triggerType: TriggerType.AMOUNT,
    threshold: 100,
    additionalCondition: null,
    approvalLevels: [],
    finalEscalation: null,
    onTimeout: TimeoutAction.ESCALATE_TO_NEXT_LEVEL,
  };

  // LD2: Add default approval levels
  defaultWorkflow.approvalLevels = [
    { role: 'MERCHANT_ADMIN', timeout: 4 },
    { role: 'ORGANIZATION_ADMIN', timeout: 8 },
  ];

  // LD3: Set default timeout action
  defaultWorkflow.onTimeout = TimeoutAction.ESCALATE_TO_NEXT_LEVEL;

  // LD4: Apply any overrides to customize the workflow
  const mockWorkflow = { ...defaultWorkflow, ...overrides };

  // LD5: Return the mock workflow object
  return mockWorkflow;
};

describe('ApprovalWorkflowConfiguration Component', () => {
  it('renders the component with default props', async () => {
    // Arrange
    const { container } = setup();

    // Act: Wait for the component to paint
    await waitForComponentToPaint({ container });

    // Assert
    expect(screen.getByText('Approval Workflow Configuration')).toBeInTheDocument();
    expect(screen.getByLabelText('Workflow Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Trigger Type')).toBeInTheDocument();
  });

  it('displays existing workflow data when a workflow prop is provided', async () => {
    // Arrange
    const mockWorkflow = createMockWorkflow({ name: 'Existing Workflow', threshold: 500 });
    const { container } = setup({ workflow: mockWorkflow });

    // Act: Wait for the component to paint
    await waitForComponentToPaint({ container });

    // Assert
    expect(screen.getByLabelText('Workflow Name')).toHaveValue('Existing Workflow');
    expect(screen.getByLabelText('Threshold Amount')).toHaveValue('500');
  });

  it('calls onSave when the Save Workflow button is clicked', async () => {
    // Arrange
    const onSave = jest.fn();
    const { container, user } = setup({ onSave });

    // Act
    await waitForComponentToPaint({ container });
    await user.click(screen.getByText('Save Workflow'));

    // Assert
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the Cancel button is clicked', async () => {
    // Arrange
    const onCancel = jest.fn();
    const { container, user } = setup({ onCancel });

    // Act
    await waitForComponentToPaint({ container });
    await user.click(screen.getByText('Cancel'));

    // Assert
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('adds and removes approval levels dynamically', async () => {
    // Arrange
    const { container, user } = setup();

    // Act
    await waitForComponentToPaint({ container });
    await user.click(screen.getByText('Add Approval Level'));

    // Assert
    expect(screen.getAllByLabelText(/Level \d+ Role/)).toHaveLength(3);

    // Act
    const removeButton = screen.getAllByRole('button', { name: /svg/ })[0];
    await user.click(removeButton);

    // Assert
    expect(screen.getAllByLabelText(/Level \d+ Role/)).toHaveLength(2);
  });

  it('updates approval level properties correctly', async () => {
    // Arrange
    const { container, user } = setup();

    // Act
    await waitForComponentToPaint({ container });
    const roleSelect = screen.getByLabelText('Level 1 Role');
    fireEvent.change(roleSelect, { target: { value: 'ORGANIZATION_ADMIN' } });

    // Assert
    expect(roleSelect).toHaveValue('ORGANIZATION_ADMIN');
  });

  it('displays threshold amount input when Amount trigger type is selected', async () => {
    // Arrange
    const { container, user } = setup();

    // Act
    await waitForComponentToPaint({ container });
    const triggerTypeSelect = screen.getByLabelText('Trigger Type');
    fireEvent.change(triggerTypeSelect, { target: { value: TriggerType.AMOUNT } });

    // Assert
    expect(screen.getByLabelText('Threshold Amount')).toBeVisible();
  });

  it('hides threshold amount input when Amount trigger type is not selected', async () => {
    // Arrange
    const { container, user } = setup();

    // Act
    await waitForComponentToPaint({ container });
    const triggerTypeSelect = screen.getByLabelText('Trigger Type');
    fireEvent.change(triggerTypeSelect, { target: { value: TriggerType.PAYMENT_METHOD } });

    // Assert
    expect(screen.queryByLabelText('Threshold Amount')).not.toBeInTheDocument();
  });

  it('displays final escalation select when Escalation to Next Level timeout action is selected', async () => {
    // Arrange
    const { container, user } = setup();

    // Act
    await waitForComponentToPaint({ container });
    const onTimeoutSelect = screen.getByLabelText('On Timeout');
    fireEvent.change(onTimeoutSelect, { target: { value: TimeoutAction.ESCALATE_TO_NEXT_LEVEL } });

    // Assert
    expect(screen.getByLabelText('Final Escalation')).toBeVisible();
  });

  it('hides final escalation select when Escalation to Next Level timeout action is not selected', async () => {
    // Arrange
    const { container, user } = setup();

    // Act
    await waitForComponentToPaint({ container });
    const onTimeoutSelect = screen.getByLabelText('On Timeout');
    fireEvent.change(onTimeoutSelect, { target: { value: TimeoutAction.AUTO_APPROVE } });

    // Assert
    expect(screen.queryByLabelText('Final Escalation')).not.toBeInTheDocument();
  });
});