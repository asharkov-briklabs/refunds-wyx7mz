import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, vi } from 'vitest'; // vitest ^0.32.0
import Tabs, { TabOrientation, TabSize, TabVariant } from './Tabs'; // Component under test
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import userEvent from '@testing-library/user-event';

describe('Tabs Component', () => {
  // Group related tests for the Tabs component

  it('renders tabs with default props correctly', async () => {
    // Tests that the Tabs component renders correctly with default props
    const tabsData = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    ];

    // Render Tabs component with mock data
    renderWithProviders(<Tabs tabs={tabsData} />);

    // Verify the tab list is in the document
    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();

    // Verify all tab buttons are rendered with correct labels
    const tabButtons = screen.getAllByRole('tab');
    expect(tabButtons).toHaveLength(2);
    expect(tabButtons[0]).toHaveTextContent('Tab 1');
    expect(tabButtons[1]).toHaveTextContent('Tab 2');

    // Verify the first tab content is visible
    expect(screen.getByText('Content 1')).toBeVisible();

    // Verify correct ARIA attributes are applied for accessibility
    expect(tabButtons[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabButtons[1]).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-tab1');
  });

  it('switches active tab when clicked', async () => {
    // Tests that clicking a tab makes it active and shows its content
    const tabsData = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    ];

    // Render Tabs component with mock data
    renderWithProviders(<Tabs tabs={tabsData} />);

    // Verify first tab is active initially
    expect(screen.getByText('Content 1')).toBeVisible();

    // Setup userEvent for interaction
    const user = setupUserEvent();

    // Click on second tab button
    const tab2Button = screen.getByRole('tab', { name: 'Tab 2' });
    await user.click(tab2Button);

    // Verify second tab becomes active (has aria-selected=true)
    expect(tab2Button).toHaveAttribute('aria-selected', 'true');

    // Verify second tab's content panel is visible
    expect(screen.getByText('Content 2')).toBeVisible();

    // Verify first tab's content panel is no longer visible
    expect(screen.queryByText('Content 1')).not.toBeVisible();
  });

  it('respects defaultActiveTab prop', async () => {
    // Tests that defaultActiveTab prop sets the initially selected tab
    const tabsData = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    ];

    // Render Tabs component with defaultActiveTab set to second tab's ID
    renderWithProviders(<Tabs tabs={tabsData} defaultActiveTab="tab2" />);

    // Verify second tab is active initially
    const tab2Button = screen.getByRole('tab', { name: 'Tab 2' });
    expect(tab2Button).toHaveAttribute('aria-selected', 'true');

    // Verify second tab's content panel is visible
    expect(screen.getByText('Content 2')).toBeVisible();
  });

  it('calls onChange when tab is clicked', async () => {
    // Tests that onChange callback is called when a tab is clicked
    const onChange = vi.fn();

    // Define mock tabs data
    const tabsData = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    ];

    // Render Tabs component with onChange prop set to mock function
    renderWithProviders(<Tabs tabs={tabsData} onChange={onChange} />);

    // Setup userEvent for interaction
    const user = setupUserEvent();

    // Click on second tab
    const tab2Button = screen.getByRole('tab', { name: 'Tab 2' });
    await user.click(tab2Button);

    // Verify mock function was called with second tab's ID
    expect(onChange).toHaveBeenCalledWith('tab2');
  });

  it('handles keyboard navigation correctly with horizontal orientation', async () => {
    // Tests keyboard navigation in horizontal orientation
    const tabsData = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
      { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div> },
    ];

    // Render Tabs component with orientation=TabOrientation.HORIZONTAL
    renderWithProviders(<Tabs tabs={tabsData} orientation={TabOrientation.HORIZONTAL} />);

    // Setup userEvent for interaction
    const user = setupUserEvent();

    // Focus on first tab button
    const tab1Button = screen.getByRole('tab', { name: 'Tab 1' });
    tab1Button.focus();

    // Press right arrow key
    await user.keyboard('{ArrowRight}');

    // Verify focus moves to second tab
    const tab2Button = screen.getByRole('tab', { name: 'Tab 2' });
    expect(document.activeElement).toBe(tab2Button);

    // Press left arrow key
    await user.keyboard('{ArrowLeft}');

    // Verify focus moves back to first tab
    expect(document.activeElement).toBe(tab1Button);

    // Press End key
    await user.keyboard('{End}');

    // Verify focus moves to last tab
    const tab3Button = screen.getByRole('tab', { name: 'Tab 3' });
    expect(document.activeElement).toBe(tab3Button);

    // Press Home key
    await user.keyboard('{Home}');

    // Verify focus moves to first tab
    expect(document.activeElement).toBe(tab1Button);
  });

  it('handles keyboard navigation correctly with vertical orientation', async () => {
    // Tests keyboard navigation in vertical orientation
    const tabsData = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
      { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div> },
    ];

    // Render Tabs component with orientation=TabOrientation.VERTICAL
    renderWithProviders(<Tabs tabs={tabsData} orientation={TabOrientation.VERTICAL} />);

    // Setup userEvent for interaction
    const user = setupUserEvent();

    // Focus on first tab button
    const tab1Button = screen.getByRole('tab', { name: 'Tab 1' });
    tab1Button.focus();

    // Press down arrow key
    await user.keyboard('{ArrowDown}');

    // Verify focus moves to second tab
    const tab2Button = screen.getByRole('tab', { name: 'Tab 2' });
    expect(document.activeElement).toBe(tab2Button);

    // Press up arrow key
    await user.keyboard('{ArrowUp}');

    // Verify focus moves back to first tab
    expect(document.activeElement).toBe(tab1Button);

    // Press End key
    await user.keyboard('{End}');

    // Verify focus moves to last tab
    const tab3Button = screen.getByRole('tab', { name: 'Tab 3' });
    expect(document.activeElement).toBe(tab3Button);

    // Press Home key
    await user.keyboard('{Home}');

    // Verify focus moves to first tab
    expect(document.activeElement).toBe(tab1Button);
  });

  it('handles disabled tabs correctly', async () => {
    // Tests that disabled tabs cannot be selected
    const tabsData = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div>, disabled: true },
    ];

    // Render Tabs component with mock data
    renderWithProviders(<Tabs tabs={tabsData} />);

    // Verify disabled tab has aria-disabled=true
    const tab2Button = screen.getByRole('tab', { name: 'Tab 2' });
    expect(tab2Button).toHaveAttribute('aria-disabled', 'true');

    // Setup userEvent for interaction
    const user = setupUserEvent();

    // Click on disabled tab
    await user.click(tab2Button);

    // Verify tab selection does not change to disabled tab
    expect(screen.getByText('Content 1')).toBeVisible();
  });

  it('renders with different variants correctly', async () => {
    // Tests that the Tabs component renders correctly with different visual variants
    const tabsData = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    ];

    // Render Tabs with variant=TabVariant.CONTAINED
    const { container: containedContainer } = renderWithProviders(<Tabs tabs={tabsData} variant={TabVariant.CONTAINED} />);

    // Verify contained variant styling is applied
    expect(containedContainer.querySelector('.tabs__tab--contained')).toBeInTheDocument();

    // Render Tabs with variant=TabVariant.UNDERLINED
    const { container: underlinedContainer } = renderWithProviders(<Tabs tabs={tabsData} variant={TabVariant.UNDERLINED} />);

    // Verify underlined variant styling is applied
    expect(underlinedContainer.querySelector('.tabs__tab--underlined')).toBeInTheDocument();

    // Render Tabs with variant=TabVariant.PILLS
    const { container: pillsContainer } = renderWithProviders(<Tabs tabs={tabsData} variant={TabVariant.PILLS} />);

    // Verify pills variant styling is applied
    expect(pillsContainer.querySelector('.tabs__tab--pills')).toBeInTheDocument();
  });

  it('renders with different sizes correctly', async () => {
    // Tests that the Tabs component renders correctly with different sizes
    const tabsData = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    ];

    // Render Tabs with size=TabSize.SM
    const { container: smContainer } = renderWithProviders(<Tabs tabs={tabsData} size={TabSize.SM} />);

    // Verify small size styling is applied
    expect(smContainer.querySelector('.tabs__tab--sm')).toBeInTheDocument();

    // Render Tabs with size=TabSize.MD
    const { container: mdContainer } = renderWithProviders(<Tabs tabs={tabsData} size={TabSize.MD} />);

    // Verify medium size styling is applied
    expect(mdContainer.querySelector('.tabs__tab--md')).toBeInTheDocument();

    // Render Tabs with size=TabSize.LG
    const { container: lgContainer } = renderWithProviders(<Tabs tabs={tabsData} size={TabSize.LG} />);

    // Verify large size styling is applied
    expect(lgContainer.querySelector('.tabs__tab--lg')).toBeInTheDocument();
  });

  it('applies custom classNames correctly', async () => {
    // Tests that custom className props are correctly applied
    const tabsData = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    ];

    // Render Tabs with className, tabListClassName, and tabPanelClassName props
    const { container } = renderWithProviders(
      <Tabs
        tabs={tabsData}
        className="custom-tabs"
        tabListClassName="custom-tab-list"
        tabPanelClassName="custom-tab-panel"
      />
    );

    // Verify custom classes are applied to the respective elements
    expect(container.querySelector('.custom-tabs')).toBeInTheDocument();
    expect(container.querySelector('.custom-tab-list')).toBeInTheDocument();
    expect(container.querySelector('.custom-tab-panel')).toBeInTheDocument();
  });

  it('renders tabs with icons correctly', async () => {
    // Tests that tabs render with icon elements
    const MockIcon = () => <span>Mock Icon</span>;

    // Define mock tabs data with icon property
    const tabsData = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div>, icon: <MockIcon /> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
    ];

    // Render Tabs with mock data
    renderWithProviders(<Tabs tabs={tabsData} />);

    // Verify icon is rendered next to tab label
    expect(screen.getByText('Mock Icon')).toBeInTheDocument();
  });
});