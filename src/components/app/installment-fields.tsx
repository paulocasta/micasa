"use client";

import { useId } from "react";
import { Field } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { nextPeriod, periodOf } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

/**
 * Checkbox "En cuotas" + cantidad y mes de la primera cuota.
 * El monto del formulario pasa a ser el valor de cada cuota (`perInstallment`, en centavos).
 */
export function InstallmentFields({
  enabled,
  onEnabledChange,
  count,
  onCountChange,
  perInstallment,
  defaultFirst,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  count: number;
  onCountChange: (v: number) => void;
  perInstallment: number | null;
  defaultFirst?: string;
}) {
  const id = useId();
  const valid = Number.isInteger(count) && count >= 2;
  return (
    <div className="grid gap-4 rounded-lg border p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="installments"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="size-4 accent-primary"
        />
        Pagado en cuotas
      </label>
      {enabled && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cantidad de cuotas" htmlFor={`${id}-count`}>
              <Input
                id={`${id}-count`}
                name="installmentCount"
                type="number"
                inputMode="numeric"
                min={2}
                max={60}
                required
                value={Number.isNaN(count) ? "" : count}
                onChange={(e) => onCountChange(e.target.valueAsNumber)}
              />
            </Field>
            <Field label="Primera cuota en" htmlFor={`${id}-first`} hint="Según el cierre de la tarjeta.">
              <Input
                id={`${id}-first`}
                name="firstInstallment"
                type="month"
                required
                defaultValue={defaultFirst || nextPeriod(periodOf(new Date()))}
              />
            </Field>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {valid && perInstallment != null ? (
              <>
                {count} cuotas de {formatMoney(perInstallment)} ={" "}
                <span className="font-semibold text-foreground tabular">{formatMoney(perInstallment * count)}</span>
              </>
            ) : (
              "Cada cuota suma al gasto del mes en que cae."
            )}
          </p>
        </>
      )}
    </div>
  );
}
