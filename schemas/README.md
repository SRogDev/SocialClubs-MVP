# Schemas - Validación y JSON-LD

Este directorio contiene los esquemas Zod para validación de datos y generadores de JSON-LD para SEO.

## 📁 Estructura

```
schemas/
├── index.ts                      # Barrel export
├── authSchema.ts                 # Validación de autenticación
├── clubSchema.ts                 # Validación de clubs
├── postSchema.ts                 # Validación de posts
├── profileSchema.ts              # Validación de perfiles
├── widgetSchema.ts               # Validación de widgets
├── clubJsonLdSchema.ts          # 🆕 Generador JSON-LD para clubs
├── CLUB_JSONLD.md               # 📖 Documentación completa JSON-LD
├── CLUB_JSONLD_QUICKSTART.md    # 🚀 Guía rápida
└── CLUB_JSONLD_MIGRATION.md     # 🔄 Guía de migración
```

## 🔍 Schemas de Validación (Zod)

Usados con React Hook Form para validación de formularios:

### authSchema.ts

Validación de login, registro y recuperación de contraseña.

### clubSchema.ts

Validación de datos de clubs (creación, edición).

### postSchema.ts

Validación de posts y contenido generado por usuarios.

### profileSchema.ts

Validación de perfiles de usuario.

### widgetSchema.ts

Validación de widgets y configuraciones.

## 🎯 JSON-LD para SEO

### clubJsonLdSchema.ts - **NUEVO** ✨

Generador de JSON-LD (Schema.org) para clubs.

#### Uso Rápido

```tsx
import ClubJsonLd from '@/components/club-json-ld'

export default async function ClubPage({ params }) {
  const club = await getClubById(params.id)
  
  return (
    <>
      <ClubJsonLd club={club} />
      {/* Tu contenido */}
    </>
  )
}
```

#### Beneficios

- ✅ Mejor SEO
- ✅ Rich snippets en Google
- ✅ Mayor visibilidad
- ✅ Knowledge Graph

#### Documentación

- 📖 **Documentación completa**: [CLUB_JSONLD.md](./CLUB_JSONLD.md)
- 🚀 **Inicio rápido**: [CLUB_JSONLD_QUICKSTART.md](./CLUB_JSONLD_QUICKSTART.md)
- 🔄 **Migración**: [CLUB_JSONLD_MIGRATION.md](./CLUB_JSONLD_MIGRATION.md)

## 💡 Convenciones

### Schemas de Validación (Zod)

```typescript
// Nombre: [entidad]Schema.ts
// Export: export const [entidad]Schema = z.object({ ... })

// Ejemplo:
export const clubSchema = z.object({
  name: z.string().min(3),
  bio: z.string().optional(),
  // ...
})

export type ClubFormData = z.infer<typeof clubSchema>
```

### Schemas JSON-LD

```typescript
// Nombre: [entidad]JsonLdSchema.ts
// Export: export function generate[Entidad]JsonLd(data) { ... }

// Ejemplo:
export function generateClubJsonLd(club: Club) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    // ...
  }
}
```

## 🧪 Testing

Todos los schemas tienen tests completos siguiendo TDD:

```bash
# Tests de validación Zod
npm test tests/unit/schemas/

# Tests de JSON-LD
npm test tests/unit/schemas/clubJsonLdSchema.test.ts
npm test tests/unit/components/club-json-ld.test.tsx
```

## 📚 Recursos

### Schema.org

- [Organization](https://schema.org/Organization)
- [Article](https://schema.org/Article)
- [Person](https://schema.org/Person)

### Herramientas

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)

### Zod

- [Documentación oficial](https://zod.dev/)
- [Integración con React Hook Form](https://react-hook-form.com/get-started#SchemaValidation)

## 🔜 Próximos Schemas JSON-LD

Pendientes de implementar:

- [ ] `postJsonLdSchema.ts` - JSON-LD para posts (Article)
- [ ] `userJsonLdSchema.ts` - JSON-LD para usuarios (Person)
- [ ] `eventJsonLdSchema.ts` - JSON-LD para eventos
- [ ] `courseJsonLdSchema.ts` - JSON-LD para cursos/educación

## 🎯 Best Practices

### Validación (Zod)

1. Usar schemas compartidos entre cliente y servidor
2. Inferir tipos con `z.infer<typeof schema>`
3. Agregar mensajes de error descriptivos
4. Validar antes de cualquier operación

### JSON-LD

1. Un solo JSON-LD por entidad por página
2. Incluir solo datos verificados y reales
3. Sanitizar inputs para evitar XSS
4. Validar con Google Rich Results Test
5. Mantener actualizado con los datos reales

---

**Última actualización**: Diciembre 2025  
**Desarrollado con**: TDD, TypeScript, Zod, Schema.org
