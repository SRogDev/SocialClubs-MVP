# SocialClubs MVP

Red social de comunidades exclusivas. Similar a Patreon pero con mayor interaccion social, videollamadas, chat en tiempo real, IA personalizada por club, y una UI premium tipo "Minimalismo Vivo".

## Stack Tecnologico

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript strict
- **Styling**: Tailwind CSS 3.4 + shadcn/ui (new-york style) + Radix UI + Framer Motion/Motion
- **State**: Zustand 5 (stores), SWR 2 (client fetching), React Context (minimal)
- **Forms**: React Hook Form + Zod 4 validation
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Payments**: Stripe Connect Express (suscripciones + pagos unicos)
- **Video Calls**: Daily.co (salas efimeras, cron cada 5min)
- **Video Hosting**: Mux (upload, processing, playback)
- **AI**: Vercel AI SDK + Google Gemini 2.0 Flash (agentes por club)
- **Email**: Resend + React Email
- **Analytics**: PostHog (solo client-side), Sentry (errors)
- **Deploy**: Vercel (serverless + cron jobs)
- **Local Cache**: Dexie.js (IndexedDB)

## Arquitectura

### Patron Repository + Presentational Layer

```
Component → Hook/Action → Service → Supabase
```

- `/schemas` - Esquemas Zod (validacion compartida client/server)
- `/services` - Repositories: TODA logica de negocio y CRUD
- `/hooks/swr` - SOLO para GET: llaman a API routes via fetch(), NO a Supabase directo
- `/app/actions` - Server Actions para mutaciones (POST/PUT/DELETE): llaman a services
- `/app/api` - API Routes (Route Handlers): orquestan auth, rate-limit, validacion, llaman a services
- `/components` - Subcarpetas por feature + `/shared` + `/ui`
- `/stores` - Zustand stores (clubStore, roomStore, post)
- `/types` - Interfaces TypeScript
- `/lib` - Utils, Supabase clients, Stripe client, rate-limit

### Flujos de Datos

- **GET**: Client Component → SWR Hook → fetch('/api/...') → API Route → Service → Supabase
- **Mutation**: Client Component → Server Action → Service → Supabase
- **Realtime**: Supabase Realtime → Zustand Store → Component re-render
- **AI Chat**: Client → POST /api/agent/chat → Vercel AI SDK → Gemini → Streaming response

### Reglas Criticas

- API routes SOLO orquestan: auth + rate-limit + validacion + llamada a service
- Services contienen TODO el CRUD y logica de negocio
- Server Components por defecto. `"use client"` solo cuando es necesario
- Rate limiting en TODAS las API routes via `lib/rate-limit.ts`
- PostHog: capturar eventos SOLO en client-side, DESPUES de status 200
- NO usar Supabase MCP a menos que se indique explicitamente
- Usar `createClient()` de `lib/supabase/server` en API routes y services

## Convenciones de Codigo

### Naming
- Componentes: `PascalCase.tsx` (UserProfile.tsx)
- Hooks: `use-*.ts` o `useFeature.ts` (use-realtime-chat.ts)
- Services: `camelCase.ts` (userService.ts)
- Schemas: `camelCaseSchema.ts` (agentSchema.ts)
- Stores: `camelCase.ts` (clubStore.ts)

### Imports
1. Externos (react, next, libraries)
2. Internos (@/components, @/services, @/hooks)
3. Types/interfaces

### Exports
- Named exports (excepto paginas Next.js que usan default)
- Un componente principal por archivo

## Base de Datos (33 tablas)

### Core
- `users` - Perfiles (extiende auth.users), `stripe_customer_id`
- `clubs` - Clubes con branding, `club_link` (invitacion unica)
- `users_clubs` - Membresia con roles y puntos por club
- `channels` - Canales por club con tiers de membresia
- `chat_messages` - Mensajes con contenido JSONB

### Contenido
- `posts` - Posts con contenido JSONB
- `post_stats` - Contadores (likes, superlikes, comments, views)
- `post_interactions` - Likes/superlikes por usuario
- `post_comments` - Comentarios anidados (parent_comment_id)
- `polls` - Encuestas (2-10 opciones JSONB)

### Pagos
- `memberships` - Tiers de suscripcion, `stripe_price_id`
- `users_memberships` - Suscripciones activas, `stripe_subscription_id`
- `payments` - Historial (direction: in/out, type: payment/payout/fee/refund)
- `club_balances` - Ganancias del creador
- `connected_stripe_accounts` - Cuentas Stripe Connect

### Videollamadas
- `vcall_appointments` - Disponibilidad semanal del creador
- `users_agendas` - Reservas con estado y pago
- `vcall_rooms` - Salas Daily.co (active/ended/expired)

### Gamificacion
- `usersPoints` - Contador global de superlikes
- `club_gamification_actions` - Reglas de puntos por club
- `club_gamification_rewards` - Recompensas canjeables

### IA
- `club_agents` - Config del agente (personalidad, temperatura, contexto)
- `agent_messages` - Historial de chat con IA
- `agent_skills` - Habilidades del agente (max 4)

### RPCs
- `increment_superlikes()` / `decrement_superlikes()`
- `increment_like_count()` / `decrement_like_count()`
- `increment_user_points()` - Actualización atómica
- `search_clubs_json()` - Búsqueda de clubs

## Features Principales

### Implementadas
- Auth completo (email/password, Supabase Auth)
- CRUD de clubs con branding y links de invitacion
- Posts con likes, superlikes, comentarios anidados, encuestas
- Perfiles de usuario con avatar y bio
- Videollamadas con Daily.co (agenda, reservas, cron, salas)
- Agente IA por club (Gemini, streaming, personalidad configurable)
- Stripe Connect Express (onboarding de creadores)
- Gamificacion (schema + services, falta UI)
- Email con React Email + Resend

### En Progreso
- Chat realtime (schema listo, UI parcial)
- Checkout de suscripciones (infraestructura lista, flujo pendiente)
- Video hosting con Mux (componentes listos, integracion parcial)
- Analytics dashboard (datos recopilados, dashboard parcial)

### Pendientes
- ~15 API routes GET necesarias para que hooks SWR funcionen (ver ESTADO_IMPLEMENTACION.md)
- Webhook handlers completos de Stripe
- Sistema de notificaciones (schema existe, delivery pendiente)
- Widgets personalizables (schema existe, UI pendiente)
- Busqueda full-text optimizada

## UX/UI - Filosofia "Minimalismo Vivo"

### Principios
- Elegancia simple con interacciones calidas y animadas
- Premium y acogedor: la tecnologia sirve a la conexion humana
- Mobile-first con bottom navbar
- Dark mode como default (next-themes, class strategy)

### Design Tokens
- **Font**: Manrope (400, 500, 600, 700)
- **Primary Light**: Dark Orange `hsl(28, 80%, 52%)`
- **Primary Dark**: Deep Saffron `hsl(30, 100%, 60%)`
- **Background Light**: Warm White `hsl(36, 39%, 96%)`
- **Background Dark**: Dark Warm Brown `hsl(24, 10%, 10%)`
- **Border Radius**: 0.75rem (12px)
- **Animations**: fade-in, slide-up, scale-in, pulse-soft

### Componentes
- shadcn/ui (new-york style) + Radix UI (26+ primitivos)
- Framer Motion + Motion para animaciones
- Lucide React para iconos
- Embla Carousel, Recharts, TanStack Table
- Integrando Aceternity UI para efectos premium

## Testing (TDD)

- **Ciclo**: Red → Green → Refactor
- **Patron**: Given-When-Then en todos los tests
- **Unit**: Jest + React Testing Library (`/tests/unit`)
- **Integration**: Jest + RTL (`/tests/integration`)
- **E2E**: Playwright (`/tests/e2e`)
- **Coverage minimo**: 70%

### Comandos
```bash
pnpm test              # Unit + integration
pnpm test:watch        # Watch mode
pnpm test:coverage     # Con coverage
pnpm test:e2e          # E2E headless
pnpm test:e2e:ui       # E2E con UI
pnpm dev               # Dev server
pnpm build             # Production build
pnpm lint              # ESLint
```

## Environment Variables

Archivo `.env.local` requerido (ver `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DAILY_API_KEY` / `NEXT_PUBLIC_DAILY_DOMAIN`
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
- `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` / `MUX_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`
- `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL`

## Skills Instaladas

Las siguientes skills estan en `.claude/skills/`:
- **react-best-practices** - 57 reglas de optimizacion React/Next.js de Vercel Engineering
- **web-design-guidelines** - Auditoria de UI contra Web Interface Guidelines
- **frontend-design** - Diseno frontend premium, evitar estetica generica de IA
- **stripe-best-practices** - Mejores practicas para integraciones Stripe (Connect, Checkout, Billing)
- **composition-patterns** - Patrones de composicion React que escalan (compound components, React 19)
