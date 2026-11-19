import { AlertTriangleIcon, ArrowDownRightIcon, ArrowUpRightIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { UrlFilters } from "@/components/app/url-filters";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { byMonth, SERIES, sumTotals } from "@/lib/dashboard-calc";
import { formatDate, localParts, MONTHS, monthRange, periodLabel, yearRange } from "@/lib/dates";
import { formatMoney, formatQuantity } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  getExpenses,
  getLatestPaidTaxes,
  getLatestRepairs,
  getLowStock,
  getUpcomingTaxes,
} from "@/server/dashboard";
import { MonthlyChart } from "./monthly-chart";

export default async function InicioPage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const now = new Date();
  const today = localParts(now);
  const view = one("vista") === "anio" ? "anio" : "mes";
  const year = Number(one("anio")) || today.year;
  const month = Math.min(12, Math.max(1, Number(one("mes")) || today.month));

  const range = view === "anio" ? yearRange(year) : monthRange(year, month);
  const prev = view === "anio" ? yearRange(year - 1) : month === 1 ? monthRange(year - 1, 12) : monthRange(year, month - 1);
  const yr = yearRange(year);

  const [expenses, prevExpenses, yearExpenses, lowStock, paidTaxes, upcomingTaxes, repairs] = await Promise.all([
    getExpenses(range.start, range.end),
    getExpenses(prev.start, prev.end),
    getExpenses(yr.start, yr.end),
    getLowStock(),
    getLatestPaidTaxes(),
    getUpcomingTaxes(),
    getLatestRepairs(),
  ]);

  const totals = sumTotals(expenses);
  const prevTotal = sumTotals(prevExpenses).total;
  const months = byMonth(yearExpenses, year);
  const delta = prevTotal ? (totals.total - prevTotal) / prevTotal : null;
  const periodName = view === "anio" ? String(year) : `${MONTHS[month - 1]} ${year}`;
  const visibleSeries = SERIES.filter((s) => (s.key !== "reparaciones" && s.key !== "varios") || totals[s.key] > 0);
  const years = Array.from({ length: 5 }, (_, i) => today.year - i);
  if (!years.includes(year)) years.push(year);

  return (
    <>
      <PageHeader title="Inicio" description={`Resumen de gastos · ${periodName}`} />

      <Suspense>
        <UrlFilters
          className="mb-6"
          filters={[
            {
              name: "vista",
              label: "Ver por",
              value: view,
              options: [
                { value: "mes", label: "Por mes" },
                { value: "anio", label: "Por año" },
              ],
            },
            ...(view === "mes"
              ? [
                  {
                    name: "mes",
                    label: "Mes",
                    value: String(month),
                    options: MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
                  },
                ]
              : []),
            {
              name: "anio",
              label: "Año",
              value: String(year),
              options: years.sort((a, b) => b - a).map((y) => ({ value: String(y), label: String(y) })),
            },
          ]}
        />
      </Suspense>

      <section aria-label="Gastos del período" className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card className="gap-2 bg-primary px-5 py-4 text-primary-foreground sm:col-span-2 lg:col-span-1">
          <p className="text-sm font-medium opacity-90">Total {view === "anio" ? "del año" : "del mes"}</p>
          <p className="text-3xl font-bold tracking-tight tabular">{formatMoney(totals.total)}</p>
          {delta != null && (
            <p className="flex items-center gap-1 text-xs opacity-90">
              {delta >= 0 ? <ArrowUpRightIcon className="size-3.5" aria-hidden /> : <ArrowDownRightIcon className="size-3.5" aria-hidden />}
              {Math.abs(delta * 100).toFixed(0)}% {delta >= 0 ? "más" : "menos"} que {view === "anio" ? "el año" : "el mes"} anterior
            </p>
          )}
        </Card>
        {visibleSeries.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Card className="h-full gap-2 px-5 py-4 transition-colors duration-200 group-hover:border-primary/40">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
                {s.label}
              </p>
              <p className="text-2xl font-semibold tracking-tight tabular">{formatMoney(totals[s.key])}</p>
              <p className="text-xs text-muted-foreground">
                {totals.total ? `${Math.round((totals[s.key] / totals.total) * 100)}% del total` : "Sin gastos"}
              </p>
            </Card>
          </Link>
        ))}
      </section>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Gasto mensual {year}</CardTitle>
          <CardAction>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda">
              {SERIES.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
                  {s.label}
                </li>
              ))}
            </ul>
          </CardAction>
        </CardHeader>
        <CardContent>
          <MonthlyChart months={months} />
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver como tabla</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-3 font-medium">Mes</th>
                    {SERIES.map((s) => (
                      <th key={s.key} className="py-2 pr-3 text-right font-medium">
                        {s.label}
                      </th>
                    ))}
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m, i) => (
                    <tr key={i} className={cn("border-b last:border-0", view === "mes" && i + 1 === month && "bg-muted/60")}>
                      <td className="py-1.5 pr-3">{MONTHS[i]}</td>
                      {SERIES.map((s) => (
                        <td key={s.key} className="py-1.5 pr-3 text-right tabular">
                          {formatMoney(m[s.key])}
                        </td>
                      ))}
                      <td className="py-1.5 text-right font-medium tabular">{formatMoney(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget title="Despensa · stock bajo" href="/despensa?bajo=1">
          {lowStock.length === 0 ? (
            <Empty>Todo en orden: ningún artículo bajo el mínimo.</Empty>
          ) : (
            lowStock.map((i) => (
              <Row
                key={i.id}
                href={`/despensa/${i.id}`}
                title={i.brand ? `${i.name} · ${i.brand}` : i.name}
                subtitle={i.category.name}
                right={
                  <span className="flex items-center gap-1 font-semibold text-warning tabular">
                    <AlertTriangleIcon className="size-3.5" aria-hidden />
                    {formatQuantity(i.quantity)} {i.unit}
                  </span>
                }
              />
            ))
          )}
        </Widget>

        <Widget title="Impuestos" href="/impuestos">
          {upcomingTaxes.length > 0 && (
            <>
              <SubTitle>Próximos a pagar</SubTitle>
              {upcomingTaxes.slice(0, 3).map((t) => {
                const overdue = t.dueDate != null && t.dueDate < now;
                return (
                  <Row
                    key={t.id}
                    href={`/impuestos?anio=${t.period.slice(0, 4)}&estado=pendientes`}
                    title={`${t.name} ${periodLabel(t.period)}`}
                    subtitle={t.dueDate ? `Vence ${formatDate(t.dueDate)}` : "Sin vencimiento"}
                    right={<StatusBadge kind={overdue ? "overdue" : "pending"}>{overdue ? "Vencido" : "Pendiente"}</StatusBadge>}
                  />
                );
              })}
            </>
          )}
          <SubTitle>Últimos pagados</SubTitle>
          {paidTaxes.length === 0 ? (
            <Empty>Todavía no hay pagos registrados.</Empty>
          ) : (
            paidTaxes.map((t) => (
              <Row
                key={t.id}
                href={`/impuestos?anio=${t.period.slice(0, 4)}&estado=pagados`}
                title={`${t.name} ${periodLabel(t.period)}`}
                subtitle={`${formatDate(t.paidAt)} · ${t.paymentMethod ?? ""}`}
                right={<span className="font-semibold tabular">{formatMoney(t.amount)}</span>}
              />
            ))
          )}
        </Widget>

        <Widget title="Últimas reparaciones" href="/reparaciones">
          {repairs.length === 0 ? (
            <Empty>No hay reparaciones registradas.</Empty>
          ) : (
            repairs.map((r) => (
              <Row
                key={r.id}
                href="/reparaciones?estado=hechas"
                title={r.title}
                subtitle={formatDate(r.date)}
                right={<span className="font-semibold tabular">{formatMoney(r.cost)}</span>}
              />
            ))
          )}
        </Widget>
      </div>
    </>
  );
}

function Widget({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardAction>
          <Link
            href={href}
            className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Ver todo <ChevronRightIcon className="size-4" aria-hidden />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-1">{children}</CardContent>
    </Card>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase first:mt-0">{children}</p>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>;
}

function Row({ href, title, subtitle, right }: { href: string; title: string; subtitle: string; right: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-mx-2 flex min-h-12 items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <span className="shrink-0 text-sm">{right}</span>
    </Link>
  );
}
