"use client";

/**
 * PollWidget — encuesta con opciones votables y barra de resultados.
 *
 * v1: los votos son optimistas y locales al dispositivo. Todavía no hay
 * backend de persistencia para votos de widgets tipados (la tabla `polls`
 * solo cubre el tipo de post `poll` heredado), así que el conteo se
 * reinicia al recargar. Se documenta en el README como limitación de v1.
 */

import { BarChart3 } from "lucide-react";
import { useState } from "react";

import ProgressAnimated from "@/components/progress-animated";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PollWidgetConfig } from "@/lib/ai/widget-configs";

export default function PollWidget({ config }: { config: PollWidgetConfig }) {
  const [extraVotes, setExtraVotes] = useState<number[]>(() =>
    config.options.map(() => 0),
  );
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  // Snapshot once (lazy initializer, not during render) so the component stays pure.
  const [now] = useState(() => Date.now());

  const hasVoted = votedIndex !== null;
  const total = extraVotes.reduce((a, b) => a + b, 0);
  const closed = config.closesAt
    ? new Date(config.closesAt).getTime() < now
    : false;
  const showResults = hasVoted || closed;

  const vote = (index: number) => {
    if (hasVoted || closed) return;
    setExtraVotes((prev) => prev.map((c, i) => (i === index ? c + 1 : c)));
    setVotedIndex(index);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base leading-snug">
          <BarChart3 size={18} className="text-primary shrink-0" />
          {config.question}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {config.options.map((option, i) => {
          const votes = extraVotes[i] ?? 0;
          const percentage = total === 0 ? 0 : (votes / total) * 100;
          if (!showResults) {
            return (
              <Button
                key={i}
                variant="outline"
                className="w-full justify-start h-auto p-3"
                onClick={() => vote(i)}
              >
                <span className="text-sm">{option}</span>
              </Button>
            );
          }
          return (
            <ProgressAnimated
              key={i}
              text={option}
              votes={votes}
              percentage={percentage}
            />
          );
        })}
        <p className="text-xs text-muted-foreground pt-1">
          {closed
            ? "Encuesta cerrada"
            : hasVoted
              ? "¡Gracias por votar!"
              : "Toca una opción para votar"}
          {total > 0 && ` · ${total} voto${total === 1 ? "" : "s"}`}
        </p>
      </CardContent>
    </Card>
  );
}
