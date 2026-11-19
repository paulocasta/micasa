"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
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

function readExpense(fd: FormData) {
  const description = str(fd, "description");
  const categoryText = str(fd, "category");
  const category = EXPENSE_CATEGORIES.includes(categoryText as never) ? categoryText : "Otros";
  const date = str(fd, "date");
  const amount = parseMoney(str(fd, "amount"));
  if (!description) return { error: "Ingresá qué compraste" } as const;
  if (!date) return { error: "Indicá la fecha" } as const;
  if (amount == null) return { error: "Monto inválido" } as const;
  return {
    data: {
      description,
      category,
      date: parseDateInput(date),
      amount,
      paymentMethod: str(fd, "paymentMethod") || null,
      store: str(fd, "store") || null,
      notes: str(fd, "notes") || null,
    },
  } as const;
}

export async function saveExpense(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAuth();
  const parsed = readExpense(fd);
  if ("error" in parsed) return fail(parsed.error!);
  const id = optInt(fd, "expenseId");
  if (id) {
    // Editar una cuota cambia solo esa cuota.
    await db.expense.update({ where: { id }, data: parsed.data });
    return done("Gasto actualizado");
  }

  const plan = readInstallments(fd);
  if (plan && "error" in plan) return fail(plan.error);
  if (!plan) {
    await db.expense.create({ data: parsed.data });
    return done("Gasto registrado");
  }

  // En cuotas: `amount` es el valor de cada cuota; una fila por mes.
  const group = randomUUID();
  const dates = installmentDates(plan.firstPeriod, localParts(parsed.data.date).day, plan.count);
  await db.expense.createMany({
    data: dates.map((date, i) => ({
      ...parsed.data,
      date,
      installmentGroup: group,
      installmentNumber: i + 1,
      installmentCount: plan.count,
    })),
  });
  return done(`${plan.count} cuotas registradas`);
}

export async function deleteExpense(id: number, allInstallments = false): Promise<ActionResult> {
  await requireAuth();
  const expense = await db.expense.findUnique({ where: { id }, select: { installmentGroup: true } });
  if (!expense) return fail("El gasto ya no existe");
  if (allInstallments && expense.installmentGroup) {
    const { count } = await db.expense.deleteMany({ where: { installmentGroup: expense.installmentGroup } });
    return done(`${count} cuotas eliminadas`);
  }
  await db.expense.delete({ where: { id } });
  return done(expense.installmentGroup ? "Cuota eliminada" : "Gasto eliminado");
}
