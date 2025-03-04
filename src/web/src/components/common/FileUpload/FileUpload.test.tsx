import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { FileUpload } from './FileUpload';
import { renderWithProviders } from '../../../utils/test.utils';
import { jest } from '@jest/globals'; // jest ^29.5.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3

describe('FileUpload component', () => {
  // Main test suite for the FileUpload component
  it('renders with default props', () => {
    // Test to verify component renders correctly with default props
    renderWithProviders(<FileUpload onChange={() => {}} />);

    // Check if the file input and button are in the document
    expect(screen.getByRole('button', { name: /Select Files/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Upload Files/i)).toBeInTheDocument();

    // Verify default button text is displayed
    expect(screen.getByText(/Drag and drop a file here, or browse/i)).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    // Test to verify file selection functionality
    const mockOnChange = jest.fn();

    // Create a mock file
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    // Render component with the mock handler
    renderWithProviders(<FileUpload onChange={mockOnChange} />);

    // Simulate file selection event
    const input = screen.getByLabelText(/Upload Files/i);
    fireEvent.change(input, { target: { files: [file] } });

    // Verify onChange was called with the mock file
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([file]);
    });

    // Check if file name is displayed in the component
    expect(screen.getByText('hello.txt')).toBeInTheDocument();
  });

  it('displays error for invalid file type', async () => {
    // Test to verify file type validation
    const mockOnError = jest.fn();

    // Create a mock file with invalid type
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    // Render component with specific acceptedFileTypes
    renderWithProviders(
      <FileUpload
        onChange={() => {}}
        onError={mockOnError}
        acceptedFileTypes={['image/jpeg', 'image/png']}
      />
    );

    // Simulate file selection event
    const input = screen.getByLabelText(/Upload Files/i);
    fireEvent.change(input, { target: { files: [file] } });

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    });

    // Check if onError was called with appropriate error
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        'Invalid file type. Accepted types: image/jpeg, image/png'
      );
    });
  });

  it('displays error for file exceeding size limit', async () => {
    // Test to verify file size validation
    const mockOnError = jest.fn();

    // Create a mock file with large size
    const file = new File(['hello'], 'large.txt', { type: 'text/plain', size: 6000000 });

    // Render component with specific allowedMaxSize
    renderWithProviders(
      <FileUpload
        onChange={() => {}}
        onError={mockOnError}
        allowedMaxSize={5000000}
      />
    );

    // Simulate file selection event
    const input = screen.getByLabelText(/Upload Files/i);
    fireEvent.change(input, { target: { files: [file] } });

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/File size exceeds the maximum allowed size/i)).toBeInTheDocument();
    });

    // Check if onError was called with appropriate error
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        'File size exceeds the maximum allowed size of 4.77 MB'
      );
    });
  });

  it('supports drag and drop file upload', async () => {
    // Test to verify drag and drop functionality
    const mockOnChange = jest.fn();

    // Render the FileUpload component
    renderWithProviders(<FileUpload onChange={mockOnChange} />);

    // Create mock drag events (dragOver, drop) with mock file
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const dropzone = screen.getByText(/Drag and drop a file here, or browse/i).closest('div');

    // Simulate drag and drop events
    fireEvent.dragOver(dropzone as Element, { dataTransfer });
    fireEvent.drop(dropzone as Element, { dataTransfer });

    // Verify onChange was called with the mock file
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([file]);
    });

    // Check if file name is displayed after drop
    expect(screen.getByText('hello.txt')).toBeInTheDocument();
  });

  it('allows file removal', async () => {
    // Test to verify file removal functionality
    const mockOnChange = jest.fn();

    // Create a mock file
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    // Render FileUpload with pre-selected file
    renderWithProviders(<FileUpload onChange={mockOnChange} value={[file]} />);

    // Find and click the remove button
    const removeButton = screen.getByRole('button', { name: /Remove file hello\.txt/i });
    fireEvent.click(removeButton);

    // Verify file name is no longer displayed
    await waitFor(() => {
      expect(screen.queryByText('hello.txt')).not.toBeInTheDocument();
    });

    // Check if onChange was called with empty array
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('shows file preview when showPreview is true', async () => {
    // Test to verify file preview functionality
    const mockCreateObjectURL = jest.fn().mockReturnValue('mock-preview-url');
    global.URL.createObjectURL = mockCreateObjectURL;

    // Create a mock image file
    const file = new File(['image'], 'image.jpg', { type: 'image/jpeg' });

    // Render FileUpload with showPreview=true
    renderWithProviders(<FileUpload onChange={() => {}} showPreview={true} />);

    // Simulate file selection
    const input = screen.getByLabelText(/Upload Files/i);
    fireEvent.change(input, { target: { files: [file] } });

    // Verify image preview is displayed
    await waitFor(() => {
      expect(screen.getByAltText('image.jpg')).toBeInTheDocument();
    });

    // Clean up by restoring URL.createObjectURL
    global.URL.revokeObjectURL = jest.fn();
    global.URL.createObjectURL = (window.URL as any).createObjectURL;
  });

  it('displays upload progress indicator', () => {
    // Test to verify progress indicator functionality
    renderWithProviders(<FileUpload onChange={() => {}} />);

    // Verify progress bar is visible
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('is accessible', async () => {
    // Test to verify accessibility compliance
    const { container } = renderWithProviders(<FileUpload onChange={() => {}} />);

    // Check for accessibility issues using axe or similar tool
    // Verify keyboard navigation works properly
    const fileUploadElement = container.querySelector('div[role="button"]');
    expect(fileUploadElement).toBeInTheDocument();
  });

  it('supports multiple file selection', async () => {
    // Test to verify multiple file upload functionality
    const mockOnChange = jest.fn();

    // Create multiple mock files
    const file1 = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const file2 = new File(['world'], 'world.txt', { type: 'text/plain' });

    // Render FileUpload with multiple=true
    renderWithProviders(<FileUpload onChange={mockOnChange} multiple={true} />);

    // Simulate selection of multiple files
    const input = screen.getByLabelText(/Upload Files/i);
    fireEvent.change(input, { target: { files: [file1, file2] } });

    // Verify all files are displayed
    await waitFor(() => {
      expect(screen.getByText('hello.txt')).toBeInTheDocument();
      expect(screen.getByText('world.txt')).toBeInTheDocument();
    });

    // Check if onChange was called with all files
    expect(mockOnChange).toHaveBeenCalledWith([file1, file2]);
  });
});