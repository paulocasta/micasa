import { ArrowLeftIcon, PackagePlusIcon, Trash2Icon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmAction } from "@/components/app/confirm-action";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { formatMoney, formatQuantity } from "@/lib/money";
import { deleteItem } from "@/server/pantry-actions";
import { PurchaseDialog } from "../purchase-dialog";
import { StockStepper } from "../stock-stepper";
import { ConsumeForm, EditItemForm, MovementDelete } from "./item-forms";

async function getItem(id: number) {
  if (!Number.isInteger(id)) return null;
  return db.pantryItem.findUnique({
    where: { id },
    include: { category: true, subcategory: true, movements: { orderBy: [{ date: "desc" }, { id: "desc" }], take: 50 } },
  });
}

export async function generateMetadata({ params }: PageProps<"/despensa/[id]">): Promise<Metadata> {
  const item = await getItem(Number((await params).id));
  return { title: item?.name ?? "Artículo" };
}

export default async function ItemPage({ params }: PageProps<"/despensa/[id]">) {
  const item = await getItem(Number((await params).id));
  if (!item) notFound();

  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    include: { subcategories: { orderBy: { name: "asc" } } },
  });
  const categoryOptions = categories.map(({ id, name, slug, subcategories }) => ({
    id,
    name,
    slug,
    subcategories: subcategories.map(({ id, name }) => ({ id, name })),
  }));
  const low = item.quantity <= item.minStock;
  const spent = item.movements.reduce((s, m) => s + (m.cost ?? 0), 0);

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/despensa">
          <ArrowLeftIcon aria-hidden /> Despensa
        </Link>
      </Button>
      <PageHeader
        title={item.brand ? `${item.name} · ${item.brand}` : item.name}
        description={[item.category.name, item.subcategory?.name].filter(Boolean).join(" · ")}
        actions={
          <>
            <PurchaseDialog
              categories={categoryOptions}
              items={[{ id: item.id, name: item.name, brand: item.brand, unit: item.unit, quantity: item.quantity }]}
              defaultItemId={item.id}
              trigger={
                <Button>
                  <PackagePlusIcon aria-hidden /> Registrar compra
                </Button>
              }
            />
            <ConfirmAction
              title={`¿Eliminar ${item.name}?`}
              description="Se borra el artículo y todo su historial, incluidos los gastos registrados."
              action={deleteItem.bind(null, item.id)}
              redirectTo="/despensa"
              trigger={
                <Button variant="destructive">
                  <Trash2Icon aria-hidden /> Eliminar
                </Button>
              }
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Stock</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between gap-2">
              <StockStepper itemId={item.id} name={item.name} quantity={item.quantity} unit={item.unit} low={low} />
              {low && (
                <Badge variant="outline" className="border-warning/40 bg-warning-soft text-warning">
                  Stock bajo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Mínimo: {formatQuantity(item.minStock)} {item.unit}
            </p>
            <ConsumeForm itemId={item.id} unit={item.unit} />
            {item.description && <p className="text-sm">{item.description}</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Editar artículo</CardTitle>
          </CardHeader>
          <CardContent>
            <EditItemForm
              categories={categoryOptions}
              item={{
                id: item.id,
                name: item.name,
                brand: item.brand,
                description: item.description ?? "",
                unit: item.unit,
                minStock: item.minStock,
                categoryId: item.categoryId,
                subcategoryId: item.subcategoryId,
              }}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Historial</CardTitle>
            {spent > 0 && (
              <span className="text-sm text-muted-foreground">
                Gastado (últimos movimientos): <span className="font-semibold text-foreground tabular">{formatMoney(spent)}</span>
              </span>
            )}
          </CardHeader>
          <CardContent>
            {item.movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin movimientos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3 font-medium">Fecha</th>
                      <th className="py-2 pr-3 font-medium">Movimiento</th>
                      <th className="py-2 pr-3 text-right font-medium">Cantidad</th>
                      <th className="py-2 pr-3 text-right font-medium">Costo</th>
                      <th className="py-2">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.movements.map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 tabular">{formatDate(m.date)}</td>
                        <td className="py-2 pr-3">
                          {m.type === "IN" ? (m.cost != null ? "Compra" : "Ingreso") : "Consumo"}
                        </td>
                        <td className="py-2 pr-3 text-right tabular">
                          {m.type === "IN" ? "+" : "−"}
                          {formatQuantity(m.quantity)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular">{m.cost != null ? formatMoney(m.cost) : "—"}</td>
                        <td className="py-1 text-right">
                          <MovementDelete id={m.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
