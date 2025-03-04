import React from 'react';
import { Link } from 'react-router-dom';
import classnames from 'classnames';
import { NextIcon } from '../../../assets/icons/navigation-icons';

/**
 * Interface for individual breadcrumb items
 */
export interface Breadcrumb {
  /**
   * Display text for the breadcrumb item
   */
  label: string;
  
  /**
   * URL path for the breadcrumb item
   */
  path: string;
  
  /**
   * Whether this is the active/current breadcrumb item
   */
  active?: boolean;
}

/**
 * Props for the Breadcrumbs component
 */
export interface BreadcrumbsProps {
  /**
   * Array of breadcrumb items to display
   */
  items: Breadcrumb[];
  
  /**
   * Custom separator element to use between breadcrumb items
   * @default NextIcon
   */
  separator?: React.ReactNode;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Aria label for the breadcrumb navigation
   * @default 'Breadcrumb'
   */
  ariaLabel?: string;
}

/**
 * Breadcrumbs component that displays a hierarchical path of the current page location
 * and allows navigation to parent/ancestor pages.
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  separator,
  className,
  ariaLabel,
}) => {
  // Set default separator and aria label if not provided
  const breadcrumbSeparator = separator || <NextIcon aria-hidden="true" />;
  const breadcrumbAriaLabel = ariaLabel || 'Breadcrumb';
  
  // Return empty nav element if no items are provided
  if (!items || items.length === 0) {
    return <nav className={className} aria-label={breadcrumbAriaLabel} />;
  }
  
  return (
    <nav
      className={classnames('breadcrumbs', className)}
      aria-label={breadcrumbAriaLabel}
    >
      <ol className="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          // If the item explicitly has active=true, use that; otherwise, default to treating the last item as active
          const isActive = item.active === true || (isLast && item.active !== false);
          
          return (
            <li
              key={`${item.label}-${index}`}
              className={classnames('breadcrumbs-item', {
                'breadcrumbs-item-active': isActive,
              })}
            >
              {isActive ? (
                <span
                  className="breadcrumbs-text breadcrumbs-active"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link to={item.path} className="breadcrumbs-link">
                  {item.label}
                </Link>
              )}
              
              {!isLast && (
                <span className="breadcrumbs-separator" aria-hidden="true">
                  {breadcrumbSeparator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;