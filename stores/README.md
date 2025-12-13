# Stores - Zustand State Management

Este directorio contiene los stores de Zustand para el manejo de estado global de la aplicación.

## Stores Implementados ✅

### 1. Post Store (`postStore.ts`)

Maneja el estado de los posts con soporte para actualizaciones optimistas.

#### Características

- ✅ CRUD completo de posts
- ✅ Actualizaciones optimistas
- ✅ Filtrado por club
- ✅ Estado de carga
- ✅ Selección por ID

#### Ejemplo de Uso

```typescript
'use client'

import { usePostStore } from '@/stores'
import { useEffect } from 'react'

function PostsList() {
  const { 
    posts, 
    isLoading, 
    setPosts, 
    addOptimisticPost,
    confirmOptimisticPost,
    getPostsByClubId 
  } = usePostStore()

  // Cargar posts iniciales
  useEffect(() => {
    const loadPosts = async () => {
      const response = await fetch('/api/posts')
      const data = await response.json()
      setPosts(data)
    }
    loadPosts()
  }, [setPosts])

  // Crear post con actualización optimista
  const handleCreatePost = async (content: string) => {
    const tempId = `temp-${Date.now()}`
    const optimisticPost = {
      id: tempId,
      club_id: 'club-1',
      content: { text: content },
      type: 'text',
      created_at: new Date().toISOString()
    }

    // Agregar inmediatamente (optimistic)
    addOptimisticPost(optimisticPost)

    try {
      // Enviar al servidor
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(optimisticPost)
      })
      const realPost = await response.json()

      // Confirmar con el ID real del servidor
      confirmOptimisticPost(tempId, realPost)
    } catch (error) {
      // Si falla, remover el post optimista
      removeOptimisticPost(tempId)
    }
  }

  // Filtrar posts por club
  const clubPosts = getPostsByClubId('club-1')

  return (
    <div>
      {isLoading ? (
        <p>Cargando posts...</p>
      ) : (
        posts.map(post => (
          <div key={post.id}>
            {post.content?.text}
          </div>
        ))
      )}
    </div>
  )
}
```

### 2. Club Store (`clubStore.ts`)

Maneja el estado de los clubs con soporte para club activo.

#### Características

- ✅ CRUD completo de clubs
- ✅ Club activo (selección)
- ✅ Filtrado por creador
- ✅ Estado de carga
- ✅ Selección por ID

#### Ejemplo de Uso

```typescript
'use client'

import { useClubStore } from '@/stores'
import { useEffect } from 'react'

function ClubSelector() {
  const { 
    clubs, 
    activeClub,
    activeClubId,
    setActiveClub,
    setClubs,
    getClubsByCreator,
    updateClub 
  } = useClubStore()

  // Cargar clubs iniciales
  useEffect(() => {
    const loadClubs = async () => {
      const response = await fetch('/api/clubs')
      const data = await response.json()
      setClubs(data)
    }
    loadClubs()
  }, [setClubs])

  // Seleccionar club activo
  const handleSelectClub = (clubId: string) => {
    setActiveClub(clubId)
  }

  // Actualizar club
  const handleUpdateClub = async (clubId: string, updates: Partial<Club>) => {
    // Actualizar localmente (optimistic)
    updateClub(clubId, updates)

    try {
      // Sincronizar con servidor
      await fetch(`/api/clubs/${clubId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      })
    } catch (error) {
      // Revertir cambios si falla
      console.error('Failed to update club', error)
    }
  }

  // Obtener mis clubs
  const myClubs = getClubsByCreator('user-id')

  return (
    <div>
      <h2>Club Activo: {activeClub?.name || 'Ninguno'}</h2>
      
      <div>
        {clubs.map(club => (
          <button 
            key={club.id}
            onClick={() => handleSelectClub(club.id)}
            className={activeClubId === club.id ? 'active' : ''}
          >
            {club.name}
          </button>
        ))}
      </div>

      <div>
        <h3>Mis Clubs</h3>
        {myClubs.map(club => (
          <div key={club.id}>{club.name}</div>
        ))}
      </div>
    </div>
  )
}
```

## Patrones de Uso

### 1. Actualización Optimista (Optimistic UI)

```typescript
// 1. Crear dato temporal
const tempId = `temp-${Date.now()}`
const optimisticData = { id: tempId, ...data }

// 2. Agregar inmediatamente al store
addOptimisticPost(optimisticData)

// 3. Enviar al servidor
try {
  const realData = await createInServer(data)
  // 4. Confirmar con dato real
  confirmOptimisticPost(tempId, realData)
} catch (error) {
  // 5. Revertir si falla
  removeOptimisticPost(tempId)
}
```

### 2. Persistencia con SWR

```typescript
import useSWR from 'swr'
import { usePostStore } from '@/stores'

function PostsWithSWR() {
  const { setPosts } = usePostStore()
  
  const { data, error } = useSWR('/api/posts', fetcher, {
    onSuccess: (data) => {
      // Sincronizar con el store
      setPosts(data)
    }
  })

  // El store se mantiene actualizado automáticamente
}
```

### 3. Combinación de Stores

```typescript
function ClubPosts({ clubId }: { clubId: string }) {
  const { getClubById } = useClubStore()
  const { getPostsByClubId } = usePostStore()

  const club = getClubById(clubId)
  const posts = getPostsByClubId(clubId)

  return (
    <div>
      <h1>{club?.name}</h1>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
```

## Testing

Los stores están completamente testeados siguiendo TDD:

```bash
# Ejecutar tests de stores
npm test tests/unit/stores/

# Test específico
npm test tests/unit/stores/postStore.test.ts
npm test tests/unit/stores/clubStore.test.ts
```

## Buenas Prácticas

1. **Usar selectores**: Preferir `getPostById` sobre filtrar manualmente
2. **Optimistic UI**: Siempre implementar actualizaciones optimistas para mejor UX
3. **Sincronización**: Mantener el store sincronizado con el servidor usando SWR
4. **Estado local vs global**: Solo usar stores para estado que se comparte entre componentes
5. **Limpieza**: Llamar `clearPosts()` o `clearClubs()` al desmontar componentes que los necesiten

## Arquitectura

```
stores/
├── index.ts          # Barrel export
├── postStore.ts      # Store de posts ✅
├── clubStore.ts      # Store de clubs ✅
└── README.md         # Esta documentación
```

## Próximos Stores (Planned)

Considera crear stores adicionales para:

- `userStore.ts` - Estado del usuario y perfil
- `notificationStore.ts` - Notificaciones y alertas
- `chatStore.ts` - Mensajes y conversaciones
- `membershipStore.ts` - Membresías y suscripciones
- `authStore.ts` - Authentication state
- `uiStore.ts` - UI state (modals, toasts, etc.)

## Why Zustand?

- Minimal boilerplate
- Better TypeScript support
- No Provider wrapper needed
- Built-in devtools support
- Perfect for Optimistic UI patterns
- Optimized re-renders

## Migration Plan

1. Create individual stores in this folder
2. Gradually replace Context API usage
3. Update components to use Zustand hooks
4. Remove Context providers once migration is complete

## Resources

- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Zustand with TypeScript](https://github.com/pmndrs/zustand#typescript)
