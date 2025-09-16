import React, { forwardRef } from 'react';
import { CardProps } from '../types/component-props';
import './Card.css';

/**
 * Card component with accessibility support
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className = '',
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    tabIndex,
    'data-testid': testId,
    children,
    
    title,
    description,
    clickable = false,
    onClick,
    elevation = 'low',
    ...props 
  }, ref) => {
    

    return (
      <div
        ref={ref as any}
        className={`card ${className}`.trim()}
        onClick={clickable ? onClick : undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        tabIndex={tabIndex}
        data-testid={testId || 'card'}
        {...props}
      >
        
        {title && <h3 className="card-title">{title}</h3>}
        {description && <p className="card-description">{description}</p>}
        <div className="card-content">
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;