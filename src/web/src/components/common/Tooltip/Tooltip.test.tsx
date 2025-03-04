import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, vi } from 'vitest'; // vitest ^0.32.0
import Tooltip, { TooltipProps } from './Tooltip';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';

describe('Tooltip Component', () => {
  it('renders with default props correctly', async () => {
    const content = 'This is a tooltip';
    const { container } = renderWithProviders(
      <Tooltip content={content}>
        <div>Trigger Element</div>
      </Tooltip>
    );

    const triggerElement = screen.getByText('Trigger Element');
    expect(triggerElement).toBeInTheDocument();

    const tooltipContent = screen.queryByText(content);
    expect(tooltipContent).not.toBeVisible();

    const userEvent = setupUserEvent();
    await userEvent.hover(triggerElement);

    await waitFor(() => {
      expect(screen.getByText(content)).toBeVisible();
    });

    expect(container.firstChild).toHaveClass('relative');
  });

  it('renders with different positions correctly', async () => {
    const positions = ['top', 'bottom', 'left', 'right'];

    for (const position of positions) {
      const content = `Tooltip content at ${position}`;
      const { container } = renderWithProviders(
        <Tooltip content={content} position={position}>
          <div>Trigger</div>
        </Tooltip>
      );

      const triggerElement = screen.getByText('Trigger');
      const userEvent = setupUserEvent();
      await userEvent.hover(triggerElement);

      await waitFor(() => {
        expect(screen.getByText(content)).toBeVisible();
      });

      const tooltipElement = screen.getByText(content).closest('div');
      expect(tooltipElement).toBeInTheDocument();
    }
  });

  it('shows tooltip on focus and hides on blur', async () => {
    const content = 'Tooltip on focus';
    renderWithProviders(
      <Tooltip content={content}>
        <button>Focusable Trigger</button>
      </Tooltip>
    );

    const triggerElement = screen.getByText('Focusable Trigger');
    expect(screen.queryByText(content)).toBeNull();

    const userEvent = setupUserEvent();
    await userEvent.focus(triggerElement);

    await waitFor(() => {
      expect(screen.getByText(content)).toBeVisible();
    });

    await userEvent.blur(triggerElement);

    await waitFor(() => {
      expect(screen.queryByText(content)).toBeNull();
    });
  });

  it('does not show tooltip when disabled', async () => {
    const content = 'This should not appear';
    renderWithProviders(
      <Tooltip content={content} disabled={true}>
        <div>Disabled Trigger</div>
      </Tooltip>
    );

    const triggerElement = screen.getByText('Disabled Trigger');
    const userEvent = setupUserEvent();
    await userEvent.hover(triggerElement);

    await waitFor(() => {
      expect(screen.queryByText(content)).toBeNull();
    });

    await userEvent.focus(triggerElement);

    await waitFor(() => {
      expect(screen.queryByText(content)).toBeNull();
    });
  });

  it('applies custom className when provided', async () => {
    const content = 'Custom class tooltip';
    const customClassName = 'custom-tooltip-class';
    renderWithProviders(
      <Tooltip content={content} className={customClassName}>
        <div>Custom Class Trigger</div>
      </Tooltip>
    );

    const triggerElement = screen.getByText('Custom Class Trigger');
    const userEvent = setupUserEvent();
    await userEvent.hover(triggerElement);

    await waitFor(() => {
      const tooltipElement = screen.getByText(content).closest('div');
      expect(tooltipElement).toHaveClass(customClassName);
    });
  });

  it('supports string and ReactNode content', async () => {
    const stringContent = 'String content';
    renderWithProviders(
      <Tooltip content={stringContent}>
        <div>String Trigger</div>
      </Tooltip>
    );

    const stringTrigger = screen.getByText('String Trigger');
    const userEvent1 = setupUserEvent();
    await userEvent1.hover(stringTrigger);

    await waitFor(() => {
      expect(screen.getByText(stringContent)).toBeVisible();
    });

    const reactNodeContent = <span className="react-node-class">React Node Content</span>;
    renderWithProviders(
      <Tooltip content={reactNodeContent}>
        <div>React Node Trigger</div>
      </Tooltip>
    );

    const reactNodeTrigger = screen.getByText('React Node Trigger');
    const userEvent2 = setupUserEvent();
    await userEvent2.hover(reactNodeTrigger);

    await waitFor(() => {
      expect(screen.getByText('React Node Content')).toBeVisible();
      expect(screen.getByText('React Node Content')).toHaveClass('react-node-class');
    });
  });

  it('has proper accessibility attributes', async () => {
    const content = 'Accessibility tooltip';
    const { container } = renderWithProviders(
      <Tooltip content={content}>
        <div>Accessible Trigger</div>
      </Tooltip>
    );

    const triggerElement = screen.getByText('Accessible Trigger');
    expect(triggerElement).toHaveAttribute('aria-describedby');

    const tooltipId = triggerElement.getAttribute('aria-describedby');
    expect(screen.queryByRole('tooltip')).toBeNull();

    const userEvent = setupUserEvent();
    await userEvent.hover(triggerElement);

    await waitFor(() => {
      const tooltipElement = screen.getByRole('tooltip');
      expect(tooltipElement).toBeInTheDocument();
      expect(tooltipElement).toHaveAttribute('id', tooltipId || '');
      expect(triggerElement).toHaveAttribute('aria-describedby', tooltipId || '');
    });
  });
});