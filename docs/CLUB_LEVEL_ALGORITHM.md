# Club Level Algorithm — Sistema de Niveles Dinámicos

## Visión General

Los clubs tienen un sistema de **niveles 1-10** donde la experiencia (XP) determina el nivel actual. Los **umbrales de XP** requeridos para cada nivel **no son fijos**: fluctúan dinámicamente según las estadísticas medias globales de todos los clubs en la plataforma.

> **Principio clave:** Mientras mejores sean los clubs en la plataforma, más difícil es subir de nivel. Esto mantiene los niveles altos como un logro genuino y evita inflación.

---

## Modelo de Datos

### Tabla `clubs`

- `xp BIGINT DEFAULT 0` — Experiencia acumulada del club
- `level SMALLINT CHECK (level <= 10)` — Nivel actual (calculado)

### Tabla futura: `club_level_snapshots` (para el cron)

```sql
CREATE TABLE club_level_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level INT NOT NULL,
    xp_threshold BIGINT NOT NULL,  -- XP mínima para este nivel en este snapshot
    global_avg_xp BIGINT NOT NULL, -- Media global de XP al momento del cálculo
    total_clubs INT NOT NULL,       -- Total de clubs activos
    metadata JSONB DEFAULT '{}'
);
```

---

## Ganancia de XP del Club

El club gana XP por acciones de sus miembros y métricas de crecimiento. **Los valores exactos se definirán después**, pero las categorías son:

### Categorías de XP

| Categoría | Ejemplos | XP Estimado |
|-----------|----------|-------------|
| **Contenido** | Posts creados, comentarios, media subido | Variable |
| **Engagement** | Likes, superlikes, shares, tiempo en club | Variable |
| **Crecimiento** | Nuevos miembros, retención mensual | Variable |
| **Monetización** | Suscripciones, revenue generado | Variable |
| **Actividad** | Videocalls realizadas, mensajes de chat | Variable |
| **Calidad** | Reportes bajos, miembros activos vs totales | Variable (puede ser negativo) |

> ⚠️ **TODO**: Definir valores específicos de XP por acción cuando se profundice en esta feature.

### XP Negativo (Decay)

- Inactividad prolongada (sin posts en X días) → pérdida gradual de XP
- Reportes de miembros → penalización de XP
- Pérdida masiva de miembros → reducción de XP

---

## Algoritmo de Umbrales Dinámicos

### Concepto

Los umbrales de nivel no son constantes. Se recalculan periódicamente (propuesta: **semanalmente**) basándose en la distribución de XP de todos los clubs activos.

### Fórmula Base

```
umbral(nivel) = base_xp(nivel) × factor_global
```

Donde:

```
factor_global = max(1.0, media_global_xp / baseline_xp)
```

- `base_xp(nivel)`: Umbrales base fijos como punto de partida
- `media_global_xp`: Promedio de XP de todos los clubs con al menos 1 miembro
- `baseline_xp`: XP media esperada cuando la plataforma es joven (constante, ej: 500)

### Umbrales Base (Punto de Partida)

| Nivel | XP Base | Descripción |
|-------|---------|-------------|
| 1 | 0 | Inicio — todos empiezan aquí |
| 2 | 100 | Algo de actividad inicial |
| 3 | 500 | Club con uso regular |
| 4 | 1,500 | Club en crecimiento |
| 5 | 4,000 | Club establecido |
| 6 | 10,000 | Club influyente |
| 7 | 25,000 | Club grande y activo |
| 8 | 60,000 | Club top |
| 9 | 150,000 | Club élite |
| 10 | 400,000 | Club legendario |

### Progresión Exponencial

Los umbrales siguen una curva exponencial: cada nivel requiere ~2.5x más XP que el anterior. Esto asegura que:

- Los niveles bajos son alcanzables rápidamente (motivación)
- Los niveles altos requieren esfuerzo sostenido (prestigio)
- La distancia entre nivel 9 y 10 es enorme (exclusividad)

### Efecto de la Media Global

```python
# Pseudocódigo del recálculo semanal
def recalculate_thresholds():
    clubs = get_all_active_clubs()
    global_avg_xp = average(club.xp for club in clubs)
    
    factor = max(1.0, global_avg_xp / BASELINE_XP)
    
    # Aplicar factor con suavizado (no puede subir más de 20% por semana)
    previous_factor = get_last_snapshot_factor()
    smoothed_factor = previous_factor + clamp(factor - previous_factor, -0.2, 0.2)
    
    thresholds = {}
    for level in 1..10:
        thresholds[level] = BASE_XP[level] * smoothed_factor
    
    # Guardar snapshot
    save_snapshot(thresholds, global_avg_xp, len(clubs))
    
    # Recalcular nivel de TODOS los clubs
    for club in clubs:
        new_level = calculate_level(club.xp, thresholds)
        if new_level != club.level:
            update_club_level(club.id, new_level)  # Dispara trigger de notificación
```

### Suavizado (Anti-volatilidad)

Para evitar que los niveles fluctúen bruscamente:

1. **Clamp semanal**: El factor global no puede cambiar más de ±20% por recálculo
2. **Gracia de bajada**: Un club que baja de nivel tiene 7 días de gracia antes de que se haga efectivo
3. **Histéresis**: Para subir necesitas 100% del umbral, para bajar necesitas caer por debajo del 85% (evita oscilar en el borde)

---

## Sistema de Subida y Bajada

### Subida de Nivel

- El cron semanal detecta que `club.xp >= umbral(nivel+1)`
- Actualiza `clubs.level` → dispara trigger `notify_club_level_up`
- Todos los miembros reciben notificación
- Animación de celebración en la UI (LevelUpCelebration component)

### Bajada de Nivel

- El cron detecta que `club.xp < umbral(nivel_actual) * 0.85` (histéresis)
- Período de gracia de 7 días (el club mantiene el nivel temporalmente)
- Si después de 7 días sigue por debajo → baja de nivel
- Notificación al creador del club (no a todos los miembros, para no generar alarma)
- No hay animación de bajada (es silencioso)

---

## Job de Recálculo (Cron)

### Frecuencia: Semanal (Domingo 03:00 UTC)

```
Flujo:
1. Calcular media global de XP de clubs activos
2. Calcular nuevo factor_global con suavizado
3. Generar nuevos umbrales para niveles 1-10
4. Guardar snapshot en club_level_snapshots
5. Para cada club:
   a. Calcular nivel según nuevos umbrales
   b. Si nivel subió → UPDATE clubs SET level = new_level (trigger notifica)
   c. Si nivel bajó → Verificar período de gracia → Si expiró → UPDATE
6. Log de cambios para auditoría
```

### Implementación: QStash (ya integrado en el proyecto)

- Endpoint: `POST /api/cron/recalculate-club-levels`
- Autenticación: Verificar firma de QStash
- Timeout: Hasta 5 minutos (procesar todos los clubs)

---

## Recompensas por Nivel

| Nivel | Recompensa |
|-------|------------|
| 1 | — |
| 2 | — |
| 3 | — |
| 4 | — |
| 5 | Features de acceso medio + comisiones reducidas |
| 6 | 🔵 Blue Badge + comisiones reducidas |
| 7 | — |
| 8 | Early Access a nuevas features |
| 9 | — |
| 10 | 🥇 Golden Badge |

> Las recompensas se irán añadiendo a medida que la plataforma crezca y haya más valor que ofrecer.

---

## Consideraciones Futuras

- **Percentil relativo**: Además de XP absoluto, considerar la posición del club en un ranking percentil para ajustar el nivel (un club top-1% siempre debería ser nivel 9-10)
- **Categorías de club**: Los umbrales podrían variar por tipo de club (un club de nicho con 50 miembros muy activos podría competir con uno de 500 miembros pasivos)
- **Temporadas**: Resetear parcialmente XP cada trimestre/año para mantener la competitividad
- **Leaderboard de clubs**: Ranking público de clubs por nivel y XP
- **API pública**: Endpoint para consultar el nivel y progreso de un club

---

## Archivos Relacionados

- **Migración**: `supabase/migrations/20260301000001_notifications_extended_club_xp.sql` (columna `xp` en clubs)
- **Trigger**: `notify_club_level_up()` en la misma migración
- **Componente**: `components/shared/ClubLevelBadge.tsx`
- **Listener**: `hooks/use-club-level-listener.ts`
- **Animación**: `components/notifications/LevelUpCelebration.tsx`
- **Servicio**: TODO — `services/clubLevelService.ts` (cálculo de niveles)
- **Cron**: TODO — `app/api/cron/recalculate-club-levels/route.ts`

---

*Última actualización: Marzo 2026*
