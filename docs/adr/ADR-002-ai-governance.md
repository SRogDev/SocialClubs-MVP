# ADR-002: AI Governance — Actions, Policy, Verification

**Status:** accepted (2026-10-15)
**Context:** Master plan Phases 3.1, 14, 15, 58, 59, 60. Builds on ADR-001 (shared AI runtime). Verification must exist BEFORE high autonomy (plan Phase 66).

## Decisions

### 1. Action registry (`lib/ai/actions.ts`, plan Phase 58)
Central `ACTION_REGISTRY: Record<string, ActionDef>`. Initial actions:
`send_message`, `create_post`, `comment_post`, `tag_post`, `hide_post`, `notify_creator`, `create_event`, `grant_temporary_access`, `escalate_to_human`, `pause_agent`.
Each declares: `risk` (low|medium|high|critical), required `permissions`, input/output zod schemas, `idempotent: boolean`, `audit: boolean` (always true for medium+), `approval` default.
Deliberately NOT in v1: `modify_event`, `activate_experience`, `report_post` (arrive with their features).

### 2. Proactivity levels (plan Phase 14)
Per-club `club_ai_config.proactivity_level`: 1=Advisor (AI drafts, never executes), 2=Operator (auto-executes low-risk, approval for medium+), 3=Autonomous (auto low+medium under policy, approval for high/critical). Default: 1.
Permission matrix (action × risk × level → draft|auto|approval) in `lib/ai/proactivity.ts`:
- low risk: L1 draft, L2 auto, L3 auto
- medium risk: L1 draft, L2 approval, L3 auto-under-policy
- high risk: always approval (suggest at L1)
- critical (membership/payment changes): always approval, always human

### 3. Verification pipeline (`lib/ai/verify.ts`, plan Phase 15)
Every agent-proposed action flows: schema validation → permission validation → policy validation → risk classification → (medium+: AI reviewer) → (high/critical or policy: human approval) → execute → audit log.
- Deterministic checks are plain code (plan 15.1). Never ask the LLM what code can decide.
- AI reviewer: separate `reviewer`-tier call with the action + context; returns pass|revise|escalate|block. Max 1 revise loop, then escalate.
- Human approval: creates a pending row surfaced in the AI Inbox; action executes only after approval (or expires).

### 4. Agent definitions (`lib/ai/agents.ts`, plan Phase 3.1)
Three `AgentDefinition`s, all starting at proactivity L1:
- `community-manager`: onboarding, FAQs, engagement nudges, organization. Tools: read posts/members, send_message (draft at L1), tag_post.
- `experience-director`: opportunity detection, experience proposals. Tools: read signals, propose (never auto-execute in v1).
- `creator-copilot`: creator-facing intelligence, briefings, recommendations. Tools: read-only + notify_creator.
No agent gets a tool outside its mission. Tools are thin wrappers over existing services with permission checks.

### 5. Audit log (plan Phase 60)
`ai_actions` table is the single audit trail: who (agent), what (action+inputs), policy result, review result, execution result, idempotency key, timestamps. `ai_action_reviews` stores AI + human reviews. The AI Inbox reads from these tables — no separate store.

## Consequences
- Adding a new AI capability = adding an ActionDef + policy row + tests. No ad-hoc agent powers.
- Autonomy is earned: L2/L3 unlock only after the verification stack + AI Inbox ship and pass evals.
- Every AI write is attributable and reversible via the audit log.
