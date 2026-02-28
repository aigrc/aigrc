# @aigrc/dashboard

Enterprise dashboard for AI Governance, Risk, and Compliance (AIGRC).

## Overview

This package provides a complete enterprise dashboard UI for the AIGRC platform, including components for:

- **Asset Management**: Create, view, and manage AI asset cards
- **Detection Results**: View framework detection scan results
- **Compliance Tracking**: Monitor compliance status across multiple standards
- **Runtime Governance**: Monitor and control AI agents via AIGOS integration
- **Policy Management**: Create and enforce governance policies

## Installation

```bash
pnpm add @aigrc/dashboard
```

## Quick Start

```tsx
import { createAigrcClient, AuthProvider } from '@aigrc/dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Initialize the API client
createAigrcClient({
  baseUrl: 'https://api.aigrc.io',
  apiKey: 'your-api-key',
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Your app content */}
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

## Architecture

This package is designed to integrate with the AIGRC ecosystem:

```
┌─────────────────────────────────────────────────────────────┐
│                    @aigrc/dashboard                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐   │
│  │   Components   │  │     Hooks      │  │   Contexts   │   │
│  │  - UI          │  │  - useAssets   │  │  - Auth      │   │
│  │  - Layout      │  │  - useRuntime  │  │  - Theme     │   │
│  │  - Governance  │  │  - useDashboard│  │              │   │
│  └───────┬────────┘  └───────┬────────┘  └──────┬───────┘   │
│          │                   │                   │           │
│          └───────────────────┼───────────────────┘           │
│                              │                               │
│                    ┌─────────▼─────────┐                     │
│                    │   AIGRC API Client │                    │
│                    └─────────┬─────────┘                     │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │        AIGRC Backend           │
              │  - @aigrc/core (detection)     │
              │  - @aigos/runtime (governance) │
              │  - Policy engine               │
              └────────────────────────────────┘
```

## Components

### UI Components

Based on shadcn/ui and Radix primitives:

- `Button`, `Card`, `Badge`, `Table`
- `Input`, `Select`, `Dialog`, `Tabs`
- Custom governance variants (risk levels, compliance status)

### Hooks

React Query-based data fetching:

- `useAssets()` - Asset card CRUD operations
- `useDetection()` - Framework detection scans
- `useCompliance()` - Compliance assessments
- `useRuntime()` - AIGOS agent monitoring
- `useDashboard()` - Dashboard metrics

### Contexts

- `AuthProvider` - Authentication state management
- `PermissionGate` - Permission-based rendering
- `RoleGate` - Role-based rendering

## Theming

The dashboard uses CSS variables for theming. Governance-specific colors:

```css
:root {
  --governance-minimal: 142 76% 36%;    /* Green */
  --governance-limited: 48 96% 53%;     /* Yellow */
  --governance-high: 25 95% 53%;        /* Orange */
  --governance-unacceptable: 0 84% 60%; /* Red */
}
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## License

Apache-2.0

## Related Packages

- [@aigrc/core](../core) - Core detection and classification engine
- [@aigrc/cli](../cli) - Command-line interface
- [@aigos/runtime](../../aigos/packages/runtime) - Runtime governance layer
