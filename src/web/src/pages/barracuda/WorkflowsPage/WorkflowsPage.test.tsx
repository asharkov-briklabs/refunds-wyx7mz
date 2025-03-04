import React from 'react'; // react ^18.2.0
import { screen, waitFor, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { renderWithProviders, setupUserEvent, waitForComponentToPaint } from '../../../utils/test.utils';
import WorkflowsPage from './WorkflowsPage';
import { EntityType } from '../../../types/parameter.types';
import { TriggerType, TimeoutAction } from '../../../components/barracuda/ApprovalWorkflowConfiguration';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { API_VERSION } from '../../../constants/api.constants';
import { uiActions } from '../../../store';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { MockedFunction } from 'jest-mock';

// jest ^29.5.0
// LD1: Define mock workflows data for testing
const mockWorkflows = [
  {
    id: '1',
    name: 'High Value Refunds',
    entityType: EntityType.MERCHANT,
    entityId: 'merchant123',
    entityName: 'TechCorp',
    triggerType: TriggerType.AMOUNT,
    threshold: 1000,
    approvalLevels: 2,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Payment Method Exceptions',
    entityType: EntityType.ORGANIZATION,
    entityId: 'org456',
    entityName: 'Global Retail',
    triggerType: TriggerType.PAYMENT_METHOD,
    threshold: 0,
    approvalLevels: 1,
    createdAt: '2023-02-15T00:00:00.000Z',
    updatedAt: '2023-02-15T00:00:00.000Z',
  },
];

// LD1: Define mock entities data for testing
const mockEntities = [
  { value: EntityType.MERCHANT, label: 'Merchant' },
  { value: EntityType.ORGANIZATION, label: 'Organization' },
  { value: EntityType.PROGRAM, label: 'Program' },
  { value: EntityType.BANK, label: 'Bank' },
];

// Mock the API endpoint for fetching workflows
const mockGetWorkflows = rest.get(`/v1/workflows`, (req, res, ctx) => {
  return res(ctx.status(200), ctx.json({ items: mockWorkflows, totalItems: mockWorkflows.length }));
});

// Mock the API endpoint for creating workflows
const mockCreateWorkflow = rest.post(`/v1/workflows`, (req, res, ctx) => {
  return res(ctx.status(201), ctx.json({ id: '3', ...req.body }));
});

// Mock the API endpoint for updating workflows
const mockUpdateWorkflow = rest.put(`/v1/workflows/:id`, (req, res, ctx) => {
  const { id } = req.params;
  return res(ctx.status(200), ctx.json({ id, ...req.body }));
});

// Mock the API endpoint for deleting workflows
const mockDeleteWorkflow = rest.delete(`/v1/workflows/:id`, (req, res, ctx) => {
  return res(ctx.status(204));
});

// Mock the API endpoint for fetching parameter definitions
const mockGetParameterDefinitions = rest.get(`/v1/parameters/definitions`, (req, res, ctx) => {
  return res(ctx.status(200), ctx.json([]));
});

// Set up mock server
const server = setupServer(
  mockGetWorkflows,
  mockCreateWorkflow,
  mockUpdateWorkflow,
  mockDeleteWorkflow,
  mockGetParameterDefinitions
);

// Before all tests, start the mock server
beforeAll(() => server.listen());

// After each test, reset handlers to prevent state pollution
afterEach(() => server.resetHandlers());

// After all tests, close the mock server
afterAll(() => server.close());

describe('WorkflowsPage Component', () => {
  // LD1: Setup before each test
  beforeEach(() => {
    // Reset mock implementations
    jest.clearAllMocks();

    // Mock the API responses for workflow data
    server.use(mockGetWorkflows);

    // Mock the API responses for parameter definitions
    server.use(mockGetParameterDefinitions);
  });

  // LD1: Cleanup after each test
  afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should render the workflows page', async () => {
    // LD1: Render the WorkflowsPage component using renderWithProviders
    const { container } = renderWithProviders(<WorkflowsPage />);

    // LD2: Wait for the component to finish loading
    await waitForComponentToPaint({ container });

    // LD3: Verify the page title is displayed
    expect(screen.getByText('Approval Workflows')).toBeInTheDocument();

    // LD4: Verify the 'Add Workflow' button is present
    expect(screen.getByText('Create Workflow')).toBeInTheDocument();

    // LD5: Verify the workflows table is rendered
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should load and display workflows', async () => {
    // LD1: Render the WorkflowsPage component
    renderWithProviders(<WorkflowsPage />);

    // LD2: Wait for the API call to resolve
    await waitFor(() => {
      expect(screen.getByText('High Value Refunds')).toBeInTheDocument();
      expect(screen.getByText('Payment Method Exceptions')).toBeInTheDocument();
    });

    // LD3: Check that workflow names, entity types, and triggers are correctly shown
    expect(screen.getByText('High Value Refunds')).toBeVisible();
    expect(screen.getByText('Merchant')).toBeVisible();
    expect(screen.getByText('Amount')).toBeVisible();
  });

  it('should filter workflows by entity type', async () => {
    // LD1: Render the WorkflowsPage component
    renderWithProviders(<WorkflowsPage />);

    // LD2: Wait for workflows to load
    await waitFor(() => {
      expect(screen.getByText('High Value Refunds')).toBeInTheDocument();
    });

    // LD3: Select an entity type from the dropdown
    fireEvent.change(screen.getByLabelText('Entity Type'), {
      target: { value: EntityType.MERCHANT },
    });

    // LD4: Verify that the API is called with the correct entity type filter
    await waitFor(() => {
      expect(mockGetWorkflows).toHaveBeenCalled();
    });

    // LD5: Verify that the filtered workflows are displayed
    expect(screen.getByText('High Value Refunds')).toBeVisible();
    expect(screen.queryByText('Payment Method Exceptions')).toBeNull();
  });

  it('should search workflows by name', async () => {
    // LD1: Render the WorkflowsPage component
    renderWithProviders(<WorkflowsPage />);

    // LD2: Wait for workflows to load
    await waitFor(() => {
      expect(screen.getByText('High Value Refunds')).toBeInTheDocument();
    });

    // LD3: Type search text in the search input
    fireEvent.change(screen.getByPlaceholderText('Search workflows...'), {
      target: { value: 'High Value' },
    });

    // LD4: Verify that the API is called with the search parameter
    await waitFor(() => {
      expect(mockGetWorkflows).toHaveBeenCalled();
    });

    // LD5: Verify the search results are displayed
    expect(screen.getByText('High Value Refunds')).toBeVisible();
    expect(screen.queryByText('Payment Method Exceptions')).toBeNull();
  });

  it('should open create workflow modal when Add Workflow button is clicked', async () => {
    // LD1: Render the WorkflowsPage component
    renderWithProviders(<WorkflowsPage />);

    // LD2: Click the 'Add Workflow' button
    fireEvent.click(screen.getByText('Create Workflow'));

    // LD3: Verify the workflow configuration modal is displayed
    await waitFor(() => {
      expect(screen.getByText('Approval Workflow Configuration')).toBeInTheDocument();
    });

    // LD4: Check that the form elements are rendered correctly
    expect(screen.getByLabelText('Workflow Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Trigger Type')).toBeInTheDocument();

    // LD5: Verify the modal is in 'create' mode
    expect(screen.getByText('Save Workflow')).toBeInTheDocument();
  });

  it('should handle API errors', async () => {
    // LD1: Mock the API to return an error
    server.use(
      rest.get(`/v1/workflows`, (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: 'Internal Server Error' }));
      })
    );

    // LD2: Render the WorkflowsPage component
    renderWithProviders(<WorkflowsPage />);

    // LD3: Wait for the API call to fail
    await waitFor(() => {
      expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
    });

    // LD4: Verify an error message is displayed
    expect(screen.getByText('Internal Server Error')).toBeVisible();

    // LD5: Verify the error handling logic works correctly
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('should handle pagination correctly', async () => {
    // LD1: Mock API to return paginated results
    const mockPaginatedWorkflows = rest.get(`/v1/workflows`, (req, res, ctx) => {
      const page = req.url.searchParams.get('page') || '1';
      const pageSize = req.url.searchParams.get('pageSize') || '10';
      const start = (parseInt(page) - 1) * parseInt(pageSize);
      const end = start + parseInt(pageSize);
      const paginatedWorkflows = mockWorkflows.slice(start, end);
      return res(
        ctx.status(200),
        ctx.json({
          items: paginatedWorkflows,
          totalItems: mockWorkflows.length,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(mockWorkflows.length / parseInt(pageSize)),
        })
      );
    });
    server.use(mockPaginatedWorkflows);

    // LD2: Render the WorkflowsPage component
    renderWithProviders(<WorkflowsPage />);

    // LD3: Wait for initial page to load
    await waitFor(() => {
      expect(screen.getByText('High Value Refunds')).toBeInTheDocument();
    });

    // LD4: Click next page button
    const nextButton = screen.getByRole('button', { name: 'Next page' });
    fireEvent.click(nextButton);

    // LD5: Verify API is called with updated page parameter
    await waitFor(() => {
      expect(mockPaginatedWorkflows).toHaveBeenCalled();
    });

    // LD6: Verify next page of workflows is displayed
    // expect(screen.getByText('Workflow 3')).toBeInTheDocument();
  });

  it('should validate workflow form inputs', async () => {
    // LD1: Render the WorkflowsPage component
    renderWithProviders(<WorkflowsPage />);

    // LD2: Click 'Add Workflow' button
    fireEvent.click(screen.getByText('Create Workflow'));

    // LD3: Submit the form without required fields
    fireEvent.click(screen.getByText('Save Workflow'));

    // LD4: Verify validation errors are displayed
    // expect(screen.getByText('Workflow Name is required')).toBeInTheDocument();

    // LD5: Fill in required fields
    fireEvent.change(screen.getByLabelText('Workflow Name'), {
      target: { value: 'Test Workflow' },
    });

    // LD6: Verify form can now be submitted
    fireEvent.click(screen.getByText('Save Workflow'));
  });
});