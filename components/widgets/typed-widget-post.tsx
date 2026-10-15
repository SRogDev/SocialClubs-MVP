"use client";

/**
 * TypedWidgetPost — renderiza un post `type: 'widget'` del runtime tipado.
 *
 * Lee `post.content = { widget: <tipo>, config: {...} }` y despacha al
 * componente registrado en WIDGET_TYPES. SOLO los 5 tipos registrados
 * pueden renderizarse: no hay codegen ni eval de ningún tipo.
 *
 * - Tipo desconocido o config inválida → tarjeta de fallback (nunca crashea).
 * - La config se revalida con zod defensivamente antes de renderizar,
 *   porque el contenido viene de la base de datos (no se confía en él).
 */

import { Puzzle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  validateWidgetConfig,
  WIDGET_TYPES,
  type CountdownWidgetConfig,
  type FaqWidgetConfig,
  type LeaderboardWidgetConfig,
  type PollWidgetConfig,
  type RsvpWidgetConfig,
  type WidgetTypeName,
} from "@/lib/ai/widget-configs";

import CountdownWidget from "./countdown-widget";
import FaqWidget from "./faq-widget";
import LeaderboardWidget from "./leaderboard-widget";
import PollWidget from "./poll-widget";
import RsvpWidget from "./rsvp-widget";

interface TypedWidgetPostProps {
  /** Raw `content` column of a `type: 'widget'` post. */
  content: unknown;
  /** Needed by LeaderboardWidget to fetch points. */
  clubId?: string;
}

function WidgetFallback({ reason }: { reason: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Puzzle size={20} className="text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium">Widget no disponible</p>
          <p className="text-xs text-muted-foreground">{reason}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TypedWidgetPost({ content, clubId }: TypedWidgetPostProps) {
  const raw = (content ?? {}) as { widget?: unknown; config?: unknown };
  const widgetType = typeof raw.widget === "string" ? raw.widget : null;

  const entry = widgetType
    ? (WIDGET_TYPES as Record<string, (typeof WIDGET_TYPES)[WidgetTypeName] | undefined>)[widgetType]
    : undefined;

  if (!widgetType || !entry) {
    return (
      <WidgetFallback reason="Este widget ya no está soportado en esta versión." />
    );
  }

  let config: Record<string, unknown>;
  try {
    // Revalidación defensiva: el contenido viene de la BD.
    config = validateWidgetConfig(widgetType, raw.config);
  } catch {
    return (
      <WidgetFallback reason="La configuración de este widget es inválida." />
    );
  }

  // Despacho explícito por tipo registrado. Los `as` son seguros: la config
  // acaba de pasar el schema zod del tipo correspondiente.
  switch (widgetType as WidgetTypeName) {
    case "poll":
      return <PollWidget config={config as PollWidgetConfig} />;
    case "countdown":
      return <CountdownWidget config={config as CountdownWidgetConfig} />;
    case "leaderboard":
      return (
        <LeaderboardWidget
          config={config as LeaderboardWidgetConfig}
          clubId={clubId}
        />
      );
    case "faq":
      return <FaqWidget config={config as FaqWidgetConfig} />;
    case "rsvp":
      return <RsvpWidget config={config as RsvpWidgetConfig} />;
    default:
      return (
        <WidgetFallback reason="Este widget ya no está soportado en esta versión." />
      );
  }
}
