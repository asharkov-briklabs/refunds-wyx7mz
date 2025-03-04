import React, { useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce'; // ^4.17.21
import { Select, SelectProps, SelectSize } from '../../common/Select/Select';
import TextField from '../../common/TextField/TextField';
import Spinner from '../../common/Spinner/Spinner';
import { SelectOption } from '../../../types/common.types';
import { apiClient } from '../../../services/api';

/**
 * Interface defining merchant data structure
 */
export interface Merchant {
  id: string;
  name: string;
  organizationId: string;
  programId: string;
  bankId: string;
  status: 'active' | 'inactive' | 'suspended';
}

/**
 * Props interface for the MerchantSelector component
 */
export interface MerchantSelectorProps {
  /** Unique identifier for the component */
  id?: string;
  /** Currently selected merchant ID */
  value?: string;
  /** Callback function called when merchant selection changes */
  onChange: (merchantId: string) => void;
  /** Label text displayed above the dropdown */
  label?: string;
  /** Placeholder text displayed when no merchant is selected */
  placeholder?: string;
  /** Error message to display */
  error?: string;
  /** Helper text displayed below the component */
  helperText?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether a merchant selection is required */
  required?: boolean;
  /** Whether to show a search input above the dropdown */
  showSearch?: boolean;
  /** Size variant of the dropdown */
  size?: SelectSize;
  /** Whether the component should take up full width of container */
  fullWidth?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Filter merchants by organization ID */
  filterByOrganization?: string;
  /** Filter merchants by program ID */
  filterByProgram?: string;
  /** Filter merchants by bank ID */
  filterByBank?: string;
}

/**
 * A reusable component for the Barracuda admin interface that allows users to select
 * merchants from a dropdown or search for specific merchants. Used in refund administration,
 * parameter configuration, and reporting interfaces.
 */
const MerchantSelector: React.FC<MerchantSelectorProps> = (props) => {
  const {
    id,
    value,
    onChange,
    label,
    placeholder = 'Select a merchant',
    error,
    helperText,
    disabled = false,
    required = false,
    showSearch = false,
    size = SelectSize.MD,
    fullWidth = false,
    className,
    searchPlaceholder = 'Search merchants...',
    filterByOrganization,
    filterByProgram,
    filterByBank
  } = props;

  // State for merchants, search term, and loading status
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Format merchants data into select options
  const merchantOptions = useMemo<SelectOption[]>(() => {
    return filteredMerchants.map(merchant => ({
      value: merchant.id,
      label: merchant.name,
      disabled: merchant.status !== 'active'
    }));
  }, [filteredMerchants]);

  // Debounced search function to prevent excessive API calls
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      if (!term) {
        setFilteredMerchants(merchants);
        return;
      }
      
      const lowerCaseTerm = term.toLowerCase();
      const filtered = merchants.filter(merchant => 
        merchant.name.toLowerCase().includes(lowerCaseTerm)
      );
      setFilteredMerchants(filtered);
    }, 300),
    [merchants]
  );

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  // Handle merchant selection
  const handleMerchantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const merchantId = e.target.value;
    onChange(merchantId);
  };

  // Fetch merchants from API
  const fetchMerchants = useCallback(async () => {
    setIsLoading(true);
    setLoadingError(null);

    try {
      // Prepare query parameters for filtering
      const params: Record<string, string> = {};
      
      if (filterByOrganization) {
        params.organizationId = filterByOrganization;
      }
      
      if (filterByProgram) {
        params.programId = filterByProgram;
      }
      
      if (filterByBank) {
        params.bankId = filterByBank;
      }

      const response = await apiClient.get<Merchant[]>('/merchants', params);
      
      if (response.success && response.data) {
        setMerchants(response.data);
        setFilteredMerchants(response.data);
      } else {
        setLoadingError('Failed to load merchants');
      }
    } catch (err) {
      setLoadingError('Error fetching merchants');
      console.error('Error fetching merchants:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterByOrganization, filterByProgram, filterByBank]);

  // Fetch merchants on component mount and when filter parameters change
  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  // Fetch a specific merchant by ID if needed
  const fetchMerchantById = useCallback(async (merchantId: string) => {
    if (!merchantId) return;
    
    try {
      const response = await apiClient.get<Merchant>(`/merchants/${merchantId}`);
      if (response.success && response.data) {
        // Add this merchant to our list if it's not already there
        setMerchants(prevMerchants => {
          if (!prevMerchants.some(m => m.id === response.data.id)) {
            return [...prevMerchants, response.data];
          }
          return prevMerchants;
        });
        
        // Also update filtered merchants if we're not searching
        if (!searchTerm) {
          setFilteredMerchants(prevFiltered => {
            if (!prevFiltered.some(m => m.id === response.data.id)) {
              return [...prevFiltered, response.data];
            }
            return prevFiltered;
          });
        }
      }
    } catch (err) {
      console.error('Error fetching specific merchant:', err);
    }
  }, [searchTerm]);

  // Effect to fetch the selected merchant if not in list
  useEffect(() => {
    if (value && merchants.length > 0 && !merchants.some(m => m.id === value)) {
      fetchMerchantById(value);
    }
  }, [value, merchants, fetchMerchantById]);

  // Effect to clean up debounced search on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return (
    <div className={`merchant-selector ${className || ''}`}>
      {/* Search input */}
      {showSearch && (
        <div className="mb-2">
          <TextField
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={disabled}
            size="small"
            fullWidth={fullWidth}
          />
        </div>
      )}

      {/* Merchant dropdown */}
      <Select
        id={id}
        name="merchantSelector"
        options={merchantOptions}
        value={value || ''}
        onChange={handleMerchantChange}
        label={label}
        placeholder={placeholder}
        error={error || loadingError || undefined}
        helperText={helperText}
        disabled={disabled || isLoading}
        required={required}
        size={size}
        fullWidth={fullWidth}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center mt-2">
          <Spinner size="sm" color="primary" />
        </div>
      )}
    </div>
  );
};

export default MerchantSelector;