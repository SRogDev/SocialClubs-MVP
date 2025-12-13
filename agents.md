# Agents Configuration - SocialClubs

Este archivo documenta las convenciones y guías para agentes de IA trabajando en el proyecto SocialClubs.

## Project Context

**Project Type**: Full-stack web application (Next.js 16 + React 19)  
**Architecture**: Modular layered architecture with clear separation of concerns  
**Backend**: Supabase (PostgreSQL, Auth, Storage)  
**Deployment**: Vercel (recommended)

## Tech Stack

- **Frontend**: React 19, Next.js 16 (App Router), TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **State/Data**: SWR (client-side fetching), React Cache Components
- **Backend**: Supabase (Auth, Database, Storage)
- **PWA**: Service Worker, Web Manifest, Vibration API

## Architecture Principles

### 1. Layered Architecture

- `/schemas` - Zod schemas (validation)
- `/services` - Business logic, CRUD operations
- `/hooks` - Custom React hooks
- `/components` - UI components (feature-based folders + `/shared` + `/ui`)
- `/utils` - Utility functions (including PWA utilities)

### 2. Presentational Pattern

- UI components receive props and render
- Business logic in `/services`
- Reusable logic in custom hooks
- NO mixing concerns

### 3. Data Fetching Strategy

- **Client**: Use SWR for all fetching
- **Server**: Use Cache Components (React 19)
- **Real-time**: SWR Subscription for SSE
- Server Components by default, Client Components only when needed

### 4. Validation & Forms

- ALL forms use React Hook Form
- ALL data validation uses Zod schemas
- Share schemas between client and server
- Validate before ANY operation

### 5. User Experience

- Implement Optimistic UI for all user interactions
- Use vibration feedback (PWA) on key actions
- Provide immediate feedback before server confirmation
- Use Suspense and Streaming for better perceived performance

## Code Conventions

### File Naming

- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Hooks: `camelCase.ts` with "use" prefix (e.g., `useUserData.ts`)
- Services: `camelCase.ts` (e.g., `userService.ts`)
- Schemas: `camelCase.ts` with "Schema" suffix (e.g., `userSchema.ts`)

### Import Organization

1. External libraries
2. Internal modules
3. Types/interfaces

### Exports

- Prefer named exports over default (except Next.js pages)
- One component per file (exceptions for tightly coupled sub-components)

## PWA Features

- Service Worker: `/public/sw.js` (Network First strategy)
- Manifest: `/public/manifest.json`
- Vibration utilities: `utils/pwa.ts`
- Use vibration patterns for tactile feedback

## Test-Driven Development (TDD)

### Mandatory TDD Workflow

This project follows **strict TDD practices**. All new features and bug fixes MUST follow this workflow:

1. **Write a failing test first** (Red phase)
2. **Write minimal code to pass the test** (Green phase)
3. **Refactor while keeping tests green** (Refactor phase)

### TDD Principles

- **Red-Green-Refactor Cycle**: Never write production code without a failing test first
- **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
- **Given-When-Then Pattern**: Structure all tests with clear sections:

  ```typescript
  // GIVEN: Initial state and preconditions
  // WHEN: Action being tested
  // THEN: Expected result verification
  ```

### Testing Strategy

- **Unit Tests** (`/tests/unit`): Individual functions, components, hooks
- **Integration Tests** (`/tests/integration`): Multi-component interactions
- **E2E Tests** (`/tests/e2e`): Complete user flows with Playwright

### Coverage Requirements

- Minimum 70% coverage for: branches, functions, lines, statements
- All critical user paths must have E2E tests
- All services and utilities must have unit tests

## Common Patterns

### Creating a New Feature (TDD Approach)

1. **Write test first** in appropriate test folder
2. Define Zod schema in `/schemas`
3. Create service functions in `/services` (test-driven)
4. Create custom hooks if needed in `/hooks` (test-driven)
5. Build UI components in `/components/[feature]` (test-driven)
6. Implement Optimistic UI
7. Add vibration feedback

### Form Implementation

```typescript
// 1. Test (tests/unit/userForm.test.tsx)
describe('UserForm', () => {
  it('should validate email format', () => { ... });
});

// 2. Schema (schemas/userSchema.ts)
export const userSchema = z.object({ ... });

// 3. Service (services/userService.ts)
export const createUser = async (data: UserInput) => { ... };

// 4. Component with React Hook Form + Optimistic UI
```

## Guidelines for AI Agents

- **MANDATORY** Follow TDD: Write tests before implementation
- **ALWAYS** use Zod for validation
- **ALWAYS** use React Hook Form for forms
- **ALWAYS** implement Optimistic UI for mutations
- **ALWAYS** write tests using Given-When-Then pattern
- **PREFER** Server Components over Client Components
- **PREFER** SWR for client-side data fetching
- **AVOID** creating new component folders without explicit instruction
- **AVOID** mixing business logic with UI components
- **AVOID** testing implementation details
- **CHECK** existing patterns before implementing new ones

## Performance Best Practices

- Cache components aggressively
- Use `use client` sparingly
- Implement code splitting
- Optimize images (next/image)
- Use Suspense boundaries
- Stream data when possible

---

**Last Updated**: December 2025  
**Maintained by**: SocialClubs Development Team
