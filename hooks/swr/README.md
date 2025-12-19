# SWR Hooks - Patrón Repository

Este directorio contiene todos los hooks SWR del proyecto siguiendo el **Patrón Repository**.

## ⚠️ IMPORTANTE

**Los hooks SWR NO hacen CRUD directamente a Supabase**. Siguen este flujo:

```
Client Component → SWR Hook → fetch('/api/...') → API Route → Service → Supabase
```

Los hooks **solo hacen fetch** a endpoints de API. Las API routes llaman a services (repositories) que hacen el CRUD en Supabase.

## Arquitectura

```
Client Component → SWR Hook → API Route → Service (Repository) → Database
                     ↓                         ↓
                  GET only              CRUD Operations
```

## Principios

### 1. Hooks SOLO para FETCH (GET)

- Los hooks SWR ÚNICAMENTE hacen peticiones GET a API routes
- **NO acceden directamente a Supabase**
- Las mutaciones (POST/PUT/DELETE) van en **Server Actions** (`/app/actions`)

### 2. Llamadas a API Routes (NO a Supabase directamente)

```typescript
// ⚠️ IMPORTANTE: Este fetcher hace fetch() a API routes
// NO accede directamente a Supabase
const fetcher = async (url: string) => {
  const res = await fetch(url)  // ← Llama a API Route (/api/clubs)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useClubs(config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<{ data: Club[] }>(
    '/api/clubs',  // ← API Route (NO Supabase directamente)
    fetcher,       // ← fetch() a la API Route
    config
  )

  return {
    clubs: data?.data,
    isLoading,
    isError: error,
    mutate,
  }
}

// El flujo completo es:
// 1. Hook llama a fetcher con '/api/clubs'
// 2. fetcher hace fetch('/api/clubs') 
// 3. API Route /api/clubs recibe la request
// 4. API Route llama al service (repository)
// 5. Service hace CRUD en Supabase
// 6. Respuesta regresa al hook
```

### 3. Configuración de Cache

```typescript
{
  revalidateOnFocus: true,      // Revalidar al volver al tab
  revalidateOnReconnect: true,  // Revalidar al reconectar
  refreshInterval: 10000,       // Auto-refresh cada X ms
  dedupingInterval: 2000,       // Deduplicate requests
}
```

## Hooks Disponibles

### Club Data

- `useClubs()` - Lista de todos los clubs
- `useClub(id)` - Club específico
- `useUserClubs(userId)` - Clubs del usuario
- `useClubStats(clubId)` - Estadísticas del club
- `useClubMembers(clubId)` - Miembros del club
- `useIsMember(clubId, userId)` - Check si es miembro
- `useFeaturedClubs()` - Clubs destacados

### Post Data

- `useClubPosts(clubId)` - Posts de un club
- `usePost(postId)` - Post específico
- `usePostStats(postId)` - Estadísticas de un post
- `usePostComments(postId)` - Comentarios de un post
- `useUserPostInteractions(userId, postIds)` - Interacciones del usuario
- `useUserPosts(userId)` - Posts del usuario
- `useTrendingPosts()` - Posts trending

### User Data

- `useCurrentUser()` - Usuario autenticado actual
- `useUser(userId)` - Usuario específico
- `useUserByUsername(username)` - Usuario por username
- `useUserPoints(userId)` - Puntos del usuario (superlikes, etc.)
- `useUserMemberships(userId)` - Membresías del usuario
- `useUsernameAvailability(username)` - Check disponibilidad username

## Uso en Componentes

```typescript
"use client"

import { useClubs } from "@/hooks/swr"

export default function ClubList() {
  const { clubs, isLoading, isError, mutate } = useClubs()

  if (isLoading) return <Skeleton />
  if (isError) return <Error />
  if (!clubs) return <Empty />

  return (
    <div>
      {clubs.map(club => (
        <ClubCard key={club.id} club={club} />
      ))}
    </div>
  )
}
```

## Mutaciones con SWR

Para mutaciones, usar **Server Actions** + `mutate`:

```typescript
"use client"

import { useClubs } from "@/hooks/swr"
import { createClubAction } from "@/app/actions"

export default function CreateClub() {
  const { mutate } = useClubs()

  const handleCreate = async (data) => {
    // Optimistic update
    mutate(async (currentData) => {
      const result = await createClubAction(data)
      
      if (result.success) {
        return {
          ...currentData,
          data: [...(currentData?.data || []), result.data]
        }
      }
      
      return currentData
    }, {
      optimisticData: (current) => ({
        ...current,
        data: [...(current?.data || []), data]
      }),
      rollbackOnError: true,
      revalidate: true,
    })
  }
}
```

## Real-time con SWR Subscription

Para datos en tiempo real (SSE):

```typescript
import useSWRSubscription from 'swr/subscription'

export function useRealtimeClub(clubId: string) {
  return useSWRSubscription(
    clubId ? `/api/clubs/${clubId}/realtime` : null,
    (key, { next }) => {
      const eventSource = new EventSource(key)
      
      eventSource.addEventListener('update', (event) => {
        next(null, JSON.parse(event.data))
      })
      
      eventSource.onerror = () => {
        next('Error connecting to realtime')
      }
      
      return () => eventSource.close()
    }
  )
}
```

## Estados de Loading y Error

```typescript
const { data, isLoading, isError, mutate } = useClubs()

// isLoading: true cuando está cargando por primera vez
// isError: objeto Error si hubo error
// data: datos cargados (puede ser undefined)
// mutate: función para revalidar manualmente
```

## Best Practices

### 1. Conditional Fetching

```typescript
// Solo fetch si hay ID
const { data } = useClub(clubId || null)
```

### 2. Deduplicación

```typescript
// Múltiples componentes pueden usar el mismo hook
// SWR automáticamente deduplica las requests
function ComponentA() {
  const { clubs } = useClubs()
}

function ComponentB() {
  const { clubs } = useClubs() // Misma request
}
```

### 3. Revalidación Manual

```typescript
const { mutate } = useClubs()

// Revalidar después de una mutación
await createClubAction(data)
mutate() // Re-fetch clubs
```

## Ver También

- `/app/actions` - Server Actions para mutaciones
- `/app/api` - API Routes que usan services
- `/services` - Repositories con CRUD operations
