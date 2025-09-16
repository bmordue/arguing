import React, { forwardRef } from 'react';
import { ButtonProps } from '../types/component-props';
import './Button.css';

/**
 * Button component with accessibility support
 */
export const Button = forwardRef<HTMLDivElement, ButtonProps>(
  ({ 
    className = '',
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    tabIndex,
    'data-testid': testId,
    children,
    
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    ...props 
  }, ref) => {
    

    return (
      <button
        ref={ref as any}
        className={`button ${className}`.trim()}
        type={type}
        disabled={disabled || loading}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        tabIndex={tabIndex}
        data-testid={testId || 'button'}
        {...props}
      >
        
        {loading && <span className="loading-spinner" aria-hidden="true">⟳</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;