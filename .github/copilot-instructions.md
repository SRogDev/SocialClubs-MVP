# GitHub Copilot Instructions - SocialClubs

## Arquitectura y Estructura

- **Patrón Presentational Layer**: Services contienen CRUDs de Supabase; componentes llaman a services o API routes (cuando se requiere backend)
- **Arquitectura de capas modulares**: Separación estricta de responsabilidades
- **Carpeta components**: Una subcarpeta por página/feature, `/shared` para componentes comunes, `/ui` para shadcn
- **Carpeta schemas**: Todos los esquemas Zod centralizados
- **Carpeta services**: Lógica de negocio y funciones CRUD (patrón presentacional)
- **Carpeta hooks**: Hooks personalizados separados por funcionalidad
- **Carpeta app/api**: Backend API routes (Next.js Route Handlers) - orquestan llamadas a services
- NO crear nuevas carpetas en components sin instrucción explícita

### Backend y API Routes
- **IMPORTANTE**: El backend va en `/app/api` usando Next.js Route Handlers
- Las API routes SOLO orquestan: autenticación, rate limiting, validación, y llamadas a services
- La lógica de negocio SIEMPRE va en `/services`
- Aplicar rate limiting a TODAS las API routes usando `lib/rate-limit.ts`
- **NO usar Supabase MCP** a menos que se indique expresamente
- Usar `createClient()` de `lib/supabase/server` en API routes

## Stack Tecnológico

- Next.js 16 (App Router) y React 19
- TypeScript con tipado estricto
- Tailwind CSS + shadcn/ui
- Supabase para backend
- SWR para data fetching en cliente
- Zod para validación
- React Hook Form para formularios

## Convenciones de Código

### Validación y Formularios
- SIEMPRE usar Zod para validación de datos
- SIEMPRE usar React Hook Form en formularios
- Mismo schema Zod para cliente y servidor
- Validación exhaustiva antes de cualquier operación

### Data Fetching
- Usar SWR para todas las peticiones desde el cliente
- SWR Subscription para Server-Sent Events (SSE)
- Priorizar Cache Components de React 19
- Server Components por defecto, Client Components solo cuando necesario

### UI/UX
- Implementar Optimistic UI en todas las interacciones del usuario
- Feedback inmediato antes de confirmación del servidor
- Usar utilidades de vibración (`utils/pwa.ts`) en interacciones clave
- Componentes presentacionales separados de lógica de negocio

### Patrón Presentacional
- Separar componentes de UI de lógica de negocio
- Funciones CRUD van en `/services`
- Componentes solo reciben props y renderizan
- Hooks personalizados para lógica reutilizable

### Analytics (PostHog)
- **IMPORTANTE**: Captura de eventos SOLO del lado del cliente
- Capturar eventos después de recibir status 200 de API routes
- NO capturar eventos en server-side (services o API routes)
- Eventos importantes: `club_created`, `club_deleted`, etc.

## PWA
- Service Worker configurado en `/public/sw.js`
- Manifest en `/public/manifest.json`
- Usar funciones de `utils/pwa.ts` para vibración y funcionalidades PWA

## Testing & TDD

### Test-Driven Development (TDD)
- SIEMPRE seguir el ciclo Red-Green-Refactor
- Escribir tests ANTES de implementar la funcionalidad
- Tests primero, código después
- Un test que falla es el punto de partida

### Patrón Given-When-Then
- Estructura todos los tests con comentarios explícitos:
  - GIVEN: Estado inicial y precondiciones
  - WHEN: Acción que se ejecuta
  - THEN: Verificación del resultado esperado

### Principios de Testing
- Testear COMPORTAMIENTO, nunca implementación
- Tests unitarios para funciones puras y componentes aislados
- Tests de integración para flujos multi-componente
- Tests E2E con Playwright para flujos completos de usuario
- Cobertura mínima: 70% (branches, functions, lines, statements)

### Ubicación de Tests
- `/tests/unit` - Tests unitarios
- `/tests/integration` - Tests de integración
- `/tests/e2e` - Tests end-to-end (Playwright)

## Buenas Prácticas
- Server Components por defecto
- Usar Suspense y Streaming para mejor UX
- Type-safe en todas las APIs con Zod
- Optimistic updates en mutaciones
- Componentes cacheables siempre que sea posible
- Evitar "use client" innecesario

## Naming Conventions
- Componentes: PascalCase (`UserProfile.tsx`)
- Hooks: camelCase con prefijo "use" (`useUserData.ts`)
- Services: camelCase (`userService.ts`)
- Schemas: camelCase con sufijo "Schema" (`userSchema.ts`)
- Utils: camelCase (`formatDate.ts`)

## Imports
- Absolute imports desde la raíz del proyecto
- Agrupar imports: externos, internos, tipos
- Preferir named exports sobre default exports (excepto páginas)
