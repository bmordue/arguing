const fs = require('fs').promises;
const path = require('path');

const COMPONENT_CONFIGS = [
  {
    name: 'Button',
    propsInterface: 'ButtonProps',
    hasChildren: true,
    accessibility: {
      keyboardNavigation: true,
      ariaLabelRequired: false
    }
  },
  {
    name: 'Input',
    propsInterface: 'InputProps',
    hasChildren: false,
    accessibility: {
      ariaLabelRequired: true
    }
  },
  {
    name: 'Card',
    propsInterface: 'CardProps',
    hasChildren: true,
    accessibility: {
      keyboardNavigation: true
    }
  }
];

function generateComponentTemplate(config) {
  const { name, propsInterface, hasChildren } = config;
  
  return `import React, { forwardRef } from 'react';
import { ${propsInterface} } from '../types/component-props';
import './${name}.css';

/**
 * ${name} component with accessibility support
 */
export const ${name} = forwardRef<HTML${name === 'Input' ? 'Input' : 'Div'}Element, ${propsInterface}>(
  ({ 
    className = '',
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    tabIndex,
    'data-testid': testId,
    ${hasChildren ? 'children,' : ''}
    ${generatePropDestructuring(config)},
    ...props 
  }, ref) => {
    ${generateAccessibilityChecks(config)}

    return (
      <${getHtmlElement(config)}
        ref={ref as any}
        className={\`${name.toLowerCase()} \${className}\`.trim()}
        ${generateHtmlAttributes(config)}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        tabIndex={tabIndex}
        data-testid={testId || '${name.toLowerCase()}'}
        {...props}
      >
        ${generateComponentContent(config)}
      </${getHtmlElement(config)}>
    );
  }
);

${name}.displayName = '${name}';

export default ${name};`;
}

function generatePropDestructuring(config) {
  switch (config.name) {
    case 'Button':
      return `
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    onClick,
    type = 'button'`;
    
    case 'Input':
      return `
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
    onBlur`;
    
    case 'Card':
      return `
    title,
    description,
    clickable = false,
    onClick,
    elevation = 'low'`;
    
    default:
      return '';
  }
}

function generateAccessibilityChecks(config) {
  if (config.accessibility?.ariaLabelRequired) {
    return `
    // Accessibility check: ensure aria-label is provided for screen readers
    if (!ariaLabel && !ariaDescribedby) {
      console.warn('${config.name} component should have an aria-label or aria-describedby for accessibility');
    }`;
  }
  return '';
}

function getHtmlElement(config) {
  switch (config.name) {
    case 'Button':
      return 'button';
    case 'Input':
      return 'input';
    default:
      return 'div';
  }
}

function generateHtmlAttributes(config) {
  const attrs = [];
  
  // Add component-specific attributes
  switch (config.name) {
    case 'Button':
      attrs.push('type={type}', 'disabled={disabled || loading}', 'onClick={onClick}');
      break;
    case 'Input':
      attrs.push('type={type}', 'value={value}', 'defaultValue={defaultValue}', 
                'placeholder={placeholder}', 'disabled={disabled}', 'required={required}',
                'onChange={onChange}', 'onFocus={onFocus}', 'onBlur={onBlur}');
      break;
    case 'Card':
      attrs.push('onClick={clickable ? onClick : undefined}');
      break;
  }
  
  return attrs.join('\n        ');
}

function generateComponentContent(config) {
  switch (config.name) {
    case 'Button':
      return `
        {loading && <span className="loading-spinner" aria-hidden="true">⟳</span>}
        {children}`;
    
    case 'Input':
      return '';
    
    case 'Card':
      return `
        {title && <h3 className="card-title">{title}</h3>}
        {description && <p className="card-description">{description}</p>}
        <div className="card-content">
          {children}
        </div>`;
    
    default:
      return config.hasChildren ? '{children}' : '';
  }
}

function generateCSSTemplate(componentName) {
  const className = componentName.toLowerCase();
  
  return `.${className} {
  box-sizing: border-box;
  
  /* Focus styles for accessibility */
}

.${className}:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

.${className}:focus:not(:focus-visible) {
  outline: none;
}

.${className}:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

/* Component-specific styles */
${generateComponentSpecificCSS(componentName)}

/* Responsive design */
@media (prefers-reduced-motion: reduce) {
  .${className} * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`;
}

function generateComponentSpecificCSS(componentName) {
  const className = componentName.toLowerCase();
  
  switch (componentName) {
    case 'Button':
      return `
.${className} {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  text-decoration: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.${className}.primary {
  background-color: #007bff;
  color: white;
}

.${className}.secondary {
  background-color: #6c757d;
  color: white;
}

.${className}.outline {
  background-color: transparent;
  border: 2px solid #007bff;
  color: #007bff;
}

.${className}.ghost {
  background-color: transparent;
  color: #007bff;
}

.${className}:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.${className}:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.${className}.small {
  padding: 4px 8px;
  font-size: 12px;
}

.${className}.large {
  padding: 12px 24px;
  font-size: 16px;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`;
    
    case 'Input':
      return `
.${className} {
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  transition: border-color 0.2s ease;
  width: 100%;
}

.${className}:focus {
  border-color: #007bff;
}

.${className}.error {
  border-color: #dc3545;
}

.${className}:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}`;
    
    case 'Card':
      return `
.${className} {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: white;
  transition: all 0.2s ease;
}

.${className}.clickable {
  cursor: pointer;
}

.${className}.clickable:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.${className}.elevation-none {
  box-shadow: none;
}

.${className}.elevation-low {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.${className}.elevation-medium {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.${className}.elevation-high {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.card-description {
  margin: 0 0 16px 0;
  color: #6c757d;
  font-size: 14px;
}

.card-content {
  margin: 0;
}`;
    
    default:
      return `/* Add component-specific styles for ${componentName} here */`;
  }
}

function generateStoryTemplate(config) {
  const { name } = config;
  
  return `import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from '../components/${name}';

const meta: Meta<typeof ${name}> = {
  title: 'Components/${name}',
  component: ${name},
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '${name} component with accessibility support and keyboard navigation.'
      }
    }
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

${generateStoryVariants(config)}`;
}

function generateStoryVariants(config) {
  switch (config.name) {
    case 'Button':
      return `
export const Primary: Story = {
  args: {
    children: 'Button',
    variant: 'primary'
  }
};

export const Secondary: Story = {
  args: {
    children: 'Button',
    variant: 'secondary'
  }
};

export const Outline: Story = {
  args: {
    children: 'Button',
    variant: 'outline'
  }
};

export const Disabled: Story = {
  args: {
    children: 'Button',
    disabled: true
  }
};

export const Loading: Story = {
  args: {
    children: 'Button',
    loading: true
  }
};`;
    
    case 'Input':
      return `
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
    'aria-label': 'Text input'
  }
};

export const WithValue: Story = {
  args: {
    value: 'Sample text',
    placeholder: 'Enter text...',
    'aria-label': 'Text input with value'
  }
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
    'aria-label': 'Password input'
  }
};

export const Error: Story = {
  args: {
    error: true,
    errorMessage: 'This field is required',
    placeholder: 'Enter text...',
    'aria-label': 'Text input with error'
  }
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input...',
    'aria-label': 'Disabled text input'
  }
};`;
    
    case 'Card':
      return `
export const Basic: Story = {
  args: {
    children: 'Card content goes here'
  }
};

export const WithTitle: Story = {
  args: {
    title: 'Card Title',
    children: 'Card content goes here'
  }
};

export const WithDescription: Story = {
  args: {
    title: 'Card Title',
    description: 'This is a card description',
    children: 'Card content goes here'
  }
};

export const Clickable: Story = {
  args: {
    title: 'Clickable Card',
    clickable: true,
    children: 'This card can be clicked',
    onClick: () => alert('Card clicked!')
  }
};

export const HighElevation: Story = {
  args: {
    title: 'High Elevation Card',
    elevation: 'high',
    children: 'Card with high elevation shadow'
  }
};`;
    
    default:
      return `
export const Default: Story = {
  args: {}
};`;
  }
}

async function generateComponent(config) {
  const { name } = config;
  const componentDir = path.join(process.cwd(), 'src', 'components');
  const storiesDir = path.join(process.cwd(), 'src', 'stories');
  
  // Ensure directories exist
  await fs.mkdir(componentDir, { recursive: true });
  await fs.mkdir(storiesDir, { recursive: true });
  
  // Generate component file
  const componentContent = generateComponentTemplate(config);
  await fs.writeFile(path.join(componentDir, `${name}.tsx`), componentContent);
  
  // Generate CSS file
  const cssContent = generateCSSTemplate(name);
  await fs.writeFile(path.join(componentDir, `${name}.css`), cssContent);
  
  // Generate story file
  const storyContent = generateStoryTemplate(config);
  await fs.writeFile(path.join(storiesDir, `${name}.stories.tsx`), storyContent);
  
  console.log(`✅ Generated ${name} component with story and styles`);
}

async function main() {
  console.log('🚀 Generating component library stubs...');
  
  for (const config of COMPONENT_CONFIGS) {
    try {
      await generateComponent(config);
    } catch (error) {
      console.error(`❌ Error generating ${config.name}:`, error);
    }
  }
  
  console.log('\n🎉 Component generation complete!');
  console.log('\nGenerated components:');
  COMPONENT_CONFIGS.forEach(config => {
    console.log(`  - ${config.name} (/src/components/${config.name}.tsx)`);
    console.log(`    - Story (/src/stories/${config.name}.stories.tsx)`);
    console.log(`    - Styles (/src/components/${config.name}.css)`);
  });
}

main().catch(console.error);