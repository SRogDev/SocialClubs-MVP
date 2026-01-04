# Nota sobre Migración de Agent Skills

## ¿Por qué se intentó aplicar una migración?

La tabla `agent_skills` necesita ser creada en la base de datos de Supabase para almacenar los servicios/skills que el usuario configura para su agente.

### Estructura de la tabla necesaria

```sql
CREATE TABLE agent_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES club_agents(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  action text NOT NULL,
  access_subscription_id uuid REFERENCES channels(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### RLS Policies necesarias

1. **agent_skills_creator_policy**: Permite a los creadores del club gestionar los skills de su agente
2. **agent_skills_members_policy**: Permite a los miembros del club ver los skills del agente

## Estado Actual

- ✅ El archivo de migración SQL está en: `/supabase/migrations/20231223_add_agent_skills_table.sql`
- ❌ La migración NO ha sido aplicada a la base de datos todavía

## Próximos Pasos

Para que el feature de Agent funcione completamente, necesitas:

1. Aplicar la migración manualmente en Supabase Dashboard, O
2. Usar el Supabase CLI: `supabase db push`, O
3. Copiar el SQL del archivo de migración y ejecutarlo directamente en el SQL Editor de Supabase

Sin esta tabla, las funciones de `agentService.ts` que manejan skills fallarán al intentar leer/escribir en `agent_skills`.
