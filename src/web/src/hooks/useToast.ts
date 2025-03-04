import { useState, useCallback } from 'react'; // react version ^18.2.0
import { v4 as uuidv4 } from 'uuid'; // uuid version ^9.0.0
import { NotificationIconType } from '../types/notification.types';

/**
 * Interface for toast notification items
 */
export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: NotificationIconType;
  duration: number | null;
  dismissible: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Interface for toast creation options
 */
export interface ToastOptions {
  message: string;
  title?: string;
  type: NotificationIconType;
  duration: number | null;
  dismissible: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Type for partial toast options excluding the required message and type
 */
export type PartialToastOptions = Partial<Omit<ToastOptions, 'message' | 'type'>>;

/**
 * Custom hook that provides functionality for managing toast notifications
 * @returns An object containing toast state and methods for managing toasts
 */
function useToast() {
  // Initialize state for storing the array of toast notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /**
   * Function that adds a new toast notification to the state
   * @param options Toast configuration options
   * @returns The ID of the newly created toast
   */
  const addToast = useCallback((options: ToastOptions): string => {
    // Generate a unique ID for the toast using uuidv4
    const id = uuidv4();
    
    // Create a new toast object with defaults and provided options
    const toast: ToastItem = {
      id,
      message: options.message,
      title: options.title,
      type: options.type,
      duration: options.duration ?? 5000, // Default to 5 seconds if not specified
      dismissible: options.dismissible ?? true, // Default to dismissible if not specified
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    };
    
    // Update the toasts state with the new toast
    setToasts((prevToasts) => [...prevToasts, toast]);
    
    // Return the generated toast ID
    return id;
  }, []);

  /**
   * Function that removes a toast notification by ID
   * @param id ID of the toast to remove
   */
  const removeToast = useCallback((id: string): void => {
    // Filter out the toast with the matching ID from the toasts array
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Helper function to create a success toast notification
   * @param message The message to display in the toast
   * @param options Additional options for the toast
   * @returns The ID of the created toast
   */
  const success = useCallback(
    (message: string, options?: PartialToastOptions): string => {
      // Call addToast with SUCCESS type and provided message/options
      return addToast({
        message,
        type: NotificationIconType.SUCCESS,
        ...options,
      });
    },
    [addToast]
  );

  /**
   * Helper function to create an error toast notification
   * @param message The message to display in the toast
   * @param options Additional options for the toast
   * @returns The ID of the created toast
   */
  const error = useCallback(
    (message: string, options?: PartialToastOptions): string => {
      // Call addToast with ERROR type and provided message/options
      return addToast({
        message,
        type: NotificationIconType.ERROR,
        ...options,
      });
    },
    [addToast]
  );

  /**
   * Helper function to create a warning toast notification
   * @param message The message to display in the toast
   * @param options Additional options for the toast
   * @returns The ID of the created toast
   */
  const warning = useCallback(
    (message: string, options?: PartialToastOptions): string => {
      // Call addToast with WARNING type and provided message/options
      return addToast({
        message,
        type: NotificationIconType.WARNING,
        ...options,
      });
    },
    [addToast]
  );

  /**
   * Helper function to create an info toast notification
   * @param message The message to display in the toast
   * @param options Additional options for the toast
   * @returns The ID of the created toast
   */
  const info = useCallback(
    (message: string, options?: PartialToastOptions): string => {
      // Call addToast with INFO type and provided message/options
      return addToast({
        message,
        type: NotificationIconType.INFO,
        ...options,
      });
    },
    [addToast]
  );

  // Return object with toast state and management functions
  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}

export default useToast;