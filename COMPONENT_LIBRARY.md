# Component Library Documentation

This document describes the UI component library that has been added to the Arguing project.

## Overview

The component library provides accessible, TypeScript-ready React components with:
- Strong TypeScript interfaces
- Built-in accessibility features (ARIA, keyboard navigation)
- Storybook stories for documentation
- CSS styling with focus states
- Responsive design considerations

## Components

### Button
Interactive button component with multiple variants and states.

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost'
- `size`: 'small' | 'medium' | 'large'  
- `disabled`: boolean
- `loading`: boolean
- `onClick`: click handler

**Accessibility:**
- Keyboard navigation (Enter/Space)
- Focus management
- Loading state announcements

### Input  
Text input component with validation states.

**Props:**
- `type`: 'text' | 'email' | 'password' | 'number' | 'search'
- `value`, `placeholder`, `disabled`, `required`
- `error`: boolean for error state
- `errorMessage`: string

**Accessibility:**
- Required aria-label or aria-describedby
- Error state announcements
- Focus management

### Card
Content container component with optional interactivity.

**Props:**
- `title`: optional card title
- `description`: optional card description  
- `clickable`: makes the entire card clickable
- `elevation`: 'none' | 'low' | 'medium' | 'high'

**Accessibility:**
- Keyboard navigation when clickable
- Proper heading hierarchy
- Focus management

## Usage

```typescript
import { Button, Input, Card } from './src/components';

// Button example
<Button variant="primary" onClick={handleClick}>
  Click me
</Button>

// Input example
<Input 
  type="email"
  placeholder="Enter email..."
  aria-label="Email address"
  onChange={handleChange}
/>

// Card example
<Card 
  title="Card Title"
  clickable 
  onClick={handleCardClick}
>
  Card content goes here
</Card>
```

## Development

### Generating Components

Use the component generator to create new components:

```bash
node src/templates/generate-components.js
```

This creates:
- React component with TypeScript
- CSS styles with accessibility features
- Storybook stories
- Proper interfaces in `component-props.ts`

### Storybook

View and test components in Storybook:

```bash
npm run storybook
```

### File Structure

```
src/
├── components/          # React components
│   ├── Button.tsx
│   ├── Button.css
│   ├── Input.tsx
│   ├── Input.css
│   └── Card.tsx
│   └── Card.css
├── stories/             # Storybook stories
│   ├── Button.stories.tsx
│   ├── Input.stories.tsx
│   └── Card.stories.tsx
├── types/               # TypeScript interfaces
│   └── component-props.ts
├── templates/           # Code generators
│   └── generate-components.js
├── ComponentShowcase.tsx # Example usage
└── index.ts            # Main exports
```

## Accessibility Features

All components include:

1. **ARIA Support**: Proper labels, roles, and states
2. **Keyboard Navigation**: Tab order, Enter/Space activation
3. **Focus Management**: Visible focus indicators
4. **Screen Reader Support**: Descriptive announcements
5. **Reduced Motion**: Respects user preferences

## Design Principles

- **Minimal and Surgical**: Components are lightweight with focused functionality
- **Type Safe**: Strong TypeScript interfaces prevent runtime errors
- **Accessible First**: Accessibility is built-in, not added later
- **Consistent**: Shared base props and styling patterns
- **Extensible**: Easy to add new components via generator

## Browser Support

Components work in modern browsers that support:
- ES2016+
- CSS custom properties
- CSS Grid/Flexbox
- React 16.8+ (hooks)