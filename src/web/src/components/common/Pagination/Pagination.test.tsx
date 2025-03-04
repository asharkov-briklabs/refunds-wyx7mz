import React from 'react'; // react ^18.2.0
import { screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { Pagination } from './Pagination';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { ButtonVariant } from '../Button';
import { Select } from '../Select';
import jest from 'jest'; // jest ^29.5.0

describe('Pagination component', () => {
  const onPageChange = jest.fn();
  const onPageSizeChange = jest.fn();
  const setup = (props = {}) => {
    return renderWithProviders(<Pagination 
      currentPage={1}
      totalItems={100}
      itemsPerPage={10}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      {...props}
    />);
  };

  beforeEach(() => {
    onPageChange.mockClear();
    onPageSizeChange.mockClear();
  });

  it('renders basic pagination correctly', () => {
    setup();
    expect(screen.getByText('1')).toHaveClass('font-bold');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('handles page changes correctly', async () => {
    const user = setupUserEvent();
    setup();
    const pageButton = screen.getByRole('button', { name: 'Page 2' });
    await user.click(pageButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('handles previous button click correctly', async () => {
    const user = setupUserEvent();
    setup({ currentPage: 2 });
    const prevButton = screen.getByRole('button', { name: 'Previous page' });
    await user.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('handles next button click correctly', async () => {
    const user = setupUserEvent();
    setup({ currentPage: 1, totalItems: 100, itemsPerPage: 10 });
    const nextButton = screen.getByRole('button', { name: 'Next page' });
    await user.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables previous button on first page', async () => {
    const user = setupUserEvent();
    setup({ currentPage: 1 });
    const prevButton = screen.getByRole('button', { name: 'Previous page' });
    expect(prevButton).toBeDisabled();
    await user.click(prevButton);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('disables next button on last page', async () => {
    const user = setupUserEvent();
    setup({ currentPage: 10, totalItems: 100, itemsPerPage: 10 });
    const nextButton = screen.getByRole('button', { name: 'Next page' });
    expect(nextButton).toBeDisabled();
    await user.click(nextButton);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('displays correct items per page options', () => {
    setup({ pageSizeOptions: [5, 10, 20] });
    const select = screen.getByRole('combobox', { name: 'Select number of items per page' });
    expect(screen.getByRole('option', { name: '5' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '10' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '20' })).toBeInTheDocument();
    expect(select).toHaveValue('10');
  });

  it('handles page size change correctly', async () => {
    const user = setupUserEvent();
    setup({ pageSizeOptions: [5, 10, 20] });
    const select = screen.getByRole('combobox', { name: 'Select number of items per page' });
    fireEvent.change(select, { target: { value: '20' } });
    await waitFor(() => {
      expect(onPageSizeChange).toHaveBeenCalledWith(20);
    });
  });

  it('shows correct pagination info text', () => {
    setup({ currentPage: 2, totalItems: 25, itemsPerPage: 10 });
    expect(screen.getByText('Showing 11 to 20 of 25 items')).toBeInTheDocument();
  });

  it('displays ellipsis for large page counts', () => {
    setup({ currentPage: 5, totalItems: 100, itemsPerPage: 10, maxPageButtons: 5 });
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 10' })).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    const { container } = setup({ className: 'custom-pagination' });
    expect(container.firstChild).toHaveClass('custom-pagination');
  });

  it('hides items per page selector when disabled', () => {
    setup({ showPageSizeSelector: false });
    expect(screen.queryByRole('combobox', { name: 'Select number of items per page' })).not.toBeInTheDocument();
  });

  it('correctly handles keyboard navigation', async () => {
    const user = setupUserEvent();
    setup({ currentPage: 2, totalItems: 100, itemsPerPage: 10, maxPageButtons: 5 });
    const prevButton = screen.getByRole('button', { name: 'Previous page' });
    const nextButton = screen.getByRole('button', { name: 'Next page' });
    const pageButton = screen.getByRole('button', { name: 'Page 1' });

    // Tab to the previous button
    await user.tab();
    expect(prevButton).toHaveFocus();

    // Activate the previous button
    await user.keyboard('Enter');
    expect(onPageChange).toHaveBeenCalledWith(1);

    // Tab to the next button
    await user.tab();
    expect(nextButton).toHaveFocus();

    // Activate the next button
    await user.keyboard(' ');
    expect(onPageChange).toHaveBeenCalledWith(3);

    // Tab to a page button
    await user.tab();
    expect(pageButton).toHaveFocus();

    // Activate the page button
    await user.keyboard('Enter');
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});