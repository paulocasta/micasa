"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { installmentDates, localParts, parseDateInput } from "@/lib/dates";
import { parseMoney } from "@/lib/money";
import { type ActionResult, fail, ok, optInt, str } from "./action-result";
import { readInstallments } from "./installments";
import { requireAuth } from "./session";

function done(message: string) {
  revalidatePath("/", "layout");
  return ok(message);
}

function readRepair(fd: FormData) {
  const title = str(fd, "title");
  const status = str(fd, "status") === "DONE" ? "DONE" : "PENDING";
  const date = str(fd, "date");
  const costText = str(fd, "cost");
  const estText = str(fd, "estimatedCost");
  const cost = parseMoney(costText);
  const estimatedCost = parseMoney(estText);
  if (!title) return { error: "Ingresá un título" } as const;
  if ((costText && cost == null) || (estText && estimatedCost == null)) return { error: "Monto inválido" } as const;
  if (status === "DONE" && !date) return { error: "Indicá la fecha en que se hizo" } as const;
  if (status === "DONE" && cost == null) return { error: "Indicá cuánto costó" } as const;
  // En cuotas (solo hechas): `cost` del formulario es el valor de cada cuota.
  const plan = status === "DONE" ? readInstallments(fd) : null;
  if (plan && "error" in plan) return { error: plan.error } as const;
  const parsedDate = date ? parseDateInput(date) : null;
  const installments =
    plan && parsedDate && cost != null
      ? installmentDates(plan.firstPeriod, localParts(parsedDate).day, plan.count).map((d, i) => ({
          number: i + 1,
          date: d,
          amount: cost,
        }))
      : [];
  return {
    data: {
      title,
      status,
      description: str(fd, "description") || null,
      date: parsedDate,
      cost: plan && cost != null ? cost * plan.count : cost,
      estimatedCost,
    },
    installments,
  } as const;
}

export async function saveRepair(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAuth();
  const parsed = readRepair(fd);
  if ("error" in parsed) return fail(parsed.error!);
  const id = optInt(fd, "repairId");
  const { installments } = parsed;
  if (id) {
    await db.$transaction([
      db.repairInstallment.deleteMany({ where: { repairId: id } }),
      db.repair.update({ where: { id }, data: { ...parsed.data, installments: { create: installments } } }),
    ]);
    return done("Reparación actualizada");
  }
  await db.repair.create({ data: { ...parsed.data, installments: { create: installments } } });
  return done(installments.length ? `Reparación registrada en ${installments.length} cuotas` : "Reparación registrada");
}

export async function deleteRepair(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.repair.delete({ where: { id } });
  return done("Reparación eliminada");
}
