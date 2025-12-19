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

### 1. Layered Architecture (Repository Pattern)

- `/schemas` - Zod schemas (validation)
- `/services` - **Repositories**: Business logic, ALL CRUD operations (data access layer)
- `/hooks` - Custom React hooks
  - `/hooks/swr` - SWR hooks for FETCH only (GET requests)
- `/app/actions` - Server Actions for mutations (POST/PUT/DELETE) - call services
- `/components` - UI components (feature-based folders + `/shared` + `/ui`)
- `/utils` - Utility functions (including PWA utilities)
- `/app/api` - Backend API routes (Next.js Route Handlers)

### 2. Backend & API Routes (Repository Pattern)

- **CRITICAL**: Backend goes in `/app/api` using Next.js Route Handlers
- **Repository Pattern**: Services contain ALL CRUD, API routes/Actions call them
- API routes ONLY orchestrate: authentication, rate limiting, validation, service calls
- Business logic and CRUD ALWAYS go in `/services` (repositories)
- **Server Actions** (`/app/actions`): For mutations from client components - call services
- **SWR Hooks** (`/hooks/swr`): ONLY for FETCH (GET) - call API routes
- Apply rate limiting to ALL API routes using `lib/rate-limit.ts`
- **DO NOT use Supabase MCP** unless explicitly instructed
- Use `createClient()` from `lib/supabase/server` in API routes and services

### 3. Presentational Pattern & Repository Pattern

- **Repository Pattern**: Services encapsulate data access (CRUD operations)
- **Presentational Layer**: UI components separated from business logic
- **Service Layer**: Services contain business logic and database operations
- UI components receive props and render only
- SWR hooks for fetching, Server Actions for mutations
- Flow: Component → Hook/Action → Service → Database
- NO mixing concerns

### 4. Data Fetching Strategy (Repository Pattern)

- **Client Fetching**: SWR hooks (`/hooks/swr`) ONLY for GET requests
  - Hooks call API routes via `fetch('/api/...')`, NOT Supabase directly
- **Client Mutations**: Server Actions (`/app/actions`) for POST/PUT/DELETE
  - Actions call services (repositories), NOT CRUD directly
- **Server**: Use Cache Components (React 19) with services directly
- **Real-time**: SWR Subscription for SSE
- Server Components by default, Client Components only when needed
- **GET Flow**: Client Component → SWR Hook → fetch() → API Route → Service → Supabase
- **Mutation Flow**: Client Component → Server Action → Service → Supabase

### 5. Validation & Forms

- ALL forms use React Hook Form
- ALL data validation uses Zod schemas
- Share schemas between client and server
- Validate before ANY operation

### 6. Analytics (PostHog)

- **CRITICAL**: Capture events ONLY on client-side
- Capture events AFTER receiving 200 status from API routes
- DO NOT capture events server-side (services or API routes)
- Key events: `club_created`, `club_deleted`, etc.

### 7. User Experience

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

### Repository Pattern Flow

1. **Services** (`/services`): Contain ALL CRUD operations (repositories)
2. **Server Actions** (`/app/actions`): Handle mutations, call services
3. **SWR Hooks** (`/hooks/swr`): Handle fetching (GET only), call API routes
4. **API Routes** (`/app/api`): Orchestrate auth, validation, call services
5. **Client Components**: Use hooks for data, actions for mutations

### Creating a New Feature (TDD Approach)

1. **Write test first** in appropriate test folder
2. Define Zod schema in `/schemas`
3. Create service functions (repository) in `/services` (test-driven)
4. Create Server Actions in `/app/actions` for mutations (test-driven)
5. Create SWR hooks in `/hooks/swr` for fetching (test-driven)
6. Build UI components in `/components/[feature]` (test-driven)
7. Implement Optimistic UI
8. Add vibration feedback

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
- **ALWAYS** create API routes in `/app/api` for backend operations
- **ALWAYS** apply rate limiting to API routes
- **PREFER** Server Components over Client Components
- **PREFER** SWR for client-side data fetching
- **AVOID** creating new component folders without explicit instruction
- **AVOID** mixing business logic with UI components
- **AVOID** testing implementation details
- **AVOID** using Supabase MCP unless explicitly requested
- **AVOID** capturing PostHog events on server-side
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
