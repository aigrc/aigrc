/**
 * @aigrc/dashboard - Enterprise Dashboard for AI Governance, Risk, and Compliance
 *
 * This package provides a complete enterprise dashboard UI for the AIGRC platform,
 * including components for asset management, compliance tracking, runtime governance,
 * and policy management.
 *
 * @packageDocumentation
 */

// Core components
export * from './components/ui';
export * from './components/layout';
export * from './components/auth';

// Governance components
export * from './components/governance';
export * from './components/assets';
export * from './components/compliance';
export * from './components/runtime';

// Hooks
export * from './hooks';

// Contexts
export * from './contexts';

// API client
export * from './lib/api';

// Types
export * from './types';

// Utils
export * from './lib/utils';

// Pages (sample implementations)
export * from './pages';

// Mock data (for development)
export * from './lib/mock';
