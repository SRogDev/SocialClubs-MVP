# Quick Start - Sistema de Videollamadas

## 🚀 Setup Rápido (5 minutos)

### 1. Instalar Daily.co (ya hecho)

```bash
pnpm add @daily-co/daily-js @daily-co/daily-react
```

### 2. Configurar Variables de Entorno

Crea `.env.local` con:

```bash
# Daily.co (REQUERIDO)
DAILY_API_KEY=tu_api_key_desde_dashboard.daily.co
NEXT_PUBLIC_DAILY_DOMAIN=tu-subdominio.daily.co

# Cron Secret (REQUERIDO)
CRON_SECRET=$(openssl rand -base64 32)

# Supabase (ya lo tienes)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

### 3. Aplicar Migración de Base de Datos

Abre Supabase SQL Editor y ejecuta el schema actualizado de [database.sql](database.sql) (líneas 170-235)

### 4. Probar en Development

#### Crear un horario de disponibilidad

1. Ve a `/clubs/[tu-club-id]/panel/agenda`
2. Click "Nuevo horario"
3. Configura: Lunes, 2:00 PM, 60 min, $20

#### Simular cron job

```bash
# En otra terminal (mientras dev corre):
curl http://localhost:3000/api/test/trigger-cron
```

#### Ver floating button

- El botón naranja aparece cuando hay una room activa
- Para testing manual, crea un booking y luego crea la room via API

---

## 📁 Archivos Creados

### Backend (Services)

- `services/videocallService.ts` - Daily.co integration
- `services/appointmentService.ts` - CRUD slots
- `services/bookingService.ts` - CRUD bookings

### API Routes

- `app/api/appointments/route.ts` - GET/POST
- `app/api/appointments/[id]/route.ts` - PATCH/DELETE
- `app/api/bookings/route.ts` - GET bookings
- `app/api/videocall/create-room/route.ts` - Crear room
- `app/api/cron/check-appointments/route.ts` - Cron automático
- `app/api/test/trigger-cron/route.ts` - Test manual
- `app/api/stripe/checkout-booking/route.ts` - Placeholder
- `app/api/stripe/webhook/route.ts` - Placeholder

### Frontend

- `stores/roomStore.ts` - Zustand + Realtime
- `components/shared/videocall-float-button.tsx` - Botón flotante
- `components/videocall/daily-video-container.tsx` - Player Daily.co
- `components/club-panel/agenda-section.tsx` - Admin UI
- `app/videocall/[roomId]/page.tsx` - Página videollamada

### Types & Schemas

- `types/appointment.ts` - TypeScript interfaces
- `schemas/appointmentSchema.ts` - Zod validation

### Config

- `database.sql` - Schema actualizado
- `vercel.json` - Cron configurado
- `.env.example` - Variables documentadas

---

## 🎯 Cómo Funciona

1. **Creador** configura horarios en `/clubs/[id]/panel/agenda`
2. **Usuario** reserva (pendiente: UI de booking)
3. **Cron** detecta hora de cita y crea room de Daily.co
4. **Realtime** notifica a ambos usuarios
5. **Floating button** aparece automáticamente
6. **Click** → Videollamada instantánea

---

## ⚠️ Importante

### En Development

- Cron NO corre automáticamente
- Usa `/api/test/trigger-cron` para simular

### En Production (Vercel)

- Cron corre cada 5 minutos automáticamente
- Configura `CRON_SECRET` y `DAILY_API_KEY` en Vercel env vars

---

## 🔗 Documentación Completa

Ver [VIDEOCALL_IMPLEMENTATION.md](VIDEOCALL_IMPLEMENTATION.md) para:

- Flujo detallado
- Troubleshooting
- Pendientes (Stripe, UI booking, etc.)
- Timezone handling
- Testing guides

---

**¡Listo para usar!** 🎉
