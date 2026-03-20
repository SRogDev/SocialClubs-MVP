# Clubs AI: Multiagent Architecture (v1)

## Agentes

- **Router Agent**: clasifica intención y delega.
- **Analytics Agent**: métricas, comportamiento, insights.
- **Service Agent**: operaciones/configuración del panel.
- **Engagement Agent**: activación de comunidad y contenido.

## Diseño modular

- Orquestación: `services/routerAgentService.ts`
- Especialistas:
  - `services/analyticsAgentService.ts`
  - `services/serviceAgentService.ts`
  - `services/engagementAgentService.ts`
- Tools controladas: `services/agentToolsService.ts`
- RAG desacoplado: `services/ragService.ts`

## RAG separado (requisito)

`ragService` se mantiene independiente para:

1. ingestión y procesamiento
2. retrieval contextual
3. límites y cuotas (1GB por club)
4. evolución de proveedor vectorial sin tocar `agentService`

## SQL Tool (controlada)

En v1 se implementa como queries parametrizadas/allowlist (`runClubSqlTool`) para evitar SQL libre generado por modelo.

Consultas actuales:

- `club_profile`
- `club_member_summary`
- `user_membership_preferences`

## Memoria, personalidad y proactividad (adaptación estilo OpenClaw)

Se adapta a SocialClubs con 3 capas:

1. **Memoria de sesión**: contexto de conversación actual.
2. **Memoria episódica**: historial persistido en `agent_messages`.
3. **Memoria semántica**: conocimiento externo en RAG (`ragService`).

Personalidad:

- Base en configuración del creador (`club_agents.system_prompt`)
- Ajustes por especialista (analytics/service/engagement)

Proactividad:

- Inicia con sugerencias contextuales en chat.
- Evoluciona a triggers por eventos (nuevos miembros, caída de actividad, etc.).

## Skills del creador (estado y siguiente paso)

- Estado actual: DB (`agent_skills`).
- Siguiente paso: **Skill Builder por prompt**.
  - El creador describe la habilidad.
  - El agente genera propuesta estructurada.
  - Validación y activación explícita por el creador.

## Roadmap técnico corto

## Phase 2 implementada

- Upload RAG: `/api/agent/rag/upload`
- Listado de fuentes RAG: `/api/agent/rag/sources?clubId=...`
- Worker de ingestión: `/api/queues/rag-ingestion` (QStash signed)
- MCP inicial: `/api/mcp`
- Deduplicación de jobs: Redis key `rag:job:{sourceId}`

## Próximos pasos

1. Conectar extracción real de texto desde storage (archivo/audio/video).
2. Reemplazar embedding mock por embedding model real.
3. Añadir reindexación y borrado de vectores por fuente.
4. Añadir políticas finas de autorización por operación/tool.
5. Instrumentar costos por tool/consulta/embedding.
