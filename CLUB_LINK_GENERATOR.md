# Club Link Generator

## Descripción

Sistema automático de generación de enlaces únicos para invitaciones a clubs, similar a los enlaces de grupo de WhatsApp, Telegram, etc.

## Funcionamiento

### 1. Generación Automática

Cuando un usuario crea un club, el sistema automáticamente:

- Genera un string aleatorio de 8 caracteres alfanuméricos (A-Z, a-z, 0-9)
- Verifica que sea único en la base de datos
- Lo asigna al campo `club_link` del club

### 2. Formato del Enlace

- **Longitud**: 8 caracteres
- **Caracteres permitidos**: A-Z, a-z, 0-9 (62 combinaciones posibles)
- **Total de combinaciones**: 62^8 = ~218 trillones de combinaciones únicas
- **Ejemplo**: `aB3xK9mQ`

### 3. Uso del Enlace

El enlace generado se puede usar de las siguientes formas:

```
https://tudominio.com/join/aB3xK9mQ
https://tudominio.com/clubs/join?code=aB3xK9mQ
```

## Implementación

### Service Layer

La función `generateUniqueClubLink()` en `services/clubService.ts`:

1. Genera un string aleatorio
2. Verifica unicidad en la base de datos
3. Repite hasta encontrar un código único
4. Retorna el código

### CRUD

El proceso de creación en `createClub()`:

1. Valida los datos del club
2. Genera el `club_link` único
3. Inserta el club con el link en la base de datos

### Base de Datos

```sql
ALTER TABLE clubs
ADD COLUMN club_link text UNIQUE;

CREATE INDEX idx_clubs_club_link ON clubs(club_link);
```

## Características

- ✅ **Único**: Verificación automática de unicidad
- ✅ **Seguro**: 218 trillones de combinaciones posibles
- ✅ **Corto**: Solo 8 caracteres, fácil de compartir
- ✅ **Indexed**: Búsquedas rápidas por índice en DB
- ✅ **Automático**: Sin intervención manual del usuario
- ✅ **Compatible**: Formato similar a apps populares

## Próximos Pasos

### Para usar el enlace

1. Crear endpoint `/app/join/[code]/page.tsx` que:
   - Reciba el código del enlace
   - Busque el club por `club_link`
   - Muestre preview del club
   - Permita unirse al club

2. Componente para compartir el enlace:

   ```tsx
   <ShareClubLink clubLink={club.club_link} />
   ```

### Ejemplo de implementación de ruta join

```typescript
// app/join/[code]/page.tsx
export default async function JoinClubPage({ 
  params 
}: { 
  params: { code: string } 
}) {
  const club = await getClubByLink(params.code)
  
  if (!club) {
    return <NotFound />
  }
  
  return <ClubJoinPreview club={club} />
}
```

## Seguridad

- El enlace NO expone el ID del club
- Rate limiting aplicado en la API de creación
- Validación con Zod en todos los endpoints
- Índice único en DB previene duplicados
