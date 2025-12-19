# Flujo de Datos - Patrón Repository

## ⚠️ IMPORTANTE: Hooks SWR NO acceden directamente a Supabase

Este documento clarifica cómo funciona el flujo de datos en la aplicación.

## Flujo Correcto para FETCH (GET)

```
┌─────────────────┐
│ Client Component│
│  (React)        │
└────────┬────────┘
         │
         │ 1. Usa hook
         ▼
┌─────────────────┐
│   SWR Hook      │
│  useClubs()     │
└────────┬────────┘
         │
         │ 2. fetch('/api/clubs')
         ▼
┌─────────────────┐
│   API Route     │
│ /api/clubs      │
│ route.ts        │
└────────┬────────┘
         │
         │ 3. Llama a service
         ▼
┌─────────────────┐
│   Service       │
│ clubService.ts  │
│ (Repository)    │
└────────┬────────┘
         │
         │ 4. CRUD con Supabase
         ▼
┌─────────────────┐
│    Supabase     │
│   (Database)    │
└─────────────────┘
```

## Flujo Correcto para MUTACIONES (POST/PUT/DELETE)

```
┌─────────────────┐
│ Client Component│
│  (React)        │
└────────┬────────┘
         │
         │ 1. Llama action
         ▼
┌─────────────────┐
│ Server Action   │
│ updateClubAction│
└────────┬────────┘
         │
         │ 2. Valida y autentica
         │
         │ 3. Llama a service
         ▼
┌─────────────────┐
│   Service       │
│ clubService.ts  │
│ (Repository)    │
└────────┬────────┘
         │
         │ 4. CRUD con Supabase
         ▼
┌─────────────────┐
│    Supabase     │
│   (Database)    │
└─────────────────┘
```

## Ejemplo Real: Obtener Clubs

### ❌ INCORRECTO - Acceso directo a Supabase desde hook

```typescript
// ❌ NO HACER ESTO
'use client'
import { createClient } from '@/lib/supabase/client'

export function useClubs() {
  const supabase = createClient()
  const { data } = await supabase.from('clubs').select() // ❌ Directo a DB
  return data
}
```

### ✅ CORRECTO - Hook llama a API Route

```typescript
// ✅ SÍ HACER ESTO

// 1. Hook SWR (/hooks/swr/useClubData.ts)
'use client'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)  // ← fetch a API route
  return res.json()
}

export function useClubs() {
  const { data } = useSWR('/api/clubs', fetcher)  // ← API route
  return { clubs: data?.data }
}

// 2. API Route (/app/api/clubs/route.ts)
import { getClubs } from '@/services/clubService'

export async function GET() {
  const clubs = await getClubs()  // ← Llama al service
  return Response.json({ data: clubs })
}

// 3. Service (/services/clubService.ts)
import { createClient } from '@/lib/supabase/server'

export async function getClubs() {
  const supabase = await createClient()
  const { data } = await supabase.from('clubs').select()  // ← Aquí sí CRUD
  return data
}
```

## Ejemplo Real: Actualizar Club

### ❌ INCORRECTO - CRUD en la action

```typescript
// ❌ NO HACER ESTO
'use server'
import { createClient } from '@/lib/supabase/server'

export async function updateClubAction(id, data) {
  const supabase = await createClient()
  const result = await supabase  // ❌ CRUD directo en action
    .from('clubs')
    .update(data)
    .eq('id', id)
  
  return result
}
```

### ✅ CORRECTO - Action llama a service

```typescript
// ✅ SÍ HACER ESTO

// 1. Action (/app/actions/clubActions.ts)
'use server'
import { updateClub } from '@/services/clubService'

export async function updateClubAction(id, data) {
  // Validar
  const validated = schema.parse(data)
  
  // Autenticar
  const user = await getUser()
  if (!user) return { success: false }
  
  // Llamar al service (NO CRUD aquí)
  const club = await updateClub(id, validated)  // ← Service
  
  return { success: true, data: club }
}

// 2. Service (/services/clubService.ts)
import { createClient } from '@/lib/supabase/server'

export async function updateClub(id, data) {
  const supabase = await createClient()
  const { data: club } = await supabase  // ← Aquí sí CRUD
    .from('clubs')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  
  return club
}
```

## Responsabilidades de Cada Capa

### SWR Hooks (`/hooks/swr`)

- ✅ Hacer fetch a API routes
- ✅ Manejar cache y revalidación
- ✅ Proveer estados de loading/error
- ❌ NO hacer CRUD directamente a Supabase
- ❌ NO hacer mutaciones

### Server Actions (`/app/actions`)

- ✅ Validar datos con Zod
- ✅ Autenticar usuarios
- ✅ Verificar permisos
- ✅ Llamar a services
- ✅ Revalidar paths
- ❌ NO hacer CRUD directamente a Supabase

### API Routes (`/app/api`)

- ✅ Orquestar requests GET
- ✅ Aplicar rate limiting
- ✅ Autenticar requests
- ✅ Llamar a services
- ❌ NO hacer CRUD directamente a Supabase

### Services (`/services`)

- ✅ Contener TODA la lógica de negocio
- ✅ Hacer TODAS las operaciones CRUD
- ✅ Acceder directamente a Supabase
- ✅ Usar cache de React cuando sea server-side

## Por qué este patrón?

### Ventajas

1. **Separación de responsabilidades**: Cada capa tiene un propósito claro
2. **Testeable**: Puedes testear services sin UI
3. **Reusable**: Services se usan desde actions, API routes y server components
4. **Seguro**: Validación y autenticación centralizadas
5. **Mantenible**: Cambios en DB solo afectan services

### Anti-patrones a evitar

❌ Hook hace CRUD directo a Supabase
❌ Action hace CRUD directo a Supabase  
❌ Componente accede directo a Supabase (excepto server components)
❌ Lógica de negocio en componentes
❌ Múltiples lugares con el mismo CRUD

## Preguntas Frecuentes

### ¿Por qué los hooks no van directo a Supabase?

1. **Rate limiting**: Las API routes pueden limitar requests
2. **Autenticación centralizada**: Un solo lugar para validar auth
3. **Cache del servidor**: API routes pueden cachear en servidor
4. **Logs y monitoreo**: Más fácil trackear todas las requests
5. **Cambios de DB**: Si cambias de DB, solo cambias services

### ¿Cuándo usar qué?

- **SWR Hook**: Cuando necesitas datos en client component (GET)
- **Server Action**: Cuando necesitas mutar datos desde client (POST/PUT/DELETE)
- **Server Component + Service**: Cuando puedes hacer fetch en servidor
- **API Route**: Cuando necesitas un endpoint público o rate limiting especial

### ¿Y para datos en tiempo real?

Usa **SWR Subscription** que sigue el mismo patrón:

```typescript
// Hook hace fetch a API route SSE
useSWRSubscription('/api/clubs/stream', ...)

// API Route crea SSE
// Service hace queries a Supabase
```

## Ejemplos Adicionales

Ver:

- `/app/actions/README.md` - Ejemplos de Server Actions
- `/hooks/swr/README.md` - Ejemplos de hooks SWR
- `/components/shared/club-list-example.tsx` - Ejemplo completo
