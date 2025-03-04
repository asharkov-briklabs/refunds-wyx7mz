import React from 'react';
import classNames from 'classnames';
import Button, { ButtonVariant, ButtonSize } from '../Button';
import Select from '../Select';

export interface PaginationProps {
  /** Current active page number */
  currentPage: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Number of items displayed per page */
  itemsPerPage: number;
  /** Maximum number of page buttons to display */
  maxPageButtons?: number;
  /** Callback fired when page changes */
  onPageChange: (page: number) => void;
  /** Callback fired when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Available options for items per page selector */
  pageSizeOptions?: number[];
  /** Whether to show the page size selector dropdown */
  showPageSizeSelector?: boolean;
  /** Whether to show "Items per page" label */
  showItemsPerPageLabel?: boolean;
  /** Whether to show the total items count and current range */
  showTotalItems?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Generates an array of page numbers to be displayed as pagination buttons,
 * with ellipsis for large page ranges
 * 
 * @param currentPage - The current active page
 * @param totalPages - Total number of pages
 * @param maxPageButtons - Maximum number of page buttons to display
 * @returns Array of page numbers and ellipsis strings
 */
const generatePaginationButtons = (
  currentPage: number,
  totalPages: number,
  maxPageButtons: number
): Array<number | string> => {
  // Handle simple cases
  if (totalPages <= maxPageButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  // We'll always have first and last page
  const result: Array<number | string> = [];
  
  // Calculate how many pages to show on each side of current page
  const sidesButtons = Math.floor((maxPageButtons - 3) / 2); // -3 for first, last, and current
  
  // Ensure we have at least 1 side button
  const sideButtonsCount = Math.max(1, sidesButtons);
  
  // Calculate start and end page
  let startPage = Math.max(2, currentPage - sideButtonsCount);
  let endPage = Math.min(totalPages - 1, currentPage + sideButtonsCount);
  
  // Adjust if current page is near the beginning or end
  if (currentPage <= sideButtonsCount + 1) {
    // Near beginning, show more on the right
    endPage = Math.min(totalPages - 1, maxPageButtons - 2);
  } else if (currentPage >= totalPages - sideButtonsCount) {
    // Near end, show more on the left
    startPage = Math.max(2, totalPages - maxPageButtons + 2);
  }
  
  // Always add first page
  result.push(1);
  
  // Add ellipsis if needed
  if (startPage > 2) {
    result.push('...');
  }
  
  // Add pages from start to end
  for (let i = startPage; i <= endPage; i++) {
    result.push(i);
  }
  
  // Add ellipsis if needed
  if (endPage < totalPages - 1) {
    result.push('...');
  }
  
  // Add last page if not already included (handles case when totalPages = 1)
  if (totalPages > 1) {
    result.push(totalPages);
  }
  
  return result;
};

/**
 * A reusable pagination component that provides navigation controls for paginated data.
 * It displays page numbers, previous/next buttons, shows the current page, and 
 * optionally allows changing the number of items per page.
 */
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  maxPageButtons = 5,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeSelector = true,
  showItemsPerPageLabel = true,
  showTotalItems = true,
  className = ''
}) => {
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // Calculate current displayed range
  const startItem = totalItems > 0 ? Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1) : 0;
  const endItem = Math.min(totalItems, currentPage * itemsPerPage);
  
  // Generate page buttons
  const pageButtons = generatePaginationButtons(
    currentPage,
    totalPages,
    maxPageButtons
  );
  
  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };
  
  // Handle page size change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value, 10);
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };
  
  return (
    <div 
      className={classNames(
        'flex flex-col sm:flex-row items-center justify-between gap-4',
        className
      )}
      role="navigation"
      aria-label="Pagination navigation"
    >
      {/* Pagination information */}
      {showTotalItems && totalItems > 0 && (
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalItems}</span> items
        </div>
      )}
      
      {/* Pagination controls */}
      <div className="flex items-center space-x-2">
        {/* Previous page button */}
        <Button
          variant={ButtonVariant.TERTIARY}
          size={ButtonSize.SM}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <span className="sr-only">Previous</span>
          <svg 
            className="h-5 w-5" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
        </Button>
        
        {/* Page buttons */}
        <div className="flex items-center space-x-1">
          {pageButtons.map((page, index) => (
            <React.Fragment key={`page-${index}`}>
              {typeof page === 'number' ? (
                <Button
                  variant={
                    page === currentPage 
                      ? ButtonVariant.PRIMARY 
                      : ButtonVariant.TERTIARY
                  }
                  size={ButtonSize.SM}
                  onClick={() => handlePageChange(page)}
                  aria-current={page === currentPage ? 'page' : undefined}
                  aria-label={`Page ${page}`}
                  className={page === currentPage ? 'font-bold' : ''}
                >
                  {page}
                </Button>
              ) : (
                <span className="px-2 text-gray-500" aria-hidden="true">
                  {page}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Next page button */}
        <Button
          variant={ButtonVariant.TERTIARY}
          size={ButtonSize.SM}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <span className="sr-only">Next</span>
          <svg 
            className="h-5 w-5" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
        </Button>
      </div>
      
      {/* Page size selector */}
      {showPageSizeSelector && onPageSizeChange && (
        <div className="flex items-center space-x-2">
          {showItemsPerPageLabel && (
            <label htmlFor="pagination-page-size" className="text-sm text-gray-700">
              Items per page
            </label>
          )}
          <Select
            name="pagination-page-size"
            id="pagination-page-size"
            value={itemsPerPage.toString()}
            onChange={handlePageSizeChange}
            options={pageSizeOptions.map(size => ({
              value: size.toString(),
              label: size.toString()
            }))}
            aria-label="Select number of items per page"
          />
        </div>
      )}
    </div>
  );
};

export default Pagination;