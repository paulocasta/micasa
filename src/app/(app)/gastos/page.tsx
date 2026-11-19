import { ReceiptIcon, Trash2Icon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { UrlFilters } from "@/components/app/url-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate, localParts, toDateInput, yearRange } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { deleteExpense } from "@/server/expense-actions";
import { ExpenseDialog, type ExpenseView } from "./expense-dialog";

export const metadata: Metadata = { title: "Gastos varios" };

export default async function GastosPage({ searchParams }: PageProps<"/gastos">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const categoria = one("categoria") ?? "todas";
  const anio = one("anio") ?? String(localParts(new Date()).year);

  const range = anio !== "todos" ? yearRange(Number(anio)) : null;
  const [expenses, all] = await Promise.all([
    db.expense.findMany({
      where: {
        ...(categoria !== "todas" ? { category: categoria } : {}),
        ...(range ? { date: { gte: range.start, lt: range.end } } : {}),
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    db.expense.findMany({ select: { date: true } }),
  ]);

  const years = new Set([localParts(new Date()).year]);
  for (const e of all) years.add(localParts(e.date).year);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const toView = (e: (typeof expenses)[number]): ExpenseView => ({
    id: e.id,
    description: e.description,
    category: e.category,
    date: toDateInput(e.date),
    amount: e.amount,
    paymentMethod: e.paymentMethod ?? "",
    store: e.store ?? "",
    notes: e.notes ?? "",
    installmentNumber: e.installmentNumber,
    installmentCount: e.installmentCount,
  });

  return (
    <>
      <PageHeader
        title="Gastos varios"
        description="Farmacia, limpieza, ferretería y otras compras sueltas."
        actions={<ExpenseDialog />}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Suspense>
          <UrlFilters
            filters={[
              {
                name: "categoria",
                label: "Categoría",
                value: categoria,
                options: [
                  { value: "todas", label: "Todas" },
                  ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
                ],
              },
              {
                name: "anio",
                label: "Año",
                value: anio,
                options: [
                  { value: "todos", label: "Todos los años" },
                  ...[...years].sort((a, b) => b - a).map((y) => ({ value: String(y), label: String(y) })),
                ],
              },
            ]}
          />
        </Suspense>
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground tabular">{formatMoney(total)}</span>
          {expenses.length > 0 && ` · ${expenses.length} ${expenses.length === 1 ? "gasto" : "gastos"}`}
        </p>
      </div>

      {expenses.length === 0 ? (
        <EmptyState icon={<ReceiptIcon aria-hidden />} title="Sin gastos">
          Registrá remedios, artículos de limpieza o cualquier compra suelta.
        </EmptyState>
      ) : (
        <Card className="gap-0 divide-y py-0">
          {expenses.map((e) => {
            const meta = [formatDate(e.date), e.store, e.paymentMethod].filter(Boolean).join(" · ");
            return (
              <article key={e.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{e.description}</h2>
                    <Badge variant="secondary">{e.category}</Badge>
                    {e.installmentCount && (
                      <Badge variant="outline">
                        Cuota {e.installmentNumber}/{e.installmentCount}
                      </Badge>
                    )}
                  </div>
                  {e.notes && <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{e.notes}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
                </div>
                <p className="font-semibold tabular">{formatMoney(e.amount)}</p>
                <div className="flex items-center gap-1">
                  <ExpenseDialog expense={toView(e)} />
                  <ConfirmAction
                    title={`¿Eliminar "${e.description}"?`}
                    {...(e.installmentGroup
                      ? {
                          description: `Es la cuota ${e.installmentNumber} de ${e.installmentCount}.`,
                          confirmLabel: "Solo esta cuota",
                          altAction: deleteExpense.bind(null, e.id, true),
                          altLabel: "Todas las cuotas",
                        }
                      : {})}
                    action={deleteExpense.bind(null, e.id, false)}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Eliminar ${e.description}`}>
                        <Trash2Icon aria-hidden />
                      </Button>
                    }
                  />
                </div>
              </article>
            );
          })}
        </Card>
      )}
    </>
  );
}
