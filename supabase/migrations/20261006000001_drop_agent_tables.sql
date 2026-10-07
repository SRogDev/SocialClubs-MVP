-- Drop the club-agent architecture tables.
-- Reform decision (2026-10-06): per-club AI agents are removed; AI capabilities
-- live in Polygrow (standalone-first, Polygrow-enhanced), not in SocialClubs.
-- Children dropped before parents to respect foreign keys.

DROP TABLE IF EXISTS agent_messages;
DROP TABLE IF EXISTS club_rag_chunks;
DROP TABLE IF EXISTS club_rag_sources;
DROP TABLE IF EXISTS agent_skills;
DROP TABLE IF EXISTS club_agents;
