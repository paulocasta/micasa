import type { PrismaClient } from "@/generated/prisma/client";

export const CATEGORIES: { name: string; slug: string; subs: string[] }[] = [
  { name: "Alimentos", slug: "alimentos", subs: ["Carne", "Pollo", "Pescado", "Cerdo", "Fiambres", "Congelados"] },
  { name: "Bebidas", slug: "bebidas", subs: ["Con alcohol", "Sin alcohol"] },
  { name: "Lácteos", slug: "lacteos", subs: [] },
  { name: "Limpieza", slug: "limpieza", subs: ["Accesorios", "Baño", "Cocina", "Jardín"] },
  { name: "Panificados", slug: "panificados", subs: [] },
  { name: "Mascota", slug: "mascota", subs: ["Accesorios", "Alimento"] },
  { name: "Frutas y Verduras", slug: "frutas-y-verduras", subs: [] },
  { name: "Almacén", slug: "almacen", subs: [] },
];

/** Crea las categorías iniciales si la base está vacía. */
export async function seedCategories(db: PrismaClient) {
  if ((await db.category.count()) > 0) return false;
  for (const [order, c] of CATEGORIES.entries()) {
    await db.category.create({
      data: { name: c.name, slug: c.slug, order, subcategories: { create: c.subs.map((name) => ({ name })) } },
    });
  }
  return true;
}
