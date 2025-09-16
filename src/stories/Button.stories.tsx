import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Button component with accessibility support and keyboard navigation.'
      }
    }
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;


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
};