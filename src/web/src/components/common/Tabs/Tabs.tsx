import React, { useState, useEffect, useCallback, KeyboardEvent, ReactNode } from 'react';
import clsx from 'clsx';

// Enums for tab configuration options
export enum TabOrientation {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical'
}

export enum TabSize {
  SM = 'sm',
  MD = 'md',
  LG = 'lg'
}

export enum TabVariant {
  CONTAINED = 'contained',
  UNDERLINED = 'underlined',
  PILLS = 'pills'
}

// Interface for individual tab items
export interface TabItem {
  id: string | number;
  label: string | ReactNode;
  content: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
}

// Interface for the Tabs component props
export interface TabsProps {
  tabs: TabItem[];
  defaultActiveTab?: string | number;
  onChange?: (tabId: string | number) => void;
  orientation?: TabOrientation;
  size?: TabSize;
  variant?: TabVariant;
  fullWidth?: boolean;
  className?: string;
  tabListClassName?: string;
  tabPanelClassName?: string;
  ariaLabel?: string;
}

/**
 * Handles keyboard navigation between tabs
 */
function handleTabKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  tabs: TabItem[],
  activeTab: string | number,
  onSelect: (tabId: string | number) => void,
  orientation: TabOrientation
): void {
  // Get current tab index in the tabs array
  const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);
  if (currentTabIndex === -1) return;
  
  let nextTabIndex: number | null = null;
  
  // Handle Home key: select first tab
  if (event.key === 'Home') {
    nextTabIndex = 0;
  }
  // Handle End key: select last tab
  else if (event.key === 'End') {
    nextTabIndex = tabs.length - 1;
  }
  // For horizontal orientation, handle Left/Right keys to navigate tabs
  else if (orientation === TabOrientation.HORIZONTAL) {
    if (event.key === 'ArrowLeft') {
      nextTabIndex = currentTabIndex > 0 ? currentTabIndex - 1 : null;
    } else if (event.key === 'ArrowRight') {
      nextTabIndex = currentTabIndex < tabs.length - 1 ? currentTabIndex + 1 : null;
    }
  }
  // For vertical orientation, handle Up/Down keys to navigate tabs
  else if (orientation === TabOrientation.VERTICAL) {
    if (event.key === 'ArrowUp') {
      nextTabIndex = currentTabIndex > 0 ? currentTabIndex - 1 : null;
    } else if (event.key === 'ArrowDown') {
      nextTabIndex = currentTabIndex < tabs.length - 1 ? currentTabIndex + 1 : null;
    }
  }
  
  // If tab is found, prevent default behavior and select the tab
  if (nextTabIndex !== null && !tabs[nextTabIndex].disabled) {
    event.preventDefault();
    onSelect(tabs[nextTabIndex].id);
  }
}

/**
 * Main Tabs component that renders a tabbed interface with configurable options
 */
const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultActiveTab,
  onChange,
  orientation = TabOrientation.HORIZONTAL,
  size = TabSize.MD,
  variant = TabVariant.CONTAINED,
  fullWidth = false,
  className = '',
  tabListClassName = '',
  tabPanelClassName = '',
  ariaLabel = 'Tabs'
}) => {
  // Set up state for active tab with defaultActiveTab or first tab as initial value
  const [activeTab, setActiveTab] = useState<string | number>(
    defaultActiveTab || (tabs.length > 0 ? tabs[0].id : '')
  );

  // Create effect to update active tab when defaultActiveTab prop changes
  useEffect(() => {
    if (defaultActiveTab !== undefined) {
      setActiveTab(defaultActiveTab);
    }
  }, [defaultActiveTab]);

  // Create handler for tab selection that validates tab is not disabled
  const handleSelect = useCallback(
    (tabId: string | number) => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab && !tab.disabled) {
        setActiveTab(tabId);
        onChange?.(tabId);
      }
    },
    [tabs, onChange]
  );

  // Create handler for keyboard navigation (Left/Right/Up/Down/Home/End keys)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      handleTabKeyDown(event, tabs, activeTab, handleSelect, orientation);
    },
    [tabs, activeTab, handleSelect, orientation]
  );

  // Generate appropriate class names based on props and component state
  const tabListClasses = clsx(
    'tabs__list',
    `tabs__list--${orientation}`,
    `tabs__list--${variant}`,
    `tabs__list--${size}`,
    { 'tabs__list--full-width': fullWidth },
    tabListClassName
  );

  const tabPanelClasses = clsx('tabs__panel', tabPanelClassName);

  // Find active tab's content
  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content || null;

  return (
    <div className={clsx('tabs', className)} role="presentation">
      {/* Render tab list with appropriate ARIA attributes */}
      <div
        className={tabListClasses}
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation={orientation === TabOrientation.VERTICAL ? 'vertical' : 'horizontal'}
        onKeyDown={handleKeyDown}
      >
        {/* Render each tab button with correct states and event handlers */}
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          const tabClasses = clsx(
            'tabs__tab',
            `tabs__tab--${variant}`,
            `tabs__tab--${size}`,
            {
              'tabs__tab--active': isActive,
              'tabs__tab--disabled': tab.disabled,
              'tabs__tab--full-width': fullWidth
            }
          );

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              className={tabClasses}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelect(tab.id)}
              disabled={tab.disabled}
            >
              {tab.icon && <span className="tabs__tab-icon">{tab.icon}</span>}
              <span className="tabs__tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render active tab's content panel with proper accessibility attributes */}
      <div
        id={`panel-${activeTab}`}
        className={tabPanelClasses}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTabContent}
      </div>
    </div>
  );
};

export default Tabs;