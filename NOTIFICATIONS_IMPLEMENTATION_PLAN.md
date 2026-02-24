# 🔔 Plan de Implementación: Sistema de Notificaciones Push PWA con OneSignal

Plan completo para implementar notificaciones push usando OneSignal + Supabase Edge Functions.

---

## 📋 Contexto

**Estado actual**:

- ✅ Tabla `notifications` migrada con todos los campos necesarios
- ✅ PWA configurado (service worker + manifest)
- ✅ 8 tipos de notificaciones definidos

**Arquitectura**:

- **Crear notificación**: Client → Server Action → Service (INSERT DB) → Webhook → Edge Function → OneSignal
- **Listar**: Client → SWR Hook → Edge Function → Response
- **Marcar leído**: Client → Server Action → Edge Function → Response

**Estructura de datos**:

- `type`: 8 valores (new_post_club, videocall_announcement, new_message_club, reminder_use, new_subscriber_pay, club_level_up, user_level_up, other)
- `category`: 3 valores (engagement, marketing, transactional)
- `icon_url`: Logo club o genérico

---

## 🎯 Tareas de Implementación

### 1. Setup OneSignal y Environment Variables

**Acciones**:

- [ ] Crear app en OneSignal Dashboard (Web Push)
- [ ] Obtener `NEXT_PUBLIC_ONESIGNAL_APP_ID` y `ONESIGNAL_REST_API_KEY`
- [ ] Instalar SDK: `pnpm add react-onesignal`
- [ ] Agregar a `.env.local`:

  ```env
  NEXT_PUBLIC_ONESIGNAL_APP_ID=your-app-id
  ONESIGNAL_REST_API_KEY=your-rest-api-key
  ONESIGNAL_USER_AUTH_KEY=your-user-auth-key
  ```

- [ ] Configurar en Supabase Dashboard → Edge Functions → Secrets

---

### 2. Crear Schemas Zod

**Archivo**: `schemas/notificationSchema.ts`

```typescript
import { z } from 'zod';

export const notificationTypeEnum = z.enum([
  'new_post_club',
  'videocall_announcement',
  'new_message_club',
  'reminder_use',
  'new_subscriber_pay',
  'club_level_up',
  'user_level_up',
  'other'
]);

export const notificationCategoryEnum = z.enum([
  'engagement',
  'marketing',
  'transactional'
]);

export const notificationSchema = z.object({
  user_id: z.string().uuid(),
  type: notificationTypeEnum,
  category: notificationCategoryEnum,
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(200),
  club_id: z.string().uuid().optional(),
  icon_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  scheduled_at: z.string().datetime().optional(),
});

// Mapeo type → category
export const typeToCategoryMap = {
  new_post_club: 'engagement',
  videocall_announcement: 'engagement',
  new_message_club: 'engagement',
  club_level_up: 'engagement',
  user_level_up: 'engagement',
  reminder_use: 'marketing',
  new_subscriber_pay: 'transactional',
  other: 'transactional',
} as const;
```

---

### 3. Crear Services (Repositories)

**Archivo**: `services/notificationService.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import type { NotificationInput } from '@/types/notification';

export async function createNotification(data: NotificationInput) {
  const supabase = createClient();
  
  // Auto-asignar icon_url si hay club_id
  let icon_url = data.icon_url;
  if (!icon_url && data.club_id) {
    const { data: club } = await supabase
      .from('clubs')
      .select('logo')
      .eq('id', data.club_id)
      .single();
    icon_url = club?.logo || '/icons/notification-default.png';
  } else if (!icon_url) {
    icon_url = '/icons/notification-default.png';
  }

  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({ ...data, icon_url })
    .select()
    .single();

  if (error) throw error;
  return notification;
}

export async function getUserNotifications(userId: string, filters?: {
  category?: string;
  read?: boolean;
  limit?: number;
  offset?: number;
}) {
  const supabase = createClient();
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.read !== undefined) query = query.eq('read', filters.read);
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function markAsRead(notificationId: string, userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUnreadCount(userId: string) {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
  return count || 0;
}
```

**Archivo**: `services/onesignalService.ts`

```typescript
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

export async function sendPushNotification(params: {
  userId: string;
  title: string;
  body: string;
  icon_url?: string;
  metadata?: Record<string, any>;
}) {
  const response = await fetch(ONESIGNAL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
      include_external_user_ids: [params.userId],
      headings: { en: params.title },
      contents: { en: params.body },
      large_icon: params.icon_url,
      data: params.metadata,
    }),
  });

  if (!response.ok) throw new Error('OneSignal API error');
  return response.json();
}
```

---

### 4. Crear Edge Functions con Supabase MCP

**Edge Functions a crear**:

1. **`send-notification`**: Disparada por webhook DB
   - Templates para 8 tipos
   - Llamar OneSignal API
   - Actualizar delivery_status, onesignal_notification_id, sent_at
   - Retry con exponential backoff

2. **`get-notifications`**: GET paginado
   - Query params: user_id, category, read, limit, offset
   - Autenticación JWT
   - Rate limit 60 req/min

3. **`mark-notification-read`**: PATCH marcar leído
   - Verificar ownership user_id
   - Rate limit

4. **`schedule-notifications`**: Cron cada 5min
   - Buscar `scheduled_at <= NOW() AND delivery_status = 'pending'`
   - Disparar envío

**Configurar**: `supabase/functions/config.toml` con secrets OneSignal

---

### 5. Configurar Database Webhook

**Supabase Dashboard**:

- Tabla: `notifications`
- Evento: `INSERT`
- URL: `https://[project].supabase.co/functions/v1/send-notification`
- Header: `Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]`
- Filtro SQL: `delivery_status = 'pending' AND (scheduled_at IS NULL OR scheduled_at <= NOW())`
- Timeout: 5s, retry: 3 veces

---

### 6. Integrar OneSignal SDK en Frontend

**Archivo**: `lib/onesignal.ts`

```typescript
import OneSignal from 'react-onesignal';

export async function initOneSignal() {
  await OneSignal.init({
    appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
    allowLocalhostAsSecureOrigin: true,
  });
}
```

**Archivo**: `hooks/use-onesignal-auth.ts`

```typescript
import { useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { createClient } from '@/lib/supabase/client';

export function useOneSignalAuth() {
  useEffect(() => {
    const setupOneSignal = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await OneSignal.login(user.id);
        // TODO: Actualizar tags con club_ids
      }
    };
    
    setupOneSignal();
  }, []);
}
```

**En `app/layout.tsx`**: Llamar `useOneSignalAuth()` en Client Component wrapper

**Actualizar `public/sw.js`**: Agregar handlers para `push` y `notificationclick`

---

### 7. Crear Componentes UI

**Componentes en `components/notifications/`**:

1. **`notification-bell.tsx`**: Icono con badge contador
2. **`notification-center.tsx`**: Dropdown con tabs por category
3. **`notification-item.tsx`**: Item individual con icon_url
4. **`notification-permission-prompt.tsx`**: Banner iOS (detección `isIOS()`)
5. **`ios-install-guide.tsx`**: Modal con instrucciones

---

### 8. SWR Hooks y Server Actions

**Archivo**: `hooks/swr/useNotifications.ts`

```typescript
import useSWRInfinite from 'swr/infinite';

export function useNotifications(category?: string) {
  const { data, error, size, setSize } = useSWRInfinite(
    (index) => `/api/functions/get-notifications?limit=20&offset=${index * 20}&category=${category}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );
  
  return { notifications: data, isLoading: !data && !error, loadMore: () => setSize(size + 1) };
}
```

**Archivo**: `app/actions/notificationActions.ts`

```typescript
'use server';

import { createNotification, markAsRead } from '@/services/notificationService';
import { notificationSchema } from '@/schemas/notificationSchema';

export async function createNotificationAction(data: unknown) {
  const validated = notificationSchema.parse(data);
  return createNotification(validated);
}

export async function markAsReadAction(notificationId: string, userId: string) {
  return markAsRead(notificationId, userId);
}
```

---

### 9. Tests TDD

**Archivos a crear**:

- `tests/unit/notificationService.test.ts`
- `tests/integration/notification-webhook.test.ts`
- `tests/e2e/notifications.spec.ts`
- `tests/e2e/notifications-ios.spec.ts`

**Patrón Given-When-Then** en todos los tests

---

## 🚀 Orden de Ejecución

1. Setup OneSignal + env vars
2. Crear schemas Zod
3. Crear services (notificationService + onesignalService)
4. Crear Edge Functions con MCP (4 funciones)
5. Configurar webhook DB
6. Integrar SDK OneSignal (lib + hooks + layout)
7. Actualizar service worker (push handlers)
8. Crear componentes UI (5 componentes)
9. Crear SWR hooks + Server Actions
10. Tests TDD (unit + integration + e2e)

---

## ✅ Checklist Final

- [ ] OneSignal app creada y configurada
- [ ] Environment variables agregadas
- [ ] Schemas Zod implementados
- [ ] Services (repositories) creados
- [ ] Edge Functions desplegadas (4)
- [ ] Webhook DB configurado
- [ ] OneSignal SDK integrado en layout
- [ ] Service worker actualizado
- [ ] Componentes UI implementados (5)
- [ ] SWR hooks + Server Actions
- [ ] Tests con cobertura 70%+
- [ ] Analytics PostHog (client-side)
- [ ] Iconos genéricos creados
- [ ] Documentación actualizada

---

**Creado**: 11 de enero de 2026  
**Para ejecutar**: Enviar este archivo a la IA en sesión futura
