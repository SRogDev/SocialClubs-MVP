/**
 * AI safety eval runner (master plan Phases 67-68).
 *
 * Usage: `npm run eval:ai`
 *
 * Runs every eval case in tests/eval/ against the deterministic mock client
 * (never a real provider: no cost, no flakiness, no network). Prints a
 * per-suite summary table and exits non-zero when any case fails.
 */
import { runEvals, printEvalReport } from '../../lib/ai/eval-harness';
import { faqGroundingEvals } from './faq-grounding.eval';
import { moderationEvals } from './moderation.eval';
import { jailbreakEvals } from './jailbreak.eval';
import { budgetEvals } from './budget.eval';
import { knowledgeRetrievalEvals } from './knowledge-retrieval.eval';

async function main(): Promise<void> {
    const report = await runEvals([
        ...faqGroundingEvals,
        ...moderationEvals,
        ...jailbreakEvals,
        ...budgetEvals,
        ...knowledgeRetrievalEvals,
    ]);
    printEvalReport(report);
    if (report.failed > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('[eval:ai] runner crashed:', err);
    process.exit(1);
});
