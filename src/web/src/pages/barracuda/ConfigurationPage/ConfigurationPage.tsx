import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import { useNavigate, useParams, useLocation } from 'react-router-dom'; // react-router-dom ^6.9.0
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import Tabs, { TabItem, TabVariant, TabOrientation } from '../../../components/common/Tabs';
import ParameterConfiguration from '../../../components/barracuda/ParameterConfiguration';
import { EntityType } from '../../../types/parameter.types';
import CardNetworkRules from '../../../components/barracuda/CardNetworkRules';
import { CardNetworkType } from '../../../components/barracuda/CardNetworkRules';
import ApprovalWorkflowConfiguration from '../../../components/barracuda/ApprovalWorkflowConfiguration';
import useAuth from '../../../hooks/useAuth';

/**
 * Main component for the configuration page that provides access to various configuration options
 * @returns {JSX.Element} The rendered configuration page
 */
const ConfigurationPage: React.FC = () => {
  // LD1: Initialize state for the active tab
  const [activeTab, setActiveTab] = useState<string>('parameters');

  // LD1: Get user data from authentication hook
  const { user } = useAuth();

  // LD1: Get navigation functions from React Router
  const navigate = useNavigate();
  const { search } = useLocation();

  // LD1: Get any URL parameters that might specify initial tab or entity
  const params = useParams<{ entityType?: string; entityId?: string }>();

  // LD1: Extract bank ID or other relevant data from user context
  const bankId = user?.bankId || '';

  // LD1: Initialize entity values for configuration components
  const initialEntityType = (params.entityType as EntityType) || EntityType.BANK;
  const initialEntityId = params.entityId || bankId;

  /**
   * Handles tab selection changes
   * @param {string|number} tabId
   * @returns {void} No return value
   */
  const handleTabChange = (tabId: string | number): void => {
    // Update the active tab state
    setActiveTab(String(tabId));

    // Update URL if needed to persist tab selection
    navigate(`?tab=${tabId}`);
  };

  /**
   * Handles changes to the selected entity for configuration
   * @param {EntityType} entityType
   * @param {string} entityId
   * @returns {void} No return value
   */
  const handleEntityChange = (entityType: EntityType, entityId: string): void => {
    // Update the entity selection state
    navigate(`/barracuda/configuration/${entityType}/${entityId}`);
  };

  // LD1: Create tab configuration data with parameter, card networks, and approval workflow tabs
  const tabs: TabItem[] = [
    {
      id: 'parameters',
      label: 'Parameters',
      content: (
        <ParameterConfiguration
          initialEntityType={initialEntityType}
          initialEntityId={initialEntityId}
          onEntityChange={handleEntityChange}
        />
      ),
    },
    {
      id: 'cardNetworks',
      label: 'Card Networks',
      content: (
        <CardNetworkRules
          entityId={initialEntityId}
          initialNetwork={CardNetworkType.VISA}
        />
      ),
    },
    {
      id: 'approvalWorkflows',
      label: 'Approval Workflows',
      content: <ApprovalWorkflowConfiguration entityType={EntityType.BANK} entityId={initialEntityId} onSave={() => {}} onCancel={() => {}} />,
    },
  ];

  // LD1: Render the page inside the MainLayout component
  return (
    <MainLayout>
      {/* LD1: Include PageHeader with title and breadcrumbs */}
      <PageHeader title="Configuration" />

      {/* LD1: Render the Tabs component with the different configuration sections */}
      <Tabs
        tabs={tabs}
        defaultActiveTab={activeTab}
        onChange={handleTabChange}
        orientation={TabOrientation.HORIZONTAL}
        variant={TabVariant.CONTAINED}
        fullWidth
      />
    </MainLayout>
  );
};

export default ConfigurationPage;