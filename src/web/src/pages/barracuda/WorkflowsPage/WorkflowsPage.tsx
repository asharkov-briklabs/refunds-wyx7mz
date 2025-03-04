import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'; // ^2.0.0
import PageHeader from '../../../components/layout/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Table from '../../../components/common/Table';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import Pagination from '../../../components/common/Pagination';
import Select from '../../../components/common/Select';
import TextField from '../../../components/common/TextField';
import ApprovalWorkflowConfiguration, { TriggerType, TimeoutAction } from '../../../components/barracuda/ApprovalWorkflowConfiguration';
import useParameter from '../../../hooks/useParameter';
import usePagination from '../../../hooks/usePagination';
import useToast from '../../../hooks/useToast';
import { EntityType } from '../../../types/parameter.types';

interface WorkflowListItem {
  id: string;
  name: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  triggerType: TriggerType;
  threshold: number;
  approvalLevels: number;
  createdAt: string;
  updatedAt: string;
}

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

interface ApprovalLevel {
  role: string;
  timeout: number;
}

interface WorkflowsPageState {
  loading: boolean;
  workflows: WorkflowListItem[];
  totalItems: number;
  page: number;
  pageSize: number;
  search: string;
  entityType: EntityType | null;
  entityId: string | null;
  selectedWorkflow: ApprovalWorkflow | null;
  isModalOpen: boolean;
  isConfirmDialogOpen: boolean;
  isNewWorkflow: boolean;
}

const WorkflowsPage: React.FC = () => {
  // LD1: Initialize state for workflows listing, filtering, and modals
  const [state, setState] = useState<WorkflowsPageState>({
    loading: false,
    workflows: [],
    totalItems: 0,
    page: 1,
    pageSize: 10,
    search: '',
    entityType: null,
    entityId: null,
    selectedWorkflow: null,
    isModalOpen: false,
    isConfirmDialogOpen: false,
    isNewWorkflow: false,
  });

  // LD2: Set up hooks for parameter operations, pagination, and toast notifications
  const { fetchParameters } = useParameter();
  const { currentPage, itemsPerPage, goToPage } = usePagination({
    totalItems: state.totalItems,
    itemsPerPage: state.pageSize,
    initialPage: state.page,
  });
  const { success, error } = useToast();

  // LD3: Implement fetchWorkflows function to load workflows with filtering and pagination
  const fetchWorkflows = useCallback(async () => {
    setState((prevState) => ({ ...prevState, loading: true }));
    try {
      // IE1: Satisfy the prerequisites for fetchParameters by providing the required parameters
      await fetchParameters({
        entityType: state.entityType,
        entityId: state.entityId,
        searchQuery: state.search,
        pagination: { page: currentPage, pageSize: itemsPerPage },
      });
      setState((prevState) => ({
        ...prevState,
        loading: false,
        // workflows: fakeWorkflows, // Replace with actual data from fetchParameters
        totalItems: 100, // Replace with actual total items from fetchParameters
      }));
    } catch (e: any) {
      error(e.message || 'Failed to fetch workflows');
      setState((prevState) => ({ ...prevState, loading: false }));
    }
  }, [fetchParameters, state.entityType, state.entityId, state.search, currentPage, itemsPerPage, error]);

  // LD4: Implement handleCreateWorkflow function to open modal for new workflow creation
  const handleCreateWorkflow = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      selectedWorkflow: null,
      isModalOpen: true,
      isNewWorkflow: true,
    }));
  }, []);

  // LD5: Implement handleEditWorkflow function to open modal with selected workflow data
  const handleEditWorkflow = useCallback((workflow: WorkflowListItem) => {
    setState((prevState) => ({
      ...prevState,
      selectedWorkflow: {
        id: workflow.id,
        name: workflow.name,
        entityType: workflow.entityType,
        entityId: workflow.entityId,
        triggerType: workflow.triggerType,
        threshold: workflow.threshold,
        additionalCondition: null,
        approvalLevels: [],
        finalEscalation: null,
        onTimeout: TimeoutAction.ESCALATE_TO_NEXT_LEVEL,
      },
      isModalOpen: true,
      isNewWorkflow: false,
    }));
  }, []);

  // LD6: Implement handleDeleteWorkflow function to confirm and delete a workflow
  const handleDeleteWorkflow = useCallback((workflow: WorkflowListItem) => {
    setState((prevState) => ({
      ...prevState,
      selectedWorkflow: {
        id: workflow.id,
        name: workflow.name,
        entityType: workflow.entityType,
        entityId: workflow.entityId,
        triggerType: workflow.triggerType,
        threshold: workflow.threshold,
        additionalCondition: null,
        approvalLevels: [],
        finalEscalation: null,
        onTimeout: TimeoutAction.ESCALATE_TO_NEXT_LEVEL,
      },
      isConfirmDialogOpen: true,
    }));
  }, []);

  // LD7: Implement handleSaveWorkflow function to create or update a workflow
  const handleSaveWorkflow = useCallback((workflow: ApprovalWorkflow) => {
    // Implement save logic here (API call)
    success('Workflow saved successfully!');
    setState((prevState) => ({ ...prevState, isModalOpen: false }));
  }, [success]);

  // LD8: Implement handleCancelWorkflow to close the workflow modal
  const handleCancelWorkflow = useCallback(() => {
    setState((prevState) => ({ ...prevState, isModalOpen: false, isConfirmDialogOpen: false }));
  }, []);

  // LD9: Implement handleEntityTypeChange for entity type filtering
  const handleEntityTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setState((prevState) => ({ ...prevState, entityType: e.target.value as EntityType, page: 1 }));
  }, []);

  // LD10: Implement handleEntityIdChange for entity ID filtering
  const handleEntityIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prevState) => ({ ...prevState, entityId: e.target.value, page: 1 }));
  }, []);

  // LD11: Implement handleSearchChange for keyword searching
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prevState) => ({ ...prevState, search: e.target.value, page: 1 }));
  }, []);

  // LD12: Implement handlePageChange for pagination navigation
  const handlePageChange = useCallback((newPage: number) => {
    goToPage(newPage);
    setState((prevState) => ({ ...prevState, page: newPage }));
  }, [goToPage]);

  // LD13: Call fetchWorkflows on initial render and when filters change
  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // LD14: Define table columns
  const columns = useMemo(() => [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'entityType', header: 'Entity Type', sortable: true },
    { field: 'entityName', header: 'Entity Name' },
    { field: 'triggerType', header: 'Trigger Type' },
    { field: 'threshold', header: 'Threshold' },
    { field: 'approvalLevels', header: 'Approval Levels' },
    { field: 'createdAt', header: 'Created At', sortable: true },
    {
      header: 'Actions',
      render: (_value, row: WorkflowListItem) => (
        <div className="flex space-x-2">
          <Button variant="secondary" size="sm" onClick={() => handleEditWorkflow(row)}>
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDeleteWorkflow(row)}>
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [handleEditWorkflow, handleDeleteWorkflow]);

  // LD15: Render the component
  return (
    <div>
      {/* LD15.1: Render PageHeader with title and create workflow button */}
      <PageHeader
        title="Approval Workflows"
        actions={<Button variant="primary" onClick={handleCreateWorkflow}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>}
      />

      <Card>
        {/* LD15.2: Render search and filter controls */}
        <div className="flex items-center space-x-4 mb-4">
          <TextField
            placeholder="Search workflows..."
            value={state.search}
            onChange={handleSearchChange}
          />
          <Select
            options={[
              { label: 'Merchant', value: EntityType.MERCHANT },
              { label: 'Organization', value: EntityType.ORGANIZATION },
              { label: 'Program', value: EntityType.PROGRAM },
              { label: 'Bank', value: EntityType.BANK },
            ]}
            value={state.entityType || ''}
            onChange={handleEntityTypeChange}
            label="Entity Type"
          />
          <TextField
            placeholder="Entity ID..."
            value={state.entityId || ''}
            onChange={handleEntityIdChange}
          />
        </div>

        {/* LD15.3: Render Table component with workflows data and action buttons */}
        <Table
          columns={columns}
          data={state.workflows}
          isLoading={state.loading}
        />

        {/* LD15.4: Render Pagination component for navigating between pages */}
        <Pagination
          currentPage={currentPage}
          totalItems={state.totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      </Card>

      {/* LD15.5: Render Modal for creating/editing workflow with ApprovalWorkflowConfiguration */}
      <Modal
        isOpen={state.isModalOpen}
        onClose={handleCancelWorkflow}
        title={state.isNewWorkflow ? 'Create Approval Workflow' : 'Edit Approval Workflow'}
      >
        <ApprovalWorkflowConfiguration
          workflow={state.selectedWorkflow}
          entityType={state.entityType}
          entityId={state.entityId}
          isNew={state.isNewWorkflow}
          onSave={handleSaveWorkflow}
          onCancel={handleCancelWorkflow}
        />
      </Modal>

      {/* LD15.6: Render ConfirmDialog for workflow deletion confirmation */}
      <ConfirmDialog
        isOpen={state.isConfirmDialogOpen}
        title="Delete Approval Workflow"
        message={`Are you sure you want to delete workflow "${state.selectedWorkflow?.name}"?`}
        onConfirm={() => {
          // Implement delete logic here (API call)
          success('Workflow deleted successfully!');
          setState((prevState) => ({ ...prevState, isConfirmDialogOpen: false }));
        }}
        onCancel={handleCancelWorkflow}
      />
    </div>
  );
};

export default WorkflowsPage;