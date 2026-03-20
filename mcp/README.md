# MCP - Clubs AI

Este directorio define el contrato MCP para reutilizar las mismas capacidades del agente interno.

## Objetivo

Exponer las mismas operaciones del agente de clubes en dos canales:

1. Asistente interno del panel
2. Cliente MCP externo

## Principio de diseño

- La lógica vive en `/services`.
- MCP solo adapta request/response y autenticación.
- No duplicar lógica de negocio en handlers MCP.

## Capacidades v1 previstas

- `panel.read`: lectura de contexto/config de club
- `panel.write`: mutaciones permitidas del panel
- `agent.chat`: preguntas al agente del club
- `rag.manage`: carga/listado/eliminación de fuentes RAG

## Implementación actual

- Route: `/api/mcp`
- Métodos activos:
  - `panel.read`
  - `agent.chat.context`
  - `rag.manage.upload`
  - `rag.manage.delete`
  - `rag.manage.reindex`

`rag.manage.upload` encola ingestión asíncrona con QStash y deduplicación en Redis.

## Reuso actual

- Routing multiagente: `services/routerAgentService.ts`
- Especialistas: `services/analyticsAgentService.ts`, `services/serviceAgentService.ts`, `services/engagementAgentService.ts`
- Tools controladas: `services/agentToolsService.ts`
- RAG separado: `services/ragService.ts`

## Nota

La implementación del servidor MCP se construirá en fases para mantener control de permisos y costos.
