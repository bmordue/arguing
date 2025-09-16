/**
 * Base component props with accessibility and common attributes
 */
export interface BaseComponentProps {
  /** Unique identifier for the component */
  id?: string;
  /** CSS class name(s) */
  className?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** ARIA described by attribute for accessibility */
  'aria-describedby'?: string;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
  /** Test ID for automated testing */
  'data-testid'?: string;
}

/**
 * Button component props
 */
export interface ButtonProps extends BaseComponentProps {
  /** Button content */
  children: React.ReactNode;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Input component props
 */
export interface InputProps extends BaseComponentProps {
  /** Input value */
  value?: string;
  /** Default value */
  defaultValue?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Change handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Focus handler */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Blur handler */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

/**
 * Card component props
 */
export interface CardProps extends BaseComponentProps {
  /** Card content */
  children: React.ReactNode;
  /** Card title */
  title?: string;
  /** Card description */
  description?: string;
  /** Clickable card */
  clickable?: boolean;
  /** Click handler for clickable cards */
  onClick?: () => void;
  /** Card elevation level */
  elevation?: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Modal component props
 */
export interface ModalProps extends BaseComponentProps {
  /** Modal content */
  children: React.ReactNode;
  /** Modal title */
  title?: string;
  /** Open state */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Size of the modal */
  size?: 'small' | 'medium' | 'large' | 'full';
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
}

/**
 * List component props
 */
export interface ListProps extends BaseComponentProps {
  /** List items */
  items: ListItem[];
  /** Selection mode */
  selectionMode?: 'none' | 'single' | 'multiple';
  /** Selected items */
  selectedItems?: string[];
  /** Selection change handler */
  onSelectionChange?: (selectedItems: string[]) => void;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * List item structure
 */
export interface ListItem {
  /** Unique identifier */
  id: string;
  /** Display text */
  label: string;
  /** Secondary text */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom data */
  data?: any;
}