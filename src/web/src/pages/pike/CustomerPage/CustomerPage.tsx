import React, { useState, useEffect, useCallback } from 'react'; // React v18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.0.0
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import Tabs from '../../../components/common/Tabs';
import CustomerRefundHistory from '../../../components/pike/CustomerRefundHistory';
import Spinner from '../../../components/common/Spinner';
import Alert from '../../../components/common/Alert';
import Card from '../../../components/common/Card';
import useRefund from '../../../hooks/useRefund';
import { Customer } from '../../../types/common.types';

/**
 * React functional component that renders the customer profile page with tabs for different sections
 * @returns {JSX.Element} Rendered customer page component
 */
const CustomerPage: React.FC = () => {
  // LD1: Extract customerId from route parameters using useParams hook
  const { customerId } = useParams<{ customerId: string }>();

  // LD1: Set up state for customer data, loading status, and error handling
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // LD1: Set up state for active tab
  const [activeTab, setActiveTab] = useState<string>('information');

  // LD1: Use the useNavigate hook for navigation
  const navigate = useNavigate();

  /**
   * Fetches customer data from the API based on the customerId
   * @param {string} customerId
   * @returns {Promise<void>} No direct return value, updates state
   */
  const fetchCustomerData = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      // LD1: Call API to fetch customer data
      // const response = await apiService.getCustomer(customerId);
      // LD1: Update customer state with response data
      // setCustomer(response.data);
      setCustomer({
        id: customerId,
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: [],
        permissions: [],
        merchantId: 'merchant123',
        organizationId: 'org123',
        bankId: 'bank123',
        programId: 'program123',
        mfaEnabled: false,
        lastLogin: '2024-01-01T00:00:00.000Z',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      });
    } catch (err: any) {
      // LD1: Handle errors if API call fails
      setError(err.message || 'Failed to fetch customer data');
    } finally {
      // LD1: Set loading state to false regardless of outcome
      setLoading(false);
    }
  }, []);

  /**
   * Handles tab selection changes
   * @param {string} tabId
   * @returns {void} No return value, updates state
   */
  const handleTabChange = (tabId: string) => {
    // LD1: Update active tab state with the selected tabId
    setActiveTab(tabId);
  };

  /**
   * Navigates back to the customers list page
   * @returns {void} No return value, triggers navigation
   */
  const handleBackToCustomers = () => {
    // LD1: Use navigate function to go back to the customers page
    navigate(-1);
  };

  // LD1: Fetch customer data on component mount
  useEffect(() => {
    if (customerId) {
      fetchCustomerData(customerId);
    }
  }, [customerId, fetchCustomerData]);

  // LD1: Define tab items for the tab navigation
  const tabItems = [
    { id: 'information', label: 'Information', content: <div>Customer Information</div> },
    { id: 'transactions', label: 'Transactions', content: <div>Transaction History</div> },
    { id: 'refunds', label: 'Refunds', content: <CustomerRefundHistory customerId={customerId || ''} /> },
    { id: 'notes', label: 'Notes', content: <div>Customer Notes</div> },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Customer Profile"
        breadcrumbs={[
          { label: 'Customers', path: '/customers' },
          { label: customer?.firstName || 'Customer', path: '', active: true },
        ]}
        actions={<button onClick={handleBackToCustomers}>Back to Customers</button>}
      />
      {loading && <Spinner />}
      {error && <Alert type="error" message={error} />}
      {customer && (
        <Card title={`${customer.firstName} ${customer.lastName}`}>
          <Tabs tabs={tabItems} defaultActiveTab={activeTab} onChange={handleTabChange} />
        </Card>
      )}
    </MainLayout>
  );
};

export default CustomerPage;