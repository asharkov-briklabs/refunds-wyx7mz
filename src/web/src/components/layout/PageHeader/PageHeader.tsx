import React from 'react';
import classNames from 'classnames';
import Breadcrumbs, { Breadcrumb } from '../../common/Breadcrumbs';

/**
 * Interface defining the props for the PageHeader component
 */
interface PageHeaderProps {
  /**
   * The main title displayed in the page header
   */
  title: string;
  
  /**
   * Optional subtitle displayed below the main title
   */
  subtitle?: string;
  
  /**
   * Optional array of breadcrumb items for navigation
   */
  breadcrumbs?: Breadcrumb[];
  
  /**
   * Optional action elements (buttons, links, etc.) displayed in the header
   */
  actions?: React.ReactNode;
  
  /**
   * Optional CSS class name to apply custom styling
   */
  className?: string;
}

/**
 * A reusable page header component that displays a page title,
 * optional breadcrumb navigation, and action buttons.
 * 
 * This component provides consistent layout and styling for page headers
 * across both Pike and Barracuda interfaces.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}) => {
  // Combine default styles with any custom className
  const headerClasses = classNames('page-header', className);

  return (
    <div className={headerClasses}>
      {/* Render breadcrumbs if provided */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="page-header-breadcrumbs">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}
      
      {/* Main header content area with title and actions */}
      <div className="page-header-content">
        <div className="page-header-titles">
          <h1 className="page-header-title">{title}</h1>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>
        
        {/* Render actions container if actions are provided */}
        {actions && (
          <div className="page-header-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
export type { PageHeaderProps };