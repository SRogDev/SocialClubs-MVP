# Memory infrastructure — club knowledge layer (Supermemory)

Status: shipped 2026-10-23 (Workstream A). Code: `lib/ai/knowledge.ts`,
`lib/ai/supermemory-client.ts`. Tests: `tests/unit/ai/knowledge.test.ts`,
`tests/unit/ai/supermemory-client.test.ts`; evals:
`tests/eval/knowledge-retrieval.eval.ts` (`npm run eval:ai`).

## Decision (Roger, 2026-10-23)

Supermemory is the memory infrastructure for SocialClubs clubs, adopted
with the **exit designed from day 1** because club content is private:
influencers will not accept their private community's content living in a
third-party database without a way out. The design below is the way out.

## Architecture

```
Supabase (SOURCE OF TRUTH)                Supermemory (DERIVED INDEX)
┌──────────────────────────────┐          ┌──────────────────────────────┐
│ clubs: name/description/     │  sync    │ namespace: club_<clubId>     │
│        rules/category        │ ───────► │  ├─ faq-<hash>     (faq)     │
│ club_ai_config.policies.faq  │ rebuild  │  ├─ club-profile   (profile) │
│ ai_memory (corrections)      │          │  └─ correction-<key>         │
└──────────────────────────────┘          └──────────────────────────────┘
        ▲                                            │
        │ answerFAQ fallback                         │ retrieval
        │ (no key / no hits / failure)               ▼
        └──────────────────────── Community Manager answerFAQ
```

- **One namespace per club** (`club_<clubId>`). Every provider call
  carries exactly one namespace, so cross-club reads are impossible by
  construction — not by prompt discipline (plan Phases 18/44).
- **Provider interface** (`KnowledgeProvider` in `lib/ai/knowledge.ts`):
  all callers use it. Backends today: `SupermemoryKnowledgeProvider`
  (hosted API), `InMemoryKnowledgeProvider` (tests/evals). A pgvector
  backend can implement the same interface tomorrow.
- **Sync** (`syncClubKnowledge`): upserts every source document (stable
  ids — unchanged content deduplicates provider-side) and deletes
  documents whose source rows disappeared (FAQ question edited or
  removed, correction deleted). Triggered fire-and-forget after
  AI-config saves and after a correction is recorded from the AI Inbox.
- **Rebuild** (`rebuildClubKnowledge`): wipes the club namespace and
  re-ingests from Supabase. Exposed to owners/admins at
  `POST /api/ai/knowledge/rebuild`.
- **Retrieval**: `CommunityManager.answerFAQ` asks the knowledge layer
  for the FAQ entries relevant to the member's question (kind-filtered
  to FAQ docs) instead of stuffing the whole FAQ into the prompt. Any
  failure degrades to the full-FAQ behavior that preceded this layer.

## Exactly what is sent to Supermemory (privacy inventory)

This list is exhaustive — it is what the privacy policy must disclose.
Ingestion happens ONLY through `buildClubKnowledgeDocs`:

| Document | Source (Supabase) | Content |
|---|---|---|
| `faq-<sha1(question)>` | `club_ai_config.policies.faq[]` | `Pregunta: … / Respuesta: …` |
| `club-profile` | `clubs` row | name, category, description, rules |
| `correction-<key>` | `ai_memory` rows with `source='correction'` | the distilled preference text (PII-sanitized at write time in `lib/ai/memory.ts`, re-sanitized at ingestion) |

**Never sent:** member posts, comments, DMs or chat content, member
profiles or emails, payment data, AI action payloads, raw feedback text.
Documents are ingested with `taskType: "superrag"` — searchable chunks
only; Supermemory does NOT run its fact-extraction/profile pipeline on
club knowledge.

## Exit / migration path

Because Supabase is the source of truth and Supermemory only holds a
derived index, leaving is a re-ingest, not a rescue:

1. **Self-hosted Supermemory**: run their binary (same API), set
   `SUPERMEMORY_API_URL` to the instance, then rebuild every club
   (`POST /api/ai/knowledge/rebuild` per club, or `rebuildClubKnowledge`
   in a script). Zero code changes.
2. **pgvector (or any backend)**: implement `KnowledgeProvider` over the
   new store (~one file), flip resolution in `resolveKnowledgeProvider`,
   rebuild every club. Callers do not change.
3. **Deleting a club's data from Supermemory**: `provider.clear(clubId)`
   deletes every document in the club's namespace; deletes are permanent
   on Supermemory's side (their docs), and nothing is lost because the
   source rows live in Supabase.

## Configuration

| Env var | Effect |
|---|---|
| `SUPERMEMORY_API_KEY` | Enables the layer. Absent → provider disabled, everything degrades to Supabase-only behavior. |
| `SUPERMEMORY_API_URL` | Optional. Base URL override — the self-host exit path. Default `https://api.supermemory.ai`. |

Keys are server-side only and never committed (`.env.example` documents
the variables with empty values).

## Known limits

- Sync is convergent, not transactional: a failed sync logs a warning
  and the next save/rebuild converges the index. FAQ answers are never
  blocked by the index — worst case they use the Supabase fallback.
- The hosted API processes documents asynchronously; a just-saved FAQ
  edit may take a short while to become searchable. The fallback covers
  the gap only when retrieval returns nothing relevant.
- Live verification against the real Supermemory API requires Roger's
  key; the transport is pinned to the documented contract
  (POST /v3/documents, POST /v4/search, POST /v3/documents/list,
  DELETE /v3/documents/bulk — verified against their OpenAPI spec on
  2026-10-23) and covered by fake-fetch unit tests.
