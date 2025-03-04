import React, { useState, useEffect, useMemo } from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid'; // ^2.0.18
import Spinner from '../Spinner';
import Pagination from '../Pagination';

/**
 * Props for table columns
 */
export interface TableColumn<T> {
  /** Key of the data field this column displays */
  field: keyof T;
  /** Header text to display for this column */
  header: string;
  /** Column width (CSS value or number in px) */
  width?: string | number;
  /** Whether this column can be sorted */
  sortable?: boolean;
  /** Custom cell renderer function */
  render?: (value: any, row: T, index: number) => React.ReactNode;
  /** Optional CSS class for the cell */
  className?: string;
  /** Optional CSS class for the header cell */
  headerClassName?: string;
  /** Optional alignment for the content */
  align?: 'left' | 'center' | 'right';
}

/**
 * Props for the Table component
 */
export interface TableProps<T> {
  /** Array of data to display in the table */
  data: T[];
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Whether the table is in a loading state */
  isLoading?: boolean;
  /** Message to display when there is no data */
  emptyMessage?: string;
  /** Whether the table supports sorting */
  sortable?: boolean;
  /** Initial sort configuration */
  initialSort?: {
    field: keyof T;
    direction: 'asc' | 'desc';
  };
  /** Whether rows can be selected */
  selectable?: boolean;
  /** Called when row selection changes */
  onSelectRows?: (rows: T[]) => void;
  /** Function to get a unique key for each row */
  rowKey?: (row: T) => string;
  /** Called when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Pagination configuration */
  pagination?: {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
  };
  /** Additional CSS class for the table container */
  className?: string;
  /** CSS class for the table element */
  tableClassName?: string;
  /** CSS class for the header row */
  headerClassName?: string;
  /** CSS class for the table body */
  bodyClassName?: string;
  /** CSS class or function returning a CSS class for each row */
  rowClassName?: string | ((row: T) => string);
  /** Accessibility label for the table */
  ariaLabel?: string;
}

/**
 * A reusable table component with support for sorting, pagination, custom rendering,
 * row selection, and more. Used across the application to display various types of data.
 */
const Table = <T extends Record<string, any>>(props: TableProps<T>): JSX.Element => {
  const {
    data = [],
    columns = [],
    isLoading = false,
    emptyMessage = 'No data available',
    sortable = false,
    initialSort,
    selectable = false,
    onSelectRows,
    rowKey = (row: T) => JSON.stringify(row),
    onRowClick,
    pagination,
    className = '',
    tableClassName = '',
    headerClassName = '',
    bodyClassName = '',
    rowClassName = '',
    ariaLabel = 'Data table',
  } = props;

  // Set up sort state
  const [sortField, setSortField] = useState<keyof T | null>(
    sortable && initialSort ? initialSort.field : null
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    initialSort?.direction || 'asc'
  );

  // Set up selection state
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  // Update sort state if initialSort changes
  useEffect(() => {
    if (sortable && initialSort) {
      setSortField(initialSort.field);
      setSortDirection(initialSort.direction);
    }
  }, [sortable, initialSort]);

  /**
   * Sorts an array of data based on the specified sort field and direction
   */
  const sortData = (
    data: T[],
    sortField: keyof T | null,
    sortDirection: 'asc' | 'desc'
  ): T[] => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      // Handle different data types
      if (aValue === null || aValue === undefined) return sortDirection === 'asc' ? -1 : 1;
      if (bValue === null || bValue === undefined) return sortDirection === 'asc' ? 1 : -1;

      // Compare dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Compare strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Compare numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Default comparison
      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  };

  /**
   * Updates the sort state when a column header is clicked
   */
  const handleSort = (field: keyof T) => {
    const column = columns.find((col) => col.field === field);
    if (!sortable || column?.sortable === false) return;

    if (field === sortField) {
      // Toggle direction if already sorting by this field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /**
   * Handles selection/deselection of a row when checkbox is clicked
   */
  const handleRowSelection = (row: T) => {
    let newSelectedRows: T[];
    const isSelected = isRowSelected(row);

    if (isSelected) {
      // Remove from selection
      newSelectedRows = selectedRows.filter(
        (selectedRow) => rowKey(selectedRow) !== rowKey(row)
      );
    } else {
      // Add to selection
      newSelectedRows = [...selectedRows, row];
    }

    setSelectedRows(newSelectedRows);
    if (onSelectRows) {
      onSelectRows(newSelectedRows);
    }
  };

  /**
   * Checks if a row is in the selectedRows array
   */
  const isRowSelected = (row: T): boolean => {
    return selectedRows.some((selectedRow) => rowKey(selectedRow) === rowKey(row));
  };

  // Memoize the sorted data
  const sortedData = useMemo(() => {
    return sortData(data, sortField, sortDirection);
  }, [data, sortField, sortDirection]);

  // Apply pagination to the data if pagination is enabled
  const displayData = useMemo(() => {
    if (!pagination) return sortedData;

    const { currentPage, itemsPerPage } = pagination;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, pagination]);

  // Render a loading spinner when data is loading
  if (isLoading) {
    return (
      <div className={classNames('flex justify-center items-center py-8', className)}>
        <Spinner size="lg" color="primary" ariaLabel="Loading table data" />
      </div>
    );
  }

  // Render empty state message when there's no data
  if (data.length === 0) {
    return (
      <div className={classNames('text-center py-8 text-gray-500', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table
          className={classNames(
            'min-w-full divide-y divide-gray-200 border-collapse',
            tableClassName
          )}
          aria-label={ariaLabel}
        >
          <thead className={classNames('bg-gray-50', headerClassName)}>
            <tr>
              {/* Selection checkbox column */}
              {selectable && (
                <th className="px-6 py-3 w-12">
                  <span className="sr-only">Selection</span>
                </th>
              )}

              {/* Column headers */}
              {columns.map((column) => {
                // Determine if column is sortable
                const isColumnSortable = sortable && column.sortable !== false;
                const isSorted = sortField === column.field;

                return (
                  <th
                    key={String(column.field)}
                    className={classNames(
                      'px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase',
                      isColumnSortable ? 'cursor-pointer select-none' : '',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.headerClassName
                    )}
                    style={{ width: column.width }}
                    onClick={() => isColumnSortable && handleSort(column.field)}
                    aria-sort={
                      isSorted
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {isColumnSortable && (
                        <span className="inline-flex flex-col">
                          {isSorted && sortDirection === 'asc' ? (
                            <ChevronUpIcon className="w-4 h-4 text-blue-600" aria-hidden="true" />
                          ) : isSorted && sortDirection === 'desc' ? (
                            <ChevronDownIcon className="w-4 h-4 text-blue-600" aria-hidden="true" />
                          ) : (
                            <span className="relative w-4 h-4 opacity-50 group-hover:opacity-100">
                              <ChevronUpIcon
                                className="absolute w-4 h-4 text-gray-400"
                                aria-hidden="true"
                              />
                              <ChevronDownIcon
                                className="absolute w-4 h-4 text-gray-400"
                                aria-hidden="true"
                              />
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody
            className={classNames('bg-white divide-y divide-gray-200', bodyClassName)}
          >
            {displayData.map((row, rowIndex) => {
              const isSelected = selectable && isRowSelected(row);
              const rowClasses = typeof rowClassName === 'function' 
                ? rowClassName(row) 
                : rowClassName;

              return (
                <tr
                  key={rowKey(row)}
                  className={classNames(
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : '',
                    isSelected ? 'bg-blue-50' : '',
                    rowClasses
                  )}
                  onClick={() => onRowClick && onRowClick(row)}
                  aria-selected={isSelected}
                >
                  {/* Selection checkbox cell */}
                  {selectable && (
                    <td className="px-6 py-4 whitespace-nowrap w-12" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={isSelected}
                          onChange={() => handleRowSelection(row)}
                          aria-label={`Select row ${rowIndex + 1}`}
                        />
                      </div>
                    </td>
                  )}

                  {/* Data cells */}
                  {columns.map((column) => {
                    const value = row[column.field];
                    
                    return (
                      <td
                        key={`${rowKey(row)}-${String(column.field)}`}
                        className={classNames(
                          'px-6 py-4 whitespace-nowrap',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.className
                        )}
                      >
                        {column.render
                          ? column.render(value, row, rowIndex)
                          : value != null
                          ? String(value)
                          : ''}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.currentPage}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            pageSizeOptions={pagination.pageSizeOptions}
          />
        </div>
      )}
    </div>
  );
};

export default Table;