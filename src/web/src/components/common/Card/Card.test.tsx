import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, vi } from 'vitest'; // vitest ^0.32.0
import Card, { CardVariant } from './Card';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';

describe('Card Component', () => {
  it('renders with default variant correctly', async () => {
    const { container } = renderWithProviders(<Card>Default Card Content</Card>);

    expect(screen.getByText('Default Card Content')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('card');
    expect(container.firstChild).toHaveClass('card-default');
  });

  it('renders with different variants correctly', async () => {
    const { container: defaultContainer } = renderWithProviders(<Card variant={CardVariant.DEFAULT}>Default Variant</Card>);
    expect(defaultContainer.firstChild).toHaveClass('card-default');

    const { container: outlinedContainer } = renderWithProviders(<Card variant={CardVariant.OUTLINED}>Outlined Variant</Card>);
    expect(outlinedContainer.firstChild).toHaveClass('card-outlined');

    const { container: elevatedContainer } = renderWithProviders(<Card variant={CardVariant.ELEVATED}>Elevated Variant</Card>);
    expect(elevatedContainer.firstChild).toHaveClass('card-elevated');
    expect(elevatedContainer.firstChild).toHaveStyle('box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)');
  });

  it('renders with title correctly', async () => {
    const { container } = renderWithProviders(<Card title="Card Title">Card Content</Card>);

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('aria-labelledby', expect.stringContaining('card-'));
    expect(screen.getByText('Card Title')).toHaveClass('card-title');
  });

  it('renders with actions correctly', async () => {
    const MockAction = () => <button>Do Action</button>;
    renderWithProviders(<Card actions={<MockAction />}>Card Content</Card>);

    expect(screen.getByText('Do Action')).toBeInTheDocument();
    expect(screen.getByText('Do Action').closest('div')).toHaveClass('card-actions');
  });

  it('renders with footer correctly', async () => {
    const footerContent = <div>Footer Content</div>;
    renderWithProviders(<Card footer={footerContent}>Card Content</Card>);

    expect(screen.getByText('Footer Content')).toBeInTheDocument();
    expect(screen.getByText('Footer Content').closest('div')).toHaveClass('card-footer');
  });

  it('applies noPadding prop correctly', async () => {
    const { container } = renderWithProviders(<Card noPadding>Card Content</Card>);

    expect(container.querySelector('.card-content')).toHaveClass('card-content-no-padding');
  });

  it('applies borderless prop correctly', async () => {
    const { container } = renderWithProviders(<Card borderless>Card Content</Card>);

    expect(container.firstChild).toHaveClass('card-borderless');
  });

  it('applies custom className when provided', async () => {
    const { container } = renderWithProviders(<Card className="custom-card-class">Card Content</Card>);

    expect(container.firstChild).toHaveClass('custom-card-class');
  });

  it('applies contentClassName when provided', async () => {
    const { container } = renderWithProviders(<Card contentClassName="custom-content-class">Card Content</Card>);

    expect(container.querySelector('.card-content')).toHaveClass('custom-content-class');
  });

  it('has correct accessibility attributes', async () => {
    const { container: titledContainer } = renderWithProviders(<Card title="Accessible Card">Card Content</Card>);
    expect(titledContainer.firstChild).toHaveAttribute('role', 'region');
    expect(titledContainer.firstChild).toHaveAttribute('aria-labelledby', expect.stringContaining('card-'));

    const { container: untitledContainer } = renderWithProviders(<Card>Card Content</Card>);
    expect(untitledContainer.firstChild).not.toHaveAttribute('role');
    expect(untitledContainer.firstChild).not.toHaveAttribute('aria-labelledby');
  });
});