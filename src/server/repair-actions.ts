"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseDateInput } from "@/lib/dates";
import { parseMoney } from "@/lib/money";
import { type ActionResult, fail, ok, optInt, str } from "./action-result";
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
  return {
    data: {
      title,
      status,
      description: str(fd, "description") || null,
      date: date ? parseDateInput(date) : null,
      cost,
      estimatedCost,
    },
  } as const;
}

export async function saveRepair(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAuth();
  const parsed = readRepair(fd);
  if ("error" in parsed) return fail(parsed.error!);
  const id = optInt(fd, "repairId");
  if (id) {
    await db.repair.update({ where: { id }, data: parsed.data });
    return done("Reparación actualizada");
  }
  await db.repair.create({ data: parsed.data });
  return done("Reparación registrada");
}

export async function deleteRepair(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.repair.delete({ where: { id } });
  return done("Reparación eliminada");
}
