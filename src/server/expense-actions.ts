"use server";

import { revalidatePath } from "next/cache";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { db } from "@/lib/db";
import { parseDateInput } from "@/lib/dates";
import { parseMoney } from "@/lib/money";
import { type ActionResult, fail, ok, optInt, str } from "./action-result";
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
    await db.expense.update({ where: { id }, data: parsed.data });
    return done("Gasto actualizado");
  }
  await db.expense.create({ data: parsed.data });
  return done("Gasto registrado");
}

export async function deleteExpense(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.expense.delete({ where: { id } });
  return done("Gasto eliminado");
}
