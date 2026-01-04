# Sistema de Videollamadas con Daily.co - Guía de Implementación

## 📋 Resumen

Sistema completo de **appointment booking** integrado con **Daily.co** para videollamadas 1-a-1 entre creadores de clubs y miembros. Los creadores configuran horarios de disponibilidad, usuarios agendan citas (con pago Stripe), y a la hora exacta se crea automáticamente una videollamada privada.

---

## ✅ Implementación Completada

### 1. **Database Schema** ✅

- [database.sql](database.sql) actualizado con:
  - `vcall_appointments` - Slots de disponibilidad del creador
  - `users_agendas` - Bookings de usuarios (con foreign keys corregidos)
  - `vcall_rooms` - Rooms activas de Daily.co
  - Campos: `timezone`, `call_room_created`, `expires_at`, `status`

### 2. **Types & Schemas** ✅

- [types/appointment.ts](types/appointment.ts) - Interfaces TypeScript
- [schemas/appointmentSchema.ts](schemas/appointmentSchema.ts) - Validación Zod

### 3. **Services (Repository Pattern)** ✅

- [services/appointmentService.ts](services/appointmentService.ts) - CRUD de slots de disponibilidad
- [services/bookingService.ts](services/bookingService.ts) - CRUD de bookings + `getUpcomingBookings()`
- [services/videocallService.ts](services/videocallService.ts) - Integración Daily.co

### 4. **API Routes** ✅

- [/api/appointments](app/api/appointments/route.ts) - GET/POST slots
- [/api/appointments/[id]](app/api/appointments/[id]/route.ts) - PATCH/DELETE
- [/api/bookings](app/api/bookings/route.ts) - GET bookings
- [/api/videocall/create-room](app/api/videocall/create-room/route.ts) - Crear room manualmente

### 5. **Cron Job** ✅

- [/api/cron/check-appointments](app/api/cron/check-appointments/route.ts) - Corre cada 5 min
- [/api/test/trigger-cron](app/api/test/trigger-cron/route.ts) - Endpoint de test (dev only)
- [vercel.json](vercel.json) - Configurado con cron schedule

### 6. **Realtime Store** ✅

- [stores/roomStore.ts](stores/roomStore.ts) - Zustand + Supabase Realtime

### 7. **UI Components** ✅

- [VideocallFloatingButton](components/shared/videocall-float-button.tsx) - Botón naranja flotante
- [DailyVideoContainer](components/videocall/daily-video-container.tsx) - Wrapper de Daily.co
- [AgendaSection](components/club-panel/agenda-section.tsx) - Panel admin de horarios
- [/videocall/[roomId]](app/videocall/room-id/page.tsx) - Página de videollamada

### 8. **Stripe Placeholders** ✅

- [/api/stripe/checkout-booking](app/api/stripe/checkout-booking/route.ts) - Placeholder
- [/api/stripe/webhook](app/api/stripe/webhook/route.ts) - Placeholder

---

## 🔧 Configuración Requerida

### 1. **Variables de Entorno**

Copia [.env.example](.env.example) a `.env.local` y completa:

```bash
# CRÍTICO - Daily.co
DAILY_API_KEY=tu-api-key-aqui
NEXT_PUBLIC_DAILY_DOMAIN=tu-subdominio.daily.co

# CRÍTICO - Cron authentication
CRON_SECRET=$(openssl rand -base64 32)

# OPCIONAL - Stripe (descomentar cuando implementes pagos)
# STRIPE_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. **Aplicar Migración de Base de Datos**

Ejecuta las actualizaciones del schema en Supabase:

```sql
-- Ver: database.sql líneas 170-235
-- Copiar y ejecutar en Supabase SQL Editor
```

### 3. **Vercel Configuration**

El cron job está configurado en [vercel.json](vercel.json):

- Corre cada 5 minutos: `*/5 * * * *`
- Endpoint: `/api/cron/check-appointments`
- **Importante**: Solo funciona en **producción** de Vercel

---

## 🚀 Flujo de Usuario

### Creador del Club

1. Va a `/clubs/[id]/panel/agenda`
2. Crea horarios de disponibilidad (día, hora, duración, precio)
3. Los slots se guardan en `vcall_appointments`

### Usuario (Miembro)

1. Ve slots disponibles en página del club
2. Selecciona fecha y hora
3. Paga con Stripe *(pendiente implementar)*
4. Se crea booking en `users_agendas` con `status='confirmed'`

### Automatización (Cron Job)

1. Cada 5 minutos, cron job revisa `getUpcomingBookings()`
2. Si encuentra booking cuya hora llegó (ventana de 5 min)
3. Llama a `createDailyRoom(bookingId)`:
   - Crea room privada en Daily.co
   - Guarda en `vcall_rooms`
   - Marca `users_agendas.call_room_created = true`

### Realtime (Ambos usuarios)

1. `roomStore` detecta nuevo room via Supabase Realtime
2. `VideocallFloatingButton` aparece (botón naranja)
3. Click redirige a `/videocall/[roomId]`
4. Daily.co carga con ambos participantes

---

## 🧪 Testing en Development

### Trigger Manual del Cron Job

```bash
# Autentícate en la app primero, luego:
curl http://localhost:3000/api/test/trigger-cron
```

### Crear Room Manualmente (sin cron)

```bash
POST /api/videocall/create-room
{
  "booking_id": 123
}
```

### Verificar Realtime

1. Abre 2 navegadores (usuario A y B)
2. Crea un booking para ahora
3. Trigger el cron manualmente
4. Ambos deberían ver el floating button naranja

---

## 📊 Timezone Handling

**Decisión de diseño**: Los horarios se manejan en **timezone del creador**.

- Creador configura: "Lunes 3pm" → se guarda con su timezone
- Supabase almacena: `start_time` + `timezone` (IANA)
- Usuario ve: Horario convertido a su timezone automáticamente
- Cron job: Compara hora actual (UTC) con hora del booking

**Implementado en**:

- `appointmentService.ts` - Guarda timezone del creador
- `bookingService.ts` - Calcula start/end time en booking
- Frontend - Browser convierte automáticamente al mostrar

---

## ⚠️ Pendientes para Producción

### 1. **Stripe Integration** (Alta prioridad)

Actualmente placeholders en:

- [/api/stripe/checkout-booking/route.ts](app/api/stripe/checkout-booking/route.ts)
- [/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts)

**TODO**:

```typescript
// Descomentar código en checkout-booking/route.ts
// Instalar: pnpm add stripe
// Configurar webhook en Stripe Dashboard
```

### 2. **SWR Hooks para Frontend** (Media prioridad)

Crear en `/hooks/swr`:

- `useAppointments.ts` - Fetch slots del club
- `useBookings.ts` - Fetch bookings del usuario
- `useAvailableSlots.ts` - Fetch slots disponibles por fecha

### 3. **UI de Booking para Usuarios** (Media prioridad)

Crear página: `/clubs/[id]/appointments`

- Calendario con slots disponibles
- Formulario de booking
- Integración con Stripe checkout

### 4. **Notificaciones** (Baja prioridad)

- Email/Push cuando se crea room
- Reminders 24h y 1h antes
- Confirmación de booking

### 5. **Analytics** (Baja prioridad)

- PostHog events: `booking_created`, `room_joined`, `call_completed`
- Revenue tracking
- Popular time slots

---

## 🐛 Troubleshooting

### El floating button no aparece

1. Verifica que hay un room activo en Supabase
2. Check console: "Subscribed to room changes"
3. El `user_id` o `creator_id` debe coincidir con el usuario actual

### El cron job no crea rooms

1. Solo funciona en **producción** de Vercel
2. En dev, usa `/api/test/trigger-cron`
3. Verifica `CRON_SECRET` en Vercel env vars

### Daily.co error "Room not found"

1. Verifica `DAILY_API_KEY` está configurada
2. El room debe estar en `vcall_rooms` con `status='active'`
3. Check expiration: `expires_at` debe ser futuro

### Timezone incorrecto

1. Verifica `Intl.DateTimeFormat().resolvedOptions().timeZone` en browser
2. Supabase debe tener timezone en `vcall_appointments`
3. `start_time` es `time` sin timezone (usa timezone del appointment)

---

## 📚 Recursos

- **Daily.co Docs**: <https://docs.daily.co/reference/rest-api>
- **Supabase Realtime**: <https://supabase.com/docs/guides/realtime>
- **Vercel Cron**: <https://vercel.com/docs/cron-jobs>
- **Zod Validation**: <https://zod.dev/>

---

## 🎯 Next Steps

1. **Testing**: Crear bookings de prueba y verificar cron job
2. **Stripe**: Implementar checkout completo
3. **UI**: Completar página de booking para usuarios
4. **Deploy**: Subir a Vercel y verificar cron en producción
5. **Monitor**: Logs de Daily.co API y Supabase Realtime

---

**Implementado**: 4 de enero de 2026  
**Stack**: Next.js 16, React 19, Supabase, Daily.co, Zustand  
**Pattern**: Repository Pattern + Realtime + Cron Jobs
