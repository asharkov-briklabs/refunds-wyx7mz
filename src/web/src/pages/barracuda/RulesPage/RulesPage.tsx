import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import Tabs from '../../../components/common/Tabs';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Alert from '../../../components/common/Alert';
import CardNetworkRules from '../../../components/barracuda/CardNetworkRules';
import { CardNetworkType } from '../../../components/barracuda/CardNetworkRules';
import Spinner from '../../../components/common/Spinner';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { BASE_ROUTES, BARRACUDA_ROUTES } from '../../../constants/routes.constants';
import useParameter from '../../../hooks/useParameter';
import useToast from '../../../hooks/useToast';
import { EntityType } from '../../../types/parameter.types';

/**
 * Component for the Barracuda admin Rules page that allows management of different rule types
 */
const RulesPage: React.FC = () => {
  // LD1: Initialize the selected tab state with 'card-network' as default
  const [selectedTab, setSelectedTab] = useState<string>('card-network');

  // LD1: Initialize entity ID state with a default bank ID
  const [entityId, setEntityId] = useState<string>('default-bank-id');

  // LD1: Set up breadcrumb navigation data
  const breadcrumbs = useMemo(() => [
    { label: 'Barracuda', path: BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.DASHBOARD },
    { label: 'Configuration', path: BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.CONFIGURATION },
    { label: 'Rules', path: BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.RULES, active: true },
  ], []);

  // LD1: Use useParameter hook to access parameter management functionality
  const { 
    fetchParameters, 
    updateParameter, 
    parameters, 
    loading, 
    error 
  } = useParameter();

  // LD1: Use useToast hook for notifications
  const { success, error: toastError } = useToast();

  /**
   * Handles changing between different rule type tabs
   * @param {string} tabKey
   * @returns {void} No return value
   */
  const handleTabChange = useCallback((tabKey: string) => {
    // Update the selectedTab state to the new tabKey
    setSelectedTab(tabKey);
    // Fetch the appropriate rules data based on the selected tab
  }, []);

  /**
   * Handles updates to rule parameters
   * @param {object} updatedParameter
   * @returns {Promise<void>} Promise that resolves when update completes
   */
  const handleParameterUpdate = useCallback(async (updatedParameter: any) => {
    // Call updateParameter with the updated parameter data
    try {
      await updateParameter(updatedParameter.name, EntityType.BANK, entityId, { parameterValue: updatedParameter.value });
      // Show success toast notification if update succeeds
      success('Parameter updated successfully!');
      // Refresh the rules data if update succeeds
      fetchParameters({ entityType: EntityType.BANK, entityId: entityId, page: 1, pageSize: 10 });
    } catch (err: any) {
      // Show error toast notification if update fails
      toastError(`Failed to update parameter: ${err.message}`);
    }
  }, [updateParameter, entityId, success, toastError, fetchParameters]);

  // LD1: Use useEffect to fetch card network rules on component mount
  useEffect(() => {
    fetchParameters({ entityType: EntityType.BANK, entityId: entityId, page: 1, pageSize: 10 });
  }, [fetchParameters, entityId]);

  // LD1: Render the MainLayout component as the page wrapper
  return (
    <MainLayout>
      {/* LD1: Render the PageHeader with 'Rules Configuration' title and breadcrumbs */}
      <PageHeader title="Rules Configuration" breadcrumbs={breadcrumbs} />

      {/* LD1: Render tabs for different rule categories (card network, compliance, merchant) */}
      <Tabs
        tabs={[
          {
            id: 'card-network',
            label: 'Card Network Rules',
            content: (
              <>
                {/* LD1: Show loading spinner while fetching data */}
                {loading && (
                  <div className="flex justify-center">
                    <Spinner size="md" color="primary" />
                    <p className="ml-2">Loading card network rules...</p>
                  </div>
                )}

                {/* LD1: Show error alert if data fetching fails */}
                {error && (
                  <Alert type="error" message={`Failed to load card network rules: ${error}`} />
                )}

                {/* LD1: Render the CardNetworkRules component when card network tab is selected */}
                {!loading && !error && (
                  <CardNetworkRules entityId={entityId} initialNetwork={CardNetworkType.VISA} />
                )}
              </>
            ),
          },
          {
            id: 'compliance',
            label: 'Compliance Rules',
            content: <p>Compliance rules content coming soon...</p>, // LD1: Implement placeholder content for other rule types (to be implemented)
          },
          {
            id: 'merchant',
            label: 'Merchant Policies',
            content: <p>Merchant policies content coming soon...</p>, // LD1: Implement placeholder content for other rule types (to be implemented)
          },
        ]}
        defaultActiveTab={selectedTab}
        onChange={handleTabChange}
      />
    </MainLayout>
  );
};

export default RulesPage;