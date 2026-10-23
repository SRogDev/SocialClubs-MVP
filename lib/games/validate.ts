/**
 * Static validation of AI-generated minigame code (Workstream B;
 * master plan Phases 11/30 + Roger's MINI ruleset).
 *
 * The AI generates FREE code — so this checker is a real security gate,
 * not a formality. It runs on the artifact BEFORE a creator ever sees it,
 * and nothing reaches the library without passing. Enforcement layers:
 *
 * 1. THIS static analysis (rejects known-dangerous constructs).
 * 2. The sandboxed iframe + strict CSP at play time (no network, no
 *    storage, no top navigation — see bridge.ts composePlayableHtml).
 * 3. The server-side bridge (capability checks, caps, rate limits,
 *    idempotency) — game code is never trusted, even after 1+2.
 *
 * Rules are intentionally conservative: a false rejection costs one
 * regeneration; a false pass could cost the club. Games talk to the
 * club ONLY through the injected `ClubGame` SDK — any raw postMessage,
 * any network API, any storage, any eval is a rejection.
 */
import { BRIDGE_METHOD_CAPABILITIES, MINIGAME_CONSTRAINTS } from './constraints';
import type { GameBrief } from './brief';

export interface GameViolation {
    rule: string;
    detail: string;
}

export interface GameValidationReport {
    ok: boolean;
    violations: GameViolation[];
    /** Capabilities the code actually uses (via ClubGame.* calls). */
    usedCapabilities: string[];
    sizeBytes: number;
}

interface Rule {
    rule: string;
    pattern: RegExp;
    detail: string;
}

const FORBIDDEN: Rule[] = [
    { rule: 'no_network', pattern: /\bfetch\s*\(/, detail: 'fetch() is forbidden — games have no network access; use the ClubGame bridge.' },
    { rule: 'no_network', pattern: /\bXMLHttpRequest\b/, detail: 'XMLHttpRequest is forbidden — games have no network access.' },
    { rule: 'no_network', pattern: /\bWebSocket\b/, detail: 'WebSocket is forbidden — v1 games are asynchronous, no live connections.' },
    { rule: 'no_network', pattern: /\bEventSource\b/, detail: 'EventSource is forbidden — games have no network access.' },
    { rule: 'no_network', pattern: /\bsendBeacon\b/, detail: 'navigator.sendBeacon is forbidden — no data may leave the sandbox.' },
    { rule: 'no_storage', pattern: /\blocalStorage\b/, detail: 'localStorage is forbidden — persistent state goes through ClubGame state (scoped, capped, expiring).' },
    { rule: 'no_storage', pattern: /\bsessionStorage\b/, detail: 'sessionStorage is forbidden — use ClubGame state.' },
    { rule: 'no_storage', pattern: /\bindexedDB\b/, detail: 'indexedDB is forbidden — use ClubGame state.' },
    { rule: 'no_cookies', pattern: /\bdocument\s*\.\s*cookie\b/, detail: 'document.cookie is forbidden.' },
    { rule: 'no_eval', pattern: /\beval\s*\(/, detail: 'eval() is forbidden.' },
    { rule: 'no_eval', pattern: /\bnew\s+Function\b/, detail: 'The Function constructor is forbidden (eval equivalent).' },
    { rule: 'no_dynamic_import', pattern: /\bimport\s*\(/, detail: 'Dynamic import() is forbidden — the game is a single self-contained file.' },
    { rule: 'no_dynamic_import', pattern: /\bimportScripts\b/, detail: 'importScripts is forbidden — single self-contained file.' },
    { rule: 'no_wasm', pattern: /\bWebAssembly\b/, detail: 'WebAssembly is forbidden in v1 (opaque code cannot be statically reviewed).' },
    { rule: 'no_raw_postmessage', pattern: /\.postMessage\s*\(/, detail: 'Raw postMessage is forbidden — games communicate ONLY through the ClubGame SDK.' },
    { rule: 'no_parent_access', pattern: /\bwindow\s*\.\s*parent\b/, detail: 'window.parent access is forbidden — use the ClubGame bridge.' },
    { rule: 'no_parent_access', pattern: /\bwindow\s*\.\s*top\b/, detail: 'window.top access is forbidden.' },
    { rule: 'no_parent_access', pattern: /(^|[^\w.])top\s*\./, detail: 'Bare top.* access is forbidden.' },
    { rule: 'no_parent_access', pattern: /(^|[^\w.])parent\s*\./, detail: 'Bare parent.* access is forbidden — use the ClubGame bridge.' },
    { rule: 'no_window_open', pattern: /\bwindow\s*\.\s*open\s*\(/, detail: 'window.open is forbidden — games stay inside the club.' },
    { rule: 'no_navigation', pattern: /\blocation\s*\.\s*(replace|assign)\s*\(/, detail: 'Programmatic navigation is forbidden.' },
    { rule: 'no_navigation', pattern: /\blocation\s*\.\s*href\s*=/, detail: 'Assigning location.href is forbidden.' },
    { rule: 'no_external_resources', pattern: /(src|href|action)\s*=\s*["']https?:\/\//i, detail: 'External resources are forbidden — the file must be fully self-contained (no CDN, no trackers, no beacons).' },
    { rule: 'no_external_resources', pattern: /<script[^>]+src\s*=/i, detail: 'External <script src> is forbidden — single self-contained file.' },
    { rule: 'no_external_resources', pattern: /url\s*\(\s*["']?https?:\/\//i, detail: 'External CSS url() references are forbidden.' },
];

/** Map every ClubGame.<method>( call in the code to its capability. */
function scanUsedCapabilities(html: string): { used: Set<string>; unknownMethods: string[] } {
    const used = new Set<string>();
    const unknownMethods: string[] = [];
    const re = /\bClubGame\s*\.\s*([A-Za-z]+)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
        const method = m[1];
        const capability = BRIDGE_METHOD_CAPABILITIES[method];
        if (capability) used.add(capability);
        else unknownMethods.push(method);
    }
    return { used, unknownMethods };
}

/**
 * Validate one generated game artifact against its brief and the MINI
 * constraints. Pure and deterministic — same input, same report.
 */
export function validateGameCode(html: string, brief: GameBrief): GameValidationReport {
    const violations: GameViolation[] = [];
    const sizeBytes = Buffer.byteLength(html, 'utf8');

    if (sizeBytes > MINIGAME_CONSTRAINTS.maxCodeBytes) {
        violations.push({
            rule: 'max_code_size',
            detail: `Game file is ${sizeBytes} bytes; the MINI limit is ${MINIGAME_CONSTRAINTS.maxCodeBytes} bytes (one self-contained file).`,
        });
    }
    if (html.trim().length === 0) {
        violations.push({ rule: 'empty_game', detail: 'The generated game is empty.' });
    }

    for (const { rule, pattern, detail } of FORBIDDEN) {
        if (pattern.test(html)) violations.push({ rule, detail });
    }

    const { used, unknownMethods } = scanUsedCapabilities(html);
    for (const method of unknownMethods) {
        violations.push({
            rule: 'unknown_bridge_method',
            detail: `ClubGame.${method}() does not exist. Available: ${Object.keys(BRIDGE_METHOD_CAPABILITIES).join(', ')}.`,
        });
    }
    const declared = new Set<string>(brief.capabilities);
    for (const capability of used) {
        if (!declared.has(capability)) {
            violations.push({
                rule: 'undeclared_capability',
                detail: `The code uses the "${capability}" capability but the brief does not declare it. Declare it in the brief (the creator must approve it) or remove the call.`,
            });
        }
    }
    // 'content.read' is generation-time only: it can never appear in code
    // (there is no ClubGame method for it), and declaring it is fine.

    return {
        ok: violations.length === 0,
        violations,
        usedCapabilities: [...used].sort(),
        sizeBytes,
    };
}
