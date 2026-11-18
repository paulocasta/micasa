import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const { db } = await import("@/lib/db");
const { addPurchase, adjustStock } = await import("@/server/pantry-actions");
const { createRecurring } = await import("@/server/tax-actions");
const { ensureRecurringEntries } = await import("@/server/recurring");
const { getExpenses } = await import("@/server/dashboard");
const { saveShoppingItem, completeShoppingItem } = await import("@/server/shopping-actions");
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
