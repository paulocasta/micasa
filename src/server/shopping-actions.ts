"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { type ActionResult, fail, ok, optInt, str } from "./action-result";
import { requireAuth } from "./session";

function done(message: string) {
  revalidatePath("/", "layout");
  return ok(message);
}

export async function saveShoppingItem(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireAuth();
  const name = str(fd, "name");
  if (!name) return fail("Ingresá qué hay que comprar");
  const data = { name, notes: str(fd, "notes") || null };
  const id = optInt(fd, "itemId");
  if (id) {
    await db.shoppingItem.update({ where: { id }, data });
    return done("Compra actualizada");
  }
  await db.shoppingItem.create({ data });
  return done("Compra anotada");
}

export async function completeShoppingItem(id: number): Promise<ActionResult> {
  await requireAuth();
  const item = await db.shoppingItem.delete({ where: { id } });
  return done(`Comprado: ${item.name}`);
}

export async function deleteShoppingItem(id: number): Promise<ActionResult> {
  await requireAuth();
  await db.shoppingItem.delete({ where: { id } });
  return done("Compra eliminada");
}
