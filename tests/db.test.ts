import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const { db } = await import("@/lib/db");
const { addPurchase, adjustStock } = await import("@/server/pantry-actions");
const { createRecurring } = await import("@/server/tax-actions");
const { ensureRecurringEntries } = await import("@/server/recurring");
const { getExpenses } = await import("@/server/dashboard");
const { saveShoppingItem, completeShoppingItem } = await import("@/server/shopping-actions");
const { saveExpense, deleteExpense } = await import("@/server/expense-actions");
const { saveRepair } = await import("@/server/repair-actions");
const { localDate, monthRange } = await import("@/lib/dates");

function form(data: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
}

beforeEach(async () => {
  await db.stockMovement.deleteMany();
  await db.pantryItem.deleteMany();
  await db.tax.deleteMany();
  await db.recurringTax.deleteMany();
  await db.category.deleteMany();
  await db.shoppingItem.deleteMany();
  await db.expense.deleteMany();
  await db.repair.deleteMany();
});

describe("despensa", () => {
  it("sumar a un artículo existente: 1 + 4 = 5", async () => {
    const cat = await db.category.create({ data: { name: "Almacén", slug: "almacen" } });
    const base = { name: "Yerba mate", brand: "Playadito", categoryId: String(cat.id), date: "2026-10-04" };

    expect(await addPurchase(null, form({ ...base, quantity: "1", cost: "3.500" }))).toMatchObject({ ok: true });
    const res = await addPurchase(null, form({ ...base, name: "yerba MATE", quantity: "4", cost: "14000" }));
    expect(res).toMatchObject({ ok: true });

    const items = await db.pantryItem.findMany();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);

    const { start, end } = monthRange(2026, 10);
    const spent = (await getExpenses(start, end)).reduce((s, e) => s + e.amount, 0);
    expect(spent).toBe(1750000);

    await adjustStock(items[0].id, -10);
    expect((await db.pantryItem.findUniqueOrThrow({ where: { id: items[0].id } })).quantity).toBe(0);
  });
});

describe("impuestos recurrentes", () => {
  it("crear recurrente manual genera hasta diciembre y es idempotente", async () => {
    await createRecurring(null, form({ name: "Luz EPE", mode: "MANUAL", dueDay: "15", startPeriod: "2026-10" }));
    const taxes = await db.tax.findMany({ orderBy: { period: "asc" } });
    expect(taxes.map((t) => t.period)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(taxes.every((t) => t.status === "PENDING")).toBe(true);

    expect(await ensureRecurringEntries(db, localDate(2026, 10, 20))).toBe(0);
    expect(await db.tax.count()).toBe(3);

    // un pendiente borrado no vuelve
    await db.tax.delete({ where: { id: taxes[1].id } });
    await ensureRecurringEntries(db, localDate(2026, 12, 1));
    expect(await db.tax.count()).toBe(2);

    // año nuevo
    expect(await ensureRecurringEntries(db, localDate(2027, 1, 1))).toBe(12);
  });

  it("débito automático crea el mes como pagado", async () => {
    await createRecurring(
      null,
      form({ name: "Internet", mode: "AUTO_DEBIT", defaultAmount: "25000", dueDay: "5", startPeriod: "2026-10" }),
    );
    const taxes = await db.tax.findMany();
    expect(taxes).toHaveLength(1);
    expect(taxes[0]).toMatchObject({ status: "PAID", amount: 2500000, paymentMethod: "Débito automático" });
  });
});

describe("compras", () => {
  it("anotar y marcar comprado borra la entrada", async () => {
    expect(await saveShoppingItem(null, form({ name: "  " }))).toMatchObject({ ok: false });
    expect(await saveShoppingItem(null, form({ name: "Olla Essen", notes: "" }))).toMatchObject({ ok: true });
    const [item] = await db.shoppingItem.findMany();
    expect(item).toMatchObject({ name: "Olla Essen", notes: null });

    expect(await completeShoppingItem(item.id)).toMatchObject({ ok: true, message: "Comprado: Olla Essen" });
    expect(await db.shoppingItem.count()).toBe(0);
  });
});

describe("cuotas", () => {
  it("gasto en 6 cuotas crea una fila por mes y se puede borrar entero", async () => {
    const res = await saveExpense(
      null,
      form({
        description: "TV 50",
        category: "Hogar",
        date: "2027-01-20",
        amount: "50.000",
        installments: "on",
        installmentCount: "6",
        firstInstallment: "2027-02",
      }),
    );
    expect(res).toMatchObject({ ok: true, message: "6 cuotas registradas" });
    const rows = await db.expense.findMany({ orderBy: { date: "asc" } });
    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.amount === 5000000 && r.installmentCount === 6)).toBe(true);
    expect(rows.map((r) => r.installmentNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(rows.map((r) => r.installmentGroup)).size).toBe(1);

    const feb = monthRange(2027, 2);
    const janExpenses = await getExpenses(monthRange(2027, 1).start, monthRange(2027, 1).end);
    expect(janExpenses.filter((e) => e.section === "varios")).toHaveLength(0);
    expect(await getExpenses(feb.start, feb.end)).toMatchObject([{ section: "varios", amount: 5000000 }]);

    expect(await deleteExpense(rows[1].id)).toMatchObject({ ok: true, message: "Cuota eliminada" });
    expect(await db.expense.count()).toBe(5);
    expect(await deleteExpense(rows[0].id, true)).toMatchObject({ ok: true, message: "5 cuotas eliminadas" });
    expect(await db.expense.count()).toBe(0);
  });

  it("valida cantidad de cuotas", async () => {
    const res = await saveExpense(
      null,
      form({ description: "TV", date: "2027-01-20", amount: "1000", installments: "on", installmentCount: "1", firstInstallment: "2027-02" }),
    );
    expect(res).toMatchObject({ ok: false });
    expect(await db.expense.count()).toBe(0);
  });

  it("reparación en cuotas suma cada cuota en su mes", async () => {
    const base = {
      title: "Termotanque",
      status: "DONE",
      date: "2027-03-15",
      cost: "100000",
      installments: "on",
      installmentCount: "3",
      firstInstallment: "2027-04",
    };
    expect(await saveRepair(null, form(base))).toMatchObject({ ok: true });
    const repair = await db.repair.findFirstOrThrow({ include: { installments: true } });
    expect(repair.cost).toBe(30000000);
    expect(repair.installments).toHaveLength(3);

    const mar = monthRange(2027, 3);
    const may = monthRange(2027, 5);
    expect(await getExpenses(mar.start, mar.end)).toHaveLength(0);
    expect(await getExpenses(may.start, may.end)).toMatchObject([{ section: "reparaciones", amount: 10000000 }]);

    // sin cuotas vuelve a contar el total en la fecha del arreglo
    const single = { ...base, installments: "", repairId: String(repair.id) };
    expect(await saveRepair(null, form(single))).toMatchObject({ ok: true });
    expect(await db.repairInstallment.count()).toBe(0);
    expect(await getExpenses(mar.start, mar.end)).toMatchObject([{ section: "reparaciones", amount: 10000000 }]);
  });
});
