import React from 'react';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Card } from './components/Card';
import ArgumentMap from './ArgumentMap';

/**
 * Example usage of the generated components
 */
export const ComponentShowcase: React.FC = () => {
  const [inputValue, setInputValue] = React.useState('');

  const handleButtonClick = () => {
    alert('Button clicked!');
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Component Library Showcase</h1>
      
      <section style={{ marginBottom: '40px' }}>
        <h2>Buttons</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={handleButtonClick}>
            Primary Button
          </Button>
          <Button variant="secondary" onClick={handleButtonClick}>
            Secondary Button
          </Button>
          <Button variant="outline" onClick={handleButtonClick}>
            Outline Button
          </Button>
          <Button variant="ghost" onClick={handleButtonClick}>
            Ghost Button
          </Button>
          <Button disabled onClick={handleButtonClick}>
            Disabled Button
          </Button>
          <Button loading onClick={handleButtonClick}>
            Loading Button
          </Button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <Button size="small" onClick={handleButtonClick}>
            Small Button
          </Button>
          <Button size="medium" onClick={handleButtonClick}>
            Medium Button
          </Button>
          <Button size="large" onClick={handleButtonClick}>
            Large Button
          </Button>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Inputs</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
          <Input
            placeholder="Enter your name..."
            aria-label="Name input"
            value={inputValue}
            onChange={handleInputChange}
          />
          <Input
            type="email"
            placeholder="Enter your email..."
            aria-label="Email input"
          />
          <Input
            type="password"
            placeholder="Enter your password..."
            aria-label="Password input"
          />
          <Input
            error
            errorMessage="This field is required"
            placeholder="Error state input..."
            aria-label="Error input"
          />
          <Input
            disabled
            placeholder="Disabled input..."
            aria-label="Disabled input"
          />
        </div>
        {inputValue && (
          <p style={{ marginTop: '10px' }}>
            Current input value: <strong>{inputValue}</strong>
          </p>
        )}
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Cards</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <Card title="Basic Card" elevation="low">
            This is a basic card with some content inside.
          </Card>
          
          <Card 
            title="Card with Description" 
            description="This card has both a title and description"
            elevation="medium"
          >
            Card content goes here. This card has a medium elevation shadow.
          </Card>
          
          <Card 
            title="Clickable Card" 
            description="This card can be clicked"
            clickable
            elevation="high"
            onClick={() => alert('Card clicked!')}
          >
            Click anywhere on this card to trigger an action.
          </Card>
          
          <Card elevation="none">
            <h3 style={{ margin: '0 0 10px 0' }}>No Elevation Card</h3>
            <p style={{ margin: 0 }}>This card has no shadow elevation.</p>
          </Card>
        </div>
      </section>

      <section>
        <h2>Accessibility Features</h2>
        <p>All components include:</p>
        <ul>
          <li>Proper ARIA labels and attributes</li>
          <li>Keyboard navigation support</li>
          <li>Focus management and visual indicators</li>
          <li>Screen reader compatibility</li>
          <li>Reduced motion support</li>
        </ul>
        
        <p>Try navigating with keyboard (Tab, Enter, Space) or using screen reader software.</p>
      </section>

      <section>
        <h2>Argument Map</h2>
        <ArgumentMap />
      </section>
    </div>
  );
};

export default ComponentShowcase;