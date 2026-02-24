# Claude Code Instructions - SocialClubs

## Project Overview

SocialClubs is a full-stack web application built with Next.js 16 and React 19. It's a social platform for creating and managing clubs, featuring real-time chats, video calls, gamification, and monetization through Stripe subscriptions. The app uses Supabase for backend services (PostgreSQL, Auth, Storage) and is deployed on Vercel.

**Key Features:**

- Club creation and management
- Real-time messaging and video calls
- User profiles and exploration
- PWA with offline capabilities
- Analytics with PostHog
- Stripe-based monetization

## Tech Stack

- **Frontend**: React 19, Next.js 16 (App Router), TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **State/Data**: SWR (client-side fetching), React Cache Components
- **Backend**: Supabase (Auth, Database, Storage)
- **PWA**: Service Worker, Web Manifest, Vibration API
- **Testing**: Jest, Playwright (E2E)
- **Deployment**: Vercel

## Architecture Principles

### Layered Architecture (Repository Pattern)

- **Separation of Concerns**: Strict modular layers
- **Repository Pattern**: Services contain ALL CRUD operations
- **Presentational Pattern**: UI components separated from business logic

### Folder Structure

- `/schemas` - Zod schemas (validation)
- `/services` - Repositories: Business logic, ALL CRUD operations
- `/hooks/swr` - SWR hooks ONLY for GET requests
- `/app/actions` - Server Actions for mutations (POST/PUT/DELETE)
- `/app/api` - Backend API routes (Next.js Route Handlers)
- `/components` - UI components (feature-based + `/shared` + `/ui`)
- `/utils` - Utility functions (including PWA utilities)

### Data Flow

- **GET Flow**: Client Component → SWR Hook → API Route → Service → Supabase
- **Mutation Flow**: Client Component → Server Action → Service → Supabase
- Server Components by default, Client Components only when needed

### Backend Rules

- Backend in `/app/api` using Next.js Route Handlers
- API routes ONLY orchestrate: auth, rate limiting, validation, service calls
- Business logic and CRUD ALWAYS in `/services`
- Apply rate limiting to ALL API routes using `lib/rate-limit.ts`
- Use `createClient()` from `lib/supabase/server` in API routes and services
- **DO NOT use Supabase MCP** unless explicitly instructed

## Code Conventions

### Validation & Forms

- ALWAYS use Zod for data validation
- ALWAYS use React Hook Form for forms
- Same Zod schema for client and server
- Exhaustive validation before ANY operation

### Data Fetching

- SWR Hooks (`/hooks/swr`): ONLY for GET from client components
- Server Actions (`/app/actions`): For mutations from client components
- Prioritize React 19 Cache Components
- SWR Subscription for SSE

### UI/UX

- Implement Optimistic UI for all user interactions
- Use vibration feedback (`utils/pwa.ts`) on key actions
- Immediate feedback before server confirmation
- Suspense and Streaming for better UX

### Analytics (PostHog)

- Capture events ONLY on client-side
- Capture AFTER receiving 200 status from API routes
- DO NOT capture server-side (services or API routes)
- Key events: `club_created`, `club_deleted`, etc.

### File Naming

- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Hooks: `camelCase.ts` with "use" prefix (e.g., `useUserData.ts`)
- Services: `camelCase.ts` (e.g., `userService.ts`)
- Schemas: `camelCase.ts` with "Schema" suffix (e.g., `userSchema.ts`)

### Imports

- Absolute imports from project root
- Group imports: external, internal, types
- Prefer named exports over default (except Next.js pages)

## Testing & TDD

### Mandatory TDD Workflow

1. Write a failing test first (Red phase)
2. Write minimal code to pass the test (Green phase)
3. Refactor while keeping tests green (Refactor phase)

### TDD Principles

- Red-Green-Refactor Cycle: Never write production code without a failing test first
- Test BEHAVIOR, not implementation
- Given-When-Then Pattern: Structure all tests with clear sections

### Testing Strategy

- **Unit Tests** (`/tests/unit`): Individual functions, components, hooks
- **Integration Tests** (`/tests/integration`): Multi-component interactions
- **E2E Tests** (`/tests/e2e`): Complete user flows with Playwright
- Minimum 70% coverage for branches, functions, lines, statements

## Guidelines for Claude

- **MANDATORY** Follow TDD: Write tests before implementation
- **ALWAYS** use Zod for validation and React Hook Form for forms
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
- **AVOID** capturing PostHog events server-side
- **CHECK** existing patterns before implementing new ones

## Performance Best Practices

- Cache components aggressively
- Use `use client` sparingly
- Implement code splitting
- Optimize images (next/image)
- Use Suspense boundaries
- Stream data when possible

---

**Last Updated**: January 2026  
**Maintained by**: SocialClubs Development Team</content>
<parameter name="filePath">/home/roger/Repos/SocialClubs/socialclubs/claude.md
