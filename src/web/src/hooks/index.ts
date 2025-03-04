// LD1: Import all custom hooks from their respective modules
import useAuth from './useAuth'; // Authentication hook for user authentication state and operations
import useResponsive from './useResponsive'; // Responsive design hook for handling different device sizes
import useToast from './useToast'; // Toast notification hook for displaying user feedback
import usePagination from './usePagination'; // Pagination hook for handling paginated data
import useBankAccount from './useBankAccount'; // Bank account management hook for the OTHER refund method
import useNotification from './useNotification'; // Notification hook for managing user notifications
import useParameter from './useParameter'; // Parameter management hook for refund configuration parameters
import useRefund from './useRefund'; // Refund management hook for refund operations
import useReport from './useReport'; // Report generation hook for refund analytics and reporting

// LD2: Export all imported hooks to create a single entry point for all hooks
export {
  useAuth, // Export authentication hook for components
  useResponsive, // Export responsive design hook for UI adaptability
  useToast, // Export toast notification hook for user feedback
  usePagination, // Export pagination hook for data tables and lists
  useBankAccount, // Export bank account management hook for OTHER refund method
  useNotification, // Export notification management hook for user notifications
  useParameter, // Export parameter management hook for refund configurations
  useRefund, // Export refund operations hook for refund management
  useReport, // Export reporting hook for analytics and reporting features
};