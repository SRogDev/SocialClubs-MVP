'use client';

/**
 * GamePlayer — host for a sandboxed minigame.
 *
 * Renders the session-bound playable document in an iframe with
 * sandbox="allow-scripts" (deliberately NO allow-same-origin: the game
 * runs on an opaque origin and can only talk back through the bridge).
 * The message listener accepts ONLY bridge requests coming from this
 * iframe's window, for this session; each is forwarded to
 * POST /api/games/[id]/bridge and the result is posted back as a bridge
 * response envelope.
 */
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    bridgeErrorResponse,
    bridgeOkResponse,
    isBridgeRequest,
} from '@/lib/games/bridge';

interface GamePlayerProps {
    gameId: string;
    sessionId: string;
    html: string;
    title: string;
}

export function GamePlayer({ gameId, sessionId, html, title }: GamePlayerProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [mountKey, setMountKey] = useState(0);

    useEffect(() => {
        async function onMessage(event: MessageEvent) {
            const iframe = iframeRef.current;
            if (!iframe?.contentWindow) return;
            if (event.source !== iframe.contentWindow) return;
            if (!isBridgeRequest(event.data)) return;
            const req = event.data;
            if (req.sessionId !== sessionId) return;

            try {
                const res = await fetch(`/api/games/${gameId}/bridge`, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: req.sessionId,
                        method: req.method,
                        params: req.params ?? {},
                    }),
                });
                const result = (await res.json()) as
                    | { ok: true; result: unknown }
                    | { ok: false; code: string; message: string };
                const response = result.ok
                    ? bridgeOkResponse(req, result.result)
                    : bridgeErrorResponse(req, result.code, result.message);
                iframe.contentWindow?.postMessage(response, '*');
            } catch {
                iframe.contentWindow?.postMessage(
                    bridgeErrorResponse(req, 'BRIDGE_UNREACHABLE', 'No se pudo contactar al club.'),
                    '*',
                );
            }
        }

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [gameId, sessionId]);

    return (
        <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex min-h-11 items-center justify-between gap-2 border-b px-3 py-1.5">
                <p className="truncate text-sm font-medium">{title}</p>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 shrink-0 focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                    onClick={() => setMountKey((k) => k + 1)}
                >
                    <RotateCcw size={16} className="mr-1" aria-hidden />
                    Reiniciar
                </Button>
            </div>
            <iframe
                key={mountKey}
                ref={iframeRef}
                sandbox="allow-scripts"
                srcDoc={html}
                title={title}
                className="block min-h-[420px] w-full border-0"
            />
        </div>
    );
}
