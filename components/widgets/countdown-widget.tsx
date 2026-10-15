"use client";

/**
 * CountdownWidget — cuenta regresiva en vivo hasta una fecha y hora.
 * Etiquetas en español; al llegar a cero muestra el estado "finalizado".
 */

import { PartyPopper, Timer } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CountdownWidgetConfig } from "@/lib/ai/widget-configs";

function partsOf(diffMs: number) {
  return [
    { value: Math.floor(diffMs / 86_400_000), label: "días" },
    { value: Math.floor((diffMs % 86_400_000) / 3_600_000), label: "hrs" },
    { value: Math.floor((diffMs % 3_600_000) / 60_000), label: "min" },
    { value: Math.floor((diffMs % 60_000) / 1_000), label: "seg" },
  ];
}

export default function CountdownWidget({
  config,
}: {
  config: CountdownWidgetConfig;
}) {
  // `now` lives in state (not read during render) so the component stays pure.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, new Date(config.targetAt).getTime() - now);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base leading-snug">
          <Timer size={18} className="text-primary shrink-0" />
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {diff === 0 ? (
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-primary py-3">
            <PartyPopper size={18} />
            ¡Llegó el momento!
          </p>
        ) : (
          <div className="flex justify-center gap-4 py-2" role="timer">
            {partsOf(diff).map(({ value, label }) => (
              <div key={label} className="text-center">
                <span className="text-2xl font-mono font-bold tabular-nums">
                  {String(value).padStart(2, "0")}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
        {config.description && (
          <p className="text-sm text-muted-foreground text-center mt-1">
            {config.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
