// Barrel file that exports all layout components for simplified imports throughout the application.
// This includes the main structural components like Header, Footer, Sidebar, NotificationCenter, PageHeader, and MainLayout that form the UI framework for both Pike (merchant) and Barracuda (admin) interfaces.

// IE1: Import the Footer component for application layout
import Footer from './Footer';
// IE1: Import the Header component for application navigation
import Header from './Header';
// IE1: Import the Sidebar component for application navigation
import Sidebar from './Sidebar';
// IE1: Import the NotificationCenter component for displaying alerts and notifications
import NotificationCenter from './NotificationCenter';
// IE1: Import the PageHeader component for consistent page headers
import { PageHeader } from './PageHeader';
// IE1: Import the MainLayout component that composes other layout components
import MainLayout from './MainLayout';

// LD1: Export the Footer component for use throughout the application
export { Footer };
// LD1: Export the Header component for use throughout the application
export { Header };
// LD1: Export the Sidebar component for use throughout the application
export { Sidebar };
// LD1: Export the NotificationCenter component for use throughout the application
export { NotificationCenter };
// LD1: Export the PageHeader component for use throughout the application
export { PageHeader };
// LD1: Export the MainLayout component for use throughout the application
export { MainLayout };