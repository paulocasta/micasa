"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SERIES, type Totals } from "@/lib/dashboard-calc";
import { formatMoney } from "@/lib/money";

const SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const compact = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });

export function MonthlyChart({ months }: { months: Totals[] }) {
  const data = months.map((m, i) => ({ month: SHORT[i], ...m }));
  return (
    <div className="h-72 w-full" role="img" aria-label="Gasto mensual por sección (detalle en la tabla)">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            width={52}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(v: number) => `$${compact.format(v / 100)}`}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as Totals;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                  <p className="mb-1 font-semibold">{label}</p>
                  {SERIES.map((s) => (
                    <p key={s.key} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
                        {s.label}
                      </span>
                      <span className="tabular">{formatMoney(row[s.key])}</span>
                    </p>
                  ))}
                  <p className="mt-1 flex justify-between gap-4 border-t pt-1 font-semibold">
                    <span>Total</span>
                    <span className="tabular">{formatMoney(row.total)}</span>
                  </p>
                </div>
              );
            }}
          />
          {SERIES.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="gastos"
              fill={s.color}
              stroke="var(--card)"
              strokeWidth={2}
              radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={36}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
