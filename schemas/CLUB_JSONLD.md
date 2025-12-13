# Club JSON-LD - Structured Data for SEO

Este módulo proporciona generación automática de JSON-LD (Schema.org) para clubes, mejorando el SEO y la aparición en búsquedas de Google con rich snippets.

## ¿Qué es JSON-LD?

JSON-LD (JavaScript Object Notation for Linked Data) es un formato que ayuda a los motores de búsqueda a entender mejor el contenido de tu página. Para los clubes, usamos el tipo `Organization` de Schema.org.

## Beneficios

- ✅ **Mejor SEO**: Los motores de búsqueda entienden mejor tu contenido
- ✅ **Rich Snippets**: Aparición mejorada en resultados de búsqueda con logo, miembros, etc.
- ✅ **Knowledge Graph**: Posibilidad de aparecer en el Knowledge Graph de Google
- ✅ **Redes Sociales**: Mejor vista previa al compartir enlaces

## Uso Básico

### En una Página de Club (Client Component)

```tsx
'use client'

import ClubJsonLd from '@/components/club-json-ld'
import { useEffect, useState } from 'react'
import type { Club } from '@/types/club'

export default function ClubPage({ params }: { params: { id: string } }) {
  const [club, setClub] = useState<Club | null>(null)

  useEffect(() => {
    // Cargar datos del club
    fetch(`/api/clubs/${params.id}`)
      .then(res => res.json())
      .then(data => setClub(data))
  }, [params.id])

  if (!club) return <div>Loading...</div>

  return (
    <>
      {/* JSON-LD para SEO */}
      <ClubJsonLd club={club} />
      
      {/* Contenido de la página */}
      <div>
        <h1>{club.name}</h1>
        <p>{club.bio}</p>
        {/* ... resto del contenido ... */}
      </div>
    </>
  )
}
```

### En una Página de Club (Server Component)

```tsx
import ClubJsonLd from '@/components/club-json-ld'
import { getClubById } from '@/services/clubService'

export default async function ClubPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const club = await getClubById(params.id)

  if (!club) {
    return <div>Club no encontrado</div>
  }

  return (
    <>
      {/* JSON-LD para SEO */}
      <ClubJsonLd club={club} />
      
      {/* Contenido de la página */}
      <div>
        <h1>{club.name}</h1>
        <p>{club.bio}</p>
        {/* ... resto del contenido ... */}
      </div>
    </>
  )
}
```

### Uso Directo del Generador

Si necesitas más control o quieres usar el JSON-LD de otra forma:

```tsx
import { generateClubJsonLd } from '@/schemas/clubJsonLdSchema'
import type { Club } from '@/types/club'

export default function CustomClubSeo({ club }: { club: Club }) {
  const jsonLd = generateClubJsonLd(club)

  // Puedes modificar el jsonLd si necesitas agregar campos adicionales
  const customJsonLd = {
    ...jsonLd,
    // Agregar campos personalizados
    additionalType: 'https://schema.org/ProfessionalService',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(customJsonLd) }}
    />
  )
}
```

## Datos Incluidos en el Schema

El schema generado incluye automáticamente:

| Campo | Origen | Descripción |
|-------|--------|-------------|
| `@type` | - | `"Organization"` (tipo Schema.org) |
| `@id` | `club.id` | URL única del club |
| `name` | `club.name` | Nombre del club |
| `description` | `club.bio` | Biografía/descripción del club |
| `url` | `club.id` | URL de la página del club |
| `logo` | `club.logo` | Logo del club (ImageObject) |
| `numberOfMembers` | `club.total_members` | Número de miembros |
| `keywords` | `club.tags` | Tags como keywords |
| `foundingDate` | `club.created_at` | Fecha de creación |
| `memberOf` | - | Pertenece a SocialClubs |
| `isAccessibleForFree` | `club.privacity` | `true` si es público |

## Ejemplo de JSON-LD Generado

Para un club con estos datos:

```typescript
const club: Club = {
  id: 'club-123',
  name: 'Club de Programación',
  bio: 'Un club para desarrolladores apasionados',
  logo: { url: 'https://example.com/logo.png' },
  total_members: 150,
  tags: ['programación', 'desarrollo', 'tecnología'],
  privacity: 'public',
  created_at: '2024-01-15T10:00:00Z',
  // ... otros campos
}
```

Se genera este JSON-LD:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://socialclubs.com/clubs/club-123",
  "name": "Club de Programación",
  "description": "Un club para desarrolladores apasionados",
  "url": "https://socialclubs.com/clubs/club-123",
  "logo": {
    "@type": "ImageObject",
    "url": "https://example.com/logo.png"
  },
  "numberOfMembers": 150,
  "keywords": "programación, desarrollo, tecnología",
  "foundingDate": "2024-01-15T10:00:00Z",
  "memberOf": {
    "@type": "Organization",
    "name": "Red Social de Comunidades",
    "url": "https://socialclubs.com"
  },
  "isAccessibleForFree": true
}
```

## Validación

Puedes validar el JSON-LD generado usando estas herramientas:

1. **Google Rich Results Test**: <https://search.google.com/test/rich-results>
2. **Schema.org Validator**: <https://validator.schema.org/>
3. **Google Search Console**: Monitorea el rendimiento en búsquedas

### Validación en Tests

```typescript
import { generateClubJsonLd } from '@/schemas/clubJsonLdSchema'

test('should generate valid JSON-LD', () => {
  const club = createMockClub()
  const jsonLd = generateClubJsonLd(club)
  
  // Verificar estructura básica
  expect(jsonLd['@context']).toBe('https://schema.org')
  expect(jsonLd['@type']).toBe('Organization')
  expect(jsonLd.name).toBeDefined()
  expect(jsonLd.logo).toBeDefined()
})
```

## Mejores Prácticas

### ✅ DO

- Incluir el componente en todas las páginas de club individuales
- Mantener los datos del club actualizados
- Usar logos de alta calidad (mínimo 112x112px)
- Validar el JSON-LD generado regularmente

### ❌ DON'T

- No duplicar el JSON-LD en la misma página
- No incluir información falsa o engañosa
- No usar HTML en los campos de texto (se sanitiza automáticamente)
- No olvidar actualizar cuando cambian los datos del club

## Manejo de Casos Especiales

### Club sin Logo

```typescript
// Si el club no tiene logo, se usa el logo por defecto de la plataforma
const club: Club = {
  // ...
  logo: null, // Se usará /icons/icon-512.png
}
```

### Club Privado

```typescript
// Los clubs privados se marcan como no gratuitos
const privateClub: Club = {
  // ...
  privacity: 'private',
  // isAccessibleForFree será false en el JSON-LD
}
```

### Club sin Tags

```typescript
// Si no hay tags, el campo keywords se omite
const club: Club = {
  // ...
  tags: null, // O [] - keywords no aparecerá en JSON-LD
}
```

## Testing

El schema está completamente testeado siguiendo TDD:

```bash
# Ejecutar tests del JSON-LD schema
npm test tests/unit/schemas/clubJsonLdSchema.test.ts
```

Los tests cubren:

- ✅ Estructura básica del schema
- ✅ Manejo de logos (existente, null, string)
- ✅ Información de miembros
- ✅ Tags y keywords
- ✅ Fechas
- ✅ Privacidad y accesibilidad
- ✅ Casos extremos y sanitización

## Integración con Next.js Metadata

Si estás usando Next.js 13+ con App Router, puedes combinar JSON-LD con metadata:

```tsx
import { Metadata } from 'next'
import ClubJsonLd from '@/components/club-json-ld'
import { getClubById } from '@/services/clubService'

export async function generateMetadata({ 
  params 
}: { 
  params: { id: string } 
}): Promise<Metadata> {
  const club = await getClubById(params.id)
  
  return {
    title: club.name,
    description: club.bio || 'Únete a esta comunidad',
    openGraph: {
      title: club.name,
      description: club.bio || '',
      images: [club.logo?.url || '/default-og.png'],
    },
  }
}

export default async function ClubPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const club = await getClubById(params.id)

  return (
    <>
      <ClubJsonLd club={club} />
      <div>{/* contenido */}</div>
    </>
  )
}
```

## Monitoreo y Análisis

### Google Search Console

1. Ve a Search Console
2. Busca "Datos estructurados" o "Rich Results"
3. Verifica que tus clubs aparezcan correctamente

### Debugging

Si el JSON-LD no aparece o tiene errores:

```typescript
// En desarrollo, puedes ver el JSON-LD generado:
console.log(JSON.stringify(generateClubJsonLd(club), null, 2))
```

## Recursos Adicionales

- [Schema.org Organization](https://schema.org/Organization)
- [Google Search - Structured Data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [JSON-LD Specification](https://json-ld.org/)

---

**Creado siguiendo**: TDD, TypeScript strict mode, y las convenciones de SocialClubs
