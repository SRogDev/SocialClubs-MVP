# 🚀 Before Launch - Tareas Pendientes

Checklist de funcionalidades pendientes antes del lanzamiento de producción.

---

## 📱 iOS PWA Optimizations

### Onboarding Tutorial Primer Login

- [ ] Flujo guiado para usuarios iOS: cómo añadir app a Home Screen
- [ ] Modal/wizard multi-paso con capturas visuales
- [ ] Guardar estado completado en localStorage
- [ ] Analytics: tracking completación y abandono

### Gestión Avanzada Banner de Notificaciones

- [ ] "Recordar después" → ocultar 7 días
- [ ] Límite 3 apariciones → ocultar permanentemente
- [ ] Analytics de dismissals para medir fricción
- [ ] Timing óptimo (después de engagement)

### Badge Icon Generation

- [ ] Generar badge icon 72x72px (`/public/icons/badge-72.png`)
- [ ] Iconos genéricos notificaciones: default, engagement, marketing, transactional (192x192)

### Safari-Specific Push

- [ ] Testing Safari iOS 16+
- [ ] Manejar permisos denegados → instrucciones reset
- [ ] Service Worker failures → fallback graceful
- [ ] Documentar limitaciones iOS vs Android

---

## 💳 Stripe Escrow System

**No implementado**: Sistema de retención de pagos (escrow) para transacciones entre usuarios y clubs.

- Retener fondos temporalmente cuando usuario paga
- Liberar fondos al creador después de período garantía (7-30 días)
- Manejar chargebacks/disputas automáticamente
- Requiere Stripe Connect con plataforma marketplace

**Prioridad**: Media (necesario para monetización completa)

---

## 🔔 16 Notificaciones Adicionales Sugeridas

### **ENGAGEMENT** (Interacciones sociales)

1. **`post_liked`** - Alguien dio like a tu post
   - Feedback inmediato, aumenta motivación crear contenido

2. **`post_commented`** - Nuevo comentario en tu post
   - Mantiene conversaciones activas, aumenta retention

3. **`member_joined_club`** - Nuevo miembro (solo admin/mod)
   - Ver crecimiento en tiempo real

4. **`member_left_club`** - Miembro dejó club (solo admin)
   - Alertar churn para acciones correctivas

5. **`club_invitation_received`** - Te invitaron a club
   - Urgencia aceptar invitaciones, growth viral

6. **`friend_joined_app`** - Contacto se unió a SocialClubs
   - Reactivación usuarios inactivos, networking

7. **`achievement_unlocked`** - Logro/badge desbloqueado
   - Gamificación, motivación continuar

8. **`weekly_recap`** - Resumen semanal actividad
   - Re-engagement usuarios poco activos, FOMO

### **MARKETING** (Campañas y retención)

1. **`featured_club_recommendation`** - Club recomendado
   - Discovery personalizado, aumenta clubs joined

2. **`inactive_user_reminder`** - "Te extrañamos"
    - Reactivar usuarios +7 días inactivos

3. **`special_event_announcement`** - Evento especial
    - Awareness features, aumenta engagement

4. **`milestone_celebration`** - Plataforma alcanzó X usuarios
    - Sentido comunidad, social proof

### **TRANSACTIONAL** (Confirmaciones críticas)

1. **`subscription_renewal_reminder`** - Renovación pronto
    - Transparencia pagos, reduce chargebacks

2. **`subscription_payment_failed`** - Fallo pago
    - Actualizar método pago, reduce churn involuntario

3. **`club_role_changed`** - Rol cambió (promovido a mod)
    - Celebrar progreso, claridad permisos

4. **`content_moderation_alert`** - Contenido reportado/removido
    - Transparencia moderación, permite apelar

### 📊 Prioridad de Implementación

**Alto**: post_liked, post_commented, member_joined_club, club_invitation_received, subscription_payment_failed

**Medio**: friend_joined_app, achievement_unlocked, weekly_recap, inactive_user_reminder, club_role_changed

**Bajo**: featured_club_recommendation, special_event_announcement, milestone_celebration

---

## 🎨 Sistema Iconos Notificaciones

- [ ] Automatizar resize logos clubs a tamaños compatibles
- [ ] Fallback si no hay logo: avatar con iniciales + color club
- [ ] CDN/caché para iconos procesados
- [ ] Lazy loading en notification center

## ⚙️ Preferencias Notificaciones

- [ ] Tabla `notification_preferences`: habilitar/deshabilitar por category/club
- [ ] Configurar horario "No molestar"
- [ ] UI en perfil usuario para gestionar
- [ ] Validar preferencias en Edge Function antes envío

---

## 🔐 Security & Compliance

- [ ] Rate limiting más agresivo en Edge Functions
- [ ] Auditoría permisos RLS todas las tablas
- [ ] Sanitización inputs `metadata`
- [ ] GDPR: export/delete user notifications
- [ ] Unsubscribe obligatorio marketing
- [ ] Respetar "Do Not Disturb" hours (timezone)
- [ ] Logs auditoría envíos

---

## 📈 Analytics & Monitoring

- [ ] Delivery rate (sent/failed ratio)
- [ ] Click-through rate por tipo
- [ ] Time to open
- [ ] Unsubscribe rate por category
- [ ] A/B testing títulos/cuerpos
- [ ] Panel admin estadísticas
- [ ] Alertas si delivery rate < 95%
- [ ] Heatmap mejores horarios envío

---

## 🚀 Performance

- [ ] Batch sending notificaciones masivas
- [ ] Queue system scheduled notifications
- [ ] Deduplicación: no múltiples del mismo tipo en ventana tiempo
- [ ] Archivado automático leídas > 30 días
- [ ] Partitioning tabla notifications por mes
- [ ] Vacuum automático

---

**Última actualización**: 11 de enero de 2026
