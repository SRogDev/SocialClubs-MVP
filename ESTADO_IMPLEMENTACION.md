# Estado de Implementación - Hooks y Actions

## ✅ Implementado y Funcional

### API Routes Existentes

- ✅ `POST /api/clubs` - Crear club (route + service)
- ✅ `DELETE /api/clubs/[id]` - Eliminar club (route + service)

### Actions Funcionales (llaman a services existentes)

- ✅ `updateClubAction` - Usa `updateClub()`
- ✅ `joinClubAction` - Usa `joinClub()`
- ✅ `leaveClubAction` - Usa `leaveClub()`
- ✅ `createPostAction` - Usa `createPost()`
- ✅ `updatePostAction` - Usa `updatePost()`
- ✅ `deletePostAction` - Usa `deletePost()`
- ✅ `addCommentAction` - Usa `addComment()`
- ✅ `likePostAction` - Usa `addPostInteraction()`
- ✅ `unlikePostAction` - Usa `removePostInteraction()`
- ✅ `superlikePostAction` - Usa `addPostInteraction()`
- ✅ `updateProfileAction` - Usa `updateUserProfile()`
- ✅ `uploadProfileImageAction` - Usa Supabase Storage

### Services (Repositories) Completos

Todos los services en `/services` están completos con CRUD:

- ✅ `clubService.ts` - CRUD completo
- ✅ `postService.ts` - CRUD completo
- ✅ `userService.ts` - CRUD completo
- ✅ `exploreService.ts` - Queries de exploración
- ✅ `authService.ts` - Autenticación

## ⚠️ Pendiente de Implementar

### Hooks SWR (Requieren API Routes)

#### Club Hooks

- ⚠️ `useClubs()` - Necesita `GET /api/clubs`
  - Service existe: `getClubs()`
- ⚠️ `useClub(id)` - Necesita `GET /api/clubs/[id]`
  - Service existe: `getClubById(id)`
- ⚠️ `useUserClubs(userId)` - Necesita `GET /api/users/[userId]/clubs`
  - Service existe: `getUserClubs(userId)`
- ⚠️ `useClubStats(clubId)` - Necesita `GET /api/clubs/[clubId]/stats`
  - Service existe: `getClubStats(clubId)`
- ⚠️ `useClubMembers(clubId)` - Necesita `GET /api/clubs/[clubId]/members`
  - Service: Necesita crear función con join users_clubs + users
- ⚠️ `useIsMember(clubId, userId)` - Necesita `GET /api/clubs/[clubId]/members/[userId]`
  - Service existe: `isUserClubMember(userId, clubId)`
- ⚠️ `useFeaturedClubs()` - Necesita `GET /api/clubs/featured`
  - Service existe: `getFeaturedClubs()` en exploreService

#### Post Hooks

- ⚠️ `useClubPosts(clubId)` - Necesita `GET /api/clubs/[clubId]/posts`
  - Service existe: `getPosts(clubId)`
- ⚠️ `usePost(postId)` - Necesita `GET /api/posts/[postId]`
  - Service existe: `getPostById(id)`
- ⚠️ `usePostStats(postId)` - Necesita `GET /api/posts/[postId]/stats`
  - Service existe: `getPostStats(postId)`
- ⚠️ `usePostComments(postId)` - Necesita `GET /api/posts/[postId]/comments`
  - Service existe: `getPostComments(postId)`
- ⚠️ `useUserPostInteractions(userId, postIds)` - Necesita `GET /api/users/[userId]/interactions?postIds=...`
  - Service existe: `getUserPostInteractions(userId, postIds)`
- ⚠️ `useUserPosts(userId)` - Necesita `GET /api/users/[userId]/posts`
  - Service: Necesita crear función con query a posts by user_id
- ⚠️ `useTrendingPosts()` - Necesita `GET /api/posts/trending`
  - Service: Necesita crear función con query ordenado por stats

#### User Hooks

- ⚠️ `useCurrentUser()` - Necesita `GET /api/users/me`
  - Service existe: `getCurrentUser()`
- ⚠️ `useUser(userId)` - Necesita `GET /api/users/[userId]`
  - Service existe: `getUserProfile(id)`
- ⚠️ `useUserByUsername(username)` - Necesita `GET /api/users/username/[username]`
  - Service existe: `getUserByUsername(username)`
- ⚠️ `useUserPoints(userId)` - Necesita `GET /api/users/[userId]/points`
  - Service existe: `getUserPoints(userId)`
- ⚠️ `useUserMemberships(userId)` - Necesita `GET /api/users/[userId]/memberships`
  - Service existe: `getUserClubMemberships(userId)`

## 🗑️ Eliminado

- ❌ `useUsernameAvailability` - No necesario, Supabase maneja unicidad
- ❌ `useNotifications` - Archivo eliminado, se trabajará después
- ❌ `toggleClubNotificationsAction` - Eliminado de actions

## 📋 Para Implementar un Hook Nuevo

### 1. Crear API Route

```typescript
// /app/api/clubs/route.ts
export async function GET(request: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, RATE_LIMITS.QUERY)
  if (rateLimitResult) return rateLimitResult

  // 2. Autenticación (opcional según endpoint)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 3. Llamar al service
  const clubs = await getClubs()

  // 4. Retornar response
  return NextResponse.json({ data: clubs })
}
```

### 2. El Hook ya está listo

Los hooks ya están creados, solo necesitan que exista la API route correspondiente.

```typescript
// Ya existe en /hooks/swr/useClubData.ts
export function useClubs() {
  const { data } = useSWR('/api/clubs', fetcher)
  return { clubs: data?.data }
}
```

### 3. Usar en Componente

```typescript
'use client'
import { useClubs } from '@/hooks/swr'

export default function MyComponent() {
  const { clubs, isLoading, isError } = useClubs()
  
  if (isLoading) return <Skeleton />
  if (isError) return <Error />
  
  return <div>{clubs?.map(club => ...)}</div>
}
```

## 🎯 Prioridad de Implementación

### Alta Prioridad (necesarios para funcionalidad básica)

1. `GET /api/clubs` - Listar clubs
2. `GET /api/clubs/[id]` - Ver detalles de un club
3. `GET /api/users/me` - Usuario actual
4. `GET /api/clubs/[clubId]/posts` - Posts de un club
5. `GET /api/clubs/[clubId]/members/[userId]` - Verificar membresía

### Media Prioridad

6. `GET /api/clubs/[clubId]/stats` - Estadísticas
2. `GET /api/posts/[postId]/comments` - Comentarios
3. `GET /api/users/[userId]/points` - Puntos del usuario
4. `GET /api/clubs/featured` - Clubs destacados

### Baja Prioridad

10. `GET /api/posts/trending` - Posts trending
2. `GET /api/clubs/[clubId]/members` - Lista de miembros
3. `GET /api/users/[userId]/memberships` - Membresías del usuario

## 📝 Notas

- Todos los hooks tienen el comentario ⚠️ PENDIENTE indicando qué falta
- Los services (repositories) ya están completos
- Las actions están funcionales y llaman a services
- Solo falta crear las API routes GET para que los hooks funcionen
