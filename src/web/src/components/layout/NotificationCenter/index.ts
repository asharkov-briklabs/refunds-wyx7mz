import React from 'react'; // react ^18.2.0
import NotificationCenter, { NotificationCenterProps } from './NotificationCenter';
// LD1: Import the NotificationCenter component for re-export

/**
 * Exports the NotificationCenter component for use in layout components like MainLayout
 * @param {NotificationCenterProps} props
 * @returns {JSX.Element} Rendered notification center component
 */
export default NotificationCenter;