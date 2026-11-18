import { CalendarClockIcon, LandmarkIcon, RepeatIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { UrlFilters } from "@/components/app/url-filters";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate, localParts, MONTHS, periodLabel, periodOf, toDateInput } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  NewRecurringDialog,
  NewTaxDialog,
  PayTaxButton,
  RecurringActions,
  type RecurringView,
  TaxMenu,
  type TaxView,
} from "./tax-dialogs";

export const metadata: Metadata = { title: "Impuestos" };

type Status = "todos" | "pendientes" | "pagados" | "vencidos";

export default async function ImpuestosPage({ searchParams }: PageProps<"/impuestos">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const now = new Date();
  const { year: currentYear } = localParts(now);
  const tab = one("tab") === "recurrentes" ? "recurrentes" : "lista";
  const year = Number(one("anio")) || currentYear;
  const month = one("mes") ?? "todos";
  const status = (one("estado") as Status) ?? "todos";
  const currentPeriod = periodOf(now);

  const [taxes, recurring, yearsRaw] = await Promise.all([
    db.tax.findMany({
      where: {
        period: month === "todos" ? { startsWith: `${year}-` } : `${year}-${month.padStart(2, "0")}`,
        ...(status === "pagados" ? { status: "PAID" } : status === "todos" ? {} : { status: "PENDING" }),
      },
      orderBy: [{ period: "asc" }, { dueDate: "asc" }, { name: "asc" }],
    }),
    db.recurringTax.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.tax.findMany({ select: { period: true }, distinct: ["period"] }),
  ]);

  const isOverdue = (t: (typeof taxes)[number]) => t.status === "PENDING" && t.dueDate != null && t.dueDate < now;
  const list = status === "vencidos" ? taxes.filter(isOverdue) : taxes;

  const paidTotal = list.filter((t) => t.status === "PAID").reduce((s, t) => s + (t.amount ?? 0), 0);
  const pending = list.filter((t) => t.status === "PENDING");
  const pendingTotal = pending.reduce((s, t) => s + (t.amount ?? 0), 0);
  const overdueCount = list.filter(isOverdue).length;

  const groups = new Map<string, typeof list>();
  for (const t of list) groups.set(t.period, [...(groups.get(t.period) ?? []), t]);

  const years = new Set([currentYear, year, ...yearsRaw.map((p) => Number(p.period.slice(0, 4)))]);

  const toView = (t: (typeof taxes)[number]): TaxView => ({
    id: t.id,
    name: t.name,
    title: `${t.name} ${periodLabel(t.period)}`,
    period: t.period,
    status: t.status,
    dueDate: t.dueDate ? toDateInput(t.dueDate) : "",
    paidAt: t.paidAt ? toDateInput(t.paidAt) : "",
    paymentMethod: t.paymentMethod ?? "",
    amount: t.amount,
    notes: t.notes ?? "",
  });

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-200",
      active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <>
      <PageHeader
        title="Impuestos"
        description="Servicios e impuestos pagados y por pagar."
        actions={tab === "lista" ? <NewTaxDialog /> : <NewRecurringDialog />}
      />

      <nav aria-label="Vistas" className="mb-5 inline-flex rounded-lg bg-muted p-1">
        <Link href="/impuestos" className={tabClass(tab === "lista")} aria-current={tab === "lista" ? "page" : undefined}>
          <LandmarkIcon className="size-4" aria-hidden /> Pagos
        </Link>
        <Link
          href="/impuestos?tab=recurrentes"
          className={tabClass(tab === "recurrentes")}
          aria-current={tab === "recurrentes" ? "page" : undefined}
        >
          <RepeatIcon className="size-4" aria-hidden /> Recurrentes
          <span className="tabular text-muted-foreground">{recurring.length}</span>
        </Link>
      </nav>

      {tab === "recurrentes" ? (
        <RecurringList
          items={recurring.map((r) => ({
            id: r.id,
            name: r.name,
            mode: r.mode,
            defaultAmount: r.defaultAmount,
            paymentMethod: r.paymentMethod ?? "",
            dueDay: r.dueDay,
            startPeriod: r.startPeriod,
            active: r.active,
          }))}
        />
      ) : (
        <>
          <Suspense>
            <UrlFilters
              className="mb-4"
              filters={[
                {
                  name: "anio",
                  label: "Año",
                  value: String(year),
                  options: [...years].sort((a, b) => b - a).map((y) => ({ value: String(y), label: String(y) })),
                },
                {
                  name: "mes",
                  label: "Mes",
                  value: month,
                  options: [
                    { value: "todos", label: "Todos los meses" },
                    ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
                  ],
                },
                {
                  name: "estado",
                  label: "Estado",
                  value: status,
                  options: [
                    { value: "todos", label: "Todos" },
                    { value: "pendientes", label: "Pendientes" },
                    { value: "vencidos", label: "Vencidos" },
                    { value: "pagados", label: "Pagados" },
                  ],
                },
              ]}
            />
          </Suspense>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Pagado" value={formatMoney(paidTotal)} />
            <Stat label={`Pendiente (${pending.length})`} value={formatMoney(pendingTotal)} />
            <Stat
              label="Vencidos"
              value={String(overdueCount)}
              className={cn("col-span-2 sm:col-span-1", overdueCount > 0 && "text-destructive")}
            />
          </div>

          {list.length === 0 ? (
            <EmptyState icon={<LandmarkIcon aria-hidden />} title="No hay impuestos para este filtro">
              Cargá uno nuevo o creá un recurrente (por ej. la luz) para generar todo el año.
            </EmptyState>
          ) : (
            <div className="grid gap-6">
              {[...groups.entries()].map(([period, items]) => (
                <section key={period} aria-labelledby={`p-${period}`}>
                  <h2 id={`p-${period}`} className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    {periodLabel(period)}
                    {period === currentPeriod && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Este mes</span>}
                  </h2>
                  <Card className="gap-0 divide-y py-0">
                    {items.map((t) => {
                      const view = toView(t);
                      const overdue = isOverdue(t);
                      return (
                        <div key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{view.title}</p>
                              {t.status === "PAID" ? (
                                <StatusBadge kind="paid">Pagado</StatusBadge>
                              ) : overdue ? (
                                <StatusBadge kind="overdue">Vencido</StatusBadge>
                              ) : (
                                <StatusBadge kind="pending">Pendiente</StatusBadge>
                              )}
                              {t.recurringTaxId && <RepeatIcon className="size-3.5 text-muted-foreground" aria-label="Recurrente" />}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {t.status === "PAID"
                                ? `Pagado el ${formatDate(t.paidAt)} · ${t.paymentMethod ?? "—"}`
                                : t.dueDate
                                  ? `Vence el ${formatDate(t.dueDate)}`
                                  : "Sin vencimiento"}
                            </p>
                          </div>
                          <p className={cn("text-right font-semibold tabular", t.amount == null && "font-normal text-muted-foreground")}>
                            {formatMoney(t.amount)}
                          </p>
                          <div className="flex items-center gap-1">
                            {t.status === "PENDING" && <PayTaxButton tax={view} />}
                            <TaxMenu tax={view} />
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card className="gap-1 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold tabular", className)}>{value}</p>
    </Card>
  );
}

function RecurringList({ items }: { items: RecurringView[] }) {
  if (!items.length) {
    return (
      <EmptyState icon={<CalendarClockIcon aria-hidden />} title="Sin recurrentes">
        Ej: &quot;Luz EPE&quot; con pago manual genera los 12 meses como pendientes; &quot;Internet&quot; con débito
        automático se registra pagado cada mes.
      </EmptyState>
    );
  }
  return (
    <Card className="gap-0 divide-y py-0">
      {items.map((r) => (
        <CardContent key={r.id} className={cn("flex items-center gap-4 px-4 py-3 sm:px-5", !r.active && "opacity-60")}>
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
            <RepeatIcon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {r.name} {!r.active && <span className="text-sm font-normal text-muted-foreground">(pausado)</span>}
            </p>
            <p className="text-sm text-muted-foreground">
              {r.mode === "AUTO_DEBIT" ? `Débito automático el día ${r.dueDay}` : `Pago manual · vence el día ${r.dueDay}`}
              {" · desde "}
              {periodLabel(r.startPeriod)}
            </p>
          </div>
          <p className="hidden font-semibold tabular sm:block">{formatMoney(r.defaultAmount)}</p>
          <RecurringActions rt={r} />
        </CardContent>
      ))}
    </Card>
  );
}
