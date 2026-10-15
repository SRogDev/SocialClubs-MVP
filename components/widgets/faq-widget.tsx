"use client";

/**
 * FaqWidget — acordeón de preguntas y respuestas.
 * Una sola pregunta abierta a la vez; todo el control es por teclado.
 */

import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FaqWidgetConfig } from "@/lib/ai/widget-configs";
import { cn } from "@/lib/utils";

export default function FaqWidget({ config }: { config: FaqWidgetConfig }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base leading-snug">
          <MessageCircleQuestion size={18} className="text-primary shrink-0" />
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {config.items.map((item, i) => {
          const open = openIndex === i;
          return (
            <div
              key={i}
              className="rounded-lg border border-border/60 overflow-hidden"
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? null : i)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
              >
                <span className="text-sm font-medium">{item.q}</span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "shrink-0 text-muted-foreground transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>
              {open && (
                <p className="px-3 pb-3 text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
