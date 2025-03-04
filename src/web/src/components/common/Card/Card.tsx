import React, { useId } from 'react';
import classNames from 'classnames'; // ^2.3.2
import { componentShadows } from '../../../themes/shadows';

/**
 * Available visual variants for the Card component
 */
export enum CardVariant {
  DEFAULT = 'default',
  OUTLINED = 'outlined',
  ELEVATED = 'elevated',
}

/**
 * Props for the Card component
 */
export interface CardProps {
  /** The content to be rendered within the card */
  children: React.ReactNode;
  /** Optional CSS class name for the card container */
  className?: string;
  /** Optional CSS class name for the content section */
  contentClassName?: string;
  /** Visual style variant of the card */
  variant?: CardVariant;
  /** Optional title for the card header */
  title?: string;
  /** Optional content for the card footer */
  footer?: React.ReactNode;
  /** Optional actions to display in the card header */
  actions?: React.ReactNode;
  /** Whether to remove padding from the content section */
  noPadding?: boolean;
  /** Whether to remove border from the card */
  borderless?: boolean;
  /** Optional ID for the card (used for accessibility) */
  id?: string;
}

/**
 * A reusable Card component that serves as a container for content with different visual styles,
 * supporting various layouts including headers, content areas, and footers with customizable styling options.
 */
const Card: React.FC<CardProps> = ({
  children,
  className,
  contentClassName,
  variant = CardVariant.DEFAULT,
  title,
  footer,
  actions,
  noPadding = false,
  borderless = false,
  id,
}) => {
  // Generate an ID for accessibility if a title is provided but no ID
  const uniqueId = useId();
  const cardId = id || (title ? `card-${uniqueId}` : undefined);
  const headerId = title ? `${cardId}-header` : undefined;

  // Construct class names based on props
  const cardClasses = classNames(
    'card',
    `card-${variant}`,
    {
      'card-borderless': borderless,
    },
    className
  );

  const contentClasses = classNames(
    'card-content',
    {
      'card-content-no-padding': noPadding,
    },
    contentClassName
  );

  // Apply appropriate shadow based on variant
  const cardStyle: React.CSSProperties = {};
  if (variant === CardVariant.ELEVATED) {
    cardStyle.boxShadow = componentShadows.card;
  }

  return (
    <div 
      className={cardClasses} 
      style={cardStyle}
      id={cardId}
      role={title ? "region" : undefined}
      aria-labelledby={headerId}
    >
      {(title || actions) && (
        <div className="card-header" id={headerId}>
          {title && <h3 className="card-title">{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      
      <div className={contentClasses}>
        {children}
      </div>
      
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;