import "server-only";
import { db } from "@/lib/db";
import type { Expense } from "@/lib/dashboard-calc";

/** Todos los gastos con fecha dentro de [start, end). */
export async function getExpenses(start: Date, end: Date): Promise<Expense[]> {
  const [purchases, taxes, repairs, misc] = await Promise.all([
    db.stockMovement.findMany({
      where: { type: "IN", cost: { not: null }, date: { gte: start, lt: end } },
      select: { date: true, cost: true },
    }),
    db.tax.findMany({
      where: { status: "PAID", amount: { not: null }, paidAt: { gte: start, lt: end } },
      select: { paidAt: true, amount: true },
    }),
    db.repair.findMany({
      where: { status: "DONE", cost: { not: null }, date: { gte: start, lt: end } },
      select: { date: true, cost: true },
    }),
    db.expense.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true, amount: true },
    }),
  ]);
  return [
    ...purchases.map((p) => ({ section: "despensa" as const, date: p.date, amount: p.cost! })),
    ...taxes.map((t) => ({ section: "impuestos" as const, date: t.paidAt!, amount: t.amount! })),
    ...repairs.map((r) => ({ section: "reparaciones" as const, date: r.date!, amount: r.cost! })),
    ...misc.map((m) => ({ section: "varios" as const, date: m.date, amount: m.amount })),
  ];
}

export async function getLowStock(take = 6) {
  return db.pantryItem.findMany({
    where: { quantity: { lte: db.pantryItem.fields.minStock } },
    orderBy: [{ quantity: "asc" }, { name: "asc" }],
    include: { category: true },
    take,
  });
}

export async function getLatestPaidTaxes(take = 5) {
  return db.tax.findMany({ where: { status: "PAID" }, orderBy: { paidAt: "desc" }, take });
}

export async function getUpcomingTaxes(take = 5) {
  return db.tax.findMany({
    where: { status: "PENDING" },
    orderBy: [{ dueDate: "asc" }, { period: "asc" }],
    take,
  });
}

export async function getLatestRepairs(take = 5) {
  return db.repair.findMany({ where: { status: "DONE" }, orderBy: { date: "desc" }, take });
}
