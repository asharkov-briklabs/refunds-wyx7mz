# src/web/src/pages/barracuda/MerchantsPage/MerchantsPage.tsx
```typescript
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.10.0
import debounce from 'lodash'; // lodash v4.17.21

import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import Table from '../../../components/common/Table';
import Button from '../../../components/common/Button';
import TextField from '../../../components/common/TextField';
import MerchantSelector, { Merchant } from '../../../components/barracuda/MerchantSelector';
import usePagination from '../../../hooks/usePagination';
import apiClient from '../../../services/api/api.client';
import { ROUTES } from '../../../constants/routes.constants';

/**
 * Main component for the Merchants page in the Barracuda admin interface
 * @returns Rendered merchants page
 */
const MerchantsPage: React.FC = () => {
  // LD1: Initialize state for merchants data, loading status, search term, and filters
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // LD1: Set up pagination using the usePagination hook
  const { currentPage, totalPages, goToPage } = usePagination({
    totalItems: merchants.length,
    itemsPerPage: 10,
  });

  // LD1: Create a navigate function using useNavigate hook for routing
  const navigate = useNavigate();

  // LD1: Create a debounced search function to prevent excessive API calls
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      // Implement search logic here (e.g., call API with search term)
      console.log('Searching for:', term);
    }, 300),
    []
  );

  // LD1: Implement useEffect to fetch merchant data when component mounts or filters change
  useEffect(() => {
    fetchMerchants();
  }, []);

  // LD1: Create a fetchMerchants function to load merchant data from API
  const fetchMerchants = async () => {
    setLoading(true);
    try {
      // LD1: Prepare query parameters including pagination, search, and filters
      // LD1: Make API request to get merchants data
      // LD1: Update the merchants state with the response data
      // LD1: Update total items count for pagination
      // LD1: Handle any errors that occur during the fetch operation
      const response = await apiClient.get<Merchant[]>('/merchants');
      if (response.success && response.data) {
        setMerchants(response.data);
      } else {
        console.error('Failed to fetch merchants');
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  // LD1: Create a handleSearchChange function to update search term state
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // LD1: Extract the value from the event target
    const { value } = event.target;
    // LD1: Update the search term state
    setSearchTerm(value);
    // LD1: Call the debounced search function
    debouncedSearch(value);
  };

  // LD1: Create a handleViewMerchant function to navigate to merchant details
  const handleViewMerchant = (merchant: Merchant) => {
    // LD1: Navigate to the merchant details route with the merchant ID as a parameter
    navigate(`/merchants/${merchant.id}`);
  };

  // LD1: Create a handleViewRefunds function to navigate to merchant refunds
  const handleViewRefunds = (merchantId: string) => {
    // LD1: Navigate to the refunds route with the merchant ID as a query parameter
    navigate(`${ROUTES.BARRACUDA}/refunds?merchantId=${merchantId}`);
  };

  // LD1: Create a handleViewParameters function to navigate to merchant parameters
  const handleViewParameters = (merchantId: string) => {
    // LD1: Navigate to the parameters route with the merchant ID as a query parameter
    navigate(`/parameters?merchantId=${merchantId}`);
  };

  // LD1: Define table columns configuration for merchant data
  const columns = useMemo(() => [
    {
      field: 'id',
      header: 'ID',
      width: '15%',
    },
    {
      field: 'name',
      header: 'Name',
      width: '25%',
    },
    {
      field: 'organizationId',
      header: 'Organization',
      width: '20%',
    },
    {
      field: 'status',
      header: 'Status',
      width: '15%',
    },
    {
      field: 'id',
      header: 'Metrics',
      width: '25%',
      render: (value: string, row: Merchant) => (
        <MerchantMetrics merchant={row} />
      ),
    },
  ], []);

  // LD1: Create MerchantMetrics component for rendering metrics data
  interface MerchantMetricsProps {
    merchant: Merchant;
  }
  const MerchantMetrics: React.FC<MerchantMetricsProps> = ({ merchant }) => {
    // LD1: Display total refund volume
    // LD1: Display refund success rate
    // LD1: Display average processing time
    // LD1: Display refund rate percentage
    return (
      <div className="flex space-x-4">
        <Button size="sm" onClick={() => handleViewRefunds(merchant.id)}>
          View Refunds
        </Button>
        <Button size="sm" onClick={() => handleViewParameters(merchant.id)}>
          View Parameters
        </Button>
      </div>
    );
  };

  // LD1: Render the MainLayout component with PageHeader and merchant content
  return (
    <MainLayout>
      <PageHeader title="Merchants">
        <TextField
          placeholder="Search merchants..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </PageHeader>

      {/* LD1: Render Table component with merchant data and loading state */}
      <Table
        data={merchants}
        columns={columns}
        isLoading={loading}
        rowKey={(merchant) => merchant.id}
      />

      {/* LD1: Render pagination controls at the bottom of the page */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span>{`Page ${currentPage} of ${totalPages}`}</span>
          <Button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </MainLayout>
  );
};

export default MerchantsPage;