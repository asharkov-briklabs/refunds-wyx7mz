// Re-export the ToastContainer component and its props interface
// Using a barrel file pattern for cleaner imports throughout the application
import ToastContainer from './ToastContainer';
import type { ToastContainerProps } from './ToastContainer';

export type { ToastContainerProps };
export default ToastContainer;