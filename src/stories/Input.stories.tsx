import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Input component with accessibility support and keyboard navigation.'
      }
    }
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;


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
};