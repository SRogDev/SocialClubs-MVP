"use client";

/**
 * Creator connections panel (Workstream C2): connect the club's
 * social/entertainment apps via platform-managed OAuth. The creator
 * only clicks "Conectar" and completes the provider's consent —
 * no API keys anywhere. Once connected, the club's AI staff, games
 * and widgets can use the app through the club bridge, with the
 * actions each artifact declares and the creator approves.
 */
import { useCallback, useEffect, useState } from "react";
import { Blocks, CheckCircle2, ExternalLink, Loader2, Unplug } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AppEntry {
    slug: string;
    name: string;
    blurb: string;
    category: string;
    connected: boolean;
    status: string | null;
}

export default function IntegrationsPanel({ clubId }: { clubId: string }) {
    const [configured, setConfigured] = useState<boolean | null>(null);
    const [apps, setApps] = useState<AppEntry[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await fetch(`/api/integrations/catalog?clubId=${clubId}`);
        if (!res.ok) {
            setError("No se pudo cargar el catálogo de aplicaciones.");
            return;
        }
        const data = (await res.json()) as { configured: boolean; apps: AppEntry[] };
        setConfigured(data.configured);
        setApps(data.apps);
    }, [clubId]);

    useEffect(() => {
        void load();
    }, [load]);

    async function connect(slug: string) {
        setBusy(slug);
        setError(null);
        const res = await fetch("/api/integrations/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clubId, toolkitSlug: slug }),
        });
        const data = (await res.json().catch(() => ({}))) as { redirectUrl?: string; error?: string };
        if (!res.ok || !data.redirectUrl) {
            setBusy(null);
            setError(data.error ?? "No se pudo iniciar la conexión.");
            return;
        }
        window.location.href = data.redirectUrl;
    }

    async function disconnect(slug: string) {
        setBusy(slug);
        setError(null);
        const res = await fetch(
            `/api/integrations/connect?clubId=${clubId}&toolkit=${encodeURIComponent(slug)}`,
            { method: "DELETE" },
        );
        setBusy(null);
        if (!res.ok) {
            setError("No se pudo desconectar la aplicación.");
            return;
        }
        await load();
    }

    if (configured === null) {
        return (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando aplicaciones…
            </p>
        );
    }

    if (!configured) {
        return (
            <Alert>
                <Blocks className="h-4 w-4" />
                <AlertTitle>Integraciones no configuradas</AlertTitle>
                <AlertDescription>
                    Esta instalación aún no tiene configurado el proveedor de integraciones
                    (COMPOSIO_API_KEY). Cuando esté activo, aquí podrás conectar las
                    aplicaciones de tu club.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Algo salió mal</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {apps.map((app) => (
                    <Card key={app.slug}>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between text-base">
                                {app.name}
                                {app.connected ? (
                                    <Badge variant="secondary" className="gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Conectada
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">Sin conectar</Badge>
                                )}
                            </CardTitle>
                            <CardDescription>{app.blurb}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {app.connected ? (
                                <Button
                                    variant="outline"
                                    className="min-h-11"
                                    disabled={busy === app.slug}
                                    onClick={() => void disconnect(app.slug)}
                                >
                                    <Unplug className="mr-2 h-4 w-4" /> Desconectar
                                </Button>
                            ) : (
                                <Button
                                    className="min-h-11 bg-violet-600 hover:bg-violet-700"
                                    disabled={busy === app.slug}
                                    onClick={() => void connect(app.slug)}
                                >
                                    {busy === app.slug ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                    )}
                                    Conectar
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            <p className="text-sm text-muted-foreground">
                Al conectar una aplicación, el personal IA, los minijuegos y los widgets de
                este club podrán usarla solo mediante las acciones que cada uno declare y
                que tú apruebes. Las escrituras (publicar, crear, enviar) siempre pasan por
                tu aprobación en el AI Inbox, salvo en flujos que hayas aprobado antes.
            </p>
        </div>
    );
}
