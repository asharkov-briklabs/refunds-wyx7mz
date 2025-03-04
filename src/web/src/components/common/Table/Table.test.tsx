import React from 'react'; // ^18.2.0
import { screen, waitFor, fireEvent } from '@testing-library/react'; // ^14.0.0
import Table, { TableProps } from './Table';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';

describe('Table component', () => {
  const renderTable = (props: Partial<TableProps<any>>) => {
    const defaultData = [
      { id: 1, name: 'Item 1', value: 10 },
      { id: 2, name: 'Item 2', value: 20 },
      { id: 3, name: 'Item 3', value: 15 },
    ];
    const defaultColumns = [
      { field: 'id', header: 'ID', width: '50px' },
      { field: 'name', header: 'Name', sortable: true },
      { field: 'value', header: 'Value', align: 'right' },
    ];

    const mergedProps: TableProps<any> = {
      data: defaultData,
      columns: defaultColumns,
      ...props,
    };

    return renderWithProviders(<Table {...mergedProps} />);
  };

  it('renders successfully with data', () => {
    const { container } = renderTable({});

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    renderTable({ isLoading: true });

    expect(screen.getByRole('status', { name: 'Loading table data' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('displays empty state message', () => {
    renderTable({ data: [] });

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('sorts data when clicking sortable column headers', async () => {
    const { rerender } = renderTable({ sortable: true });
    const user = setupUserEvent();

    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toHaveTextContent('Item 1');
    });

    await user.click(nameHeader);

    await waitFor(() => {
      expect(screen.getByText('Item 3')).toHaveTextContent('Item 3');
    });
  });

  it('paginates data correctly', async () => {
    const mockOnPageChange = jest.fn();
    const { rerender } = renderTable({
      data: Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, value: i + 1 })),
      pagination: {
        currentPage: 1,
        totalItems: 25,
        itemsPerPage: 10,
        onPageChange: mockOnPageChange,
      },
    });
    const user = setupUserEvent();

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 10')).toBeInTheDocument();
    expect(screen.queryByText('Item 11')).not.toBeInTheDocument();

    const nextPageButton = screen.getByRole('button', { name: 'Next page' });
    await user.click(nextPageButton);

    await waitFor(() => {
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });
  });

  it('handles row selection correctly', async () => {
    const mockOnSelectRows = jest.fn();
    renderTable({ selectable: true, onSelectRows: mockOnSelectRows });
    const user = setupUserEvent();

    const checkbox = screen.getByLabelText('Select row 1');
    await user.click(checkbox);

    await waitFor(() => {
      expect(mockOnSelectRows).toHaveBeenCalledTimes(1);
    });

    await user.click(checkbox);

    await waitFor(() => {
      expect(mockOnSelectRows).toHaveBeenCalledTimes(2);
    });
  });

  it('calls onRowClick when a row is clicked', async () => {
    const mockOnRowClick = jest.fn();
    renderTable({ onRowClick: mockOnRowClick });
    const user = setupUserEvent();

    const row = screen.getByText('Item 1').closest('tr');
    await user.click(row as Element);

    await waitFor(() => {
      expect(mockOnRowClick).toHaveBeenCalledTimes(1);
    });
  });

  it('renders custom cell content correctly', () => {
    const renderCell = (value: any) => <span>Custom: {value}</span>;
    renderTable({
      columns: [
        { field: 'id', header: 'ID', width: '50px' },
        { field: 'name', header: 'Name', render: renderCell },
      ],
    });

    expect(screen.getByText('Custom: Item 1')).toBeInTheDocument();
  });
});