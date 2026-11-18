import type { PrismaClient } from "@/generated/prisma/client";
import { planRecurring } from "@/lib/recurring-plan";

/** Genera las entradas faltantes de impuestos recurrentes. Idempotente. */
export async function ensureRecurringEntries(db: PrismaClient, now = new Date(), onlyId?: number) {
  const recurring = await db.recurringTax.findMany({
    where: { active: true, ...(onlyId ? { id: onlyId } : {}) },
  });
  let created = 0;
  for (const rt of recurring) {
    const { entries, generatedThrough } = planRecurring(rt, now);
    if (!entries.length) continue;
    await db.$transaction([
      ...entries.map((e) =>
        db.tax.upsert({
          where: { recurringTaxId_period: { recurringTaxId: rt.id, period: e.period } },
          update: {},
          create: e,
        }),
      ),
      db.recurringTax.update({ where: { id: rt.id }, data: { generatedThrough } }),
    ]);
    created += entries.length;
  }
  return created;
}
