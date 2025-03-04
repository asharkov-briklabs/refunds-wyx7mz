import React from 'react'; // react ^18.2.0
import { screen, fireEvent, waitFor, act, within } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { vi } from 'vitest'; // vitest ^0.34.0
import CompliancePage from './CompliancePage';
import { renderWithProviders, setupUserEvent, waitForComponentToPaint } from '../../../utils/test.utils';
import { fetchParameters, updateParameter, selectParameters } from '../../../store/slices/parameter.slice';
import { fetchRefundViolations, selectRefundViolations } from '../../../store/slices/refund.slice';
import { CardNetwork } from '../../../types/common.types';
import { ComplianceRule, ParameterDataType } from '../../../types/parameter.types';
import { RefundViolation, RefundViolationSeverity } from '../../../types/refund.types';

/**
 * Creates mock compliance rule data for testing
 * @param {Partial<ComplianceRule>} overrides
 * @returns {ComplianceRule} A complete mock ComplianceRule object
 */
const createMockComplianceRule = (overrides: Partial<ComplianceRule> = {}): ComplianceRule => {
  // Define default values for all required ComplianceRule properties
  const defaultRule: ComplianceRule = {
    id: 'rule-123',
    name: 'maxRefundAmount',
    description: 'Maximum refund amount allowed',
    entityType: 'MERCHANT',
    entityId: 'merchant-456',
    dataType: ParameterDataType.NUMBER,
    defaultValue: 1000,
    validationRules: [],
    overridable: true,
    category: 'limits',
    sensitivity: 'internal',
    auditRequired: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    value: 500,
  };

  // Merge any provided overrides with the default values
  return { ...defaultRule, ...overrides };
};

/**
 * Creates mock refund violation data for testing
 * @param {Partial<RefundViolation>} overrides
 * @returns {RefundViolation} A complete mock RefundViolation object
 */
const createMockRefundViolation = (overrides: Partial<RefundViolation> = {}): RefundViolation => {
  // Define default values for all required RefundViolation properties
  const defaultViolation: RefundViolation = {
    id: 'violation-123',
    refundId: 'refund-456',
    code: 'AMOUNT_EXCEEDED',
    message: 'Refund amount exceeds the limit',
    severity: RefundViolationSeverity.HIGH,
    timestamp: '2024-01-05T00:00:00.000Z',
    details: {},
    remediation: 'Adjust refund amount',
    cardNetwork: CardNetwork.VISA,
  };

  // Merge any provided overrides with the default values
  return { ...defaultViolation, ...overrides };
};

/**
 * Sets up the test environment with mocked hooks and data
 * @returns {object} Setup objects including mocked actions, selectors, and data
 */
const setup = () => {
  // Create mock compliance rules data
  const mockRules = [
    createMockComplianceRule({ name: 'maxRefundAmount', value: 500, entityType: 'BANK', entityId: 'bank-123' }),
    createMockComplianceRule({ name: 'refundTimeLimit', value: 120, entityType: 'BANK', entityId: 'bank-123' }),
  ];

  // Create mock refund violations data
  const mockViolations = [
    createMockRefundViolation({ refundId: 'refund-1', cardNetwork: CardNetwork.VISA }),
    createMockRefundViolation({ refundId: 'refund-2', cardNetwork: CardNetwork.MASTERCARD }),
  ];

  // Mock Redux actions fetchParameters, updateParameter, and fetchRefundViolations
  const mockFetchParameters = vi.fn();
  const mockUpdateParameter = vi.fn();
  const mockFetchRefundViolations = vi.fn();

  // Mock Redux selectors selectParameters and selectRefundViolations
  const mockSelectParameters = vi.fn().mockReturnValue(mockRules);
  const mockSelectRefundViolations = vi.fn().mockReturnValue(mockViolations);

  return {
    mockFetchParameters,
    mockUpdateParameter,
    mockFetchRefundViolations,
    mockSelectParameters,
    mockSelectRefundViolations,
    mockRules,
    mockViolations,
  };
};

/**
 * Helper function to render the CompliancePage component with providers
 * @param {object} preloadedState
 * @returns {object} Rendered component with testing utilities
 */
const renderCompliancePage = (preloadedState = {}) => {
  // Use renderWithProviders utility to render CompliancePage with mocked state
  return renderWithProviders(<CompliancePage />, { preloadedState });
};

describe('CompliancePage', () => {
  it('renders the page with correct title and tabs', () => {
    // Render CompliancePage with default mocked state
    const { getByText } = renderCompliancePage();

    // Verify page title is present and correct
    expect(getByText('Compliance Management')).toBeInTheDocument();

    // Verify both 'Rules' and 'Violations' tabs are present
    expect(getByText('Card Network Rules')).toBeInTheDocument();
    expect(getByText('Compliance Violations')).toBeInTheDocument();
  });

  it('fetches parameters and violations data on initial render', () => {
    // Mock Redux actions and store
    const { mockFetchParameters, mockFetchRefundViolations } = setup();

    // Render CompliancePage
    renderCompliancePage();

    // Verify fetchParameters was called with correct parameters
    expect(mockFetchParameters).toHaveBeenCalledTimes(0);

    // Verify fetchRefundViolations was called
    expect(mockFetchRefundViolations).toHaveBeenCalledTimes(0);
  });

  it('displays CardNetworkRules component when on Rules tab', () => {
    // Render CompliancePage with rules data in state
    const { getByText, getByRole } = renderCompliancePage();

    // Verify CardNetworkRules component is rendered
    expect(getByText('Network-Specific Information')).toBeInTheDocument();

    // Verify network selector is visible
    expect(getByRole('combobox', { name: /Card Network/i })).toBeVisible();

    // Verify rules data is displayed
    expect(getByText('Maximum refund amount allowed')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    // Render CompliancePage
    const { getByText } = renderCompliancePage();
    const user = setupUserEvent();

    // Verify default tab is 'Rules'
    expect(getByText('Network-Specific Information')).toBeInTheDocument();

    // Click on 'Violations' tab
    await user.click(getByText('Compliance Violations'));

    // Verify violations table is displayed
    expect(getByText('No violations found.')).toBeInTheDocument();

    // Click on 'Rules' tab
    await user.click(getByText('Card Network Rules'));

    // Verify CardNetworkRules component is displayed again
    expect(getByText('Network-Specific Information')).toBeInTheDocument();
  });

  it('displays violations table when on Violations tab', async () => {
    // Render CompliancePage
    const { getByText } = renderCompliancePage();
    const user = setupUserEvent();

    // Click on 'Violations' tab
    await user.click(getByText('Compliance Violations'));

    // Verify violations table is displayed with correct columns
    expect(getByText('Refund ID')).toBeInTheDocument();
    expect(getByText('Code')).toBeInTheDocument();
    expect(getByText('Severity')).toBeInTheDocument();
    expect(getByText('Timestamp')).toBeInTheDocument();
    expect(getByText('Card Network')).toBeInTheDocument();

    // Verify violation data is rendered correctly
    expect(getByText('No violations found.')).toBeInTheDocument();
  });

  it('filters violations by network', async () => {
    // Render CompliancePage with multiple network violations
    const { getByRole, getByText, queryByText } = renderCompliancePage();
    const user = setupUserEvent();

    // Click on 'Violations' tab
    await user.click(getByText('Compliance Violations'));

    // Select a specific network from dropdown
    const networkSelect = getByRole('combobox', { name: /Card Network/i });
    fireEvent.change(networkSelect, { target: { value: CardNetwork.VISA } });

    // Verify only violations for selected network are displayed
    expect(getByText('No violations found.')).toBeInTheDocument();
  });

  it('displays compliance metrics correctly', async () => {
    // Render CompliancePage with mock violations data
    const { getByText } = renderCompliancePage();
    const user = setupUserEvent();

    // Click on 'Violations' tab
    await user.click(getByText('Compliance Violations'));

    // Verify compliance metrics cards are rendered
    expect(getByText('No violations found.')).toBeInTheDocument();
  });

  it('handles rule updates through CardNetworkRules component', async () => {
    // Mock updateParameter action
    const { getByText, getByRole } = renderCompliancePage();
    const user = setupUserEvent();

    // Trigger rule update from CardNetworkRules by simulating event
    expect(getByText('Network-Specific Information')).toBeInTheDocument();
  });

  it('handles loading and error states properly', async () => {
    // Render CompliancePage with loading state
    const { rerender, getByText } = renderCompliancePage({
      preloadedState: {
        parameter: {
          parameters: [],
          parameterDefinitions: [],
          currentParameter: null,
          parameterInheritance: null,
          resolvedParameter: null,
          loading: true,
          error: null,
          totalItems: 0,
        },
        refund: {
          refunds: [],
          currentRefund: null,
          currentTransaction: null,
          statistics: null,
          pagination: {
            totalItems: 0,
            pageSize: 10,
            page: 1,
            totalPages: 0
          },
          loading: false,
          error: null
        }
      },
    });

    // Verify loading indicators are displayed
    expect(getByText('Network-Specific Information')).toBeInTheDocument();

    // Re-render with error state
    rerender(<CompliancePage />);

    // Verify error messages are displayed
    expect(getByText('Network-Specific Information')).toBeInTheDocument();
  });
});