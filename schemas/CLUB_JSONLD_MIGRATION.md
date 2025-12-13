# Guía de Migración - Club JSON-LD

Esta guía te ayudará a integrar el JSON-LD de clubs en tus páginas existentes.

## 🎯 Objetivo

Agregar JSON-LD estructurado a todas las páginas de clubs para mejorar el SEO y la visibilidad en Google.

## 📋 Checklist de Migración

### Páginas a Actualizar

- [ ] `/app/clubs/[id]/page.tsx` - Página principal del club
- [ ] `/app/clubs/[id]/info/page.tsx` - Información del club (si aplica)
- [ ] Cualquier otra página que muestre un club individual

### Pasos de Migración

## 1. Página Principal del Club

**Archivo**: `/app/clubs/[id]/page.tsx`

### Antes (sin JSON-LD)

```tsx
'use client'

export default function ClubPage({ params }: { params: { id: string } }) {
  const [club, setClub] = useState(null)

  useEffect(() => {
    // Cargar club...
  }, [])

  return (
    <div>
      <h1>{club?.name}</h1>
      {/* contenido */}
    </div>
  )
}
```

### Después (con JSON-LD)

```tsx
'use client'

import ClubJsonLd from '@/components/club-json-ld'
import type { Club } from '@/types/club'

export default function ClubPage({ params }: { params: { id: string } }) {
  const [club, setClub] = useState<Club | null>(null)

  useEffect(() => {
    // Cargar club...
  }, [])

  // No renderizar JSON-LD hasta tener datos
  if (!club) return <div>Loading...</div>

  return (
    <>
      {/* ✅ NUEVO: JSON-LD para SEO */}
      <ClubJsonLd club={club} />
      
      <div>
        <h1>{club.name}</h1>
        {/* contenido */}
      </div>
    </>
  )
}
```

## 2. Si usas Server Components (Recomendado)

```tsx
// ✅ MEJOR: Server Component
import ClubJsonLd from '@/components/club-json-ld'
import { getClubById } from '@/services/clubService'

export default async function ClubPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const club = await getClubById(params.id)

  if (!club) return <div>Club no encontrado</div>

  return (
    <>
      <ClubJsonLd club={club} />
      <div>
        <h1>{club.name}</h1>
        {/* contenido */}
      </div>
    </>
  )
}
```

## 3. Con SWR

```tsx
'use client'

import useSWR from 'swr'
import ClubJsonLd from '@/components/club-json-ld'
import type { Club } from '@/types/club'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ClubPage({ params }: { params: { id: string } }) {
  const { data: club } = useSWR<Club>(`/api/clubs/${params.id}`, fetcher)

  if (!club) return <div>Loading...</div>

  return (
    <>
      <ClubJsonLd club={club} />
      <div>
        <h1>{club.name}</h1>
        {/* contenido */}
      </div>
    </>
  )
}
```

## 4. Con Zustand Store

```tsx
'use client'

import { useEffect } from 'react'
import ClubJsonLd from '@/components/club-json-ld'
import { useClubStore } from '@/stores'

export default function ClubPage({ params }: { params: { id: string } }) {
  const { getClubById, setActiveClub } = useClubStore()
  
  useEffect(() => {
    setActiveClub(params.id)
  }, [params.id])

  const club = getClubById(params.id)

  if (!club) return <div>Loading...</div>

  return (
    <>
      <ClubJsonLd club={club} />
      <div>
        <h1>{club.name}</h1>
        {/* contenido */}
      </div>
    </>
  )
}
```

## 5. Actualizar Metadata (Next.js 13+)

Combina JSON-LD con metadata para SEO completo:

```tsx
import { Metadata } from 'next'
import ClubJsonLd from '@/components/club-json-ld'
import { getClubById } from '@/services/clubService'

// ✅ Genera metadata dinámica
export async function generateMetadata({ 
  params 
}: { 
  params: { id: string } 
}): Promise<Metadata> {
  const club = await getClubById(params.id)
  
  if (!club) return { title: 'Club no encontrado' }

  return {
    title: club.name,
    description: club.bio || 'Únete a esta comunidad',
    openGraph: {
      title: club.name,
      description: club.bio || '',
      images: [
        typeof club.logo === 'object' 
          ? club.logo?.url || '/default.png' 
          : club.logo || '/default.png'
      ],
    },
  }
}

export default async function ClubPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const club = await getClubById(params.id)

  if (!club) return <div>Club no encontrado</div>

  return (
    <>
      <ClubJsonLd club={club} />
      {/* contenido */}
    </>
  )
}
```

## ⚠️ Consideraciones Importantes

### 1. Esperar a tener datos

```tsx
// ❌ MAL: Renderizar sin datos
return (
  <>
    <ClubJsonLd club={club} /> {/* club puede ser null */}
    <div>Loading...</div>
  </>
)

// ✅ BIEN: Esperar datos
if (!club) return <div>Loading...</div>

return (
  <>
    <ClubJsonLd club={club} />
    {/* contenido */}
  </>
)
```

### 2. No duplicar JSON-LD

```tsx
// ❌ MAL: Múltiples JSON-LD para el mismo club
return (
  <>
    <ClubJsonLd club={club} />
    <ClubJsonLd club={club} /> {/* duplicado! */}
  </>
)

// ✅ BIEN: Solo uno por página
return (
  <>
    <ClubJsonLd club={club} />
    {/* contenido */}
  </>
)
```

### 3. Posición en el árbol

```tsx
// ✅ BIEN: Al inicio del componente
return (
  <>
    <ClubJsonLd club={club} />
    <div>contenido...</div>
  </>
)

// ⚠️ Funciona pero no recomendado: Al final
return (
  <>
    <div>contenido...</div>
    <ClubJsonLd club={club} />
  </>
)
```

## 🧪 Testing después de la Migración

### 1. Test Visual

```bash
# Iniciar servidor de desarrollo
npm run dev

# Abrir: http://localhost:3000/clubs/[algún-id]
# Ver el código fuente (Ctrl+U)
# Buscar: application/ld+json
# Debe aparecer el JSON-LD del club
```

### 2. Validación con Google

1. Copia la URL de tu club (desarrollo o producción)
2. Ve a: <https://search.google.com/test/rich-results>
3. Pega la URL
4. Verifica que no haya errores

### 3. Test Automatizado

```bash
npm test tests/unit/components/club-json-ld.test.tsx
```

## 📊 Resultados Esperados

Después de la migración deberías ver:

1. ✅ JSON-LD en el código fuente de cada página de club
2. ✅ Sin errores en Google Rich Results Test
3. ✅ Metadata correcta en el `<head>`
4. ✅ Mejor indexación en Google (puede tomar días/semanas)

## 🐛 Troubleshooting

### Problema: JSON-LD no aparece

**Solución**:

```tsx
// Verificar que club no sea null
console.log('Club data:', club)

// Verificar que el componente se renderice
if (!club) {
  console.log('Club is null, JSON-LD not rendered')
  return <div>Loading...</div>
}
```

### Problema: Errores de TypeScript

**Solución**:

```tsx
// Asegurar que club tenga el tipo correcto
import type { Club } from '@/types/club'

const club: Club | null = // ... tu lógica
```

### Problema: Logo no se muestra correctamente

**Solución**:

```tsx
// El generador maneja diferentes formatos automáticamente:
// - club.logo = { url: 'https://...' } ✅
// - club.logo = 'https://...' ✅
// - club.logo = null ✅ (usa default)
```

## 📈 Monitoreo Post-Migración

### Semana 1-2

- Verificar que JSON-LD aparezca en todas las páginas
- Revisar Google Search Console

### Semana 3-4

- Monitorear impresiones en búsquedas
- Verificar rich snippets

### Mes 1+

- Analizar tráfico orgánico
- Ajustar metadata si es necesario

## 🎉 Listo

Una vez completada la migración, tus clubes tendrán:

- ✅ JSON-LD estructurado
- ✅ Mejor SEO
- ✅ Rich snippets en Google
- ✅ Mayor visibilidad

---

**¿Dudas?** Consulta [CLUB_JSONLD.md](./CLUB_JSONLD.md) para documentación completa.
