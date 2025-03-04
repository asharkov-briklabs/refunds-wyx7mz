import React, { useState, useRef, useEffect, useCallback } from 'react'; // react ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import Button from '../Button';
import Alert from '../Alert';
import Tooltip from '../Tooltip';

/**
 * Props interface for the FileUpload component
 */
export interface FileUploadProps {
  /**
   * Allow multiple file selection
   * @default false
   */
  multiple?: boolean;
  
  /**
   * List of accepted file MIME types or extensions
   * @example ['image/jpeg', 'image/png', '.pdf']
   */
  acceptedFileTypes?: string[];
  
  /**
   * Maximum allowed file size in bytes
   * @default 5242880 (5MB)
   */
  allowedMaxSize?: number;
  
  /**
   * Callback function triggered when files are selected or removed
   */
  onChange: (files: File[]) => void;
  
  /**
   * Callback function triggered when file validation fails
   */
  onError?: (error: string) => void;
  
  /**
   * Show file previews for images
   * @default true
   */
  showPreview?: boolean;
  
  /**
   * Additional CSS classes for the component container
   */
  className?: string;
  
  /**
   * Additional CSS classes for the dropzone
   */
  dropzoneClassName?: string;
  
  /**
   * Additional CSS classes for the file list
   */
  fileListClassName?: string;
  
  /**
   * Custom label text
   * @default "Upload Files"
   */
  label?: string;
  
  /**
   * Custom button label text
   * @default "Select Files"
   */
  buttonLabel?: string;
  
  /**
   * Disable the file upload component
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Controlled value for the component
   */
  value?: File[];
  
  /**
   * Error message to display
   */
  errorMessage?: string;
  
  /**
   * Input field ID
   */
  id?: string;
  
  /**
   * Input field name
   */
  name?: string;
  
  /**
   * Whether the field is required
   * @default false
   */
  required?: boolean;
}

/**
 * Interface for file objects with preview URLs and validation status
 */
export interface FileWithPreview {
  /**
   * The original File object
   */
  file: File;
  
  /**
   * URL for the file preview (if available)
   */
  preview: string | null;
  
  /**
   * Error message if file validation failed
   */
  error: string | null;
}

/**
 * Validates if a file meets the specified criteria (size, type, etc.)
 */
const validateFile = (file: File, props: FileUploadProps): { isValid: boolean; error: string | null } => {
  // Check file size
  if (props.allowedMaxSize && file.size > props.allowedMaxSize) {
    return {
      isValid: false,
      error: `File size exceeds the maximum allowed size of ${formatFileSize(props.allowedMaxSize)}`
    };
  }

  // Check file type
  if (props.acceptedFileTypes && props.acceptedFileTypes.length > 0) {
    // Check if file type matches any of the accepted types
    const isValidType = props.acceptedFileTypes.some(type => {
      // Handle file extensions (starting with '.')
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      // Handle MIME types
      return file.type === type;
    });

    if (!isValidType) {
      return {
        isValid: false,
        error: `Invalid file type. Accepted types: ${props.acceptedFileTypes.join(', ')}`
      };
    }
  }

  return { isValid: true, error: null };
};

/**
 * Formats file size in bytes to a human-readable format
 */
const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
};

/**
 * Creates a FileWithPreview object from a File
 */
const createFileWithPreview = async (file: File, props: FileUploadProps): Promise<FileWithPreview> => {
  // Validate the file
  const validation = validateFile(file, props);
  
  // Generate preview URL if valid and showPreview is true
  let preview: string | null = null;
  
  if (validation.isValid && props.showPreview) {
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    }
  }
  
  return {
    file,
    preview,
    error: validation.error
  };
};

/**
 * A component that allows users to upload single or multiple files with preview capability,
 * drag and drop support, and validation for file types and sizes.
 */
const FileUpload: React.FC<FileUploadProps> = ({
  multiple = false,
  acceptedFileTypes,
  allowedMaxSize = 5 * 1024 * 1024, // 5MB default
  onChange,
  onError,
  showPreview = true,
  className = '',
  dropzoneClassName = '',
  fileListClassName = '',
  label = 'Upload Files',
  buttonLabel = 'Select Files',
  disabled = false,
  value,
  errorMessage,
  id,
  name,
  required = false,
}) => {
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  
  // State
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  // Update internal files when value prop changes (controlled component)
  useEffect(() => {
    if (value) {
      const processFiles = async () => {
        const filesWithPreview = await Promise.all(
          value.map(file => createFileWithPreview(file, { 
            allowedMaxSize, 
            acceptedFileTypes, 
            showPreview,
            onChange: () => {}, // Placeholder for the required onChange prop
          } as FileUploadProps))
        );
        setSelectedFiles(filesWithPreview);
      };
      
      processFiles();
    }
  }, [value, allowedMaxSize, acceptedFileTypes, showPreview]);
  
  /**
   * Handles file selection change events
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    
    // Convert FileList to array
    const fileArray = Array.from(files);
    
    // Process files
    const newFilesWithPreview = await Promise.all(
      fileArray.map(file => createFileWithPreview(file, {
        allowedMaxSize,
        acceptedFileTypes,
        showPreview,
        onChange: () => {}, // Placeholder for the required onChange prop
      } as FileUploadProps))
    );
    
    // Update state
    setSelectedFiles(prevFiles => 
      multiple ? [...prevFiles, ...newFilesWithPreview] : newFilesWithPreview
    );
    
    // Call onChange with valid files
    const validFiles = newFilesWithPreview
      .filter(file => !file.error)
      .map(file => file.file);
    
    onChange(multiple ? 
      [...selectedFiles.filter(f => !f.error).map(f => f.file), ...validFiles] : 
      validFiles
    );
    
    // Check for errors
    const errors = newFilesWithPreview
      .filter(file => file.error)
      .map(file => file.error);
    
    if (errors.length > 0) {
      const errorMessage = errors.join('. ');
      setInternalError(errorMessage);
      onError?.(errorMessage);
    } else {
      setInternalError(null);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  /**
   * Handles drag over events for the drop area
   */
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!disabled) {
      setIsDragging(true);
    }
  };
  
  /**
   * Handles drag leave events
   */
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };
  
  /**
   * Handles file drop events
   */
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (disabled) {
      return;
    }
    
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) {
      return;
    }
    
    // Convert FileList to array (respect multiple flag)
    const fileArray = Array.from(files).slice(0, multiple ? undefined : 1);
    
    // Process files
    const newFilesWithPreview = await Promise.all(
      fileArray.map(file => createFileWithPreview(file, {
        allowedMaxSize,
        acceptedFileTypes,
        showPreview,
        onChange: () => {}, // Placeholder for the required onChange prop
      } as FileUploadProps))
    );
    
    // Update state
    setSelectedFiles(prevFiles => 
      multiple ? [...prevFiles, ...newFilesWithPreview] : newFilesWithPreview
    );
    
    // Call onChange with valid files
    const validFiles = newFilesWithPreview
      .filter(file => !file.error)
      .map(file => file.file);
    
    onChange(multiple ? 
      [...selectedFiles.filter(f => !f.error).map(f => f.file), ...validFiles] : 
      validFiles
    );
    
    // Check for errors
    const errors = newFilesWithPreview
      .filter(file => file.error)
      .map(file => file.error);
    
    if (errors.length > 0) {
      const errorMessage = errors.join('. ');
      setInternalError(errorMessage);
      onError?.(errorMessage);
    } else {
      setInternalError(null);
    }
  };
  
  /**
   * Removes a file from the selected files
   */
  const handleRemoveFile = (index: number) => {
    // Create a new array without the removed file
    const updatedFiles = [...selectedFiles];
    
    // Revoke object URL if preview exists to prevent memory leaks
    if (updatedFiles[index].preview) {
      URL.revokeObjectURL(updatedFiles[index].preview as string);
    }
    
    updatedFiles.splice(index, 1);
    setSelectedFiles(updatedFiles);
    
    // Call onChange with updated files
    onChange(updatedFiles.filter(f => !f.error).map(f => f.file));
  };
  
  // Handle click on dropzone
  const handleDropzoneClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);
  
  // Format accepted file types for input accept attribute
  const formatAcceptedTypes = useCallback(() => {
    if (!acceptedFileTypes || acceptedFileTypes.length === 0) {
      return undefined;
    }
    return acceptedFileTypes.join(',');
  }, [acceptedFileTypes]);
  
  // Determine if there are any errors
  const hasErrors = internalError || errorMessage;
  
  return (
    <div className={classNames('w-full', className)}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label 
            htmlFor={id || 'file-upload'}
            className={classNames(
              'block text-sm font-medium',
              disabled ? 'text-gray-400' : 'text-gray-700'
            )}
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
          
          {/* File type info */}
          {acceptedFileTypes && acceptedFileTypes.length > 0 && (
            <Tooltip 
              content={`Accepted file types: ${acceptedFileTypes.join(', ')}`}
              position="top"
            >
              <span className="text-xs text-gray-500 cursor-help">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="w-4 h-4" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </span>
            </Tooltip>
          )}
        </div>
      )}
      
      {/* File Input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        id={id || 'file-upload'}
        name={name}
        className="sr-only"
        onChange={handleFileChange}
        accept={formatAcceptedTypes()}
        multiple={multiple}
        disabled={disabled}
        required={required}
      />
      
      {/* Dropzone Area */}
      <div
        ref={dropzoneRef}
        className={classNames(
          'flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md transition-colors',
          isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50',
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100',
          dropzoneClassName
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleDropzoneClick}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        role="button"
      >
        {/* Upload Icon */}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={classNames(
            'w-10 h-10',
            isDragging ? 'text-blue-600' : 'text-gray-400'
          )}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
          />
        </svg>
        
        {/* Instructions */}
        <p className="mt-2 text-sm text-gray-600">
          Drag and drop {multiple ? 'files' : 'a file'} here, or{' '}
          <span className="font-medium text-blue-600 hover:text-blue-500">
            browse
          </span>
        </p>
        
        <p className="mt-1 text-xs text-gray-500">
          {acceptedFileTypes && acceptedFileTypes.length > 0 
            ? `Accepted formats: ${acceptedFileTypes.join(', ')}`
            : 'All file types accepted'
          }
          {allowedMaxSize && (
            <span className="ml-1">
              (Max size: {formatFileSize(allowedMaxSize)})
            </span>
          )}
        </p>
        
        {/* Browse Button */}
        <Button
          type="button"
          size="sm"
          className="mt-4"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            handleDropzoneClick();
          }}
        >
          {buttonLabel}
        </Button>
      </div>
      
      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className={classNames('mt-4', fileListClassName)}>
          <h4 className="text-sm font-medium text-gray-700">
            Selected {multiple ? 'Files' : 'File'}
          </h4>
          <div className="mt-1">
            {selectedFiles.map((fileWithPreview, index) => (
              <div 
                key={`${fileWithPreview.file.name}-${index}`}
                className={classNames(
                  'relative flex items-center p-3 mt-2 border rounded-md',
                  fileWithPreview.error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                )}
              >
                {/* Preview thumbnail for images */}
                {fileWithPreview.preview && fileWithPreview.file.type.startsWith('image/') ? (
                  <div className="flex-shrink-0 w-12 h-12 mr-3 overflow-hidden rounded-md bg-gray-100">
                    <img 
                      src={fileWithPreview.preview} 
                      alt={fileWithPreview.file.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mr-3 text-gray-500 bg-gray-100 rounded-md">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="w-6 h-6" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                      />
                    </svg>
                  </div>
                )}
                
                {/* File information */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {fileWithPreview.file.name}
                    </p>
                    <p className="ml-2 text-xs text-gray-500">
                      {formatFileSize(fileWithPreview.file.size)}
                    </p>
                  </div>
                  {fileWithPreview.error && (
                    <p className="mt-1 text-xs text-red-600">{fileWithPreview.error}</p>
                  )}
                </div>
                
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500"
                  aria-label={`Remove file ${fileWithPreview.file.name}`}
                  disabled={disabled}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="w-5 h-5" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {hasErrors && (
        <Alert
          type="error"
          message={errorMessage || internalError || ''}
          className="mt-2"
        />
      )}
    </div>
  );
};

export default FileUpload;