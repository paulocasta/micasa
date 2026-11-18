import { Trash2Icon, WrenchIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { UrlFilters } from "@/components/app/url-filters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate, localParts, toDateInput, yearRange } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { deleteRepair } from "@/server/repair-actions";
import { RepairDialog, type RepairView } from "./repair-dialog";

export const metadata: Metadata = { title: "Reparaciones" };

export default async function ReparacionesPage({ searchParams }: PageProps<"/reparaciones">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const estado = one("estado") ?? "todas";
  const anio = one("anio") ?? "todos";

  const range = anio !== "todos" ? yearRange(Number(anio)) : null;
  const [repairs, all] = await Promise.all([
    db.repair.findMany({
      where: {
        ...(estado === "hechas" ? { status: "DONE" } : estado === "pendientes" ? { status: "PENDING" } : {}),
        ...(range ? { date: { gte: range.start, lt: range.end } } : {}),
      },
      orderBy: [{ status: "asc" }, { date: "desc" }, { createdAt: "desc" }],
    }),
    db.repair.findMany({ select: { date: true } }),
  ]);

  const years = new Set([localParts(new Date()).year]);
  for (const r of all) if (r.date) years.add(localParts(r.date).year);
  const doneTotal = repairs.filter((r) => r.status === "DONE").reduce((s, r) => s + (r.cost ?? 0), 0);
  const pendingCount = repairs.filter((r) => r.status === "PENDING").length;

  const toView = (r: (typeof repairs)[number]): RepairView => ({
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    status: r.status,
    date: r.date ? toDateInput(r.date) : "",
    cost: r.cost,
    estimatedCost: r.estimatedCost,
  });

  return (
    <>
      <PageHeader
        title="Reparaciones"
        description="Arreglos hechos en la casa y los que quedan por hacer."
        actions={<RepairDialog />}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Suspense>
          <UrlFilters
            filters={[
              {
                name: "estado",
                label: "Estado",
                value: estado,
                options: [
                  { value: "todas", label: "Todas" },
                  { value: "pendientes", label: "Por hacer" },
                  { value: "hechas", label: "Hechas" },
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
          Gastado: <span className="font-semibold text-foreground tabular">{formatMoney(doneTotal)}</span>
          {pendingCount > 0 && ` · ${pendingCount} por hacer`}
        </p>
      </div>

      {repairs.length === 0 ? (
        <EmptyState icon={<WrenchIcon aria-hidden />} title="Sin reparaciones">
          Registrá arreglos hechos o anotá los que hay que hacer.
        </EmptyState>
      ) : (
        <Card className="gap-0 divide-y py-0">
          {repairs.map((r) => {
            const view = toView(r);
            return (
              <article key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{r.title}</h2>
                    {r.status === "DONE" ? (
                      <StatusBadge kind="done">Hecha</StatusBadge>
                    ) : (
                      <StatusBadge kind="pending">Por hacer</StatusBadge>
                    )}
                  </div>
                  {r.description && <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{r.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.status === "DONE" ? `Hecha el ${formatDate(r.date)}` : r.date ? `Prevista para ${formatDate(r.date)}` : "Sin fecha"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular">{formatMoney(r.status === "DONE" ? r.cost : r.estimatedCost)}</p>
                  {r.status === "PENDING" && r.estimatedCost != null && <p className="text-xs text-muted-foreground">estimado</p>}
                </div>
                <div className="flex items-center gap-1">
                  {r.status === "PENDING" && <RepairDialog repair={view} markDone />}
                  <RepairDialog repair={view} />
                  <ConfirmAction
                    title={`¿Eliminar "${r.title}"?`}
                    action={deleteRepair.bind(null, r.id)}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Eliminar ${r.title}`}>
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
