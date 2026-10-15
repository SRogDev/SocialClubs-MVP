"use client";

/**
 * RsvpWidget — tarjeta de evento con confirmación de asistencia.
 *
 * El config trae una foto tipada del evento (título, fechas, zona horaria,
 * ubicación). El botón "Voy a asistir" intenta POST /api/events/[id]/rsvp;
 * si la API de eventos aún no está disponible, el widget degrada con
 * elegancia a modo informativo en lugar de romper el feed.
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Check, MapPin } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RsvpWidgetConfig } from "@/lib/ai/widget-configs";

type RsvpState = "idle" | "sending" | "confirmed" | "unavailable";

export default function RsvpWidget({ config }: { config: RsvpWidgetConfig }) {
  const [state, setState] = useState<RsvpState>("idle");

  const startsAt = new Date(config.startsAt);
  const dateLabel = format(startsAt, "EEEE d 'de' MMMM, HH:mm", { locale: es });

  const rsvp = async () => {
    if (state !== "idle") return;
    setState("sending");
    try {
      const res = await fetch(`/api/events/${config.eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "going" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("confirmed");
    } catch {
      // La API de eventos (fases 46-52) aún no está desplegada en esta base:
      // modo informativo en lugar de error.
      setState("unavailable");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base leading-snug">
          <CalendarDays size={18} className="text-primary shrink-0" />
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          <p className="font-medium capitalize">{dateLabel}</p>
          {config.location && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin size={14} className="shrink-0" />
              {config.location}
            </p>
          )}
        </div>

        {state === "confirmed" ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-primary rounded-lg bg-primary/10 px-3 py-2.5">
            <Check size={16} />
            ¡Listo! Nos vemos ahí.
          </p>
        ) : state === "unavailable" ? (
          <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 px-3 py-2.5">
            La confirmación en línea estará disponible muy pronto. Por ahora,
            comenta en el post si planeas asistir.
          </p>
        ) : (
          <Button
            className="w-full"
            onClick={rsvp}
            disabled={state === "sending"}
          >
            {state === "sending" ? "Confirmando…" : "Voy a asistir"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
