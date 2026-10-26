# AI Safety Evals

Safety proofs for the SocialClubs AI staff (master plan **Phases 67–68**).
Unit tests assert code behavior; these evals assert **safety properties**:
the staff stays grounded, moderates correctly, refuses jailbreaks, and never
spends budget it doesn't have.

## Running

```bash
npm run eval:ai        # ts-node tests/eval/run.ts — full suite, exits non-zero on failure
```

- **Deterministic only.** Every eval runs against the deterministic mock
  client (or a purpose-built deterministic stand-in) — never a real provider.
  No cost, no network, no flakiness. Safe to run in CI on every push.
- **Separate from unit tests.** Evals live in `tests/eval/` and are NOT part
  of the jest suite (`tests/unit/`, `tests/integration/`). They answer
  "is the AI staff safe?" rather than "does this function work?".

## Suites

| Suite | Cases | What it proves |
|---|---|---|
| `faq-grounding` | 24 | `answerFAQ` receives the club's full FAQ as model context (20 entries); each of 20 questions resolves to the right entry (answer contains the entry's key phrase); no answer contains invented facts (denylist scan); uncovered questions get an honest `No lo sé` + `grounded=false`; a missing/malformed FAQ returns `null` with **zero** model calls. |
| `moderation` | 30 | 10 clean texts pass at the deterministic layer (no AI spend); 10 spam texts split into blocklist → `violation` (deterministic) and link-spam / all-caps → `suspicious` routed to the AI layer (`layer === 'ai'`); 10 hate/harassment texts (placeholder tokens `slurword` / `grupo-inferior`, **no real hate speech**) → `violation` via blocklist. |
| `jailbreak` | 21 | 15 adversarial prompts (instruction override, system-prompt extraction, role reassignment, DAN/jailbreak personas, policy evasion, hypothetical framing, repetition exploits, base64 tricks, authority spoofing, prompt-leak prefixes, compliance tests) are **blocked** by `screenAgentInput` with a safe refusal; 5 benign member questions pass through; the screen never throws on weird input. |
| `budget` | 4 | `invokeAgent` throws `AI_BUDGET_EXCEEDED` with **zero** model invocations when the budget is exhausted or disabled; a healthy budget yields exactly one call plus a usage-log row; event ordering proves the budget read precedes the model call. |
| `knowledge-retrieval` | 6 | With the Supermemory knowledge layer active (deterministic in-memory provider, same interface): `answerFAQ` grounding narrows to the relevant FAQ entries instead of the full FAQ; answers resolve to the right entry; **cross-club namespace isolation** (club A can never be grounded in club B's FAQ, even for identical questions); provider disabled → full-FAQ fallback; uncovered questions still get `No lo sé`; after a source edit + `syncClubKnowledge`, retrieval serves the updated answer (Supabase = source of truth). |

Current pass rate: **85/85** (measured 2026-10-23, `npm run eval:ai`).

## How to add evals

1. Create `tests/eval/<name>.eval.ts` and export an array of cases:
   ```ts
   import { defineEval, assertContains } from '../../lib/ai/eval-harness';

   export const myEvals = [
       defineEval('my-suite', 'descriptive case name', async () => {
           // ... run the subject against the deterministic mock ...
           assertContains(answer, 'expected phrase'); // throws on failure
           return { pass: true, details: 'what was verified' };
       }),
   ];
   ```
2. Register the array in `tests/eval/run.ts`.
3. Available assertion helpers (`lib/ai/eval-harness.ts`): `assertContains`,
   `assertNotContains`, `assertRefusal`, plus `withEnv` (temporary env flags)
   and `makeInMemoryCostDeps` (in-memory budget stub with event ordering).
4. Rules: deterministic mock only (no real API calls); adversarial prompts
   must use placeholders or mild phrasing — never real hate speech, slurs,
   or disallowed content.

## Policy

**Every new AI feature must ship evals.** A PR that adds or changes AI staff
behavior (new agent, new capability, new prompt policy, new guardrail) is not
complete until `tests/eval/` covers its safety properties and
`npm run eval:ai` is green. Update the suite table and pass rate above in the
same PR.

## Honest scope notes (read before citing these evals)

- **The mock is not the model.** `faq-grounding` uses `GroundedFaqMock`, a
  deterministic stand-in for a *policy-compliant* model (it quotes the matched
  FAQ entry, or says `No lo sé`). The eval proves the **system wiring** — FAQ
  entries reach the model, fallbacks don't hallucinate — not that a real
  model obeys the grounding policy. Model obedience is covered by the prompt
  policies plus (future) LLM-as-judge evals.
- **Known limitation: `answerFAQ` trusts model output.** There is currently no
  deterministic verifier on the FAQ answer path — a misbehaving model could
  inject facts the FAQ doesn't contain; the prompt policy is the only guard.
  Follow-up: add a grounding verifier over `answerFAQ` output (quoted-phrase
  check against the entries) and pin it here.
- **Resolved (Phases 69–72): input screen wired in.** `screenAgentInput`
  (lib/ai/input-guards.ts) is now called by `invokeAgent` as a pre-model
  gate: a blocked payload throws the typed `AI_INPUT_BLOCKED` error (with
  the safe canned refusal) and the model is never called. Covered by unit
  tests in `tests/unit/ai/cost-dashboard.test.ts` ("invokeAgent input
  screening"); the jailbreak evals continue to pin the screen itself.
- **Mock-determined L2 verdicts.** In `moderation`, the AI-layer verdict for
  `suspicious` texts comes from the canned mock; the eval asserts **routing**
  (`layer === 'ai'`), not the mock's verdict.
