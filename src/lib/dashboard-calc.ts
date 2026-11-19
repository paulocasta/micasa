import { localParts } from "./dates";

export type Section = "despensa" | "impuestos" | "reparaciones" | "varios";
export const SERIES = [
  { key: "despensa", label: "Despensa", color: "var(--chart-1)", href: "/despensa" },
  { key: "impuestos", label: "Impuestos", color: "var(--chart-2)", href: "/impuestos" },
  { key: "reparaciones", label: "Reparaciones", color: "var(--chart-3)", href: "/reparaciones" },
  { key: "varios", label: "Gastos varios", color: "var(--chart-4)", href: "/gastos" },
] as const;

export type Expense = { section: Section; date: Date; amount: number };
export type Totals = Record<Section, number> & { total: number };

export const emptyTotals = (): Totals => ({ despensa: 0, impuestos: 0, reparaciones: 0, varios: 0, total: 0 });

export function sumTotals(expenses: Expense[]): Totals {
  const t = emptyTotals();
  for (const e of expenses) {
    t[e.section] += e.amount;
    t.total += e.amount;
  }
  return t;
}

/** Totales por mes (índice 0 = enero) de un año, en horario argentino. */
export function byMonth(expenses: Expense[], year: number): Totals[] {
  const months = Array.from({ length: 12 }, emptyTotals);
  for (const e of expenses) {
    const p = localParts(e.date);
    if (p.year !== year) continue;
    const t = months[p.month - 1];
    t[e.section] += e.amount;
    t.total += e.amount;
  }
  return months;
}
