import { AUTO_DEBIT_METHOD } from "./constants";
import { localDate, nextPeriod, parsePeriod, periodOf, periodsBetween } from "./dates";

export type RecurringInput = {
  id: number;
  name: string;
  mode: "MANUAL" | "AUTO_DEBIT";
  defaultAmount: number | null;
  paymentMethod: string | null;
  dueDay: number;
  startPeriod: string;
  generatedThrough: string | null;
  active: boolean;
};

export type PlannedTax = {
  name: string;
  period: string;
  status: "PENDING" | "PAID";
  dueDate: Date;
  paidAt: Date | null;
  paymentMethod: string | null;
  amount: number | null;
  recurringTaxId: number;
};

/**
 * Calcula qué entradas faltan generar para un impuesto recurrente.
 * - MANUAL: genera hasta diciembre del año en curso, como pendientes.
 * - AUTO_DEBIT: genera hasta el mes en curso, como pagadas.
 * Nunca regenera períodos <= generatedThrough (si el usuario borró una entrada, no vuelve).
 */
export function planRecurring(rt: RecurringInput, now: Date) {
  if (!rt.active) return { entries: [] as PlannedTax[], generatedThrough: rt.generatedThrough };

  const current = periodOf(now);
  const target = rt.mode === "MANUAL" ? `${current.slice(0, 4)}-12` : current;
  const from = rt.generatedThrough ? nextPeriod(rt.generatedThrough) : rt.startPeriod;
  if (from > target) return { entries: [] as PlannedTax[], generatedThrough: rt.generatedThrough };

  const entries = periodsBetween(from, target).map((period): PlannedTax => {
    const { year, month } = parsePeriod(period);
    const date = localDate(year, month, rt.dueDay);
    const auto = rt.mode === "AUTO_DEBIT";
    return {
      name: rt.name,
      period,
      status: auto ? "PAID" : "PENDING",
      dueDate: date,
      paidAt: auto ? date : null,
      paymentMethod: auto ? rt.paymentMethod || AUTO_DEBIT_METHOD : null,
      amount: rt.defaultAmount,
      recurringTaxId: rt.id,
    };
  });
  return { entries, generatedThrough: target };
}
