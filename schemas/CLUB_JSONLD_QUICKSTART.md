# Club JSON-LD Schema - Quick Start

## 📋 Resumen

Sistema de generación de JSON-LD (Schema.org) para clubes que mejora el SEO y la visibilidad en motores de búsqueda.

## 🚀 Implementación Rápida

### 1. En cualquier página de club

```tsx
import ClubJsonLd from '@/components/club-json-ld'
import { getClubById } from '@/services/clubService'

export default async function ClubPage({ params }: { params: { id: string } }) {
  const club = await getClubById(params.id)
  
  return (
    <>
      <ClubJsonLd club={club} />
      {/* Tu contenido aquí */}
    </>
  )
}
```

### 2. Eso es todo ✅

El componente genera automáticamente el JSON-LD optimizado para SEO.

## 📦 Archivos Creados

```
schemas/
├── clubJsonLdSchema.ts        # Generador de JSON-LD
├── CLUB_JSONLD.md            # Documentación completa
└── index.ts                  # Export actualizado

components/
└── club-json-ld.tsx          # Componente React

tests/unit/schemas/
└── clubJsonLdSchema.test.ts  # Tests completos (TDD)

app/clubs/[id]/
└── page.example.tsx          # Ejemplo de integración
```

## 🎯 Datos Incluidos Automáticamente

| Campo | Descripción |
|-------|-------------|
| **name** | Nombre del club |
| **description** | Bio del club |
| **logo** | Logo (o default si no hay) |
| **numberOfMembers** | Total de miembros |
| **keywords** | Tags del club |
| **foundingDate** | Fecha de creación |
| **isAccessibleForFree** | Público/Privado |
| **url** | URL del club |

## ✅ Testing

```bash
npm test tests/unit/schemas/clubJsonLdSchema.test.ts
```

## 📖 Documentación Completa

Ver [schemas/CLUB_JSONLD.md](./CLUB_JSONLD.md) para:

- Ejemplos avanzados
- Validación con Google Rich Results
- Integración con Next.js Metadata
- Casos especiales
- Best practices

## 🔍 Validar tu implementación

1. **Google Rich Results Test**: <https://search.google.com/test/rich-results>
2. **Schema Validator**: <https://validator.schema.org/>

## 💡 Ejemplo de Output

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://socialclubs.com/clubs/club-123",
  "name": "Club de Programación",
  "description": "Un club para desarrolladores",
  "logo": {
    "@type": "ImageObject",
    "url": "https://example.com/logo.png"
  },
  "numberOfMembers": 150,
  "keywords": "programación, desarrollo, tecnología",
  "isAccessibleForFree": true
}
```

## 🎨 Características

- ✅ **Generación automática** - Solo pasa el objeto club
- ✅ **Sanitización** - Limpia HTML y caracteres especiales
- ✅ **Fallbacks inteligentes** - Maneja datos faltantes
- ✅ **Type-safe** - Completamente tipado con TypeScript
- ✅ **Testeado** - Cobertura completa con TDD
- ✅ **SEO optimizado** - Siguiendo mejores prácticas de Schema.org

---

**Desarrollado con**: TDD, TypeScript, React Server Components
