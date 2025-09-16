import React, { forwardRef } from 'react';
import { InputProps } from '../types/component-props';
import './Input.css';

/**
 * Input component with accessibility support
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className = '',
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    tabIndex,
    'data-testid': testId,
    
    
    value,
    defaultValue,
    placeholder,
    type = 'text',
    disabled = false,
    required = false,
    error = false,
    errorMessage,
    onChange,
    onFocus,
    onBlur,
    ...props 
  }, ref) => {
    
    // Accessibility check: ensure aria-label is provided for screen readers
    if (!ariaLabel && !ariaDescribedby) {
      console.warn('Input component should have an aria-label or aria-describedby for accessibility');
    }

    return (
      <input
        ref={ref as any}
        className={`input ${className}`.trim()}
        type={type}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        tabIndex={tabIndex}
        data-testid={testId || 'input'}
        {...props}
      >
        
      </input>
    );
  }
);

Input.displayName = 'Input';

export default Input;