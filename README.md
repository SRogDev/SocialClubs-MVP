# SocialClubs

Plataforma moderna para la gestión de clubes sociales construida con Next.js 16 y React 19.

## 🏗️ Arquitectura del Proyecto

### Principios Fundamentales

Este proyecto sigue una **arquitectura de capas modulares** con separación clara de responsabilidades:

#### 📁 Estructura de Carpetas

- **`/schemas`** - Todos los esquemas Zod para validación de datos
- **`/services`** - Lógica de negocio y funciones CRUD (patrón presentacional)
- **`/hooks`** - Custom hooks de React separados por funcionalidad
- **`/components`**
  - Subcarpetas por página/feature (ej: `/landing`, `/auth`)
  - `/shared` - Componentes comunes reutilizables
  - `/ui` - Componentes de shadcn/ui
- **`/utils`** - Funciones utilitarias y helpers

### 🎯 Convenciones de Desarrollo

#### Validación y Formularios

- **Zod** para todos los schemas de validación
- **React Hook Form** en todos los formularios
- Validación en cliente y servidor con los mismos schemas

#### Data Fetching

- **SWR** para fetching desde el cliente (cache, revalidación automática)
- **SWR Subscription** para Server-Sent Events (SSE)
- Priorizar **Cache Components** de React 19

#### UI/UX

- **Optimistic UI** en todas las interacciones del usuario
- Feedback inmediato antes de confirmar con el servidor
- Vibración táctil para interacciones clave (PWA)

#### Patrón Presentacional

- Separación entre UI y lógica de negocio
- Funciones CRUD en `/services`
- Componentes enfocados en presentación

### 📱 PWA (Progressive Web App)

El proyecto está configurado como PWA:

- Service Worker para funcionamiento offline
- Manifest.json configurado
- Utilidades de vibración en `utils/pwa.ts`
- Instalable en dispositivos móviles

### 🚀 Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS + shadcn/ui
- **Validación**: Zod
- **Formularios**: React Hook Form
- **Data Fetching**: SWR
- **Backend**:
  - API Routes Serverless (Next.js)
  - Supabase (Database, Auth, Storage)
  - APIs de terceros
- **Local Storage**: Dexie DB (IndexedDB)
- **TypeScript**: Tipado estricto
- **Testing**: Jest, React Testing Library, Playwright

### 📝 Buenas Prácticas

1. **Server Components** por defecto, Client Components solo cuando sea necesario
2. **Streaming y Suspense** para mejorar percepción de carga
3. **Optimistic Updates** para mejor UX
4. **Type-safe APIs** con Zod en cliente y servidor
5. **Componentes cacheable** siempre que sea posible

### 🎨 System Design & UX/UI

**Filosofía: "Minimalismo Vivo"** - Elegancia simple con interacciones cálidas y animadas.

#### Principios Clave

- **Tipografía**: Manrope (moderna, legible, cálida)
- **Colores Primary**:
  - Dark Orange (modo claro)
  - Deep Saffron (modo oscuro)
- **Tokens centralizados**: Variables CSS en `:root` mapeadas a Tailwind
- **Feedback visual**: Escalado, sombras y vibraciones en interacciones
- **UX Invisible**: Prefetching, transiciones suaves, validación en tiempo real
- **Inmersión total**: UI discreta que da protagonismo al contenido

📖 Ver [DESIGN.md](./DESIGN.md) para documentación completa del sistema de diseño.

### � Arquitectura Backend

El backend se construye sobre una **arquitectura serverless**:

- **API Routes de Next.js**: Endpoints serverless para lógica de negocio
- **Supabase**: Base de datos PostgreSQL, autenticación y almacenamiento
- **APIs de Terceros**: Integración con servicios externos (Stripe, Resend, etc.)
- **Dexie DB**: IndexedDB local para cache y funcionalidad offline

Esta arquitectura permite:

- Escalabilidad automática
- Costos optimizados (pay-per-use)
- Deploy simplificado en Vercel
- Edge computing para latencia mínima

## 🧪 Testing

Seguimos **Test-Driven Development (TDD)** con una estrategia de testing completa:

### Principios de Testing

1. **TDD First**: Escribir tests antes del código de implementación
2. **Given-When-Then**: Estructura clara de tests (Arrange-Act-Assert)
3. **Comportamiento sobre Implementación**: Testeamos qué hace el código, no cómo lo hace
4. **Pirámide de Testing**: Muchos tests unitarios, menos de integración, pocos E2E

### Tipos de Tests

#### 🔬 Tests Unitarios (Jest + React Testing Library)

- Funciones puras y utilidades
- Componentes aislados
- Hooks personalizados
- Ubicación: `/tests/unit`

#### 🔗 Tests de Integración (Jest + RTL)

- Flujos de múltiples componentes
- Interacción con APIs (mocked)
- Estado compartido
- Ubicación: `/tests/integration`

#### 🎭 Tests E2E (Playwright)

- Flujos completos de usuario
- Interacciones reales con backend
- Navegación entre páginas
- Ubicación: `/tests/e2e`

### Ejemplo: Patrón Given-When-Then

```typescript
describe('Login Form', () => {
  it('should login successfully with valid credentials', async () => {
    // GIVEN: Un usuario con credenciales válidas
    const validUser = { email: 'user@test.com', password: 'Pass123!' }
    
    // WHEN: El usuario ingresa sus credenciales y hace submit
    await userEvent.type(screen.getByLabelText(/email/i), validUser.email)
    await userEvent.type(screen.getByLabelText(/password/i), validUser.password)
    await userEvent.click(screen.getByRole('button', { name: /login/i }))
    
    // THEN: El usuario es redirigido al dashboard
    expect(await screen.findByText(/welcome/i)).toBeInTheDocument()
  })
})
```

### Comandos de Testing

```bash
# Tests unitarios y de integración
pnpm test              # Todos los tests
pnpm test:watch        # Modo watch
pnpm test:coverage     # Con cobertura

# Tests E2E
pnpm test:e2e          # Headless
pnpm test:e2e:ui       # Con interfaz visual
```

## �️ Desarrollo

```bash
pnpm dev
```

## �📦 Despliegue

```bash
pnpm build
pnpm start
```

---

Desarrollado con ❤️ siguiendo los principios más modernos de React, Next.js y TDD

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

  ```env
  NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
  ```

  > [!NOTE]
  > This example uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which refers to Supabase's new **publishable** key format.
  > Both legacy **anon** keys and new **publishable** keys can be used with this variable name during the transition period. Supabase's dashboard may show `NEXT_PUBLIC_SUPABASE_ANON_KEY`; its value can be used in this example.
  > See the [full announcement](https://github.com/orgs/supabase/discussions/29260) for more information.

  Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)
