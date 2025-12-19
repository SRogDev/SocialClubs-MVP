# Server Actions - Patrón Repository

Este directorio contiene todas las Server Actions del proyecto siguiendo el **Patrón Repository**.

## ⚠️ IMPORTANTE

**Las actions NO hacen CRUD directamente a Supabase**. Solo llaman a services:

```
Client Component → Server Action → Service (Repository) → Supabase
                                           ↓
                                    CRUD Operations
```

## Arquitectura

```
Client Component → Server Action → Service (Repository) → Database
                                    ↓
                              CRUD Operations
```

## Principios

### 1. Actions NO hacen CRUD directamente

- Las actions SOLO orquestan: autenticación, validación, y llamadas a services
- El CRUD está en `/services` (repositories)

### 2. Actions para Mutaciones (POST/PUT/DELETE)

- `createPostAction` → llama a `createPost` del service
- `updateClubAction` → llama a `updateClub` del service
- `deletePostAction` → llama a `deletePost` del service

### 3. Validación y Autenticación

```typescript
export async function updateClubAction(clubId: string, input: UpdateClubInput) {
  try {
    // 1. Validar input con Zod
    const validated = updateClubSchema.parse(input)
    
    // 2. Autenticar usuario
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }
    
    // 3. Verificar permisos
    // ...
    
    // 4. Llamar al service (Repository)
    const result = await updateClub(clubId, validated)
    
    // 5. Revalidar paths
    revalidatePath(`/clubs/${clubId}`)
    
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

## Uso en Componentes

```typescript
"use client"

import { updateClubAction } from "@/app/actions"

export default function MyComponent() {
  const handleUpdate = async () => {
    const result = await updateClubAction(clubId, { name: "New Name" })
    
    if (result.success) {
      // Handle success
    } else {
      // Handle error
    }
  }
  
  return <button onClick={handleUpdate}>Update</button>
}
```

## Estructura de Respuesta

Todas las actions devuelven:

```typescript
{
  success: boolean
  data?: T        // Si success es true
  error?: string  // Si success es false
}
```

## Optimistic UI

Usar junto con Optimistic UI para mejor UX:

```typescript
const [liked, setLiked] = useState(isLiked)

const handleLike = async () => {
  // Optimistic update
  setLiked(true)
  
  try {
    await likePostAction(postId)
  } catch (error) {
    // Revert on error
    setLiked(false)
  }
}
```

## Analytics (PostHog)

⚠️ **IMPORTANTE**: Captura de eventos SOLO en client-side

```typescript
// ❌ NO hacer en actions
posthog.capture('event') // Server-side

// ✅ SÍ hacer en componentes
const result = await myAction()
if (result.success) {
  posthog.capture('event') // Client-side
}
```

## Ver También

- `/services` - Repositories con CRUD operations
- `/hooks/swr` - Hooks para fetching (GET only)
- `/schemas` - Zod schemas para validación
