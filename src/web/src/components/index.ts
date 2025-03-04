/**
 * Main barrel file that exports all UI components from the application organized by category.
 * This provides a centralized import point for common, shared, charts, layout, and platform-specific (Pike and Barracuda) components.
 */

// IE1: Import all common UI components (buttons, inputs, modals, etc.)
import * as CommonComponents from './common';
// IE1: Import all chart components for data visualization
import * as ChartComponents from './charts';
// IE1: Import all shared components used across interfaces
import * as SharedComponents from './shared';
// IE1: Import all layout components (header, footer, sidebar, etc.)
import * as LayoutComponents from './layout';
// IE1: Import all Pike (merchant-facing) components
import * as PikeComponents from './pike';
// IE1: Import all Barracuda (admin-facing) components
import * as BarracudaComponents from './barracuda';

// LD1, IE3: Re-export all common UI components
export * as Common from './common';

// LD1, IE3: Re-export all chart components
export * as Charts from './charts';

// LD1, IE3: Re-export all shared components
export * as Shared from './shared';

// LD1, IE3: Re-export all layout components
export * as Layout from './layout';

// LD1, IE3: Re-export all Pike (merchant-facing) components
export * as Pike from './pike';

// LD1, IE3: Re-export all Barracuda (admin-facing) components
export * as Barracuda from './barracuda';