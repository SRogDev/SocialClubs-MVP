# ImageKit.io — Configuración de Folders y Variables de Entorno

## 1. Variables de entorno necesarias

Añade estas variables en **Vercel → Project → Settings → Environment Variables** y en tu `.env.local`:

```env
# ImageKit (servidor — NUNCA expongas IMAGEKIT_PRIVATE_KEY al cliente)
IMAGEKIT_PRIVATE_KEY=private_xxxxxxxxxxxxxxxxxxxxx

# ImageKit (cliente — seguras para exponer)
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=public_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/TU_IMAGEKIT_ID
```

> **Dónde encontrarlas:** ImageKit Dashboard → Developer Options → API Keys

---

## 2. Folders a crear en ImageKit Media Library

Crea estos folders manualmente desde el panel de ImageKit (**Media Library → New Folder**) o se crearán automáticamente en el primer upload:

| Folder | Uso | Tamaño recomendado |
|---|---|---|
| `/avatars` | Fotos de perfil de usuarios | 400×400 px |
| `/clubs/logos` | Logo/avatar del club | 400×400 px |
| `/clubs/covers` | Imagen de portada del club | 1200×400 px |
| `/posts/images` | Imágenes adjuntas a posts | 1200×900 px |
| `/posts/thumbnails` | Thumbnails de videos de posts | 640×360 px |

---

## 3. URL Endpoint

Tu URL endpoint tiene este formato:

```
https://ik.imagekit.io/TU_IMAGEKIT_ID
```

Ejemplo real: `https://ik.imagekit.io/socialclubs`

---

## 4. Transformaciones automáticas que se aplican

El SDK aplica automáticamente transformaciones cuando usas el componente `<Image>` de `@imagekit/next`:

| Contexto | Transformación | Resultado |
|---|---|---|
| Avatar usuario | `w-400,h-400,c-face` | Crop centrado en cara, 400×400 |
| Logo de club | `w-200,h-200,q-85` | Cuadrado 200px, calidad 85% |
| Post image | `q-85,f-auto` | Calidad 85%, formato automático (WebP/AVIF) |
| Thumbnail | `w-640,h-360,c-force` | 16:9 forzado |

---

## 5. Flujo de upload implementado

### Desde Server Action (perfiles, admin)

```
Server Action → uploadToImageKit() [lib/imagekit.ts]
             → REST POST https://upload.imagekit.io/api/v1/files/upload
             → Returns { url, fileId, name }
             → URL se guarda en Supabase (campo avatar_url, logo->url, etc.)
```

### Desde Client Component (club wizard, post creation)

```
Client Component → fetch('/api/upload-auth')     [obtiene token/sig/expire]
                → upload() from @imagekit/next   [sube directo a ImageKit]
                → Returns { url, fileId }
                → URL se pasa al formulario / Server Action
```

---

## 6. Seguridad

- `IMAGEKIT_PRIVATE_KEY` **NUNCA** sale del servidor
- El endpoint `/api/upload-auth` verifica sesión Supabase antes de devolver credenciales
- Los tokens de upload expiran en **1 hora** máximo
- Rate limiting aplicado en `/api/upload-auth`

---

## 7. Buckets de Supabase Storage — ya no necesarios

Con ImageKit, los siguientes buckets de Supabase Storage quedan **obsoletos**:

| Bucket anterior | Reemplazado por |
|---|---|
| `profiles` | `/avatars` en ImageKit |
| `clubs` | `/clubs/logos` y `/clubs/covers` en ImageKit |

> Puedes mantenerlos para URLs antiguas ya guardadas en la BD — son retrocompatibles porque los campos `avatar_url` y `logo->url` almacenan la URL completa.

---

## 8. Configuración de Named Transformations (opcional pero recomendado)

En el dashboard de ImageKit → **Image Transformations → Named Transformations**, crea:

| Nombre | String | Descripción |
|---|---|---|
| `avatar_sm` | `w-100,h-100,c-force,q-80` | Avatar pequeño para listas |
| `avatar_md` | `w-200,h-200,c-force,q-85` | Avatar mediano para perfiles |
| `club_logo` | `w-400,h-400,c-force,q-90` | Logo del club |
| `post_img` | `w-1200,h-900,q-85,f-auto` | Imagen de post full |
| `thumb` | `w-640,h-360,c-force,q-80` | Thumbnail 16:9 |

---

## 9. Checklist de activación

- [ ] Crear cuenta en [imagekit.io](https://imagekit.io) (plan gratuito: 20 GB/mes)
- [ ] Copiar **Public Key**, **Private Key**, e **URL Endpoint** del dashboard
- [ ] Añadir variables a `.env.local` y a Vercel
- [ ] Crear folders `/avatars`, `/clubs/logos`, `/clubs/covers`, `/posts/images`, `/posts/thumbnails`
- [ ] Hacer primer upload de prueba desde el profile page
- [ ] Verificar que las imágenes se sirven desde `ik.imagekit.io`
