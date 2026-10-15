"use client";

/**
 * LeaderboardWidget — top de miembros por puntos de gamificación.
 *
 * Obtiene los datos de GET /api/clubs/[id]/leaderboard (que reutiliza el
 * getClubLeaderboard existente). Estados de carga, vacío y error incluidos;
 * el widget nunca rompe el feed si la API falla.
 */

import { Medal, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaderboardWidgetConfig } from "@/lib/ai/widget-configs";
import type { LeaderboardEntry } from "@/types/gamification";

const RANK_STYLE: Record<number, string> = {
  1: "text-amber-500",
  2: "text-slate-400",
  3: "text-amber-700",
};

export default function LeaderboardWidget({
  config,
  clubId,
}: {
  config: LeaderboardWidgetConfig;
  clubId?: string;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    fetch(`/api/clubs/${clubId}/leaderboard?limit=${config.limit}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ data: LeaderboardEntry[] }>;
      })
      .then((json) => {
        if (!cancelled) setEntries(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, config.limit]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base leading-snug">
          <Trophy size={18} className="text-primary shrink-0" />
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!clubId || failed ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No se pudo cargar la clasificación.
          </p>
        ) : entries === null ? (
          <div className="space-y-2 py-1" aria-label="Cargando clasificación">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-11 rounded-lg bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Todavía no hay puntos registrados. ¡Sé la primera persona en ganar
            puntos!
          </p>
        ) : (
          <ol className="space-y-1">
            {entries.map((entry) => (
              <li
                key={entry.userId}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors"
              >
                <span
                  className={`w-6 text-center font-bold tabular-nums ${RANK_STYLE[entry.rank] ?? "text-muted-foreground"}`}
                >
                  {entry.rank <= 3 ? (
                    <Medal size={18} className="inline" />
                  ) : (
                    entry.rank
                  )}
                </span>
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={entry.avatarUrl ?? undefined}
                    alt={entry.username}
                  />
                  <AvatarFallback>
                    {entry.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium truncate">
                  {entry.username}
                </span>
                <span className="text-sm font-bold tabular-nums text-primary">
                  {entry.points} pts
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
