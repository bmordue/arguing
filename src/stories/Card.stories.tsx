import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '../components/Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Card component with accessibility support and keyboard navigation.'
      }
    }
  },
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;


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
};