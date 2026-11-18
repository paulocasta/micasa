"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseDateInput } from "@/lib/dates";
import { parseMoney } from "@/lib/money";
import { itemKey } from "@/lib/text";
import { type ActionResult, fail, num, ok, optInt, str } from "./action-result";
import { requireAuth } from "./session";

const itemSchema = z.object({
  name: z.string().min(1, "Ingresá el nombre del producto").max(120),
  brand: z.string().max(80),
  description: z.string().max(500),
  unit: z.string().min(1).max(30),
  minStock: z.number().min(0, "El mínimo no puede ser negativo"),
  categoryId: z.number().int().positive("Elegí una categoría"),
  subcategoryId: z.number().int().positive().nullable(),
});

function readItem(fd: FormData) {
  return itemSchema.safeParse({
    name: str(fd, "name"),
    brand: str(fd, "brand"),
    description: str(fd, "description"),
    unit: str(fd, "unit") || "unidad",
    minStock: num(fd, "minStock", 1),
    categoryId: optInt(fd, "categoryId") ?? 0,
    subcategoryId: optInt(fd, "subcategoryId"),
  });
}

function done(message: string) {
  revalidatePath("/", "layout");
  return ok(message);
}

/**
 * Registra una compra. Si el artículo (nombre + marca) ya existe, suma la cantidad;
 * si no, lo crea. El costo, si se indica, cuenta como gasto de Despensa.
 */
export async function addPurchase(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAuth();
  const quantity = num(fd, "quantity");
  if (quantity <= 0) return fail("La cantidad debe ser mayor a 0");
  const costText = str(fd, "cost");
  const cost = parseMoney(costText);
  if (costText && cost == null) return fail("Costo inválido");
  const date = str(fd, "date") ? parseDateInput(str(fd, "date")) : new Date();

  const itemId = optInt(fd, "itemId");
  let existing = itemId ? await db.pantryItem.findUnique({ where: { id: itemId } }) : null;

  if (!existing) {
    const parsed = readItem(fd);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const data = parsed.data;
    const key = itemKey(data.name, data.brand);
    existing = await db.pantryItem.findUnique({ where: { key } });
    if (!existing) {
      const item = await db.pantryItem.create({
        data: {
          ...data,
          description: data.description || null,
          key,
          quantity,
          movements: { create: { type: "IN", quantity, cost, date } },
        },
      });
      return done(`${item.name} agregado (${quantity} en stock)`);
    }
  }

  const updated = await db.pantryItem.update({
    where: { id: existing.id },
    data: {
      quantity: { increment: quantity },
      movements: { create: { type: "IN", quantity, cost, date } },
    },
  });
  return done(`${updated.name}: ahora hay ${updated.quantity} en stock`);
}

/** Ajuste rápido de stock (+/-). Las salidas no generan gasto. */
export async function adjustStock(itemId: number, delta: number): Promise<ActionResult> {
  await requireAuth();
  if (!delta) return fail("Cantidad inválida");
  const item = await db.pantryItem.findUnique({ where: { id: itemId } });
  if (!item) return fail("El artículo no existe");
  const change = delta < 0 ? -Math.min(item.quantity, -delta) : delta;
  if (change === 0) return fail("No hay stock para descontar");
  await db.pantryItem.update({
    where: { id: itemId },
    data: {
      quantity: { increment: change },
      movements: { create: { type: change > 0 ? "IN" : "OUT", quantity: Math.abs(change) } },
    },
  });
  return done(change > 0 ? "Stock aumentado" : "Stock descontado");
}

export async function consumeStock(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const itemId = optInt(fd, "itemId");
  const quantity = num(fd, "quantity");
  if (!itemId || quantity <= 0) return fail("Cantidad inválida");
  return adjustStock(itemId, -quantity);
}

export async function updateItem(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAuth();
  const id = optInt(fd, "itemId");
  if (!id) return fail("Artículo inválido");
  const parsed = readItem(fd);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;
  const key = itemKey(data.name, data.brand);
  const clash = await db.pantryItem.findUnique({ where: { key } });
  if (clash && clash.id !== id) return fail("Ya existe un artículo con ese nombre y marca");
  await db.pantryItem.update({
    where: { id },
    data: { ...data, description: data.description || null, key },
  });
  return done("Artículo actualizado");
}

export async function deleteItem(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.pantryItem.delete({ where: { id } });
  return done("Artículo eliminado");
}

export async function deleteMovement(id: number): Promise<ActionResult> {
  await requireAuth();
  const mv = await db.stockMovement.findUnique({ where: { id } });
  if (!mv) return fail("Movimiento inexistente");
  const delta = mv.type === "IN" ? -mv.quantity : mv.quantity;
  await db.$transaction([
    db.stockMovement.delete({ where: { id } }),
    db.pantryItem.update({ where: { id: mv.itemId }, data: { quantity: { increment: delta } } }),
  ]);
  // Evita stock negativo si ya se había consumido lo comprado.
  await db.pantryItem.updateMany({ where: { id: mv.itemId, quantity: { lt: 0 } }, data: { quantity: 0 } });
  return done("Movimiento eliminado");
}

export async function addSubcategory(categoryId: number, name: string): Promise<ActionResult> {
  await requireAuth();
  const clean = name.trim();
  if (!clean) return fail("Ingresá un nombre");
  const exists = await db.subcategory.findUnique({ where: { categoryId_name: { categoryId, name: clean } } });
  if (exists) return fail("Esa subcategoría ya existe");
  await db.subcategory.create({ data: { categoryId, name: clean } });
  return done("Subcategoría creada");
}

export async function deleteSubcategory(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.subcategory.delete({ where: { id } });
  return done("Subcategoría eliminada");
}
