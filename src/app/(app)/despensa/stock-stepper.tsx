"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { runAction } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { formatQuantity } from "@/lib/money";
import { cn } from "@/lib/utils";
import { adjustStock } from "@/server/pantry-actions";

export function StockStepper({
  itemId,
  name,
  quantity,
  unit,
  low,
}: {
  itemId: number;
  name: string;
  quantity: number;
  unit: string;
  low: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(quantity);
  const [pending, start] = useTransition();
  const change = (delta: number) =>
    start(async () => {
      setOptimistic(Math.max(0, optimistic + delta));
      await runAction(adjustStock(itemId, delta));
    });

  return (
    <div className="flex items-center gap-1" aria-busy={pending}>
      <Button
        variant="outline"
        size="icon"
        aria-label={`Usar 1 ${name}`}
        disabled={optimistic <= 0}
        onClick={() => change(-1)}
      >
        <MinusIcon aria-hidden />
      </Button>
      <div className="min-w-16 text-center" aria-live="polite">
        <span className={cn("text-lg font-semibold tabular", low && "text-warning")}>{formatQuantity(optimistic)}</span>
        <span className="block text-xs text-muted-foreground">{unit}</span>
      </div>
      <Button variant="outline" size="icon" aria-label={`Sumar 1 ${name}`} onClick={() => change(1)}>
        <PlusIcon aria-hidden />
      </Button>
    </div>
  );
}
