"""Deliver the AI Inbox PR: branch from main -> upload files -> open PR.

Usage: python3 deliver_inbox_pr.py [step]
  steps: branch | upload | openpr   (run in order; each is idempotent-ish)
"""
import base64
import os
import sys
import urllib.parse

sys.path.insert(0, "/home/hatch/workspace/scripts")
from gh_api import api, get_file_sha  # noqa: E402

OWNER = "SRogDev"
REPO = "SocialClubs-MVP"
BRANCH = "feat/ai-inbox"
BASE_SHA = "4003c757493a4b65cde6cb7fd42fec0233cbabf1"  # origin/main
WORKTREE = "/home/hatch/workspace/socialclubs-inbox"

FILES = [
    "lib/ai/inbox.ts",
    "lib/ai/inbox-display.ts",
    "app/api/ai/inbox/route.ts",
    "app/api/ai/inbox/[actionId]/route.ts",
    "app/clubs/[id]/panel/ai-inbox/page.tsx",
    "components/club-panel/ai-inbox-section.tsx",
    "components/club-panel/club-panel-sidebar.tsx",
    "components/club-panel/club-panel-sidebar-wrapper.tsx",
    "tests/unit/ai/inbox.test.ts",
    "tests/unit/ai/inbox-routes.test.ts",
    "README.md",
    "STATUS.md",
]

COMMIT_MSG = "feat: AI Inbox — creator trust center for the AI staff"


def step_branch():
    try:
        api("POST", f"/repos/{OWNER}/{REPO}/git/refs",
            {"ref": f"refs/heads/{BRANCH}", "sha": BASE_SHA}, ok_codes=(201,))
        print(f"branch {BRANCH} created at {BASE_SHA[:8]}")
    except RuntimeError as e:
        if "-> 422" in str(e):
            print(f"branch {BRANCH} already exists (continuing)")
        else:
            raise


def step_upload():
    for path in FILES:
        with open(os.path.join(WORKTREE, path), "rb") as f:
            content = base64.b64encode(f.read()).decode()
        url_path = urllib.parse.quote(path, safe="/")
        payload = {
            "message": COMMIT_MSG,
            "content": content,
            "branch": BRANCH,
        }
        sha = get_file_sha(OWNER, REPO, url_path, BRANCH)
        if sha:
            payload["sha"] = sha
            action = "updated"
        else:
            action = "created"
        r = api("PUT", f"/repos/{OWNER}/{REPO}/contents/{url_path}", payload,
                ok_codes=(200, 201))
        commit_sha = r.get("commit", {}).get("sha", "")[:8]
        print(f"{action:8} {path} (commit {commit_sha})")


PR_BODY = """## AI Inbox — creator trust center for the AI staff (master plan Phases 8, 9, 17, 18, 22, 23, 24)

Builds on the merged runtime + governance (ADR-002): the inbox reads the audit trail (`ai_actions` + `ai_action_reviews`) — no separate store.

### What it does
- **Approve** records a human `approved` review, then **executes the action now** through its registry executor (same step-7 logic as `verifyAndExecute`) and marks the row `executed`. Idempotent: a second approve never re-executes and records nothing.
- **Reject** records a human `rejected` review (optional feedback) and marks the row `rejected` — rejecting **never** executes.
- Only `pending_approval`/`draft` rows are decidable; anything else returns its current state untouched.

### Files
- `lib/ai/inbox.ts` — `getPendingActions`, `approveAction`, `rejectAction`, `listInboxActions` (+`humanDecision` filter), `countPendingActions`, `getInboxAction`, `InboxDb` (extends `VerifyDb`), `supabaseInboxDb()`. Server-only.
- `lib/ai/inbox-display.ts` — client-safe Spanish labels, risk badges, input previews, audit-trail formatters.
- `app/api/ai/inbox/route.ts` — GET: auth + `requireClubRole(owner,admin,moderator)`; `?clubId=` required; `?status=` csv (default `pending_approval,draft`); `?humanDecision=approved|rejected`; `?countOnly=1` for the badge.
- `app/api/ai/inbox/[actionId]/route.ts` — POST `{decision:'approve'|'reject', feedback?}`: `requireClubRole(owner,admin)` — moderators get 403 FORBIDDEN.
- `app/clubs/[id]/panel/ai-inbox/page.tsx` + `components/club-panel/ai-inbox-section.tsx` — Spanish-first UI: tabs Pendientes/Aprobadas/Rechazadas/Ejecutadas, agent avatar + risk badge + content preview + policy reason per card, approve/reject with optional feedback (optimistic UI + rollback), per-card audit trail (proposer, policy, reviews), empty state *"No hay borradores pendientes. Tu equipo de IA está al día."*
- Panel sidebar: new "Bandeja IA" link with pending-count badge (client fetch of `countOnly=1`; fails silent).
- `README.md` (English AI Inbox section), `STATUS.md` (phase entry).
- Gated by the `AI_INBOX` env flag (default OFF), following the repo's flag convention.

### Verifiable evidence
- `npx jest tests/unit/ai/inbox` → **29/29 pass** (15 lib: approve executes + writes review, reject never executes, double-approve/reject idempotent, NOT_FOUND, listing/filters/badge count, registry risk-map drift guard; 14 route: 401/400/403-FORBIDDEN incl. moderator-blocked-on-POST, 404s, approve/reject delegation, flag-off 404). Written RED first.
- Full unit suite: 187/189 pass — the 2 failures (cookie-banner, club/post stores) are **pre-existing on clean main** (verified via `git stash`).
- `npx tsc --noEmit`: **0 errors in new/changed files**; 229 pre-existing errors elsewhere on main, unchanged (verified via `git stash`).
- `npm run build`: **green** — `/api/ai/inbox`, `/api/ai/inbox/[actionId]`, `/clubs/[id]/panel/ai-inbox` all collected. (Build needs dummy env for pre-existing module-level guards: `STRIPE_SECRET_KEY`, `UPSTASH_REDIS_REST_*`, `QSTASH_TOKEN`, `RESEND_API_KEY` — unrelated to this PR.)
"""


def step_openpr():
    pr = api("POST", f"/repos/{OWNER}/{REPO}/pulls", {
        "title": "feat: AI Inbox — creator trust center for the AI staff (Phases 8, 9, 17, 18, 22, 23, 24)",
        "head": BRANCH,
        "base": "main",
        "body": PR_BODY,
    }, ok_codes=(201,))
    print(f"PR #{pr['number']}: {pr['html_url']}")


if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else "branch"
    {"branch": step_branch, "upload": step_upload, "openpr": step_openpr}[step]()
