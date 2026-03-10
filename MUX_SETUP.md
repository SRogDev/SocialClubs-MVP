# Mux — Configuración del entorno de video

## ¿Mux tiene "buckets"?

**No.** Mux no usa buckets. Los videos (llamados **Assets**) se almacenan directamente en tu **Environment** de Mux, y tú los gestionas a través del API o el dashboard. Un solo Environment es todo lo que necesitas para SocialClubs.

---

## 1. Crear cuenta y entorno

1. Crea cuenta en [mux.com](https://mux.com)
2. En el dashboard ya tienes un **Environment** por defecto llamado `Production`
3. Opcionalmente crea un segundo entorno `Development` para pruebas (no es obligatorio)

> Los videos de todos los clubs viven juntos en el mismo Environment, diferenciados únicamente por los metadatos que guardas en tu propia base de datos (`club_id` en el campo `passthrough`).

---

## 2. Variables de entorno necesarias

Obtén las claves en: **Mux Dashboard → Settings → API Access Tokens**

```env
# Mux (servidor — nunca expongas al cliente)
MUX_TOKEN_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MUX_TOKEN_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Solo si usas webhook signature verification (recomendado)
MUX_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Añádelas en **Vercel → Project → Settings → Environment Variables**.

---

## 3. Configurar el webhook

En **Mux Dashboard → Settings → Webhooks → Add new webhook**:

| Campo | Valor |
|---|---|
| URL | `https://tu-dominio.vercel.app/api/webhooks/mux` |
| Environment | Production |
| Events | Seleccionar todos (o los listados abajo) |

**Eventos que necesitas:**

| Evento | Para qué se usa |
|---|---|
| `video.asset.ready` | El video terminó de encodear → actualiza el post con `mux_playback_id` y estado `ready` |
| `video.asset.errored` | Falló el encoding → marca el post con estado `errored` |
| `video.upload.asset_created` | El upload del cliente terminó → marca el post como `processing` |
| `video.asset.deleted` | Limpieza/logging cuando se borra un asset |

> ⚠️ Después de crear el webhook, copia el **Signing Secret** (`whsec_...`) y ponlo como `MUX_WEBHOOK_SECRET` en tus env vars. El handler en `/api/webhooks/mux/route.ts` lo usa para verificar la firma de cada evento.

---

## 4. Cómo funciona el flujo en SocialClubs

```
1. Usuario selecciona video en VideoUpload component
        ↓
2. createVideoUploadAction() → createMuxDirectUpload()
   - Crea un Direct Upload URL en Mux
   - Pasa clubId, postId, userId en el campo "passthrough"
   - Crea un post en DB con status = 'uploading'
        ↓
3. El cliente sube el video DIRECTAMENTE a Mux via XHR (PUT al uploadUrl)
   - Nuestro servidor nunca recibe el archivo de video
   - Progreso 0→100% se muestra en la UI
        ↓
4. Mux encoda el video (puede tardar segundos o minutos)
        ↓
5. Mux llama al webhook /api/webhooks/mux
   - Si video.upload.asset_created → status = 'processing'
   - Si video.asset.ready → guarda mux_playback_id y status = 'ready'
   - Si video.asset.errored → status = 'errored' + mensaje de error
        ↓
6. El post queda visible en el club con el player de Mux
```

---

## 5. Política de reproducción

Actualmente el código usa `playback_policy: ['public']` — cualquiera con el `playback_id` puede ver el video.

**Para videos de clubs privados** considera cambiar a `signed` en el futuro:

```typescript
// services/videoService.ts — futura mejora
new_asset_settings: {
  playback_policy: ['signed'], // Requiere JWT para reproducir
}
```

Con signed URLs necesitarías también crear un **Signing Key** en Mux Dashboard → Settings → Signing Keys.

---

## 6. Checklist de activación

- [ ] Crear cuenta en mux.com
- [ ] Copiar `MUX_TOKEN_ID` y `MUX_TOKEN_SECRET` del dashboard
- [ ] Añadir ambas variables a Vercel y a `.env.local`
- [ ] Crear webhook apuntando a `https://tu-dominio.vercel.app/api/webhooks/mux`
- [ ] Copiar `MUX_WEBHOOK_SECRET` (signing secret del webhook) y añadirlo a Vercel
- [ ] Verificar que el player (`@mux/mux-player-react`) carga un video de prueba

---

## 7. Límites del plan gratuito de Mux

| Recurso | Plan Free |
|---|---|
| Encoding | $0.015 / minuto de video |
| Almacenamiento | $0.003 / GB / mes |
| Streaming | $0.002 / GB transferido |
| Mínimo de facturación | Desde $20/mes al activar tarjeta |

> Para la beta, los costes serán mínimos. Un video de 10 minutos en 1080p ≈ $0.15 de encoding.
