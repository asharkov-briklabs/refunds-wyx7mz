import { useState, useMemo, useEffect } from 'react';

/**
 * Options for configuring pagination behavior
 */
interface PaginationOptions {
  /** Total number of items across all pages */
  totalItems: number;
  /** Number of items to display per page (default: 10) */
  itemsPerPage?: number;
  /** Page to start on (default: 1) */
  initialPage?: number;
}

/**
 * Result object containing pagination state and navigation functions
 */
interface PaginationResult {
  /** Current active page (1-based) */
  currentPage: number;
  /** Total number of pages based on totalItems and itemsPerPage */
  totalPages: number;
  /** Number of items displayed per page */
  itemsPerPage: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Starting index (0-based) of items on the current page */
  startIndex: number;
  /** Ending index (0-based) of items on the current page */
  endIndex: number;
  /** Whether there is a previous page available */
  hasPreviousPage: boolean;
  /** Whether there is a next page available */
  hasNextPage: boolean;
  /** Navigate to a specific page */
  goToPage: (page: number) => void;
  /** Navigate to the next page (if available) */
  goToNextPage: () => void;
  /** Navigate to the previous page (if available) */
  goToPreviousPage: () => void;
  /** Navigate to the first page */
  goToFirstPage: () => void;
  /** Navigate to the last page */
  goToLastPage: () => void;
}

/**
 * Custom hook for implementing pagination logic in components that display lists of data.
 * 
 * @param options - Configuration options for pagination
 * @returns Object containing pagination state and navigation functions
 * 
 * @example
 * ```tsx
 * // Using the hook in a component
 * const { 
 *   currentPage, 
 *   totalPages,
 *   startIndex,
 *   endIndex,
 *   goToNextPage, 
 *   goToPreviousPage 
 * } = usePagination({
 *   totalItems: 100,
 *   itemsPerPage: 10
 * });
 * 
 * // Display items for the current page
 * const currentItems = allItems.slice(startIndex, endIndex + 1);
 * ```
 */
const usePagination = (options: PaginationOptions): PaginationResult => {
  const { totalItems, itemsPerPage = 10, initialPage = 1 } = options;
  
  // Use state to track the current page
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // Reset to page 1 if totalItems or itemsPerPage changes and current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalItems, itemsPerPage, totalPages, currentPage]);
  
  // Calculate start and end indices for the current page (0-based)
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems - 1);
  
  // Determine if we can navigate to previous or next pages
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  
  // Navigation functions with validation to prevent out-of-bounds navigation
  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };
  
  const goToNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPreviousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToFirstPage = () => {
    setCurrentPage(1);
  };
  
  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };
  
  // Return pagination state and functions in a memoized object to prevent unnecessary rerenders
  return useMemo(() => ({
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    startIndex,
    endIndex,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
  }), [
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    startIndex,
    endIndex,
    hasPreviousPage,
    hasNextPage
  ]);
};

export default usePagination;