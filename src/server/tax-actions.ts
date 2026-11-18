"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { localDate, parseDateInput, parsePeriod, periodOf } from "@/lib/dates";
import { parseMoney } from "@/lib/money";
import { type ActionResult, fail, ok, optInt, str } from "./action-result";
import { ensureRecurringEntries } from "./recurring";
import { requireAuth } from "./session";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function done(message: string) {
  revalidatePath("/", "layout");
  return ok(message);
}

function readMoney(fd: FormData, key: string) {
  const text = str(fd, key);
  const value = parseMoney(text);
  return { value, invalid: Boolean(text) && value == null };
}

function readPayment(fd: FormData) {
  const paidAt = str(fd, "paidAt");
  const paymentMethod = str(fd, "paymentMethod");
  const amount = readMoney(fd, "amount");
  if (!DATE_RE.test(paidAt)) return { error: "Indicá la fecha de pago" } as const;
  if (!paymentMethod) return { error: "Indicá el medio de pago" } as const;
  if (amount.invalid || amount.value == null) return { error: "Indicá el monto pagado" } as const;
  return { data: { paidAt: parseDateInput(paidAt), paymentMethod, amount: amount.value } } as const;
}

/** Alta de un impuesto suelto (no recurrente). */
export async function createTax(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAuth();
  const name = str(fd, "name");
  const period = str(fd, "period");
  if (!name) return fail("Ingresá el nombre del impuesto");
  if (!PERIOD_RE.test(period)) return fail("Elegí el mes correspondiente");
  const dueDate = str(fd, "dueDate");
  const notes = str(fd, "notes") || null;

  if (str(fd, "status") === "PAID") {
    const payment = readPayment(fd);
    if ("error" in payment) return fail(payment.error!);
    await db.tax.create({
      data: { name, period, notes, status: "PAID", dueDate: dueDate ? parseDateInput(dueDate) : null, ...payment.data },
    });
  } else {
    const amount = readMoney(fd, "amount");
    if (amount.invalid) return fail("Monto inválido");
    await db.tax.create({
      data: { name, period, notes, status: "PENDING", amount: amount.value, dueDate: dueDate ? parseDateInput(dueDate) : null },
    });
  }
  return done("Impuesto registrado");
}

export async function payTax(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAuth();
  const id = optInt(fd, "taxId");
  if (!id) return fail("Impuesto inválido");
  const payment = readPayment(fd);
  if ("error" in payment) return fail(payment.error!);
  await db.tax.update({ where: { id }, data: { status: "PAID", ...payment.data } });
  return done("Pago registrado");
}

export async function updateTax(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAuth();
  const id = optInt(fd, "taxId");
  if (!id) return fail("Impuesto inválido");
  const name = str(fd, "name");
  const period = str(fd, "period");
  if (!name) return fail("Ingresá el nombre del impuesto");
  if (!PERIOD_RE.test(period)) return fail("Elegí el mes correspondiente");
  const amount = readMoney(fd, "amount");
  if (amount.invalid) return fail("Monto inválido");
  const dueDate = str(fd, "dueDate");
  const paidAt = str(fd, "paidAt");
  const existing = await db.tax.findUnique({ where: { id } });
  if (!existing) return fail("Impuesto inexistente");
  if (existing.status === "PAID" && (!paidAt || amount.value == null)) {
    return fail("Un impuesto pagado necesita fecha de pago y monto");
  }
  await db.tax.update({
    where: { id },
    data: {
      name,
      period,
      amount: amount.value,
      dueDate: dueDate ? parseDateInput(dueDate) : null,
      paidAt: existing.status === "PAID" && paidAt ? parseDateInput(paidAt) : existing.paidAt,
      paymentMethod: existing.status === "PAID" ? str(fd, "paymentMethod") || existing.paymentMethod : null,
      notes: str(fd, "notes") || null,
    },
  });
  return done("Impuesto actualizado");
}

export async function markTaxPending(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.tax.update({ where: { id }, data: { status: "PENDING", paidAt: null, paymentMethod: null } });
  return done("Marcado como pendiente");
}

export async function deleteTax(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.tax.delete({ where: { id } });
  return done("Impuesto eliminado");
}

function readRecurring(fd: FormData) {
  const name = str(fd, "name");
  const mode = str(fd, "mode") === "AUTO_DEBIT" ? "AUTO_DEBIT" : "MANUAL";
  const dueDay = optInt(fd, "dueDay") ?? 10;
  const amount = readMoney(fd, "defaultAmount");
  if (!name) return { error: "Ingresá el nombre" } as const;
  if (dueDay < 1 || dueDay > 31) return { error: "El día debe estar entre 1 y 31" } as const;
  if (amount.invalid) return { error: "Monto inválido" } as const;
  if (mode === "AUTO_DEBIT" && amount.value == null) {
    return { error: "El débito automático necesita un monto mensual" } as const;
  }
  return {
    data: {
      name,
      mode,
      dueDay,
      defaultAmount: amount.value,
      paymentMethod: str(fd, "paymentMethod") || null,
    },
  } as const;
}

export async function createRecurring(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAuth();
  const parsed = readRecurring(fd);
  if ("error" in parsed) return fail(parsed.error!);
  const startPeriod = str(fd, "startPeriod") || periodOf(new Date());
  if (!PERIOD_RE.test(startPeriod)) return fail("Mes de inicio inválido");
  const rt = await db.recurringTax.create({ data: { ...parsed.data, startPeriod } });
  const created = await ensureRecurringEntries(db, new Date(), rt.id);
  return done(`${rt.name}: ${created} ${created === 1 ? "entrada generada" : "entradas generadas"}`);
}

/** Actualiza el recurrente y propaga nombre, monto y vencimiento a las entradas pendientes futuras. */
export async function updateRecurring(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAuth();
  const id = optInt(fd, "recurringId");
  if (!id) return fail("Recurrente inválido");
  const parsed = readRecurring(fd);
  if ("error" in parsed) return fail(parsed.error!);
  const active = fd.get("active") === "on";
  const rt = await db.recurringTax.update({ where: { id }, data: { ...parsed.data, active } });

  const pending = await db.tax.findMany({
    where: { recurringTaxId: id, status: "PENDING", period: { gte: periodOf(new Date()) } },
  });
  await db.$transaction(
    pending.map((t) => {
      const { year, month } = parsePeriod(t.period);
      return db.tax.update({
        where: { id: t.id },
        data: { name: rt.name, amount: rt.defaultAmount, dueDate: localDate(year, month, rt.dueDay) },
      });
    }),
  );
  if (active) await ensureRecurringEntries(db, new Date(), id);
  return done("Recurrente actualizado");
}

/** Elimina el recurrente. Las entradas pagadas se conservan; las pendientes futuras se borran. */
export async function deleteRecurring(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.$transaction([
    db.tax.deleteMany({ where: { recurringTaxId: id, status: "PENDING", period: { gte: periodOf(new Date()) } } }),
    db.recurringTax.delete({ where: { id } }),
  ]);
  return done("Recurrente eliminado");
}
